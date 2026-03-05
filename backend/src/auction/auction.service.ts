import { Injectable, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuctionGateway } from './auction.gateway';

@Injectable()
export class AuctionService {
  private readonly logger = new Logger(AuctionService.name);

  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => AuctionGateway))
    private auctionGateway: AuctionGateway,
  ) { }

  // ============================================
  // TIME HELPERS (Vietnam timezone UTC+7)
  // ============================================

  /**
   * Get current time in Vietnam timezone
   */
  private getNowVN(): Date {
    const now = new Date();
    return new Date(now.getTime() + 7 * 60 * 60 * 1000);
  }

  /**
   * Get day identifier (dayOfYear + year) for daily auctions
   * Uses Vietnam timezone (UTC+7)
   */
  private getDayIdentifier(date = new Date()): { dayNumber: number; year: number } {
    const vnDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const year = vnDate.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const diff = vnDate.getTime() - startOfYear.getTime();
    const dayNumber = Math.floor(diff / 86400000) + 1;
    return { dayNumber, year };
  }

  /**
   * Build a Date object from Vietnam timezone components
   * Input: year, month (0-based), day, hour, minute in Vietnam time
   * Output: UTC Date object
   */
  private buildVNDate(year: number, month: number, day: number, hour: number, minute: number): Date {
    const utcDate = new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
    // Subtract 7 hours to convert VN time → UTC
    return new Date(utcDate.getTime() - 7 * 60 * 60 * 1000);
  }

  /**
   * Calculate startTime and endTime for a given date based on settings
   */
  private async calculateAuctionTimes(date = new Date()): Promise<{ startTime: Date; endTime: Date }> {
    const settings = await this.settingsService.getAuctionSettings();
    const vnDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const year = vnDate.getUTCFullYear();
    const month = vnDate.getUTCMonth();
    const day = vnDate.getUTCDate();

    const startTime = this.buildVNDate(year, month, day, settings.startHour, settings.startMinute);
    let endTime = this.buildVNDate(year, month, day, settings.endHour, settings.endMinute);

    // If end time is before or equal to start time, assume end is next day
    if (endTime <= startTime) {
      endTime = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
    }

    return { startTime, endTime };
  }

  /**
   * Determine auction status based on current time
   */
  private getAuctionLiveStatus(auction: any): string {
    if (auction.status === 'ENDED' || auction.status === 'CANCELLED') {
      return auction.status;
    }
    const now = new Date();
    if (now < new Date(auction.startTime)) return 'PENDING';
    if (now >= new Date(auction.startTime) && now <= new Date(auction.endTime)) return 'ACTIVE';
    return 'ENDED'; // Past endTime but not yet finalized by cron
  }

  // ============================================
  // CORE AUCTION OPERATIONS
  // ============================================

  /**
   * Get current/latest auction.
   * If autoCreate is enabled and no auction exists for today, creates one automatically.
   * Returns null only when autoCreate is OFF and no auction exists.
   */
  async getCurrentAuction() {
    const { dayNumber, year } = this.getDayIdentifier();
    const now = new Date();

    // 1. Try to find today's auction (only if it's still relevant: ACTIVE or PENDING)
    let auction = await this.prisma.auction.findUnique({
      where: { weekNumber_year: { weekNumber: dayNumber, year } },
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

    // If today's auction is ENDED or CANCELLED, skip it — we want to show the next one
    if (auction && (auction.status === 'ENDED' || auction.status === 'CANCELLED')) {
      auction = null;
    }

    // 2. If no auction today, check for any ACTIVE one that hasn't ended yet
    if (!auction) {
      auction = await this.prisma.auction.findFirst({
        where: {
          status: 'ACTIVE',
          endTime: { gt: now }, // Only auctions that haven't ended
        },
        orderBy: { startTime: 'desc' },
        include: {
          bids: {
            include: {
              seller: { include: { sellerProfile: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    }

    // 2b. Auto-finalize any expired ACTIVE auctions from previous days
    const expiredAuctions = await this.prisma.auction.findMany({
      where: {
        status: 'ACTIVE',
        endTime: { lte: now },
      },
    });
    for (const expired of expiredAuctions) {
      this.logger.log(`Auto-finalizing expired auction ${expired.id} (endTime: ${expired.endTime.toISOString()})`);
      try {
        await this.finalizeAuction(expired.id);
      } catch (e) {
        this.logger.error(`Failed to finalize expired auction ${expired.id}:`, e);
      }
    }

    // 3. Still no auction → auto-create if setting is enabled
    if (!auction) {
      const settings = await this.settingsService.getAuctionSettings();
      if (settings.autoCreate) {
        const created = await this.autoCreateTodayAuction();
        if (created) {
          // Fetch the newly created auction with includes
          auction = await this.prisma.auction.findUnique({
            where: { weekNumber_year: { weekNumber: dayNumber, year } },
            include: {
              bids: {
                include: {
                  seller: { include: { sellerProfile: true } },
                },
                orderBy: { createdAt: 'desc' },
              },
            },
          });
        }
      }
    }

    if (!auction) return null;
    return this.formatAuctionResponse(auction);
  }

  /**
   * Auto-create today's auction (called by cron or getCurrentAuction if autoCreate is enabled)
   * If today's auction exists but is ENDED/CANCELLED, deletes it and creates a fresh one.
   */
  async autoCreateTodayAuction(): Promise<boolean> {
    const { dayNumber, year } = this.getDayIdentifier();

    // Check if already exists
    const existing = await this.prisma.auction.findUnique({
      where: { weekNumber_year: { weekNumber: dayNumber, year } },
    });

    if (existing) {
      // If any auction exists for today (regardless of status), don't create a new one.
      // NEVER delete finished auctions — they contain valuable bid history.
      this.logger.debug(`Auction already exists for day ${dayNumber}/${year} (status: ${existing.status}), skipping auto-create`);
      return false;
    }

    const { startTime, endTime } = await this.calculateAuctionTimes();

    await this.prisma.auction.create({
      data: {
        weekNumber: dayNumber,
        year,
        startTime,
        endTime,
        status: 'ACTIVE',
      },
    });

    this.logger.log(`Auto-created auction for day ${dayNumber}/${year} (${startTime.toISOString()} → ${endTime.toISOString()})`);
    return true;
  }

  /**
   * Admin creates an auction with specific date and times
   */
  async createAuction(params: {
    date: string;       // YYYY-MM-DD
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
  }) {
    const dateParts = params.date.split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1; // 0-based
    const day = parseInt(dateParts[2]);

    const startTime = this.buildVNDate(year, month, day, params.startHour, params.startMinute);
    let endTime = this.buildVNDate(year, month, day, params.endHour, params.endMinute);

    // If end time is before or equal to start time, end is next day
    if (endTime <= startTime) {
      endTime = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
    }

    // Calculate dayNumber for this date
    const { dayNumber } = this.getDayIdentifier(startTime);

    // Check duplicate
    const existing = await this.prisma.auction.findUnique({
      where: { weekNumber_year: { weekNumber: dayNumber, year } },
    });

    if (existing) {
      throw new BadRequestException(`Đã có phiên đấu giá cho ngày này (ID: ${existing.id})`);
    }

    const auction = await this.prisma.auction.create({
      data: {
        weekNumber: dayNumber,
        year,
        startTime,
        endTime,
        status: 'ACTIVE',
      },
      include: {
        bids: {
          include: {
            seller: { include: { sellerProfile: true } },
          },
        },
      },
    });

    this.logger.log(`Admin created auction for ${params.date}: ${startTime.toISOString()} → ${endTime.toISOString()}`);
    return this.formatAuctionResponse(auction);
  }

  /**
   * Admin updates auction times
   */
  async updateAuctionTimes(auctionId: string, params: {
    startHour?: number;
    startMinute?: number;
    endHour?: number;
    endMinute?: number;
  }) {
    const auction = await this.prisma.auction.findUnique({ where: { id: auctionId } });
    if (!auction) throw new BadRequestException('Không tìm thấy phiên đấu giá');

    // Get current times in VN
    const vnStartTime = new Date(auction.startTime.getTime() + 7 * 60 * 60 * 1000);
    const year = vnStartTime.getUTCFullYear();
    const month = vnStartTime.getUTCMonth();
    const day = vnStartTime.getUTCDate();

    const newStartHour = params.startHour ?? vnStartTime.getUTCHours();
    const newStartMinute = params.startMinute ?? vnStartTime.getUTCMinutes();
    const newEndHour = params.endHour ?? new Date(auction.endTime.getTime() + 7 * 60 * 60 * 1000).getUTCHours();
    const newEndMinute = params.endMinute ?? new Date(auction.endTime.getTime() + 7 * 60 * 60 * 1000).getUTCMinutes();

    const startTime = this.buildVNDate(year, month, day, newStartHour, newStartMinute);
    let endTime = this.buildVNDate(year, month, day, newEndHour, newEndMinute);

    if (endTime <= startTime) {
      endTime = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
    }

    const updated = await this.prisma.auction.update({
      where: { id: auctionId },
      data: { startTime, endTime },
      include: {
        bids: {
          include: { seller: { include: { sellerProfile: true } } },
        },
      },
    });

    return this.formatAuctionResponse(updated);
  }

  /**
   * Format auction response for API
   * For each position (1-3), find the ACTIVE bid with highest amount
   */
  private formatAuctionResponse(auction: any) {
    const positions = [1, 2, 3].map(pos => {
      const activeBids = auction.bids
        .filter((b: any) => b.position === pos && b.status === 'ACTIVE')
        .sort((a: any, b: any) => b.amount - a.amount);

      const highestBid = activeBids[0];

      return {
        position: pos,
        highestBid: highestBid ? {
          id: highestBid.id,
          amount: highestBid.amount,
          sellerId: highestBid.sellerId,
          shopName: highestBid.seller?.sellerProfile?.shopName || 'Gian hàng',
          shopLogo: highestBid.seller?.sellerProfile?.shopLogo,
          insuranceLevel: highestBid.seller?.sellerProfile?.insuranceLevel || 0,
          insuranceTier: highestBid.seller?.sellerProfile?.insuranceTier || null,
          createdAt: highestBid.createdAt,
        } : null,
        bidCount: auction.bids.filter((b: any) => b.position === pos).length,
      };
    });

    // Determine live status (PENDING if before startTime, ACTIVE if in window, etc.)
    const liveStatus = this.getAuctionLiveStatus(auction);

    return {
      id: auction.id,
      weekNumber: auction.weekNumber, // dayNumber stored in weekNumber field
      year: auction.year,
      startTime: auction.startTime,
      endTime: auction.endTime,
      lastBidAt: auction.lastBidAt,
      status: liveStatus,
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
            seller: { include: { sellerProfile: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!auction) {
      throw new BadRequestException('Không tìm thấy phiên đấu giá');
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
        seller: { include: { sellerProfile: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return bids.map(bid => ({
      id: bid.id,
      position: bid.position,
      amount: bid.amount,
      status: bid.status,
      shopName: bid.seller?.sellerProfile?.shopName || 'Gian hàng',
      insuranceLevel: bid.seller?.sellerProfile?.insuranceLevel || 0,
      insuranceTier: bid.seller?.sellerProfile?.insuranceTier || null,
      createdAt: bid.createdAt,
    }));
  }

  // ============================================
  // BIDDING
  // ============================================

  /**
   * Place a bid.
   *
   * Flow:
   * 1. Validate auction is ACTIVE and within time window (startTime <= now <= endTime)
   * 2. Validate position (1-3)
   * 3. Validate seller is verified (has products)
   * 4. Calculate startPrice with insurance discount
   * 5. Validate bid >= minBid
   * 6. Check seller balance (accounting for held amounts on other positions)
   * 7. If seller already has ACTIVE bid at this position → update in-place
   * 8. If someone else leads → mark them OUTBID + refund
   * 9. All in one Prisma $transaction
   * 10. Optional cooldown extension
   * 11. Broadcast real-time + create persistent notification
   */
  async placeBid(sellerId: string, position: number, amount: number) {
    const settings = await this.settingsService.getAuctionSettings();

    // === 1. Get current auction ===
    const { dayNumber, year } = this.getDayIdentifier();
    const rawAuction = await this.prisma.auction.findUnique({
      where: { weekNumber_year: { weekNumber: dayNumber, year } },
      include: { bids: true },
    });

    if (!rawAuction) {
      throw new BadRequestException('Không có phiên đấu giá hôm nay');
    }

    // Check auction status from DB
    if (rawAuction.status === 'ENDED') {
      throw new BadRequestException('Phiên đấu giá đã kết thúc');
    }
    if (rawAuction.status === 'CANCELLED') {
      throw new BadRequestException('Phiên đấu giá đã bị hủy');
    }

    // Check time window
    const now = new Date();
    if (now < rawAuction.startTime) {
      const vnStart = new Date(rawAuction.startTime.getTime() + 7 * 60 * 60 * 1000);
      const h = vnStart.getUTCHours().toString().padStart(2, '0');
      const m = vnStart.getUTCMinutes().toString().padStart(2, '0');
      throw new BadRequestException(
        `Phiên đấu giá chưa mở. Bắt đầu lúc ${h}:${m} (giờ Việt Nam)`
      );
    }

    if (now > rawAuction.endTime) {
      throw new BadRequestException('Phiên đấu giá đã hết giờ');
    }

    // === 2. Validate position ===
    if (position < 1 || position > 3) {
      throw new BadRequestException('Vị trí không hợp lệ (1-3)');
    }

    // === 3. Get seller + validate ===
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      include: { sellerProfile: true },
    });

    if (!seller || !seller.isSeller) {
      throw new BadRequestException('Bạn phải là người bán để tham gia đấu giá');
    }

    const productCount = await this.prisma.product.count({
      where: { sellerId, status: 'ACTIVE' },
    });

    if (productCount === 0) {
      throw new BadRequestException(
        'Bạn cần có ít nhất 1 sản phẩm đang bán để tham gia đấu giá. Hãy đăng sản phẩm trước.'
      );
    }

    // === 4. Calculate startPrice with insurance discount ===
    const insuranceLevel = seller.sellerProfile?.insuranceLevel || 0;
    const insuranceDiscount = Math.min(insuranceLevel * 5, 25); // 0-25%
    const discountedStartPrice = Math.round(settings.startPrice * (100 - insuranceDiscount) / 100);

    // === 5. Validate bid amount ===
    const activeBidsForPosition = rawAuction.bids
      .filter(b => b.position === position && b.status === 'ACTIVE')
      .sort((a, b) => b.amount - a.amount);
    const currentHighest = activeBidsForPosition[0]?.amount || 0;

    const minBid = currentHighest > 0
      ? currentHighest + settings.minIncrement
      : discountedStartPrice;

    if (amount < minBid) {
      throw new BadRequestException(
        `Giá đặt tối thiểu là ${minBid.toLocaleString('vi-VN')}đ`
      );
    }

    // === 6. Check existing bid + balance ===
    const existingBidOnPosition = rawAuction.bids.find(
      b => b.sellerId === sellerId && b.position === position && b.status === 'ACTIVE'
    );

    const totalHeldOtherPositions = rawAuction.bids
      .filter(b => b.sellerId === sellerId && b.status === 'ACTIVE' && b.position !== position)
      .reduce((sum, b) => sum + b.heldAmount, 0);

    const previousHoldThisPosition = existingBidOnPosition?.heldAmount || 0;
    const additionalHoldNeeded = amount - previousHoldThisPosition;

    if (additionalHoldNeeded > 0 && seller.balance < additionalHoldNeeded) {
      const needed = additionalHoldNeeded - seller.balance;
      throw new BadRequestException(
        `Số dư không đủ. Cần thêm ${needed.toLocaleString('vi-VN')}đ (Số dư: ${seller.balance.toLocaleString('vi-VN')}đ, đang giữ ở vị trí khác: ${totalHeldOtherPositions.toLocaleString('vi-VN')}đ)`
      );
    }

    // === 7. Determine who gets outbid ===
    const currentLeader = activeBidsForPosition.find(b => b.sellerId !== sellerId);
    const outbidSellerId = currentLeader?.sellerId || null;

    // === 8. Execute atomic transaction ===
    const result = await this.prisma.$transaction(async (tx) => {
      // Deduct balance
      if (additionalHoldNeeded > 0) {
        await tx.user.update({
          where: { id: sellerId },
          data: { balance: { decrement: additionalHoldNeeded } },
        });
      }

      // Create or update bid
      let newBid;
      if (existingBidOnPosition) {
        newBid = await tx.auctionBid.update({
          where: { id: existingBidOnPosition.id },
          data: { amount, heldAmount: amount, status: 'ACTIVE' },
        });
      } else {
        newBid = await tx.auctionBid.create({
          data: {
            auctionId: rawAuction.id,
            sellerId,
            position,
            amount,
            heldAmount: amount,
            status: 'ACTIVE',
          },
        });
      }

      // Mark outbid bids
      const outbidBids = await tx.auctionBid.findMany({
        where: {
          auctionId: rawAuction.id,
          position,
          status: 'ACTIVE',
          sellerId: { not: sellerId },
        },
      });

      for (const outbid of outbidBids) {
        if (outbid.heldAmount > 0) {
          await tx.user.update({
            where: { id: outbid.sellerId },
            data: { balance: { increment: outbid.heldAmount } },
          });
        }
        await tx.auctionBid.update({
          where: { id: outbid.id },
          data: { status: 'OUTBID', heldAmount: 0 },
        });
      }

      return newBid;
    });

    // === 9. Cooldown extension ===
    const now2 = new Date();
    const updateData: any = { lastBidAt: now2 };

    if (settings.cooldownMinutes > 0) {
      const timeUntilEnd = rawAuction.endTime.getTime() - now2.getTime();
      const cooldownMs = settings.cooldownMinutes * 60 * 1000;

      // If bid is placed within the cooldown window before end → extend
      if (timeUntilEnd < cooldownMs) {
        updateData.endTime = new Date(now2.getTime() + cooldownMs);
        this.logger.log(`Auction ${rawAuction.id} extended by ${settings.cooldownMinutes} min (bid near end)`);
      }
    }

    await this.prisma.auction.update({
      where: { id: rawAuction.id },
      data: updateData,
    });

    // === 10. Get updated auction ===
    const updatedAuction = await this.getCurrentAuction();

    // === 11. Broadcast + notify ===
    try {
      this.auctionGateway.broadcastAuctionUpdate(updatedAuction);

      if (outbidSellerId) {
        const shopName = seller.sellerProfile?.shopName || 'Một người bán';

        this.auctionGateway.notifyOutbid(outbidSellerId, position, amount, shopName);

        await this.notificationsService.create({
          userId: outbidSellerId,
          type: 'AUCTION',
          title: 'Bạn đã bị vượt giá!',
          message: `${shopName} đã đặt ${amount.toLocaleString('vi-VN')}đ cho vị trí #${position}. Tiền đã hoàn vào ví. Đặt lại giá tại trang đấu giá.`,
          link: '/auction',
          icon: 'Gavel',
        });
      }
    } catch (e) {
      this.logger.warn('Failed to broadcast auction update:', e);
    }

    return {
      bid: result,
      auction: updatedAuction,
      outbidSellerId,
    };
  }

  /**
   * Get seller's bids for current auction
   */
  async getSellerBids(sellerId: string) {
    const auction = await this.getCurrentAuction();
    if (!auction) return [];
    return this.prisma.auctionBid.findMany({
      where: { auctionId: auction.id, sellerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============================================
  // FINALIZATION
  // ============================================

  /**
   * Finalize auction — called by cron or admin.
   *
   * Logic:
   * - Minimum 2 unique sellers must have participated to declare winners
   * - For each position: highest ACTIVE bid = WON, others = LOST (refunded)
   * - If < 2 sellers → cancel and refund all
   * - Creates next day's auction
   */
  async finalizeAuction(auctionId?: string) {
    const auction = auctionId
      ? await this.prisma.auction.findUnique({
        where: { id: auctionId },
        include: { bids: true },
      })
      : await this.prisma.auction.findFirst({
        where: { status: 'ACTIVE', endTime: { lte: new Date() } },
        include: { bids: true },
        orderBy: { endTime: 'asc' },
      });

    if (!auction) {
      this.logger.log('No auction to finalize');
      return null;
    }

    if (auction.status !== 'ACTIVE') {
      this.logger.warn(`Auction ${auction.id} is not ACTIVE (status: ${auction.status})`);
      return null;
    }

    this.logger.log(`Finalizing auction ${auction.id} (Day ${auction.weekNumber}/${auction.year})`);

    // Check minimum participation
    const uniqueSellers = new Set(auction.bids.map(b => b.sellerId));
    // Allow single participant to win (important for new platforms with few sellers)
    const hasEnoughParticipants = uniqueSellers.size >= 1;

    if (!hasEnoughParticipants) {
      this.logger.log(`Auction ${auction.id} has only ${uniqueSellers.size} seller(s) — cancelling`);

      await this.prisma.$transaction(async (tx) => {
        for (const bid of auction.bids) {
          if (bid.heldAmount > 0) {
            await tx.user.update({
              where: { id: bid.sellerId },
              data: { balance: { increment: bid.heldAmount } },
            });
          }
          await tx.auctionBid.update({
            where: { id: bid.id },
            data: { status: 'LOST', heldAmount: 0 },
          });
        }
        await tx.auction.update({
          where: { id: auction.id },
          data: { status: 'CANCELLED' },
        });
      });

      // Notify participants
      for (const sellerId of uniqueSellers) {
        try {
          await this.notificationsService.create({
            userId: sellerId,
            type: 'AUCTION',
            title: 'Phiên đấu giá bị hủy',
            message: `Phiên đấu giá đã bị hủy do không đủ người tham gia (tối thiểu 2 seller). Tiền đã được hoàn vào ví.`,
            link: '/auction',
            icon: 'Gavel',
          });
        } catch (e) {
          this.logger.warn(`Failed to notify seller ${sellerId}:`, e);
        }
      }

      await this.createNextAuction();
      return auction;
    }

    // === Has enough participants — process normally ===
    const winnerSellerIds: string[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const position of [1, 2, 3]) {
        const activeBids = auction.bids
          .filter(b => b.position === position && b.status === 'ACTIVE')
          .sort((a, b) => b.amount - a.amount);

        if (activeBids.length === 0) continue;

        // Winner = highest ACTIVE bid
        const winner = activeBids[0];
        await tx.auctionBid.update({
          where: { id: winner.id },
          data: { status: 'WON', heldAmount: 0 },
        });
        winnerSellerIds.push(winner.sellerId);

        // Refund losers
        for (const loser of activeBids.slice(1)) {
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

        // Safety net: refund any orphaned OUTBID bids with heldAmount > 0
        const orphanBids = auction.bids.filter(
          b => b.position === position && b.status !== 'ACTIVE' && b.heldAmount > 0
        );
        for (const orphan of orphanBids) {
          await tx.user.update({
            where: { id: orphan.sellerId },
            data: { balance: { increment: orphan.heldAmount } },
          });
          await tx.auctionBid.update({
            where: { id: orphan.id },
            data: { heldAmount: 0 },
          });
        }
      }

      // Mark auction as ended
      await tx.auction.update({
        where: { id: auction.id },
        data: { status: 'ENDED' },
      });
    });

    // === Notify winners & losers ===
    const wonBids = await this.prisma.auctionBid.findMany({
      where: { auctionId: auction.id, status: 'WON' },
    });

    for (const wonBid of wonBids) {
      try {
        await this.notificationsService.create({
          userId: wonBid.sellerId,
          type: 'AUCTION',
          title: 'Chúc mừng! Bạn thắng đấu giá!',
          message: `Bạn đã thắng vị trí #${wonBid.position} với giá ${wonBid.amount.toLocaleString('vi-VN')}đ. Gian hàng sẽ hiển thị trên trang chủ.`,
          link: '/auction',
          icon: 'Trophy',
        });
      } catch (e) {
        this.logger.warn(`Failed to notify winner ${wonBid.sellerId}:`, e);
      }
    }

    const loserSellerIds = [...uniqueSellers].filter(sid => !winnerSellerIds.includes(sid));
    for (const loserId of loserSellerIds) {
      try {
        await this.notificationsService.create({
          userId: loserId,
          type: 'AUCTION',
          title: 'Kết quả đấu giá',
          message: `Phiên đấu giá đã kết thúc. Rất tiếc bạn không thắng lần này. Tiền giữ đã được hoàn vào ví. Thử lại lần sau!`,
          link: '/auction',
          icon: 'Gavel',
        });
      } catch (e) {
        this.logger.warn(`Failed to notify loser ${loserId}:`, e);
      }
    }

    this.logger.log(`Auction ${auction.id} finalized successfully`);
    await this.createNextAuction();
    return auction;
  }

  /**
   * Create next day's auction based on settings
   */
  private async createNextAuction() {
    try {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const { dayNumber, year } = this.getDayIdentifier(tomorrow);
      const existing = await this.prisma.auction.findUnique({
        where: { weekNumber_year: { weekNumber: dayNumber, year } },
      });

      if (!existing) {
        const { startTime, endTime } = await this.calculateAuctionTimes(tomorrow);
        await this.prisma.auction.create({
          data: {
            weekNumber: dayNumber,
            year,
            startTime,
            endTime,
            status: 'ACTIVE',
          },
        });
        this.logger.log(`Created next auction day ${dayNumber}/${year}`);
      }
    } catch (e) {
      this.logger.error('Error creating next auction:', e);
    }
  }

  // ============================================
  // PUBLIC QUERIES
  // ============================================

  /**
   * Get current winners for homepage display
   */
  async getCurrentWinners() {
    const auction = await this.prisma.auction.findFirst({
      where: { status: 'ENDED' },
      orderBy: { endTime: 'desc' },
      include: {
        bids: {
          where: { status: 'WON' },
          include: {
            seller: { include: { sellerProfile: true } },
          },
        },
      },
    });

    if (!auction) return [];

    const winners = auction.bids
      .map(bid => ({
        position: bid.position,
        sellerId: bid.sellerId,
        shopName: bid.seller?.sellerProfile?.shopName || 'Gian hàng',
        shopLogo: bid.seller?.sellerProfile?.shopLogo,
        shopDescription: bid.seller?.sellerProfile?.shopDescription,
        rating: bid.seller?.sellerProfile?.rating || 0,
        totalSales: bid.seller?.sellerProfile?.totalSales || 0,
        insuranceLevel: bid.seller?.sellerProfile?.insuranceLevel || 0,
        insuranceTier: bid.seller?.sellerProfile?.insuranceTier || null,
        pinnedProductIds: bid.seller?.sellerProfile?.pinnedProductIds || null,
        amount: bid.amount,
      }))
      .sort((a, b) => a.position - b.position);

    // Fetch pinned products
    const allPinnedIds: string[] = [];
    for (const w of winners) {
      if (w.pinnedProductIds) {
        try { allPinnedIds.push(...JSON.parse(w.pinnedProductIds)); } catch { }
      }
    }

    let productsMap: Record<string, any> = {};
    if (allPinnedIds.length > 0) {
      const products = await this.prisma.product.findMany({
        where: { id: { in: allPinnedIds }, status: 'ACTIVE' },
        select: {
          id: true, title: true, price: true,
          images: true, slug: true, sellerId: true,
          rating: true, sales: true, views: true,
          seller: {
            select: {
              name: true, avatar: true,
              sellerProfile: {
                select: { shopName: true, shopLogo: true, rating: true, isVerified: true, insuranceLevel: true, insuranceTier: true },
              },
            },
          },
        },
      });
      productsMap = Object.fromEntries(products.map(p => [p.id, p]));
    }

    return winners.map(w => {
      let pinnedProducts: any[] = [];
      if (w.pinnedProductIds) {
        try {
          const ids = JSON.parse(w.pinnedProductIds) as string[];
          // Position-based limits: TOP 1 = 4, TOP 2 = 2, TOP 3 = 1
          const maxPinned = w.position === 1 ? 4 : w.position === 2 ? 2 : 1;
          pinnedProducts = ids.map(id => productsMap[id]).filter(Boolean).slice(0, maxPinned);
        } catch { }
      }
      const { pinnedProductIds: _, ...rest } = w;
      return { ...rest, pinnedProducts };
    });
  }

  /**
   * Get past auctions (public viewing)
   */
  async getPastAuctions(limit = 5) {
    const auctions = await this.prisma.auction.findMany({
      where: { status: { in: ['ENDED', 'CANCELLED'] } },
      orderBy: { endTime: 'desc' },
      take: limit,
      include: {
        bids: {
          where: { status: 'WON' },
          include: {
            seller: { include: { sellerProfile: true } },
          },
        },
        _count: { select: { bids: true } },
      },
    });

    return auctions.map(a => ({
      id: a.id,
      weekNumber: a.weekNumber,
      year: a.year,
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
      totalBids: a._count.bids,
      winners: a.bids.map(b => ({
        position: b.position,
        shopName: b.seller?.sellerProfile?.shopName || 'Gian hàng',
        amount: b.amount,
      })).sort((x, y) => x.position - y.position),
      totalRevenue: a.bids.reduce((sum, b) => sum + b.amount, 0),
    }));
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
              seller: { include: { sellerProfile: true } },
            },
          },
          _count: { select: { bids: true } },
        },
        orderBy: { startTime: 'desc' },
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
        lastBidAt: a.lastBidAt,
        status: this.getAuctionLiveStatus(a),
        totalBids: a._count.bids,
        winners: a.bids.map(b => ({
          position: b.position,
          shopName: b.seller?.sellerProfile?.shopName || 'Gian hàng',
          amount: b.amount,
        })).sort((x, y) => x.position - y.position),
        revenue: a.bids.reduce((sum, b) => sum + b.amount, 0),
      })),
      total,
    };
  }

  /**
   * Cancel auction (admin) — refund ALL bids
   */
  async cancelAuction(auctionId: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: { bids: true },
    });

    if (!auction) throw new BadRequestException('Không tìm thấy phiên đấu giá');
    if (auction.status === 'CANCELLED') throw new BadRequestException('Phiên đã bị hủy trước đó');
    if (auction.status === 'ENDED') throw new BadRequestException('Phiên đã kết thúc, không thể hủy');

    await this.prisma.$transaction(async (tx) => {
      for (const bid of auction.bids) {
        if (bid.heldAmount > 0) {
          await tx.user.update({
            where: { id: bid.sellerId },
            data: { balance: { increment: bid.heldAmount } },
          });
        }
        await tx.auctionBid.update({
          where: { id: bid.id },
          data: { status: 'LOST', heldAmount: 0 },
        });
      }
      await tx.auction.update({
        where: { id: auctionId },
        data: { status: 'CANCELLED' },
      });
    });

    // Notify
    const uniqueSellers = new Set(auction.bids.map(b => b.sellerId));
    for (const sellerId of uniqueSellers) {
      try {
        await this.notificationsService.create({
          userId: sellerId,
          type: 'AUCTION',
          title: 'Phiên đấu giá bị hủy',
          message: 'Phiên đấu giá đã bị admin hủy. Tiền đã được hoàn vào ví.',
          link: '/auction',
          icon: 'Gavel',
        });
      } catch (e) {
        this.logger.warn(`Failed to notify seller ${sellerId}:`, e);
      }
    }
  }

  /**
   * Get auction settings with insurance discount for a seller
   */
  async getAuctionSettingsForSeller(sellerId?: string) {
    const settings = await this.settingsService.getAuctionSettings();

    let insuranceDiscount = 0;
    let insuranceLevel = 0;
    let insuranceTier: string | null = null;
    let discountedStartPrice = settings.startPrice;

    if (sellerId) {
      const seller = await this.prisma.user.findUnique({
        where: { id: sellerId },
        include: { sellerProfile: true },
      });

      if (seller?.sellerProfile) {
        insuranceLevel = seller.sellerProfile.insuranceLevel || 0;
        insuranceTier = seller.sellerProfile.insuranceTier || null;
        insuranceDiscount = Math.min(insuranceLevel * 5, 25);
        discountedStartPrice = Math.round(settings.startPrice * (100 - insuranceDiscount) / 100);
      }
    }

    return {
      ...settings,
      insuranceDiscount,
      insuranceLevel,
      insuranceTier,
      discountedStartPrice,
    };
  }
}
