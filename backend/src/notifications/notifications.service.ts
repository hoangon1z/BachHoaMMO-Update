import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationType = 'WELCOME' | 'ADMIN' | 'ORDER' | 'COMPLAINT' | 'SYSTEM' | 'PROMOTION' | 'AUCTION';

interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  icon?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a notification for a user
   */
  async create(data: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link,
        icon: data.icon,
      },
    });

    this.logger.log(`Created notification for user ${data.userId}: ${data.title}`);
    return notification;
  }

  /**
   * Create notifications for multiple users
   */
  async createMany(userIds: string[], data: Omit<CreateNotificationDto, 'userId'>) {
    const notifications = await this.prisma.notification.createMany({
      data: userIds.map(userId => ({
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link,
        icon: data.icon,
      })),
    });

    this.logger.log(`Created ${notifications.count} notifications: ${data.title}`);
    return notifications;
  }

  /**
   * Create notification for all users (admin broadcast)
   */
  async broadcast(data: Omit<CreateNotificationDto, 'userId'>) {
    const users = await this.prisma.user.findMany({
      select: { id: true },
    });

    return this.createMany(users.map(u => u.id), data);
  }

  /**
   * Get notifications for a user
   */
  async getByUserId(userId: string, options?: { skip?: number; take?: number; unreadOnly?: boolean }) {
    const { skip = 0, take = 20, unreadOnly = false } = options || {};

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: {
          userId,
          ...(unreadOnly && { isRead: false }),
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.notification.count({
        where: { userId },
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return { notifications, total, unreadCount };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * Delete a notification
   */
  async delete(notificationId: string, userId: string) {
    return this.prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  // ============================================
  // HELPER METHODS FOR COMMON NOTIFICATIONS
  // ============================================

  /**
   * Send welcome notification to new user
   */
  async sendWelcome(userId: string, userName: string) {
    return this.create({
      userId,
      type: 'WELCOME',
      title: 'Chào mừng đến BachHoaMMO!',
      message: `Xin chào ${userName}, chúc bạn có trải nghiệm mua sắm tuyệt vời!`,
      link: '/profile',
      icon: 'PartyPopper',
    });
  }

  /**
   * Send order notification
   */
  async sendOrderNotification(userId: string, orderId: string, status: string) {
    const statusMessages: Record<string, { title: string; message: string }> = {
      COMPLETED: {
        title: 'Đơn hàng hoàn thành!',
        message: 'Đơn hàng của bạn đã được giao thành công.',
      },
      PROCESSING: {
        title: 'Đơn hàng đang xử lý',
        message: 'Đơn hàng của bạn đang được xử lý.',
      },
      CANCELLED: {
        title: 'Đơn hàng đã hủy',
        message: 'Đơn hàng của bạn đã bị hủy. Tiền đã được hoàn lại.',
      },
      REFUNDED: {
        title: 'Đã hoàn tiền',
        message: 'Đơn hàng đã được hoàn tiền thành công.',
      },
    };

    const content = statusMessages[status] || {
      title: 'Cập nhật đơn hàng',
      message: `Đơn hàng của bạn đã được cập nhật: ${status}`,
    };

    return this.create({
      userId,
      type: 'ORDER',
      title: content.title,
      message: content.message,
      link: `/orders/${orderId}`,
      icon: 'Package',
    });
  }

  /**
   * Send complaint notification
   */
  async sendComplaintNotification(userId: string, complaintId: string, status: string, message?: string) {
    const content = message || `Khiếu nại của bạn đã được cập nhật: ${status}`;
    
    return this.create({
      userId,
      type: 'COMPLAINT',
      title: 'Cập nhật khiếu nại',
      message: content,
      link: `/complaints/${complaintId}`,
      icon: 'MessageSquare',
    });
  }

  /**
   * Send admin announcement
   */
  async sendAdminAnnouncement(title: string, message: string, link?: string) {
    return this.broadcast({
      type: 'ADMIN',
      title,
      message,
      link,
      icon: 'Megaphone',
    });
  }
}
