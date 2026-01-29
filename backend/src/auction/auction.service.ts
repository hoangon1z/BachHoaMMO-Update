import { Injectable, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { AuctionGateway } from './auction.gateway';

@Injectable()
export class AuctionService {
  private readonly logger = new Logger(AuctionService.name);

  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
    @Inject(forwardRef(() => AuctionGateway))
    private auctionGateway: AuctionGateway,
  ) {}

  /**
   * Get current week number and year
   */
  private getWeekInfo(date = new Date()): { weekNumber: number; year: number } {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNumber = 1 + Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    );
    return { weekNumber, year: d.getFullYear() };
  }

  /**
   * Calculate next auction end time (Sunday at configured hour)
   */
  private async getNextAuctionEndTime(): Promise<Date> {
    const settings = await this.settingsService.getAuctionSettings();
    const now = new Date();
    const endDay = settings.endDay; // 0 = Sunday
    const endHour = settings.endHour;

    const daysUntilEnd = (endDay - now.getDay() + 7) % 7;
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + (daysUntilEnd === 0 && now.getHours() >= endHour ? 7 : daysUntilEnd));
    endDate.setHours(endHour, 0, 0, 0);
    
    return endDate;
  }

  /**
   * Get or create current week's auction
   */
  async getCurrentAuction() {
    const { weekNumber, year } = this.getWeekInfo();
    
    let auction = await this.prisma.auction.findUnique({
      where: { weekNumber_year: { weekNumber, year } },
      include: {
        bids: {
          include: {
            seller: {
              include: { sellerProfile: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!auction) {
      const endTime = await this.getNextAuctionEndTime();
      const startTime = new Date();
      
      auction = await this.prisma.auction.create({
        data: {
          weekNumber,
          year,
          startTime,
          endTime,
          status: 'ACTIVE',
        },
        include: {
          bids: {
            include: {
              seller: {
                include: { sellerProfile: true },
              },
            },
          },
        },
      });
    }

    return this.formatAuctionResponse(auction);
  }

  /**
   * Format auction response with current highest bids
   */
  private formatAuctionResponse(auction: any) {
    const positions = [1, 2, 3].map(pos => {
      const bids = auction.bids
        .filter(b => b.position === pos && b.status === 'ACTIVE')
        .sort((a, b) => b.amount - a.amount);
      
      const highestBid = bids[0];
      
      return {
        position: pos,
        highestBid: highestBid ? {
          id: highestBid.id,
          amount: highestBid.amount,
          sellerId: highestBid.sellerId,
          shopName: highestBid.seller?.sellerProfile?.shopName || 'Unknown Shop',
          shopLogo: highestBid.seller?.sellerProfile?.shopLogo,
          createdAt: highestBid.createdAt,
        } : null,
        bidCount: bids.length,
      };
    });

    return {
      id: auction.id,
      weekNumber: auction.weekNumber,
      year: auction.year,
      startTime: auction.startTime,
      endTime: auction.endTime,
      status: auction.status,
      positions,
      totalBids: auction.bids.length,
    };
  }

  /**
   * Get auction by ID
   */
  async getAuction(auctionId: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        bids: {
          include: {
            seller: {
              include: { sellerProfile: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!auction) {
      throw new BadRequestException('Auction not found');
    }

    return this.formatAuctionResponse(auction);
  }

  /**
   * Get bid history for auction
   */
  async getBidHistory(auctionId: string, limit = 20) {
    const bids = await this.prisma.auctionBid.findMany({
      where: { auctionId },
      include: {
        seller: {
          include: { sellerProfile: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return bids.map(bid => ({
      id: bid.id,
      position: bid.position,
      amount: bid.amount,
      status: bid.status,
      shopName: bid.seller?.sellerProfile?.shopName || 'Unknown Shop',
      createdAt: bid.createdAt,
    }));
  }

  /**
   * Place a bid
   */
  async placeBid(sellerId: string, position: number, amount: number) {
    const settings = await this.settingsService.getAuctionSettings();
    const auction = await this.getCurrentAuction();

    // Check auction is active
    if (auction.status !== 'ACTIVE') {
      throw new BadRequestException('Đấu giá đã kết thúc');
    }

    // Check auction hasn't ended
    if (new Date() > new Date(auction.endTime)) {
      throw new BadRequestException('Đấu giá đã kết thúc');
    }

    // Check position is valid
    if (position < 1 || position > 3) {
      throw new BadRequestException('Vị trí không hợp lệ (1-3)');
    }

    // Get current highest bid for this position
    const currentPosition = auction.positions.find(p => p.position === position);
    const currentHighest = currentPosition?.highestBid?.amount || 0;

    // Check bid amount
    const minBid = currentHighest > 0 
      ? currentHighest + settings.minIncrement 
      : settings.startPrice;

    if (amount < minBid) {
      throw new BadRequestException(
        `Giá đặt tối thiểu là ${minBid.toLocaleString('vi-VN')}đ`
      );
    }

    // Get seller and check balance
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      include: { sellerProfile: true },
    });

    if (!seller || !seller.isSeller) {
      throw new BadRequestException('Bạn phải là seller để đấu giá');
    }

    // Check if seller already has an active bid on this position
    const existingBid = await this.prisma.auctionBid.findFirst({
      where: {
        auctionId: auction.id,
        sellerId,
        position,
        status: 'ACTIVE',
      },
    });

    // Calculate how much more to hold
    const previousHold = existingBid?.heldAmount || 0;
    const additionalHold = amount - previousHold;

    if (seller.balance < additionalHold) {
      throw new BadRequestException(
        `Số dư không đủ. Cần thêm ${additionalHold.toLocaleString('vi-VN')}đ`
      );
    }

    // Transaction: create bid, hold balance, update previous highest
    const result = await this.prisma.$transaction(async (tx) => {
      // Hold additional balance from seller
      if (additionalHold > 0) {
        await tx.user.update({
          where: { id: sellerId },
          data: { balance: { decrement: additionalHold } },
        });
      }

      // If seller had previous bid, update it instead of creating new
      let newBid;
      if (existingBid) {
        newBid = await tx.auctionBid.update({
          where: { id: existingBid.id },
          data: {
            amount,
            heldAmount: amount,
            status: 'ACTIVE',
          },
        });
      } else {
        newBid = await tx.auctionBid.create({
          data: {
            auctionId: auction.id,
            sellerId,
            position,
            amount,
            heldAmount: amount,
            status: 'ACTIVE',
          },
        });
      }

      // Mark previous highest bidder as OUTBID (if different seller)
      if (currentPosition?.highestBid && currentPosition.highestBid.sellerId !== sellerId) {
        await tx.auctionBid.updateMany({
          where: {
            auctionId: auction.id,
            position,
            status: 'ACTIVE',
            sellerId: { not: sellerId },
          },
          data: { status: 'OUTBID' },
        });

        // Refund the outbid seller
        const outbidBid = await tx.auctionBid.findFirst({
          where: {
            auctionId: auction.id,
            position,
            status: 'OUTBID',
            sellerId: currentPosition.highestBid.sellerId,
          },
        });

        if (outbidBid && outbidBid.heldAmount > 0) {
          await tx.user.update({
            where: { id: outbidBid.sellerId },
            data: { balance: { increment: outbidBid.heldAmount } },
          });
          
          await tx.auctionBid.update({
            where: { id: outbidBid.id },
            data: { heldAmount: 0 },
          });
        }
      }

      return newBid;
    });

    // Get updated auction state
    const updatedAuction = await this.getCurrentAuction();
    
    // Broadcast real-time update
    this.auctionGateway.broadcastAuctionUpdate(updatedAuction);
    
    // Notify outbid seller if exists
    if (currentPosition?.highestBid && currentPosition.highestBid.sellerId !== sellerId) {
      this.auctionGateway.notifyOutbid(
        currentPosition.highestBid.sellerId,
        position,
        amount,
        seller.sellerProfile?.shopName || 'Một người bán'
      );
    }

    // Return updated auction state
    return {
      bid: result,
      auction: updatedAuction,
      outbidSellerId: currentPosition?.highestBid?.sellerId !== sellerId 
        ? currentPosition?.highestBid?.sellerId 
        : null,
    };
  }

  /**
   * Get seller's bids for current auction
   */
  async getSellerBids(sellerId: string) {
    const auction = await this.getCurrentAuction();
    
    const bids = await this.prisma.auctionBid.findMany({
      where: {
        auctionId: auction.id,
        sellerId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return bids;
  }

  /**
   * Finalize auction - called by cron job or admin
   */
  async finalizeAuction(auctionId?: string) {
    const auction = auctionId 
      ? await this.prisma.auction.findUnique({
          where: { id: auctionId },
          include: { bids: true },
        })
      : await this.prisma.auction.findFirst({
          where: { status: 'ACTIVE' },
          include: { bids: true },
          orderBy: { endTime: 'asc' },
        });

    if (!auction) {
      this.logger.log('No active auction to finalize');
      return null;
    }

    this.logger.log(`Finalizing auction ${auction.id} (Week ${auction.weekNumber}/${auction.year})`);

    await this.prisma.$transaction(async (tx) => {
      // Process each position
      for (const position of [1, 2, 3]) {
        const bids = auction.bids
          .filter(b => b.position === position)
          .sort((a, b) => b.amount - a.amount);

        if (bids.length > 0) {
          const winner = bids[0];
          
          // Mark winner
          await tx.auctionBid.update({
            where: { id: winner.id },
            data: { status: 'WON', heldAmount: 0 }, // Money is now permanently deducted
          });

          // Mark losers and refund
          for (const loser of bids.slice(1)) {
            if (loser.heldAmount > 0) {
              await tx.user.update({
                where: { id: loser.sellerId },
                data: { balance: { increment: loser.heldAmount } },
              });
            }
            
            await tx.auctionBid.update({
              where: { id: loser.id },
              data: { status: 'LOST', heldAmount: 0 },
            });
          }
        }
      }

      // Mark auction as ended
      await tx.auction.update({
        where: { id: auction.id },
        data: { status: 'ENDED' },
      });
    });

    this.logger.log(`Auction ${auction.id} finalized successfully`);

    // Create next week's auction
    const { weekNumber, year } = this.getWeekInfo(new Date(auction.endTime.getTime() + 86400000));
    const existingNext = await this.prisma.auction.findUnique({
      where: { weekNumber_year: { weekNumber, year } },
    });

    if (!existingNext) {
      const endTime = await this.getNextAuctionEndTime();
      await this.prisma.auction.create({
        data: {
          weekNumber,
          year,
          startTime: new Date(),
          endTime,
          status: 'ACTIVE',
        },
      });
      this.logger.log(`Created next auction for week ${weekNumber}/${year}`);
    }

    return auction;
  }

  /**
   * Get current winners for homepage
   */
  async getCurrentWinners() {
    // Get last ended auction
    const auction = await this.prisma.auction.findFirst({
      where: { status: 'ENDED' },
      orderBy: { endTime: 'desc' },
      include: {
        bids: {
          where: { status: 'WON' },
          include: {
            seller: {
              include: { sellerProfile: true },
            },
          },
        },
      },
    });

    if (!auction) {
      return [];
    }

    return auction.bids
      .map(bid => ({
        position: bid.position,
        sellerId: bid.sellerId,
        shopName: bid.seller?.sellerProfile?.shopName || 'Unknown Shop',
        shopLogo: bid.seller?.sellerProfile?.shopLogo,
        shopDescription: bid.seller?.sellerProfile?.shopDescription,
        rating: bid.seller?.sellerProfile?.rating || 0,
        totalSales: bid.seller?.sellerProfile?.totalSales || 0,
        amount: bid.amount,
      }))
      .sort((a, b) => a.position - b.position);
  }

  /**
   * Get all auctions (admin)
   */
  async getAllAuctions(skip = 0, take = 20) {
    const [auctions, total] = await Promise.all([
      this.prisma.auction.findMany({
        include: {
          bids: {
            where: { status: 'WON' },
            include: {
              seller: {
                include: { sellerProfile: true },
              },
            },
          },
          _count: { select: { bids: true } },
        },
        orderBy: { endTime: 'desc' },
        skip,
        take,
      }),
      this.prisma.auction.count(),
    ]);

    return {
      auctions: auctions.map(a => ({
        id: a.id,
        weekNumber: a.weekNumber,
        year: a.year,
        startTime: a.startTime,
        endTime: a.endTime,
        status: a.status,
        totalBids: a._count.bids,
        winners: a.bids.map(b => ({
          position: b.position,
          shopName: b.seller?.sellerProfile?.shopName,
          amount: b.amount,
        })),
        revenue: a.bids.reduce((sum, b) => sum + b.amount, 0),
      })),
      total,
      page: Math.floor(skip / take) + 1,
      totalPages: Math.ceil(total / take),
    };
  }

  /**
   * Cancel auction (admin)
   */
  async cancelAuction(auctionId: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: { bids: true },
    });

    if (!auction) {
      throw new BadRequestException('Auction not found');
    }

    if (auction.status !== 'ACTIVE') {
      throw new BadRequestException('Can only cancel active auctions');
    }

    await this.prisma.$transaction(async (tx) => {
      // Refund all bids
      for (const bid of auction.bids) {
        if (bid.heldAmount > 0) {
          await tx.user.update({
            where: { id: bid.sellerId },
            data: { balance: { increment: bid.heldAmount } },
          });
          
          await tx.auctionBid.update({
            where: { id: bid.id },
            data: { status: 'LOST', heldAmount: 0 },
          });
        }
      }

      // Mark auction as cancelled
      await tx.auction.update({
        where: { id: auctionId },
        data: { status: 'CANCELLED' },
      });
    });

    return { success: true };
  }
}
