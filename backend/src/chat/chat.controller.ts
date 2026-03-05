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
import { ChatModerationService } from './chat-moderation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConversationStatus, ConversationType } from './schemas/conversation.schema';
import { MessageType } from './schemas/message.schema';

// Ensure upload directory exists
const uploadDir = join(process.cwd(), 'uploads', 'chat');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config - uses crypto-random filenames to prevent URL guessing
const crypto = require('crypto');
const storage = diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const randomId = crypto.randomUUID();
    cb(null, `${randomId}${extname(file.originalname)}`);
  },
});

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private chatService: ChatService,
    private chatModerationService: ChatModerationService,
  ) { }

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
   * Start chat with seller (from product page or order page)
   * POST /chat/start-with-seller
   */
  @Post('start-with-seller')
  async startWithSeller(
    @Body() body: {
      sellerId: string;
      productId?: string;
      orderId?: string;
      message?: string;
      isComplaint?: boolean;
    },
    @Request() req,
  ) {
    const conversation = await this.chatService.createOrGetConversation(
      {
        type: ConversationType.BUYER_SELLER,
        buyerId: req.user.id,
        sellerId: body.sellerId,
        productId: body.productId,
        orderId: body.orderId,
        initialMessage: body.message,
        // If it's a complaint, set conversation status to DISPUTED
        status: body.isComplaint ? 'DISPUTED' : undefined,
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
   * 
   * Security measures:
   * - JWT required (class-level guard)
   * - Extension whitelist
   * - Magic bytes validation (prevents extension spoofing)
   * - Crypto-random filenames (prevents URL guessing)
   * - Filename sanitization (prevents path traversal)
   * - File size limit: 10MB per file, max 5 files
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
          cb(new BadRequestException('Loại file không được hỗ trợ. Chỉ chấp nhận: ảnh, pdf, doc, txt, zip'), false);
        }
      },
    }),
  )
  async uploadFiles(@UploadedFiles() files: any[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Không có file nào được upload');
    }

    const fs = require('fs');
    const crypto = require('crypto');
    const validatedAttachments: any[] = [];

    for (const file of files) {
      const ext = extname(file.originalname).toLowerCase();

      // Validate magic bytes for binary formats to prevent extension spoofing
      try {
        const buffer = fs.readFileSync(file.path);
        const isValid = this.validateFileContent(buffer, ext);
        if (!isValid) {
          // Remove invalid file
          try { fs.unlinkSync(file.path); } catch { }
          continue; // Skip this file silently
        }
      } catch (err) {
        try { fs.unlinkSync(file.path); } catch { }
        continue;
      }

      // Sanitize original filename (remove path traversal, special chars)
      const sanitizedName = file.originalname
        .replace(/[^\w\s\-\.]/gi, '_')  // Replace special chars
        .replace(/\.{2,}/g, '.')        // Remove double dots (path traversal)
        .replace(/^\.+/, '')            // Remove leading dots
        .substring(0, 100);             // Limit length

      validatedAttachments.push({
        url: `/uploads/chat/${file.filename}`,
        type: file.mimetype,
        name: sanitizedName || `file${ext}`,
        size: file.size,
      });
    }

    if (validatedAttachments.length === 0) {
      throw new BadRequestException('Không có file hợp lệ. Vui lòng kiểm tra định dạng file.');
    }

    return { success: true, attachments: validatedAttachments };
  }

  /**
   * Validate file content by checking magic bytes
   * Prevents attacks where malicious files are renamed with safe extensions
   */
  private validateFileContent(buffer: Buffer, ext: string): boolean {
    // For text-based formats, verify they don't contain binary/executable content
    const textExtensions = ['.txt', '.doc', '.docx'];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

    if (imageExtensions.includes(ext)) {
      // Check image magic bytes
      const jpgMagic = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
      const pngMagic = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
      const gifMagic = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
      const webpMagic = buffer.length > 11 &&
        buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;

      switch (ext) {
        case '.jpg': case '.jpeg': return jpgMagic;
        case '.png': return pngMagic;
        case '.gif': return gifMagic;
        case '.webp': return webpMagic;
      }
    }

    if (ext === '.pdf') {
      // PDF starts with %PDF
      return buffer.length > 4 && buffer.toString('utf8', 0, 5) === '%PDF-';
    }

    if (ext === '.zip' || ext === '.docx') {
      // ZIP/DOCX starts with PK (0x50, 0x4B)
      return buffer.length > 1 && buffer[0] === 0x50 && buffer[1] === 0x4B;
    }

    if (ext === '.doc') {
      // DOC starts with D0 CF 11 E0 (OLE2 compound document)
      return buffer.length > 3 && buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0;
    }

    if (ext === '.txt') {
      // For .txt: ensure it's actually text content (no null bytes in first 8KB)
      const checkLength = Math.min(buffer.length, 8192);
      for (let i = 0; i < checkLength; i++) {
        if (buffer[i] === 0x00) {
          return false; // Contains null bytes = likely binary
        }
      }
      // Also check for common executable signatures disguised as .txt
      const header = buffer.toString('utf8', 0, Math.min(buffer.length, 20));
      if (header.startsWith('MZ') || header.startsWith('\x7fELF')) {
        return false; // Windows EXE or Linux ELF binary
      }
      return true;
    }

    // Default: allow (already passed extension check)
    return true;
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

  /**
   * Mark conversation as complete (both parties must confirm after resolution)
   * POST /chat/conversations/:id/complete
   */
  @Post('conversations/:id/complete')
  async markComplete(@Param('id') conversationId: string, @Request() req) {
    const conversation = await this.chatService.markConversationComplete(
      conversationId,
      req.user.id,
      req.user.role,
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

  /**
   * Get conversation stats
   * GET /chat/stats
   */
  @Get('stats')
  async getStats(@Request() req) {
    const stats = await this.chatService.getConversationStats(req.user.id, req.user.role);
    return { success: true, ...stats };
  }

  /**
   * Get pinned message in conversation
   * GET /chat/conversations/:id/pinned
   */
  @Get('conversations/:id/pinned')
  async getPinnedMessage(@Param('id') conversationId: string) {
    const message = await this.chatService.getPinnedMessage(conversationId);
    return { success: true, message };
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

  // ============================================
  // CHAT MODERATION ENDPOINTS (ADMIN)
  // ============================================

  /**
   * Get chat violations (admin only)
   * GET /chat/admin/violations
   */
  @Get('admin/violations')
  async getViolations(
    @Request() req,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new BadRequestException('Admin only');
    }
    const result = await this.chatModerationService.getViolations({
      userId,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
    return { success: true, ...result };
  }

  /**
   * Get user violation stats (admin only)
   * GET /chat/admin/violations/user/:userId
   */
  @Get('admin/violations/user/:userId')
  async getUserViolationStats(@Param('userId') userId: string, @Request() req) {
    if (req.user.role !== 'ADMIN') {
      throw new BadRequestException('Admin only');
    }
    const stats = await this.chatModerationService.getUserViolationStats(userId);
    return { success: true, stats };
  }

  /**
   * Unlock user chat (admin only)
   * POST /chat/admin/unlock/:userId
   */
  @Post('admin/unlock/:userId')
  async unlockUserChat(@Param('userId') userId: string, @Request() req) {
    if (req.user.role !== 'ADMIN') {
      throw new BadRequestException('Admin only');
    }
    await this.chatModerationService.unlockUserChat(userId, req.user.id);
    return { success: true, message: 'User chat unlocked successfully' };
  }

  /**
   * Analyze message for violations (testing endpoint, admin only)
   * POST /chat/admin/analyze-message
   */
  @Post('admin/analyze-message')
  async analyzeMessage(@Body() body: { content: string }, @Request() req) {
    if (req.user.role !== 'ADMIN') {
      throw new BadRequestException('Admin only');
    }
    const result = this.chatModerationService.analyzeMessage(body.content);
    return { success: true, result };
  }
}
