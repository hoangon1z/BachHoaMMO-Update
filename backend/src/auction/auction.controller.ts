import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuctionService } from './auction.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../security/decorators/security.decorators';
import { CreateBidDto } from './dto/create-bid.dto';

@Controller('auction')
export class AuctionController {
  constructor(private auctionService: AuctionService) {}

  // ============================================
  // PUBLIC ENDPOINTS
  // ============================================

  /**
   * Get current auction
   * GET /auction/current
   */
  @Get('current')
  @Public()
  async getCurrentAuction() {
    const auction = await this.auctionService.getCurrentAuction();
    return { success: true, auction };
  }

  /**
   * Get current winners for homepage
   * GET /auction/winners
   */
  @Get('winners')
  @Public()
  async getWinners() {
    const winners = await this.auctionService.getCurrentWinners();
    return { success: true, winners };
  }

  /**
   * Get bid history for current auction
   * GET /auction/history
   */
  @Get('history')
  @Public()
  async getBidHistory(@Query('limit') limit?: string) {
    const auction = await this.auctionService.getCurrentAuction();
    const history = await this.auctionService.getBidHistory(
      auction.id,
      limit ? parseInt(limit) : 20
    );
    return { success: true, history };
  }

  // ============================================
  // SELLER ENDPOINTS
  // ============================================

  /**
   * Place a bid
   * POST /auction/bid
   */
  @Post('bid')
  @UseGuards(JwtAuthGuard)
  async placeBid(@Request() req, @Body() dto: CreateBidDto) {
    const result = await this.auctionService.placeBid(
      req.user.id,
      dto.position,
      dto.amount
    );
    return { 
      success: true, 
      bid: result.bid,
      auction: result.auction,
      outbidSellerId: result.outbidSellerId,
    };
  }

  /**
   * Get my bids for current auction
   * GET /auction/my-bids
   */
  @Get('my-bids')
  @UseGuards(JwtAuthGuard)
  async getMyBids(@Request() req) {
    const bids = await this.auctionService.getSellerBids(req.user.id);
    return { success: true, bids };
  }
}

// ============================================
// ADMIN AUCTION CONTROLLER
// ============================================

@Controller('admin/auction')
@UseGuards(JwtAuthGuard)
export class AdminAuctionController {
  constructor(private auctionService: AuctionService) {}

  /**
   * Get all auctions
   * GET /admin/auction/list
   */
  @Get('list')
  async getAllAuctions(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const result = await this.auctionService.getAllAuctions(
      skip ? parseInt(skip) : 0,
      take ? parseInt(take) : 20
    );
    return { success: true, ...result };
  }

  /**
   * Get auction details
   * GET /admin/auction/:id
   */
  @Get(':id')
  async getAuction(@Param('id') id: string) {
    const auction = await this.auctionService.getAuction(id);
    return { success: true, auction };
  }

  /**
   * Get bid history for auction
   * GET /admin/auction/:id/history
   */
  @Get(':id/history')
  async getAuctionHistory(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const history = await this.auctionService.getBidHistory(
      id,
      limit ? parseInt(limit) : 50
    );
    return { success: true, history };
  }

  /**
   * Manually finalize auction
   * POST /admin/auction/:id/finalize
   */
  @Post(':id/finalize')
  async finalizeAuction(@Param('id') id: string) {
    const auction = await this.auctionService.finalizeAuction(id);
    return { success: true, auction };
  }

  /**
   * Cancel auction
   * POST /admin/auction/:id/cancel
   */
  @Post(':id/cancel')
  async cancelAuction(@Param('id') id: string) {
    await this.auctionService.cancelAuction(id);
    return { success: true, message: 'Auction cancelled and all bids refunded' };
  }
}
