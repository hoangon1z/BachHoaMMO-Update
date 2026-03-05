import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

interface AuthenticatedSocket extends Socket {
    userId?: string;
}

/**
 * Payment WebSocket Gateway
 * 
 * Provides real-time payment confirmation to frontend.
 * When PayOS webhook confirms a payment, this gateway pushes
 * the result directly to the user's browser — no polling needed.
 * 
 * Namespace: /payment
 * Events emitted:
 *   - payment:confirmed  { orderCode, amount, message }
 *   - payment:error      { orderCode, message }
 */
@WebSocketGateway({
    cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
        credentials: true,
    },
    namespace: '/payment',
})
export class PaymentGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(PaymentGateway.name);

    // Map userId → Set<socketId> (user can have multiple tabs)
    private userSockets: Map<string, Set<string>> = new Map();

    constructor(private jwtService: JwtService) { }

    async handleConnection(client: AuthenticatedSocket) {
        try {
            // Extract JWT token from handshake
            const token =
                client.handshake.auth?.token ||
                client.handshake.query?.token ||
                client.handshake.headers?.authorization?.replace('Bearer ', '');

            if (!token) {
                this.logger.warn(`Payment WS: No token — disconnecting ${client.id}`);
                client.disconnect();
                return;
            }

            // Verify JWT
            const payload = this.jwtService.verify(token as string);
            client.userId = payload.sub || payload.id;

            if (!client.userId) {
                client.disconnect();
                return;
            }

            // Register socket
            if (!this.userSockets.has(client.userId)) {
                this.userSockets.set(client.userId, new Set());
            }
            this.userSockets.get(client.userId)!.add(client.id);

            // Join user-specific room for targeted broadcasts
            client.join(`user:${client.userId}`);

            this.logger.log(`Payment WS: User ${client.userId} connected (${client.id})`);
        } catch (error) {
            this.logger.warn(`Payment WS: Auth failed — ${error.message}`);
            client.disconnect();
        }
    }

    handleDisconnect(client: AuthenticatedSocket) {
        if (client.userId) {
            const sockets = this.userSockets.get(client.userId);
            if (sockets) {
                sockets.delete(client.id);
                if (sockets.size === 0) {
                    this.userSockets.delete(client.userId);
                }
            }
            this.logger.log(`Payment WS: User ${client.userId} disconnected (${client.id})`);
        }
    }

    /**
     * Push payment confirmation to a specific user
     * Called by PayOSService after successful webhook processing
     */
    notifyPaymentConfirmed(userId: string, data: {
        orderCode: number;
        amount: number;
        message: string;
    }) {
        const room = `user:${userId}`;
        this.server.to(room).emit('payment:confirmed', data);
        this.logger.log(`Payment WS: Sent confirmation to user ${userId} — orderCode: ${data.orderCode}`);
    }

    /**
     * Push payment error to a specific user
     */
    notifyPaymentError(userId: string, data: {
        orderCode: number;
        message: string;
    }) {
        const room = `user:${userId}`;
        this.server.to(room).emit('payment:error', data);
    }

    /**
     * Check if user is currently connected
     */
    isUserOnline(userId: string): boolean {
        return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
    }
}
