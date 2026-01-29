import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get user wallet balance
   */
  async getBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Calculate pending balance (money in escrow for sellers)
    const pendingEscrows = await this.prisma.escrow.findMany({
      where: {
        sellerId: userId,
        status: 'HOLDING',
      },
    });

    const pendingBalance = pendingEscrows.reduce((sum, escrow) => sum + escrow.amount, 0);

    return {
      balance: user.balance,
      pendingBalance,
    };
  }

  /**
   * Get transaction history
   */
  async getTransactions(userId: string, limit = 50) {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return { transactions };
  }

  /**
   * Create recharge request
   */
  async createRechargeRequest(userId: string, amount: number, metadata?: any) {
    if (amount < 10000) {
      throw new BadRequestException('Minimum recharge amount is 10,000 VND');
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        type: 'DEPOSIT',
        amount,
        status: 'PENDING',
        description: 'Nạp tiền vào ví',
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    return transaction;
  }

  /**
   * Approve recharge request (Admin only)
   */
  async approveRecharge(transactionId: string, adminId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.type !== 'DEPOSIT') {
      throw new BadRequestException('Only deposit transactions can be approved');
    }

    if (transaction.status !== 'PENDING') {
      throw new BadRequestException('Transaction already processed');
    }

    // Update transaction status and user balance in a transaction
    const [updatedTransaction, updatedUser] = await this.prisma.$transaction([
      this.prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'COMPLETED' },
      }),
      this.prisma.user.update({
        where: { id: transaction.userId },
        data: {
          balance: {
            increment: transaction.amount,
          },
        },
      }),
    ]);

    return { transaction: updatedTransaction, user: updatedUser };
  }

  /**
   * Reject recharge request (Admin only)
   */
  async rejectRecharge(transactionId: string, adminId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== 'PENDING') {
      throw new BadRequestException('Transaction already processed');
    }

    const updatedTransaction = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { status: 'REJECTED' },
    });

    return updatedTransaction;
  }

  /**
   * Deduct money from user wallet (for purchases)
   */
  async deductBalance(userId: string, amount: number, description: string, orderId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.balance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    // Deduct balance and create transaction
    const [updatedUser, transaction] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          balance: {
            decrement: amount,
          },
        },
      }),
      this.prisma.transaction.create({
        data: {
          userId,
          type: 'PURCHASE',
          amount,
          status: 'COMPLETED',
          description,
          orderId,
        },
      }),
    ]);

    return { user: updatedUser, transaction };
  }

  /**
   * Add money to seller after escrow release
   */
  async addBalance(userId: string, amount: number, description: string, orderId?: string) {
    const [updatedUser, transaction] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          balance: {
            increment: amount,
          },
        },
      }),
      this.prisma.transaction.create({
        data: {
          userId,
          type: 'EARNING',
          amount,
          status: 'COMPLETED',
          description,
          orderId,
        },
      }),
    ]);

    return { user: updatedUser, transaction };
  }
}
