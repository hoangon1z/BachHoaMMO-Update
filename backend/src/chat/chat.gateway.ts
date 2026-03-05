import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { ChatModerationService } from './chat-moderation.service';
import { MessageType } from './schemas/message.schema';
import { TelegramService } from '../telegram/telegram.service';
import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  userName?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Map userId to socket IDs (one user can have multiple connections)
  private userSockets: Map<string, Set<string>> = new Map();

  // Auto-reply cooldown: Map<'sellerId:buyerId', lastAutoReplyTimestamp>
  private autoReplyCooldowns: Map<string, number> = new Map();

  constructor(
    private jwtService: JwtService,
    private chatService: ChatService,
    private chatModerationService: ChatModerationService,
    private telegramService: TelegramService,
    private prisma: PrismaService,
  ) { }

  // ============================================
  // CONNECTION HANDLERS
  // ============================================

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Authenticate via token in query or auth header
      const token =
        client.handshake.query.token as string ||
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        console.log('[Chat] ✗ Connection rejected: No token provided');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub || payload.id;
      client.userRole = payload.role;
      client.userName = payload.name;

      // Track socket
      if (!this.userSockets.has(client.userId)) {
        this.userSockets.set(client.userId, new Set());
      }
      this.userSockets.get(client.userId).add(client.id);

      // Update online status
      await this.chatService.updateUserStatus(client.userId, true, client.id);

      // Join user's personal room
      client.join(`user:${client.userId}`);

      // Notify others that user is online
      this.server.emit('user:online', { userId: client.userId });

      console.log(`[Chat] ✓ User ${client.userId} (${client.userName}) connected (socket: ${client.id})`);
    } catch (error) {
      console.error('[Chat] ✗ Connection error:', error.message);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      // Remove socket from tracking
      const userSocketSet = this.userSockets.get(client.userId);
      if (userSocketSet) {
        userSocketSet.delete(client.id);

        // Only mark offline if no more connections
        if (userSocketSet.size === 0) {
          this.userSockets.delete(client.userId);
          await this.chatService.updateUserStatus(client.userId, false);

          // Notify others that user is offline
          this.server.emit('user:offline', { userId: client.userId });
        }
      }

      console.log(`[Chat] User ${client.userId} disconnected (socket: ${client.id})`);
    }
  }

  // ============================================
  // MESSAGE HANDLERS
  // ============================================

  /**
   * Join a conversation room
   */
  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const { conversationId } = data;

    console.log(`[Chat] User ${client.userId} joining conversation ${conversationId}`);
    try {
      // Verify permission
      await this.chatService.getConversation(conversationId, client.userId, client.userRole);

      // Join room
      client.join(`conversation:${conversationId}`);
      console.log(`[Chat] ✓ User ${client.userId} joined room: conversation:${conversationId}`);

      // Note: markAsRead is NOT called here anymore.
      // It will be triggered explicitly by the client via 'messages:read' event
      // when the user is actively viewing the conversation (tab visible).

      return { success: true };
    } catch (error) {
      console.error(`[Chat] ✗ Error joining conversation:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Leave a conversation room
   */
  @SubscribeMessage('conversation:leave')
  handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conversation:${data.conversationId}`);
    return { success: true };
  }

  /**
   * Send a message
   */
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      conversationId: string;
      content?: string;
      type?: MessageType;
      attachments?: any[];
      productEmbed?: any;
      replyTo?: any;
    },
  ) {
    console.log(`[Chat] 📤 User ${client.userId} sending message to conversation ${data.conversationId}`);
    try {
      // ============================================
      // CHAT MODERATION - TEMPORARILY DISABLED
      // ============================================

      /*
      const isAdmin = client.userRole === 'ADMIN';

      if (!isAdmin) {
        const canSend = await this.chatModerationService.canUserSendMessage(client.userId);
        if (!canSend.allowed) {
          console.log(`[Chat] ⛔ User ${client.userId} is locked from chatting`);
          const response = {
            success: false,
            blocked: true,
            error: canSend.reason,
            action: 'LOCKED',
          };
          client.emit('message:blocked', response);
          return response;
        }

        if (data.content && data.content.trim().length > 0) {
          const moderationResult = await this.chatModerationService.checkAndRecordViolation(
            client.userId,
            data.conversationId,
            data.content,
          );

          if (moderationResult.isViolation) {
            console.log(`[Chat] ⚠️ Violation detected for user ${client.userId}: ${moderationResult.action}`);

            if (['BLOCK', 'BLOCK_AND_WARN', 'BLOCK_AND_RESTRICT', 'BLOCK_AND_LOCK'].includes(moderationResult.action)) {
              const response = {
                success: false,
                blocked: true,
                error: moderationResult.warningMessage,
                action: moderationResult.action,
                violations: moderationResult.violations.map(v => ({
                  type: v.type,
                  severity: v.severity,
                })),
              };
              client.emit('message:blocked', response);
              return response;
            }

            if (moderationResult.action === 'WARN') {
              client.emit('chat:warning', {
                message: moderationResult.warningMessage,
                violations: moderationResult.violations.map(v => ({
                  type: v.type,
                  severity: v.severity,
                })),
              });
            }
          }
        }
      } else {
        console.log(`[Chat] 👑 Admin ${client.userId} bypasses moderation checks`);
      }
      */


      // ============================================
      // NORMAL MESSAGE PROCESSING
      // ============================================

      // Validate: must have content OR attachments OR productEmbed
      const hasContent = data.content && data.content.trim().length > 0;
      const hasAttachments = data.attachments && data.attachments.length > 0;
      const hasProductEmbed = !!data.productEmbed;

      if (!hasContent && !hasAttachments && !hasProductEmbed) {
        throw new Error('Message must have content, attachments, or product embed');
      }

      const message = await this.chatService.sendMessage(
        {
          conversationId: data.conversationId,
          content: data.content || '',
          type: data.type || MessageType.TEXT,
          attachments: data.attachments,
          productEmbed: data.productEmbed,
          replyTo: data.replyTo,
        },
        client.userId,
        client.userRole,
      );

      console.log(`[Chat] ✓ Message saved, broadcasting to room: conversation:${data.conversationId}`);

      // Broadcast to conversation room
      this.server.to(`conversation:${data.conversationId}`).emit('message:new', {
        message,
        conversationId: data.conversationId,
      });

      // Get conversation to notify participants
      const { conversation } = await this.chatService.getConversation(
        data.conversationId,
        client.userId,
        client.userRole,
      );

      // Send push notification to offline participants
      const participants = [
        conversation.buyerId,
        conversation.sellerId,
        conversation.adminId,
      ].filter(id => id && id !== client.userId);

      console.log(`[Chat] Notifying ${participants.length} participants`);

      for (const participantId of participants) {
        // Emit to user's personal room (for badge update)
        this.server.to(`user:${participantId}`).emit('conversation:update', {
          conversationId: data.conversationId,
          lastMessage: message,
        });

        // Always send Telegram notification for new messages
        // Even if user is "online" via WebSocket, they may not be actively viewing the chat
        const isOnline = this.userSockets.has(participantId);
        console.log(`[Chat] Participant ${participantId} is ${isOnline ? 'online' : 'offline'}, sending Telegram notification`);
        this.telegramService.notifyNewMessage(participantId, {
          senderName: client.userName || 'Người dùng',
          preview: data.content || '[Đính kèm]',
        }).catch(err => console.error('Telegram notification error:', err));
      }

      // ============================================
      // AUTO-REPLY CHECK
      // ============================================
      // Only trigger if sender is the buyer (message goes to seller)
      if (conversation.sellerId && conversation.buyerId === client.userId) {
        this.handleAutoReply(
          conversation.sellerId,
          client.userId,
          data.conversationId,
        ).catch(err => console.error('[Chat] Auto-reply error:', err.message));
      }

      return { success: true, message };
    } catch (error) {
      console.error(`[Chat] ✗ Error sending message:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Typing indicator
   */
  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await this.chatService.setTypingStatus(client.userId, data.conversationId);

    // Broadcast to others in conversation
    client.to(`conversation:${data.conversationId}`).emit('typing:update', {
      userId: client.userId,
      // Backward-compat (typo): keep for older clients
      oderId: client.userId,
      userName: client.userName,
      conversationId: data.conversationId,
      isTyping: true,
    });

    return { success: true };
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await this.chatService.setTypingStatus(client.userId, null);

    client.to(`conversation:${data.conversationId}`).emit('typing:update', {
      userId: client.userId,
      // Backward-compat (typo): keep for older clients
      oderId: client.userId,
      conversationId: data.conversationId,
      isTyping: false,
    });

    return { success: true };
  }

  /**
   * Mark messages as read
   */
  @SubscribeMessage('messages:read')
  async handleMessagesRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    // Admin reading should be invisible — only reset admin's unread count,
    // do NOT add to readBy or broadcast read receipts
    if (client.userRole === 'ADMIN') {
      // Just reset admin unread count silently
      await this.chatService.markAsRead(data.conversationId, client.userId, client.userRole);
      return { success: true };
    }

    await this.chatService.markAsRead(data.conversationId, client.userId, client.userRole);

    // Notify sender that messages were read (only for non-admin users)
    client.to(`conversation:${data.conversationId}`).emit('messages:read', {
      conversationId: data.conversationId,
      readBy: client.userId,
      readAt: new Date(),
    });

    return { success: true };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Send notification to specific user
   */
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Send notification to conversation participants
   */
  sendToConversation(conversationId: string, event: string, data: any) {
    this.server.to(`conversation:${conversationId}`).emit(event, data);
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId).size > 0;
  }

  /**
   * Get online user IDs
   */
  getOnlineUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }

  // ============================================
  // AUTO-REPLY SYSTEM
  // ============================================

  /**
   * Check and send auto-reply when buyer messages a seller
   * Conditions:
   * 1. Seller is NOT currently online (no active WebSocket connections)
   * 2. Seller has auto-reply enabled with a message configured
   * 3. Current time (Vietnam timezone UTC+7) is within the seller's auto-reply schedule
   * 4. Cooldown period has passed since last auto-reply to this buyer
   */
  private async handleAutoReply(
    sellerId: string,
    buyerId: string,
    conversationId: string,
  ) {
    // 1. Skip if seller is currently online
    if (this.isUserOnline(sellerId)) {
      return;
    }

    // 2. Get seller's auto-reply settings
    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId: sellerId },
      select: {
        autoReplyEnabled: true,
        autoReplyMessage: true,
        autoReplyStartHour: true,
        autoReplyEndHour: true,
        autoReplyCooldown: true,
        shopName: true,
      },
    });

    if (!sellerProfile || !sellerProfile.autoReplyEnabled || !sellerProfile.autoReplyMessage) {
      return;
    }

    // 3. Check if current time is within schedule (Vietnam timezone UTC+7)
    if (sellerProfile.autoReplyStartHour != null && sellerProfile.autoReplyEndHour != null) {
      const now = new Date();
      const vietnamHour = (now.getUTCHours() + 7) % 24;
      const startHour = sellerProfile.autoReplyStartHour;
      const endHour = sellerProfile.autoReplyEndHour;

      let inSchedule = false;
      if (startHour <= endHour) {
        // Same day range (e.g., 8:00 - 17:00)
        inSchedule = vietnamHour >= startHour && vietnamHour < endHour;
      } else {
        // Overnight range (e.g., 22:00 - 08:00)
        inSchedule = vietnamHour >= startHour || vietnamHour < endHour;
      }

      if (!inSchedule) {
        return;
      }
    }

    // 4. Check cooldown
    const cooldownKey = `${sellerId}:${buyerId}`;
    const lastAutoReply = this.autoReplyCooldowns.get(cooldownKey);
    const cooldownMs = (sellerProfile.autoReplyCooldown || 30) * 60 * 1000;

    if (lastAutoReply && (Date.now() - lastAutoReply) < cooldownMs) {
      return;
    }

    // All checks passed - send auto-reply
    try {
      const autoReplyMessage = await this.chatService.sendMessage(
        {
          conversationId,
          content: sellerProfile.autoReplyMessage,
          type: MessageType.TEXT,
        },
        sellerId,
        'SELLER',
      );

      // Update cooldown
      this.autoReplyCooldowns.set(cooldownKey, Date.now());

      // Broadcast auto-reply to conversation room
      this.server.to(`conversation:${conversationId}`).emit('message:new', {
        message: autoReplyMessage,
        conversationId,
        isAutoReply: true,
      });

      // Emit to buyer's personal room (for conversation list update)
      this.server.to(`user:${buyerId}`).emit('conversation:update', {
        conversationId,
        lastMessage: autoReplyMessage,
      });

      console.log(`[Chat] 🤖 Auto-reply sent from seller ${sellerId} to buyer ${buyerId} in conversation ${conversationId}`);

      // Clean up old cooldown entries periodically (every 1000 entries)
      if (this.autoReplyCooldowns.size > 1000) {
        const cutoff = Date.now() - cooldownMs;
        for (const [key, timestamp] of this.autoReplyCooldowns.entries()) {
          if (timestamp < cutoff) {
            this.autoReplyCooldowns.delete(key);
          }
        }
      }
    } catch (error) {
      console.error(`[Chat] 🤖 Auto-reply failed:`, error.message);
    }
  }

  // ============================================
  // MESSAGE RECALL / EDIT / REACT / PIN / DELETE
  // ============================================

  /**
   * Recall (unsend) a message
   */
  @SubscribeMessage('message:recall')
  async handleRecallMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; conversationId: string },
  ) {
    try {
      const message = await this.chatService.recallMessage(
        data.messageId,
        client.userId,
        client.userRole,
      );

      // Broadcast recall to conversation
      this.server.to(`conversation:${data.conversationId}`).emit('message:recalled', {
        messageId: data.messageId,
        conversationId: data.conversationId,
        recalledBy: client.userId,
        recalledAt: message.recalledAt,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Edit a message
   */
  @SubscribeMessage('message:edit')
  async handleEditMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; conversationId: string; content: string },
  ) {
    try {
      const message = await this.chatService.editMessage(
        data.messageId,
        client.userId,
        data.content,
      );

      // Broadcast edit to conversation
      this.server.to(`conversation:${data.conversationId}`).emit('message:edited', {
        messageId: data.messageId,
        conversationId: data.conversationId,
        content: message.content,
        isEdited: true,
        editedAt: message.editedAt,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Toggle emoji reaction
   */
  @SubscribeMessage('message:react')
  async handleReact(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; conversationId: string; emoji: string },
  ) {
    try {
      const message = await this.chatService.toggleReaction(
        data.messageId,
        client.userId,
        client.userName || 'User',
        data.emoji,
      );

      // Broadcast reaction update to conversation
      this.server.to(`conversation:${data.conversationId}`).emit('message:reacted', {
        messageId: data.messageId,
        conversationId: data.conversationId,
        reactions: message.reactions,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Pin/unpin a message
   */
  @SubscribeMessage('message:pin')
  async handlePinMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; conversationId: string },
  ) {
    try {
      const message = await this.chatService.togglePinMessage(
        data.messageId,
        client.userId,
      );

      // Broadcast pin update to conversation
      this.server.to(`conversation:${data.conversationId}`).emit('message:pinned', {
        messageId: data.messageId,
        conversationId: data.conversationId,
        isPinned: message.isPinned,
        pinnedBy: client.userName,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a message
   */
  @SubscribeMessage('message:delete')
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; conversationId: string },
  ) {
    try {
      await this.chatService.deleteMessage(
        data.messageId,
        client.userId,
        client.userRole,
      );

      // Broadcast delete to conversation
      this.server.to(`conversation:${data.conversationId}`).emit('message:deleted', {
        messageId: data.messageId,
        conversationId: data.conversationId,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
