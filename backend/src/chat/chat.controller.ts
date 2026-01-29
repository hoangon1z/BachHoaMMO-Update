import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ChatService, CreateConversationDto, SendMessageDto } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConversationStatus, ConversationType } from './schemas/conversation.schema';
import { MessageType } from './schemas/message.schema';

// Ensure upload directory exists
const uploadDir = join(process.cwd(), 'uploads', 'chat');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config
const storage = diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
  },
});

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  // ============================================
  // CONVERSATION ENDPOINTS
  // ============================================

  /**
   * Create or get existing conversation
   * POST /chat/conversations
   */
  @Post('conversations')
  async createConversation(@Body() dto: CreateConversationDto, @Request() req) {
    const conversation = await this.chatService.createOrGetConversation(
      dto,
      req.user.id,
      req.user.role,
    );
    return { success: true, conversation };
  }

  /**
   * Get user's conversations
   * GET /chat/conversations
   */
  @Get('conversations')
  async getConversations(
    @Request() req,
    @Query('status') status?: ConversationStatus,
    @Query('type') type?: ConversationType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.chatService.getUserConversations(
      req.user.id,
      req.user.role,
      {
        status,
        type,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
      },
    );
    return { success: true, ...result };
  }

  /**
   * Get single conversation with details
   * GET /chat/conversations/:id
   */
  @Get('conversations/:id')
  async getConversation(@Param('id') id: string, @Request() req) {
    const result = await this.chatService.getConversation(id, req.user.id, req.user.role);
    return { success: true, ...result };
  }

  /**
   * Start chat with seller (from product page)
   * POST /chat/start-with-seller
   */
  @Post('start-with-seller')
  async startWithSeller(
    @Body() body: { sellerId: string; productId?: string; message?: string },
    @Request() req,
  ) {
    const conversation = await this.chatService.createOrGetConversation(
      {
        type: ConversationType.BUYER_SELLER,
        buyerId: req.user.id,
        sellerId: body.sellerId,
        productId: body.productId,
        initialMessage: body.message,
      },
      req.user.id,
      req.user.role,
    );
    return { success: true, conversation };
  }

  /**
   * Start chat with admin (support)
   * POST /chat/start-with-admin
   */
  @Post('start-with-admin')
  async startWithAdmin(
    @Body() body: { subject: string; message: string; orderId?: string },
    @Request() req,
  ) {
    const type = req.user.role === 'SELLER' 
      ? ConversationType.SELLER_ADMIN 
      : ConversationType.BUYER_ADMIN;

    const conversation = await this.chatService.createOrGetConversation(
      {
        type,
        buyerId: req.user.role !== 'SELLER' ? req.user.id : undefined,
        sellerId: req.user.role === 'SELLER' ? req.user.id : undefined,
        subject: body.subject,
        orderId: body.orderId,
        initialMessage: body.message,
      },
      req.user.id,
      req.user.role,
    );
    return { success: true, conversation };
  }

  // ============================================
  // MESSAGE ENDPOINTS
  // ============================================

  /**
   * Send a message
   * POST /chat/messages
   */
  @Post('messages')
  async sendMessage(@Body() dto: SendMessageDto, @Request() req) {
    const message = await this.chatService.sendMessage(dto, req.user.id, req.user.role);
    return { success: true, message };
  }

  /**
   * Get messages in a conversation
   * GET /chat/conversations/:id/messages
   */
  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id') conversationId: string,
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    const result = await this.chatService.getMessages(
      conversationId,
      req.user.id,
      req.user.role,
      {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 50,
        before,
      },
    );
    return { success: true, ...result };
  }

  /**
   * Mark messages as read
   * POST /chat/conversations/:id/read
   */
  @Post('conversations/:id/read')
  async markAsRead(@Param('id') conversationId: string, @Request() req) {
    await this.chatService.markAsRead(conversationId, req.user.id, req.user.role);
    return { success: true };
  }

  /**
   * Upload attachments
   * POST /chat/upload
   */
  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt|zip/;
        const ext = extname(file.originalname).toLowerCase().replace('.', '');
        if (allowedTypes.test(ext)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Invalid file type'), false);
        }
      },
    }),
  )
  async uploadFiles(@UploadedFiles() files: any[]) {
    const attachments = files.map((file) => ({
      url: `/uploads/chat/${file.filename}`,
      type: file.mimetype,
      name: file.originalname,
      size: file.size,
    }));
    return { success: true, attachments };
  }

  // ============================================
  // DISPUTE ENDPOINTS
  // ============================================

  /**
   * Open a dispute
   * POST /chat/conversations/:id/dispute
   */
  @Post('conversations/:id/dispute')
  async openDispute(
    @Param('id') conversationId: string,
    @Body() body: { reason: string },
    @Request() req,
  ) {
    const conversation = await this.chatService.openDispute(
      conversationId,
      req.user.id,
      body.reason,
    );
    return { success: true, conversation };
  }

  /**
   * Admin joins dispute
   * POST /chat/conversations/:id/join-dispute
   */
  @Post('conversations/:id/join-dispute')
  async joinDispute(@Param('id') conversationId: string, @Request() req) {
    if (req.user.role !== 'ADMIN') {
      throw new BadRequestException('Only admin can join disputes');
    }
    const conversation = await this.chatService.joinDispute(conversationId, req.user.id);
    return { success: true, conversation };
  }

  /**
   * Resolve dispute
   * POST /chat/conversations/:id/resolve
   */
  @Post('conversations/:id/resolve')
  async resolveDispute(
    @Param('id') conversationId: string,
    @Body() body: { resolution: string },
    @Request() req,
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new BadRequestException('Only admin can resolve disputes');
    }
    const conversation = await this.chatService.resolveDispute(
      conversationId,
      req.user.id,
      body.resolution,
    );
    return { success: true, conversation };
  }

  // ============================================
  // USER STATUS ENDPOINTS
  // ============================================

  /**
   * Get unread count
   * GET /chat/unread-count
   */
  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const count = await this.chatService.getTotalUnreadCount(req.user.id, req.user.role);
    return { success: true, unreadCount: count };
  }

  /**
   * Get user online status
   * GET /chat/user-status/:userId
   */
  @Get('user-status/:userId')
  async getUserStatus(@Param('userId') userId: string) {
    const status = await this.chatService.getUserStatus(userId);
    return {
      success: true,
      isOnline: status?.isOnline || false,
      lastSeen: status?.lastSeen,
    };
  }

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * Get all conversations (admin only)
   * GET /chat/admin/conversations
   */
  @Get('admin/conversations')
  async getAllConversations(
    @Request() req,
    @Query('status') status?: ConversationStatus,
    @Query('type') type?: ConversationType,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new BadRequestException('Admin only');
    }
    const result = await this.chatService.getAllConversations({
      status,
      type,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
    return { success: true, ...result };
  }

  /**
   * Hide/unhide message (admin moderation)
   * PUT /chat/admin/messages/:id/moderate
   */
  @Put('admin/messages/:id/moderate')
  async moderateMessage(
    @Param('id') messageId: string,
    @Body() body: { hide: boolean; reason?: string },
    @Request() req,
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new BadRequestException('Admin only');
    }
    const message = await this.chatService.moderateMessage(
      messageId,
      req.user.id,
      body.hide,
      body.reason,
    );
    return { success: true, message };
  }

  /**
   * Search messages (admin only)
   * GET /chat/admin/search
   */
  @Get('admin/search')
  async searchMessages(
    @Request() req,
    @Query('q') query: string,
    @Query('conversationId') conversationId?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new BadRequestException('Admin only');
    }
    if (!query) {
      throw new BadRequestException('Search query required');
    }
    const result = await this.chatService.searchMessages(query, {
      conversationId,
      userId,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
    return { success: true, ...result };
  }
}
