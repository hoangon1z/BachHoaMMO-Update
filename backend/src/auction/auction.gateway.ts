import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

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
  namespace: '/auction',
})
export class AuctionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AuctionGateway.name);

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from various sources
      const token =
        (client.handshake.query.token as string) ||
        (client.handshake.auth.token as string) ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn('[Auction] Client connected without token');
        // Allow connection but without user context (public viewing)
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub || payload.id;
      client.userRole = payload.role;
      client.userName = payload.name;

      // Join user-specific room
      if (client.userId) {
        client.join(`seller:${client.userId}`);
      }

      this.logger.log(`[Auction] Client connected: ${client.userId || 'anonymous'}`);
    } catch (error) {
      this.logger.warn('[Auction] Invalid token, allowing anonymous connection');
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`[Auction] Client disconnected: ${client.userId || 'anonymous'}`);
  }

  /**
   * Join auction room for real-time updates
   */
  @SubscribeMessage('auction:join')
  handleJoinAuction(@ConnectedSocket() client: AuthenticatedSocket) {
    client.join('auction:live');
    this.logger.log(`[Auction] Client ${client.userId || 'anonymous'} joined auction room`);
    return { success: true };
  }

  /**
   * Leave auction room
   */
  @SubscribeMessage('auction:leave')
  handleLeaveAuction(@ConnectedSocket() client: AuthenticatedSocket) {
    client.leave('auction:live');
    return { success: true };
  }

  // ============================================
  // SERVER-TO-CLIENT EVENTS
  // ============================================

  /**
   * Broadcast auction update (new bid)
   */
  broadcastAuctionUpdate(auction: any) {
    this.server.to('auction:live').emit('auction:update', { auction });
    this.logger.log('[Auction] Broadcasted auction update');
  }

  /**
   * Notify seller they were outbid
   */
  notifyOutbid(sellerId: string, position: number, newAmount: number, newBidderName: string) {
    this.server.to(`seller:${sellerId}`).emit('auction:outbid', {
      position,
      newAmount,
      newBidderName,
      message: `Bạn đã bị vượt giá ở vị trí #${position}!`,
    });
    this.logger.log(`[Auction] Notified seller ${sellerId} of outbid`);
  }

  /**
   * Notify seller they won
   */
  notifyWinner(sellerId: string, position: number, amount: number) {
    this.server.to(`seller:${sellerId}`).emit('auction:winner', {
      position,
      amount,
      message: `Chúc mừng! Bạn đã thắng đấu giá vị trí #${position}!`,
    });
    this.logger.log(`[Auction] Notified seller ${sellerId} of winning position ${position}`);
  }

  /**
   * Broadcast auction ended
   */
  broadcastAuctionEnded(winners: any[]) {
    this.server.to('auction:live').emit('auction:ended', { winners });
    this.logger.log('[Auction] Broadcasted auction ended');
  }

  /**
   * Broadcast to all connected clients (for admin monitoring)
   */
  broadcastToAdmins(event: string, data: any) {
    this.server.emit(event, data);
  }
}
