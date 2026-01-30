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
import { MessageType } from './schemas/message.schema';
import { TelegramService } from '../telegram/telegram.service';

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

  constructor(
    private jwtService: JwtService,
    private chatService: ChatService,
    private telegramService: TelegramService,
  ) {}

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
      
      // Mark as read
      await this.chatService.markAsRead(conversationId, client.userId, client.userRole);
      
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
    },
  ) {
    console.log(`[Chat] 📤 User ${client.userId} sending message to conversation ${data.conversationId}`);
    try {
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

        // Send Telegram notification if user is offline
        const isOnline = this.userSockets.has(participantId);
        if (!isOnline) {
          console.log(`[Chat] Participant ${participantId} is offline, sending Telegram notification`);
          this.telegramService.notifyNewMessage(participantId, {
            senderName: client.userName || 'Người dùng',
            preview: data.content || '[Đính kèm]',
          }).catch(err => console.error('Telegram notification error:', err));
        }
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
    await this.chatService.markAsRead(data.conversationId, client.userId, client.userRole);
    
    // Notify sender that messages were read
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
}
