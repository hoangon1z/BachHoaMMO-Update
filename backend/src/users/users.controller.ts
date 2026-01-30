import { Controller, Get, Post, Put, Body, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

// Ensure upload directory exists
const uploadDir = join(process.cwd(), 'uploads', 'avatars');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    const user = await this.usersService.findById(req.user.id);
    const { password: _, ...result } = user;
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(@Request() req, @Body() body: { name?: string; phone?: string; address?: string }) {
    const user = await this.usersService.updateProfile(req.user.id, body);
    const { password: _, ...result } = user;
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: uploadDir,
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `avatar-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const ext = extname(file.originalname).toLowerCase().slice(1);
        const mimetype = file.mimetype.split('/')[1];
        
        if (allowedTypes.test(ext) && allowedTypes.test(mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif, webp)'), false);
        }
      },
    }),
  )
  async uploadAvatar(@Request() req, @UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file ảnh');
    }

    const avatarUrl = `/uploads/avatars/${file.filename}`;
    const user = await this.usersService.updateAvatar(req.user.id, avatarUrl);
    const { password: _, ...result } = user;
    
    return {
      success: true,
      avatar: avatarUrl,
      user: result,
    };
  }

  // ==================== SELLER APPLICATION ====================

  @UseGuards(JwtAuthGuard)
  @Post('seller-application')
  async applyForSeller(
    @Request() req,
    @Body() body: {
      fullName: string;
      shopName: string;
      email: string;
      phone?: string;
      description?: string;
      agreement: boolean;
    },
  ) {
    return this.usersService.applyForSeller(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('seller-application')
  async getSellerApplication(@Request() req) {
    return this.usersService.getSellerApplication(req.user.id);
  }
}
