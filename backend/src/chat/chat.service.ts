import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument, ConversationType, ConversationStatus } from './schemas/conversation.schema';
import { Message, MessageDocument, MessageType, Attachment, ProductEmbed } from './schemas/message.schema';
import { UserStatus, UserStatusDocument } from './schemas/user-status.schema';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface CreateConversationDto {
  type: ConversationType;
  buyerId?: string;
  sellerId?: string;
  productId?: string;
  orderId?: string;
  subject?: string;
  initialMessage?: string;
  status?: 'ACTIVE' | 'DISPUTED'; // Optional status override (e.g., DISPUTED for complaints)
}

export interface SendMessageDto {
  conversationId: string;
  content: string;
  type?: MessageType;
  attachments?: Attachment[];
  productEmbed?: ProductEmbed;
}

export interface ConversationWithDetails {
  conversation: ConversationDocument;
  otherParticipant: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
  };
  product?: any;
  order?: any;
}

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(UserStatus.name) private userStatusModel: Model<UserStatusDocument>,
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  // ============================================
  // CONVERSATION METHODS
  // ============================================

  /**
   * Create or get existing conversation
   */
  async createOrGetConversation(dto: CreateConversationDto, userId: string, userRole: string): Promise<ConversationDocument> {
    // Check if conversation already exists between these participants
    const existingQuery: any = { type: dto.type, status: { $ne: ConversationStatus.ARCHIVED } };

    if (dto.type === ConversationType.BUYER_SELLER) {
      existingQuery.buyerId = dto.buyerId || userId;
      existingQuery.sellerId = dto.sellerId;
      if (dto.productId) existingQuery.productId = dto.productId;
    } else if (dto.type === ConversationType.BUYER_ADMIN) {
      existingQuery.buyerId = dto.buyerId || userId;
    } else if (dto.type === ConversationType.SELLER_ADMIN) {
      existingQuery.sellerId = dto.sellerId || userId;
    }

    let conversation = await this.conversationModel.findOne(existingQuery);

    if (!conversation) {
      // Create new conversation
      // Note: User roles are BUYER, SELLER, ADMIN (not USER)
      const isBuyer = userRole === 'BUYER' || userRole === 'USER';
      const isSeller = userRole === 'SELLER';
      
      // Use provided status (e.g., DISPUTED for complaints) or default to ACTIVE
      const conversationStatus = dto.status === 'DISPUTED' 
        ? ConversationStatus.DISPUTED 
        : ConversationStatus.ACTIVE;
      
      conversation = new this.conversationModel({
        type: dto.type,
        buyerId: dto.buyerId || (isBuyer ? userId : undefined),
        sellerId: dto.sellerId || (isSeller ? userId : undefined),
        productId: dto.productId,
        orderId: dto.orderId,
        subject: dto.subject || 'New Conversation',
        status: conversationStatus,
      });
      await conversation.save();

      // Send initial message if provided
      if (dto.initialMessage) {
        await this.sendMessage({
          conversationId: conversation._id.toString(),
          content: dto.initialMessage,
          type: MessageType.TEXT,
        }, userId, userRole);
      }
    } else {
      // Conversation already exists
      // If this is a complaint, update status to DISPUTED and send the message
      if (dto.status === 'DISPUTED') {
        conversation.status = ConversationStatus.DISPUTED;
        await conversation.save();
      }
      
      // Send the message even if conversation exists
      if (dto.initialMessage) {
        await this.sendMessage({
          conversationId: conversation._id.toString(),
          content: dto.initialMessage,
          type: MessageType.TEXT,
        }, userId, userRole);
      }
    }

    return conversation;
  }

  /**
   * Get conversation by ID with permission check
   */
  async getConversation(conversationId: string, userId: string, userRole: string): Promise<ConversationWithDetails> {
    const conversation = await this.conversationModel.findById(conversationId);
    
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check permission
    if (userRole !== 'ADMIN') {
      const isParticipant = 
        conversation.buyerId === userId || 
        conversation.sellerId === userId ||
        conversation.adminId === userId;
      
      if (!isParticipant) {
        throw new ForbiddenException('Not authorized to view this conversation');
      }
    }

    // Get other participant details
    let otherParticipantId: string;
    let otherRole: string;

    if (conversation.buyerId === userId) {
      otherParticipantId = conversation.sellerId || conversation.adminId;
      otherRole = conversation.sellerId ? 'SELLER' : 'ADMIN';
    } else if (conversation.sellerId === userId) {
      otherParticipantId = conversation.buyerId || conversation.adminId;
      otherRole = conversation.buyerId ? 'BUYER' : 'ADMIN';
    } else {
      otherParticipantId = conversation.buyerId || conversation.sellerId;
      otherRole = conversation.buyerId ? 'BUYER' : 'SELLER';
    }

    const otherUser = otherParticipantId ? await this.prisma.user.findUnique({
      where: { id: otherParticipantId },
      select: { id: true, name: true, avatar: true, role: true },
    }) : null;

    // Get product/order details if linked
    let product = null;
    let order = null;

    if (conversation.productId) {
      product = await this.prisma.product.findUnique({
        where: { id: conversation.productId },
        select: { id: true, title: true, price: true, images: true },
      });
    }

    if (conversation.orderId) {
      order = await this.prisma.order.findUnique({
        where: { id: conversation.orderId },
        select: { id: true, status: true, total: true, createdAt: true },
      });
    }

    return {
      conversation,
      otherParticipant: {
        id: otherUser?.id || '',
        name: otherUser?.name || 'Unknown',
        avatar: otherUser?.avatar,
        role: otherRole,
      },
      product,
      order,
    };
  }

  /**
   * Get user's conversations
   */
  async getUserConversations(
    userId: string, 
    userRole: string,
    options: { status?: ConversationStatus; type?: ConversationType; page?: number; limit?: number } = {}
  ): Promise<{ conversations: any[]; total: number; page: number; totalPages: number }> {
    const { status, type, page = 1, limit = 20 } = options;
    
    const query: any = {};
    
    // Filter by role
    if (userRole === 'ADMIN') {
      // Admin can see all or filter by assigned
      if (options.status === ConversationStatus.DISPUTED) {
        query.$or = [{ adminId: userId }, { adminId: { $exists: false } }];
      }
    } else if (userRole === 'SELLER') {
      query.sellerId = userId;
    } else {
      query.buyerId = userId;
    }

    if (status) query.status = status;
    if (type) query.type = type;

    const total = await this.conversationModel.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const conversations = await this.conversationModel
      .find(query)
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Enrich with participant details
    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        let otherParticipantId: string;
        
        if (userRole === 'SELLER') {
          otherParticipantId = conv.buyerId;
        } else if (userRole === 'BUYER' || userRole === 'USER') {
          otherParticipantId = conv.sellerId || conv.adminId;
        } else {
          otherParticipantId = conv.buyerId || conv.sellerId;
        }

        const otherUser = otherParticipantId ? await this.prisma.user.findUnique({
          where: { id: otherParticipantId },
          select: { id: true, name: true, avatar: true },
        }) : null;

        // Get unread count for current user
        let unreadCount = 0;
        if (userRole === 'SELLER') unreadCount = conv.sellerUnreadCount;
        else if (userRole === 'BUYER' || userRole === 'USER') unreadCount = conv.buyerUnreadCount;
        else unreadCount = conv.adminUnreadCount;

        return {
          ...conv,
          otherParticipant: otherUser,
          unreadCount,
        };
      })
    );

    return {
      conversations: enrichedConversations,
      total,
      page,
      totalPages,
    };
  }

  // ============================================
  // MESSAGE METHODS
  // ============================================

  /**
   * Send a message
   */
  async sendMessage(dto: SendMessageDto, userId: string, userRole: string): Promise<MessageDocument> {
    const conversation = await this.conversationModel.findById(dto.conversationId);
    
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check permission
    const isParticipant = 
      conversation.buyerId === userId || 
      conversation.sellerId === userId ||
      conversation.adminId === userId ||
      userRole === 'ADMIN';

    if (!isParticipant) {
      throw new ForbiddenException('Not authorized to send message in this conversation');
    }

    // Get sender info
    const sender = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, avatar: true },
    });

    // Create message
    const message = new this.messageModel({
      conversationId: new Types.ObjectId(dto.conversationId),
      senderId: userId,
      senderRole: userRole,
      senderName: sender?.name || 'Unknown',
      senderAvatar: sender?.avatar,
      content: dto.content,
      type: dto.type || MessageType.TEXT,
      attachments: dto.attachments || [],
      productEmbed: dto.productEmbed,
    });

    await message.save();

    // Update conversation
    const updateData: any = {
      lastMessageAt: new Date(),
      lastMessagePreview: dto.content.substring(0, 100),
    };

    // Increment unread count for other participants
    if (conversation.buyerId && conversation.buyerId !== userId) {
      updateData.$inc = { ...updateData.$inc, buyerUnreadCount: 1 };
    }
    if (conversation.sellerId && conversation.sellerId !== userId) {
      updateData.$inc = { ...updateData.$inc, sellerUnreadCount: 1 };
    }
    if (conversation.adminId && conversation.adminId !== userId) {
      updateData.$inc = { ...updateData.$inc, adminUnreadCount: 1 };
    }

    await this.conversationModel.findByIdAndUpdate(dto.conversationId, updateData);

    // Send in-app notification to other participants (async, don't block response)
    this.sendMessageNotifications(conversation, userId, sender?.name || 'Ai đó', dto.content).catch(err => {
      console.error('Failed to send message notification:', err.message);
    });

    return message;
  }

  /**
   * Send in-app notifications for new message
   */
  private async sendMessageNotifications(
    conversation: ConversationDocument,
    senderId: string,
    senderName: string,
    messageContent: string,
  ) {
    const conversationId = conversation._id.toString();
    
    // Notify other participants
    const recipientIds: string[] = [];
    
    if (conversation.buyerId && conversation.buyerId !== senderId) {
      recipientIds.push(conversation.buyerId);
    }
    if (conversation.sellerId && conversation.sellerId !== senderId) {
      recipientIds.push(conversation.sellerId);
    }
    if (conversation.adminId && conversation.adminId !== senderId) {
      recipientIds.push(conversation.adminId);
    }

    // Send notifications to all recipients
    for (const recipientId of recipientIds) {
      try {
        await this.notificationsService.sendMessageNotification(
          recipientId,
          senderName,
          messageContent,
          conversationId,
        );
      } catch (error) {
        console.error(`Failed to send notification to ${recipientId}:`, error);
      }
    }
  }

  /**
   * Get messages in a conversation
   */
  async getMessages(
    conversationId: string,
    userId: string,
    userRole: string,
    options: { page?: number; limit?: number; before?: string } = {}
  ): Promise<{ messages: MessageDocument[]; hasMore: boolean }> {
    const { page = 1, limit = 50, before } = options;

    // Verify permission
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isParticipant = 
      conversation.buyerId === userId || 
      conversation.sellerId === userId ||
      conversation.adminId === userId ||
      userRole === 'ADMIN';

    if (!isParticipant) {
      throw new ForbiddenException('Not authorized to view messages');
    }

    const query: any = { 
      conversationId: new Types.ObjectId(conversationId),
      isDeleted: false,
    };

    // Hide hidden messages from non-admin
    if (userRole !== 'ADMIN') {
      query.isHidden = false;
    }

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await this.messageModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1) // Get one extra to check if there's more
      .lean();

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    // Return in chronological order
    return {
      messages: messages.reverse() as MessageDocument[],
      hasMore,
    };
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string, userId: string, userRole: string): Promise<void> {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) return;

    // Reset unread count for current user
    const updateData: any = {};
    if (userRole === 'BUYER' || userRole === 'USER' || conversation.buyerId === userId) {
      updateData.buyerUnreadCount = 0;
    } else if (userRole === 'SELLER' || conversation.sellerId === userId) {
      updateData.sellerUnreadCount = 0;
    } else if (userRole === 'ADMIN') {
      updateData.adminUnreadCount = 0;
    }

    await this.conversationModel.findByIdAndUpdate(conversationId, updateData);

    // Add read receipts to messages
    await this.messageModel.updateMany(
      {
        conversationId: new Types.ObjectId(conversationId),
        senderId: { $ne: userId },
        'readBy.userId': { $ne: userId },
      },
      {
        $push: { readBy: { userId, readAt: new Date() } },
      }
    );
  }

  // ============================================
  // DISPUTE METHODS
  // ============================================

  /**
   * Open a dispute (escalate to admin)
   */
  async openDispute(conversationId: string, userId: string, reason: string): Promise<ConversationDocument> {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.status === ConversationStatus.DISPUTED) {
      throw new BadRequestException('Dispute already opened');
    }

    conversation.status = ConversationStatus.DISPUTED;
    conversation.disputeReason = reason;
    conversation.disputedAt = new Date();
    await conversation.save();

    // Send system message
    await this.sendSystemMessage(
      conversationId,
      `🚨 Tranh chấp đã được mở. Lý do: ${reason}. Admin sẽ tham gia để giải quyết.`
    );

    return conversation;
  }

  /**
   * Admin joins a dispute
   */
  async joinDispute(conversationId: string, adminId: string): Promise<ConversationDocument> {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    conversation.adminId = adminId;
    await conversation.save();

    // Get admin name
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { name: true },
    });

    // Send system message
    await this.sendSystemMessage(
      conversationId,
      `👤 Admin ${admin?.name || ''} đã tham gia để hỗ trợ giải quyết tranh chấp.`
    );

    return conversation;
  }

  /**
   * Resolve a dispute
   */
  async resolveDispute(conversationId: string, adminId: string, resolution: string): Promise<ConversationDocument> {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    conversation.status = ConversationStatus.RESOLVED;
    conversation.resolvedAt = new Date();
    conversation.resolution = resolution;
    await conversation.save();

    // Send system message
    await this.sendSystemMessage(
      conversationId,
      `✅ Tranh chấp đã được giải quyết. Kết quả: ${resolution}`
    );

    return conversation;
  }

  // ============================================
  // USER STATUS METHODS
  // ============================================

  /**
   * Update user online status
   */
  async updateUserStatus(userId: string, isOnline: boolean, socketId?: string): Promise<void> {
    await this.userStatusModel.findOneAndUpdate(
      { userId },
      {
        userId,
        isOnline,
        lastSeen: isOnline ? undefined : new Date(),
        socketId: isOnline ? socketId : undefined,
      },
      { upsert: true }
    );
  }

  /**
   * Get user online status
   */
  async getUserStatus(userId: string): Promise<UserStatusDocument | null> {
    return this.userStatusModel.findOne({ userId });
  }

  /**
   * Set typing status
   */
  async setTypingStatus(userId: string, conversationId: string | null): Promise<void> {
    await this.userStatusModel.findOneAndUpdate(
      { userId },
      { currentlyTypingIn: conversationId }
    );
  }

  // ============================================
  // ADMIN METHODS
  // ============================================

  /**
   * Get all conversations (admin only)
   */
  async getAllConversations(
    options: { status?: ConversationStatus; type?: ConversationType; search?: string; page?: number; limit?: number } = {}
  ): Promise<{ conversations: any[]; total: number; page: number; totalPages: number }> {
    const { status, type, search, page = 1, limit = 20 } = options;
    
    const query: any = {};
    if (status) query.status = status;
    if (type) query.type = type;

    // Basic search by subject or last message preview (MongoDB)
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { lastMessagePreview: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await this.conversationModel.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const conversations = await this.conversationModel
      .find(query)
      .sort({ lastMessageAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Enrich with participant details
    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const [buyer, seller] = await Promise.all([
          conv.buyerId ? this.prisma.user.findUnique({
            where: { id: conv.buyerId },
            select: { id: true, name: true, avatar: true },
          }) : null,
          conv.sellerId ? this.prisma.user.findUnique({
            where: { id: conv.sellerId },
            select: { id: true, name: true, avatar: true },
          }) : null,
        ]);

        return {
          ...conv,
          buyer,
          seller,
        };
      })
    );

    return {
      conversations: enrichedConversations,
      total,
      page,
      totalPages,
    };
  }

  /**
   * Hide/unhide a message (admin moderation)
   */
  async moderateMessage(messageId: string, adminId: string, hide: boolean, reason?: string): Promise<MessageDocument> {
    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    message.isHidden = hide;
    message.hiddenBy = hide ? adminId : undefined;
    message.hiddenReason = hide ? reason : undefined;
    message.hiddenAt = hide ? new Date() : undefined;
    await message.save();

    return message;
  }

  /**
   * Search messages
   */
  async searchMessages(
    query: string,
    options: { conversationId?: string; userId?: string; page?: number; limit?: number } = {}
  ): Promise<{ messages: any[]; total: number }> {
    const { conversationId, userId, page = 1, limit = 20 } = options;

    const searchQuery: any = {
      $text: { $search: query },
      isDeleted: false,
    };

    if (conversationId) {
      searchQuery.conversationId = new Types.ObjectId(conversationId);
    }
    if (userId) {
      searchQuery.senderId = userId;
    }

    const total = await this.messageModel.countDocuments(searchQuery);

    const messages = await this.messageModel
      .find(searchQuery, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return { messages, total };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Send a system message
   */
  private async sendSystemMessage(conversationId: string, content: string): Promise<MessageDocument> {
    const message = new this.messageModel({
      conversationId: new Types.ObjectId(conversationId),
      senderId: 'SYSTEM',
      senderRole: 'SYSTEM',
      senderName: 'System',
      content,
      type: MessageType.SYSTEM,
    });

    await message.save();

    await this.conversationModel.findByIdAndUpdate(conversationId, {
      lastMessageAt: new Date(),
      lastMessagePreview: content.substring(0, 100),
    });

    return message;
  }

  /**
   * Get total unread count for user
   */
  async getTotalUnreadCount(userId: string, userRole: string): Promise<number> {
    const query: any = { status: { $ne: ConversationStatus.ARCHIVED } };
    
    if (userRole === 'SELLER') {
      query.sellerId = userId;
      query.sellerUnreadCount = { $gt: 0 };
    } else if (userRole === 'BUYER' || userRole === 'USER') {
      query.buyerId = userId;
      query.buyerUnreadCount = { $gt: 0 };
    } else {
      query.adminId = userId;
      query.adminUnreadCount = { $gt: 0 };
    }

    const conversations = await this.conversationModel.find(query).lean();
    
    let total = 0;
    for (const conv of conversations) {
      if (userRole === 'SELLER') total += conv.sellerUnreadCount;
      else if (userRole === 'BUYER' || userRole === 'USER') total += conv.buyerUnreadCount;
      else total += conv.adminUnreadCount;
    }

    return total;
  }
}
