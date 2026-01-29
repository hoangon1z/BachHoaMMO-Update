import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  /**
   * Get user's notifications
   * GET /notifications
   */
  @Get()
  async getNotifications(
    @Request() req,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const result = await this.notificationsService.getByUserId(req.user.id, {
      skip: skip ? parseInt(skip) : 0,
      take: take ? parseInt(take) : 20,
      unreadOnly: unreadOnly === 'true',
    });

    return { success: true, ...result };
  }

  /**
   * Get unread count
   * GET /notifications/unread-count
   */
  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { success: true, count };
  }

  /**
   * Mark notification as read
   * POST /notifications/:id/read
   */
  @Post(':id/read')
  async markAsRead(@Request() req, @Param('id') id: string) {
    await this.notificationsService.markAsRead(id, req.user.id);
    return { success: true };
  }

  /**
   * Mark all notifications as read
   * POST /notifications/read-all
   */
  @Post('read-all')
  async markAllAsRead(@Request() req) {
    await this.notificationsService.markAllAsRead(req.user.id);
    return { success: true };
  }

  /**
   * Delete notification
   * DELETE /notifications/:id
   */
  @Delete(':id')
  async deleteNotification(@Request() req, @Param('id') id: string) {
    await this.notificationsService.delete(id, req.user.id);
    return { success: true };
  }
}

// ============================================
// ADMIN NOTIFICATIONS CONTROLLER
// ============================================

@Controller('admin/notifications')
@UseGuards(JwtAuthGuard)
export class AdminNotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  /**
   * Send announcement to all users
   * POST /admin/notifications/broadcast
   */
  @Post('broadcast')
  async broadcast(
    @Body() body: { title: string; message: string; link?: string },
  ) {
    const result = await this.notificationsService.sendAdminAnnouncement(
      body.title,
      body.message,
      body.link,
    );
    return { success: true, count: result.count };
  }

  /**
   * Send notification to specific user
   * POST /admin/notifications/send
   */
  @Post('send')
  async sendToUser(
    @Body() body: { userId: string; title: string; message: string; link?: string },
  ) {
    const notification = await this.notificationsService.create({
      userId: body.userId,
      type: 'ADMIN',
      title: body.title,
      message: body.message,
      link: body.link,
      icon: 'Bell',
    });
    return { success: true, notification };
  }
}
