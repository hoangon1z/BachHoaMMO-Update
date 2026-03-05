'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuthStore } from '@/store/authStore';
import { useAuction } from '@/hooks/useAuction';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Gavel, Trophy, Clock, Loader2, AlertCircle, CheckCircle, X,
  TrendingUp, Wallet, Info, Crown, Medal, Award, ArrowUpRight,
  History, Store, ChevronRight, ShieldCheck, Users,
  Shield, Zap,
} from 'lucide-react';
import Link from 'next/link';

interface PastAuction {
  id: string; weekNumber: number; year: number; endTime: string;
  totalBids: number; status: string;
  winners: { position: number; shopName: string; amount: number }[];
  totalRevenue: number;
}

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);
const fmtDateVN = (d: string) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

// Insurance tier badge component
function InsuranceBadge({ level, tier, size = 'sm' }: { level?: number; tier?: string | null; size?: 'sm' | 'xs' }) {
  if (!level || level === 0) return null;
  const tierColors: Record<string, string> = {
    BRONZE: 'bg-amber-700/10 text-amber-700 border-amber-700/20',
    SILVER: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
    GOLD: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
    DIAMOND: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20',
    VIP: 'bg-violet-500/10 text-violet-700 border-violet-500/20',
  };
  const colors = tier ? tierColors[tier] || tierColors.BRONZE : tierColors.BRONZE;
  const sizeClass = size === 'xs' ? 'text-[8px] px-1 py-0' : 'text-[9px] px-1.5 py-0.5';
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold rounded border ${colors} ${sizeClass}`}>
      <Shield className={size === 'xs' ? 'w-2 h-2' : 'w-2.5 h-2.5'} />
      {tier || `Lv${level}`}
    </span>
  );
}

export default function AuctionPage() {
  const router = useRouter();
  const { user, logout, checkAuth, refreshUser } = useAuthStore();
  const {
    isConnected, auction, bidHistory, myBids, settings, isLoading, error,
    outbidNotification, winnerNotification, placeBid, refreshAuction, clearNotifications,
  } = useAuction();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  // === Dialog states ===
  const [bidModal, setBidModal] = useState<{
    position: number; currentAmount: number; step: 'input' | 'confirm' | 'success' | 'error';
  } | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);
  // === Past auctions ===
  const [pastAuctions, setPastAuctions] = useState<PastAuction[]>([]);
  // === Tab state ===
  const [activeTab, setActiveTab] = useState<'positions' | 'history' | 'past'>('positions');
  // === Animate bid change ===
  const [animatedPosition, setAnimatedPosition] = useState<number | null>(null);

  useEffect(() => {
    const init = async () => { await checkAuth(); setIsCheckingAuth(false); };
    init();
    // Fetch past auctions
    fetch('/api/auction/past?limit=5')
      .then(r => r.json())
      .then(d => { if (d.success) setPastAuctions(d.results || []); })
      .catch(() => { });
  }, []);

  // Animate when bid updates
  useEffect(() => {
    if (auction) {
      // Detect which position changed
      auction.positions.forEach(pos => {
        if (pos.highestBid) {
          setAnimatedPosition(pos.position);
          const t = setTimeout(() => setAnimatedPosition(null), 1500);
          return () => clearTimeout(t);
        }
      });
    }
  }, [auction?.positions?.map(p => p.highestBid?.amount).join(',')]);

  // === Countdown ===
  const getTimeInfo = () => {
    if (!auction) return { hours: 0, minutes: 0, seconds: 0, target: 'end' as const, expired: true };
    const now = Date.now();
    const startMs = new Date(auction.startTime).getTime();
    const endMs = new Date(auction.endTime).getTime();

    // If before start time → countdown to start
    if (now < startMs) {
      const diff = startMs - now;
      return {
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        target: 'start' as const,
        expired: false,
      };
    }
    // If within window → countdown to end
    if (now <= endMs) {
      const diff = endMs - now;
      return {
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        target: 'end' as const,
        expired: false,
      };
    }
    // Past end → expired
    return { hours: 0, minutes: 0, seconds: 0, target: 'end' as const, expired: true };
  };
  const [timeInfo, setTimeInfo] = useState(getTimeInfo());
  useEffect(() => {
    const t = setInterval(() => setTimeInfo(getTimeInfo()), 1000);
    return () => clearInterval(t);
  }, [auction]);
  const isAuctionActive = auction?.status === 'ACTIVE' && !timeInfo.expired;
  const isAuctionPending = auction?.status === 'PENDING' || (auction?.status === 'ACTIVE' && timeInfo.target === 'start');

  const fmtTimeVN = (d: string) => new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });

  // === Helpers ===
  const getMinBid = (pos: number) => {
    if (!settings || !auction) return 0;
    const cur = auction.positions.find(p => p.position === pos)?.highestBid?.amount || 0;
    // Use discounted start price if available (seller-specific)
    const startPrice = settings.discountedStartPrice || settings.startPrice;
    return cur > 0 ? cur + settings.minIncrement : startPrice;
  };

  const getMyBidForPosition = (pos: number) => myBids.find(b => b.position === pos);

  const positionMeta = (pos: number) => {
    const map: Record<number, { icon: typeof Crown; label: string; colors: Record<string, string> }> = {
      1: { icon: Crown, label: 'Hạng Nhất', colors: { border: 'border-amber-300', bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-500', badge: 'bg-amber-100 text-amber-800' } },
      2: { icon: Medal, label: 'Hạng Nhì', colors: { border: 'border-slate-300', bg: 'bg-slate-50', text: 'text-slate-700', icon: 'text-slate-500', badge: 'bg-slate-100 text-slate-700' } },
      3: { icon: Award, label: 'Hạng Ba', colors: { border: 'border-orange-300', bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-500', badge: 'bg-orange-100 text-orange-700' } },
    };
    return map[pos] || map[3];
  };

  // === Open bid modal (Step 1: input) ===
  const openBidModal = (position: number) => {
    if (!user) { router.push('/login?redirect=/auction'); return; }
    if (!user.isSeller) {
      setBidError('Bạn cần đăng ký làm người bán để tham gia đấu giá');
      return;
    }
    const cur = auction?.positions.find(p => p.position === position)?.highestBid?.amount || 0;
    setBidModal({ position, currentAmount: cur, step: 'input' });
    setBidAmount(getMinBid(position).toString());
    setBidError(null);
  };

  // === Step 2: confirm ===
  const goToConfirm = () => {
    if (!bidModal) return;
    const amount = parseInt(bidAmount);
    const min = getMinBid(bidModal.position);
    if (isNaN(amount) || amount < min) {
      setBidError(`Giá tối thiểu là ${fmt(min)}đ`);
      return;
    }
    if (user && amount > (user.balance ?? 0)) {
      setBidError(`Số dư không đủ. Bạn có ${fmt(user.balance ?? 0)}đ`);
      return;
    }
    setBidError(null);
    setBidModal({ ...bidModal, step: 'confirm' });
  };

  // === Step 3: submit ===
  const handleSubmitBid = async () => {
    if (!bidModal) return;
    setIsSubmitting(true);
    setBidError(null);
    const amount = parseInt(bidAmount);
    const success = await placeBid(bidModal.position, amount);
    if (success) {
      setBidModal({ ...bidModal, step: 'success' });
      await refreshUser();
      setTimeout(() => setBidModal(null), 2000);
    } else {
      setBidModal({ ...bidModal, step: 'error' });
      setBidError(error || 'Không thể đặt giá. Vui lòng thử lại.');
    }
    setIsSubmitting(false);
  };

  // === Close modal ===
  const closeModal = () => { setBidModal(null); setBidError(null); };

  if (isCheckingAuth || isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <p className="text-sm text-gray-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header
          user={user}
          onLogout={() => { logout(); router.push('/'); }}
          onSearch={(q) => router.push(`/search?q=${encodeURIComponent(q)}`)}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Gavel className="w-8 h-8 text-gray-300" />
            </div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">Chưa có phiên đấu giá</h2>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              Hiện tại chưa có phiên đấu giá nào đang diễn ra hoặc sắp diễn ra.
              Vui lòng quay lại sau!
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        user={user}
        onLogout={() => { logout(); router.push('/'); }}
        onSearch={(q) => router.push(`/search?q=${encodeURIComponent(q)}`)}
      />

      <div className="flex-1">
        {/* === Notifications === */}
        <div className="container mx-auto px-4 pt-5 space-y-2">
          {outbidNotification && (
            <div className="flex items-center justify-between px-4 py-3 bg-red-50 border border-red-200 rounded-xl animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-900">Bạn đã bị vượt giá!</p>
                  <p className="text-xs text-red-600">
                    {outbidNotification.bidderName} đặt {fmt(outbidNotification.amount)}đ cho vị trí #{outbidNotification.position}. Tiền đã được hoàn vào ví.
                  </p>
                </div>
              </div>
              <button onClick={clearNotifications} className="p-1.5 rounded-md hover:bg-red-100"><X className="w-4 h-4 text-red-400" /></button>
            </div>
          )}
          {winnerNotification && (
            <div className="flex items-center justify-between px-4 py-3 bg-green-50 border border-green-200 rounded-xl animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-900">Chúc mừng! Bạn đã thắng!</p>
                  <p className="text-xs text-green-600">Vị trí #{winnerNotification.position} với giá {fmt(winnerNotification.amount)}đ. Gian hàng sẽ hiển thị trên trang chủ.</p>
                </div>
              </div>
              <button onClick={clearNotifications} className="p-1.5 rounded-md hover:bg-green-100"><X className="w-4 h-4 text-green-400" /></button>
            </div>
          )}
        </div>

        {/* === Hero === */}
        <div className="container mx-auto px-4 py-6">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-6 md:px-8 md:py-8">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center">
                      <Gavel className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl md:text-2xl font-bold text-gray-900">Đấu giá Gian hàng TOP</h1>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm text-gray-400">{auction?.startTime ? fmtDateVN(auction.startTime) : ''}</span>
                        {auction?.startTime && auction?.endTime && (
                          <span className="text-sm text-gray-400">
                            {fmtTimeVN(auction.startTime)} - {fmtTimeVN(auction.endTime)}
                          </span>
                        )}
                        {isConnected && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Trực tiếp
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 max-w-md leading-relaxed">
                    Đặt giá để gian hàng và sản phẩm của bạn hiển thị nổi bật trên trang chủ + ưu tiên tìm kiếm trong 4 ngày. Tiền được tạm giữ và hoàn lại nếu bị vượt giá.
                  </p>
                  {/* Insurance discount notice */}
                  {settings?.insuranceDiscount && settings.insuranceDiscount > 0 && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-50 border border-cyan-200 rounded-lg">
                      <Shield className="w-3.5 h-3.5 text-cyan-600" />
                      <span className="text-xs text-cyan-700 font-medium">
                        Bảo hiểm {settings.insuranceTier}: giảm {settings.insuranceDiscount}% giá khởi điểm
                      </span>
                    </div>
                  )}
                  {/* Min participants notice */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg">
                    <Users className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-xs text-gray-500">Tối thiểu 2 seller tham gia để có người thắng</span>
                  </div>
                </div>

                {/* Countdown / Status */}
                {isAuctionPending ? (
                  /* PENDING: Countdown to start */
                  <div className="flex-shrink-0">
                    <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest mb-2 text-right">
                      ⏳ Sắp mở đấu giá
                    </p>
                    <div className="flex gap-1.5">
                      {[
                        { v: timeInfo.hours, l: 'Giờ' },
                        { v: timeInfo.minutes, l: 'Phút' },
                        { v: timeInfo.seconds, l: 'Giây' },
                      ].map((t, i) => (
                        <div key={i} className="text-center">
                          <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center">
                            <span className="text-lg font-bold text-white font-mono tabular-nums">{t.v.toString().padStart(2, '0')}</span>
                          </div>
                          <p className="text-[9px] text-gray-400 mt-1 font-semibold uppercase tracking-wider">{t.l}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 text-right">
                      Mở lúc {auction?.startTime ? fmtTimeVN(auction.startTime) : ''}
                    </p>
                  </div>
                ) : isAuctionActive ? (
                  /* ACTIVE: Countdown to end */
                  <div className="flex-shrink-0">
                    <p className="text-[10px] font-semibold text-green-600 uppercase tracking-widest mb-2 text-right">
                      🟢 Đang diễn ra
                    </p>
                    <div className="flex gap-1.5">
                      {[
                        { v: timeInfo.hours, l: 'Giờ' },
                        { v: timeInfo.minutes, l: 'Phút' },
                        { v: timeInfo.seconds, l: 'Giây' },
                      ].map((t, i) => (
                        <div key={i} className="text-center">
                          <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
                            <span className="text-lg font-bold text-white font-mono tabular-nums">{t.v.toString().padStart(2, '0')}</span>
                          </div>
                          <p className="text-[9px] text-gray-400 mt-1 font-semibold uppercase tracking-wider">{t.l}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 text-right">
                      Kết thúc lúc {auction?.endTime ? fmtTimeVN(auction.endTime) : ''}
                      {settings?.cooldownMinutes ? ` (gia hạn ${settings.cooldownMinutes}p nếu có bid)` : ''}
                    </p>
                  </div>
                ) : (
                  /* ENDED */
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl">
                    <CheckCircle className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600">Phiên đấu giá đã kết thúc</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* === Tabs === */}
        <div className="container mx-auto px-4 pb-2">
          <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
            {[
              { key: 'positions' as const, label: 'Vị trí đấu giá', icon: Gavel },
              { key: 'history' as const, label: 'Lịch sử bid', icon: History },
              { key: 'past' as const, label: 'Phiên trước', icon: Trophy },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === tab.key ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* === Tab: Positions === */}
        {activeTab === 'positions' && (
          <div className="container mx-auto px-4 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {auction?.positions.map((pos) => {
                const meta = positionMeta(pos.position);
                const Icon = meta.icon;
                const myBid = getMyBidForPosition(pos.position);
                const isLeading = myBid && myBid.status === 'ACTIVE' && pos.highestBid?.sellerId === user?.id;
                const isAnimating = animatedPosition === pos.position;

                return (
                  <div
                    key={pos.position}
                    className={`bg-white border-2 ${isLeading ? meta.colors.border : 'border-gray-200'} rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg ${isAnimating ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
                  >
                    {/* Header */}
                    <div className={`px-5 py-3.5 border-b ${isLeading ? meta.colors.bg : 'bg-gray-50/50'} border-gray-100`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLeading ? meta.colors.bg : 'bg-white'} border ${isLeading ? meta.colors.border : 'border-gray-200'}`}>
                            <Icon className={`w-4 h-4 ${meta.colors.icon}`} />
                          </div>
                          <div>
                            <span className="text-sm font-bold text-gray-900">{meta.label}</span>
                            <p className="text-[11px] text-gray-400">{pos.bidCount} lượt đấu giá</p>
                          </div>
                        </div>
                        {isLeading && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.colors.badge}`}>Dẫn đầu</span>
                        )}
                        {myBid && myBid.status === 'OUTBID' && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Bị vượt</span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      {pos.highestBid ? (
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Giá cao nhất</p>
                            <p className={`text-2xl font-bold text-gray-900 tabular-nums transition-all duration-500 ${isAnimating ? 'text-blue-600 scale-105' : ''}`}>{fmt(pos.highestBid.amount)}<span className="text-sm">đ</span></p>
                          </div>
                          <div className="flex items-center gap-2 py-2 px-3 bg-gray-50 rounded-lg">
                            <div className="w-6 h-6 rounded-md bg-gray-200 flex items-center justify-center">
                              <Store className="w-3 h-3 text-gray-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium text-gray-700 truncate">{pos.highestBid.shopName}</p>
                                <InsuranceBadge level={pos.highestBid.insuranceLevel} tier={pos.highestBid.insuranceTier} size="xs" />
                              </div>
                              <p className="text-[10px] text-gray-400">
                                {new Date(pos.highestBid.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Giá khởi điểm</p>
                            <p className="text-2xl font-bold text-gray-300 tabular-nums">
                              {fmt(settings?.discountedStartPrice || settings?.startPrice || 100000)}<span className="text-sm">đ</span>
                            </p>
                            {settings?.insuranceDiscount && settings.insuranceDiscount > 0 && (
                              <p className="text-[10px] text-cyan-600 mt-0.5">
                                <span className="line-through text-gray-300">{fmt(settings.startPrice)}đ</span> -{settings.insuranceDiscount}%
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 py-2 px-3 bg-gray-50 rounded-lg">
                            <Info className="w-4 h-4 text-gray-300" />
                            <p className="text-xs text-gray-400">Chưa có ai đặt giá</p>
                          </div>
                        </div>
                      )}

                      {/* My current bid info */}
                      {myBid && myBid.status === 'ACTIVE' && (
                        <div className="mt-3 p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
                          <p className="text-[10px] font-semibold text-blue-600 uppercase">Bid của bạn</p>
                          <p className="text-sm font-bold text-blue-800 tabular-nums">{fmt(myBid.amount)}đ</p>
                        </div>
                      )}

                      <Button
                        onClick={() => openBidModal(pos.position)}
                        disabled={!isAuctionActive}
                        className="w-full mt-4 h-10 font-semibold text-sm"
                      >
                        <ArrowUpRight className="w-4 h-4 mr-1.5" />
                        {isAuctionPending ? 'Chưa mở' : isLeading ? 'Tăng giá' : 'Đặt giá ngay'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Info cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {user && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                        <Wallet className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Số dư ví</p>
                        <p className="text-lg font-bold text-gray-900 tabular-nums">{fmt(user.balance ?? 0)}đ</p>
                      </div>
                    </div>
                    <Link href="/wallet/recharge">
                      <Button variant="outline" size="sm" className="text-xs h-8">Nạp thêm <ChevronRight className="w-3 h-3 ml-0.5" /></Button>
                    </Link>
                  </div>
                </div>
              )}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Info className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-[13px] text-gray-500 leading-relaxed">
                    <p className="font-semibold text-gray-900 text-sm mb-1">Quy tắc</p>
                    <ul className="space-y-1">
                      <li>Giá khởi điểm: <strong className="text-gray-700">{fmt(settings?.startPrice || 100000)}đ</strong> | Bước giá: <strong className="text-gray-700">{fmt(settings?.minIncrement || 10000)}đ</strong></li>
                      <li>Tiền tạm giữ khi đặt, hoàn lại ngay khi bị vượt giá</li>
                      <li>Tối thiểu <strong className="text-gray-700">2 seller</strong> tham gia để có người thắng</li>
                      <li>Hiển thị nổi bật trên trang chủ</li>
                      <li>Ưu tiên tìm kiếm lên top trong 4 ngày</li>
                      <li>Áp dụng cho sản phẩm bạn chọn ghim</li>
                      <li>Seller có bảo hiểm được giảm giá khởi điểm (tối đa 25%)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === Tab: Bid History === */}
        {activeTab === 'history' && (
          <div className="container mx-auto px-4 pb-6">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-bold text-gray-900">Lịch sử đấu giá</h3>
                </div>
                <span className="text-xs text-gray-400">{bidHistory.length} lượt</span>
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                {bidHistory.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-5 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Vị trí</th>
                        <th className="px-5 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Gian hàng</th>
                        <th className="px-5 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Số tiền</th>
                        <th className="px-5 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Trạng thái</th>
                        <th className="px-5 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Thời gian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {bidHistory.map(bid => {
                        const meta = positionMeta(bid.position);
                        return (
                          <tr key={bid.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${meta.colors.badge}`}>
                                  <span className="text-xs font-bold">{bid.position}</span>
                                </div>
                                <span className="text-xs text-gray-500 hidden sm:inline">{meta.label}</span>
                              </div>
                            </td>
                            <td className="px-5 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium text-gray-700">{bid.shopName}</span>
                                <InsuranceBadge level={bid.insuranceLevel} tier={bid.insuranceTier} size="xs" />
                              </div>
                            </td>
                            <td className="px-5 py-2.5 text-right"><span className="text-sm font-bold text-gray-900 tabular-nums">{fmt(bid.amount)}đ</span></td>
                            <td className="px-5 py-2.5 text-right hidden md:table-cell">
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${bid.status === 'ACTIVE' ? 'bg-green-50 text-green-700' :
                                bid.status === 'WON' ? 'bg-amber-50 text-amber-700' :
                                  bid.status === 'OUTBID' ? 'bg-red-50 text-red-600' :
                                    'bg-gray-50 text-gray-500'
                                }`}>
                                {bid.status === 'ACTIVE' ? 'Đang dẫn' : bid.status === 'WON' ? 'Thắng' : bid.status === 'OUTBID' ? 'Bị vượt' : 'Thua'}
                              </span>
                            </td>
                            <td className="px-5 py-2.5 text-right hidden md:table-cell">
                              <span className="text-[11px] text-gray-400">
                                {new Date(bid.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-5 py-16 text-center">
                    <History className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Chưa có lượt đấu giá nào</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* === Tab: Past Auctions === */}
        {activeTab === 'past' && (
          <div className="container mx-auto px-4 pb-6 space-y-3">
            {pastAuctions.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <Trophy className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Chưa có phiên đấu giá nào kết thúc</p>
              </div>
            ) : (
              pastAuctions.map(pa => (
                <div key={pa.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{pa.endTime ? fmtDateVN(pa.endTime) : `Ngày ${pa.weekNumber}`}</span>
                      {pa.status === 'CANCELLED' && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">Đã hủy</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{pa.totalBids} lượt bid</span>
                      {pa.status !== 'CANCELLED' && <span>Tổng: {fmt(pa.totalRevenue)}đ</span>}
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {pa.status === 'CANCELLED' ? (
                      <div className="px-5 py-4 text-center text-sm text-gray-400">
                        Phiên bị hủy do không đủ người tham gia
                      </div>
                    ) : pa.winners.length > 0 ? pa.winners.map(w => {
                      const meta = positionMeta(w.position);
                      const WinnerIcon = meta.icon;
                      return (
                        <div key={w.position} className="px-5 py-3 flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.colors.bg}`}>
                            <WinnerIcon className={`w-4 h-4 ${meta.colors.icon}`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{w.shopName}</p>
                            <p className="text-[11px] text-gray-400">{meta.label}</p>
                          </div>
                          <p className="text-sm font-bold text-gray-900 tabular-nums">{fmt(w.amount)}đ</p>
                        </div>
                      );
                    }) : (
                      <div className="px-5 py-4 text-center text-sm text-gray-400">Không có người thắng</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* === BID MODAL (3-step dialog) === */}
      {bidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center">
                  <Gavel className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {bidModal.step === 'input' && 'Đặt giá'}
                    {bidModal.step === 'confirm' && 'Xác nhận đặt giá'}
                    {bidModal.step === 'success' && 'Thành công'}
                    {bidModal.step === 'error' && 'Không thành công'}
                  </h3>
                  <p className="text-xs text-gray-400">{positionMeta(bidModal.position).label}</p>
                </div>
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="p-6">
              {/* === STEP: INPUT === */}
              {bidModal.step === 'input' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Giá hiện tại</p>
                      <p className="text-lg font-bold text-gray-900 tabular-nums">{fmt(bidModal.currentAmount)}đ</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Giá tối thiểu</p>
                      <p className="text-lg font-bold text-amber-600 tabular-nums">{fmt(getMinBid(bidModal.position))}đ</p>
                    </div>
                  </div>

                  {/* Input */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Số tiền đặt</label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={bidAmount}
                        onChange={e => { setBidAmount(e.target.value); setBidError(null); }}
                        className="text-lg font-mono h-11 pr-8"
                        placeholder="Nhập số tiền"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">đ</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Wallet className="w-3 h-3" /> Số dư: {fmt(user?.balance || 0)}đ
                    </p>
                  </div>

                  {/* Quick bid buttons */}
                  <div className="flex gap-2">
                    {[0, 50000, 100000, 200000].map(add => {
                      const base = getMinBid(bidModal.position);
                      const val = base + add;
                      return (
                        <button
                          key={add}
                          onClick={() => setBidAmount(val.toString())}
                          className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200 ${bidAmount === val.toString()
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                          {add === 0 ? 'Tối thiểu' : `+${fmt(add)}`}
                        </button>
                      );
                    })}
                  </div>

                  {bidError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-700">{bidError}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <Button variant="outline" onClick={closeModal} className="flex-1 h-10">Huỷ</Button>
                    <Button onClick={goToConfirm} className="flex-1 h-10 font-semibold">
                      Tiếp tục <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* === STEP: CONFIRM === */}
              {bidModal.step === 'confirm' && (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <p className="text-sm font-semibold text-amber-800">Xác nhận giao dịch</p>
                    </div>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      Khi xác nhận, <strong>{fmt(parseInt(bidAmount))}đ</strong> sẽ được tạm giữ từ ví của bạn.
                      Nếu có người đặt giá cao hơn, tiền sẽ được hoàn lại ngay lập tức.
                      Nếu bạn thắng, tiền sẽ bị trừ vĩnh viễn.
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Vị trí</span>
                      <span className="font-semibold text-gray-900">{positionMeta(bidModal.position).label}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Số tiền đặt</span>
                      <span className="font-bold text-gray-900 tabular-nums">{fmt(parseInt(bidAmount))}đ</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Số dư hiện tại</span>
                      <span className="text-gray-700 tabular-nums">{fmt(user?.balance || 0)}đ</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between text-sm">
                      <span className="text-gray-500">Số dư sau khi đặt</span>
                      <span className="font-semibold text-gray-900 tabular-nums">{fmt((user?.balance || 0) - parseInt(bidAmount))}đ</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setBidModal({ ...bidModal, step: 'input' })} className="flex-1 h-10" disabled={isSubmitting}>
                      Quay lại
                    </Button>
                    <Button onClick={handleSubmitBid} className="flex-1 h-10 font-semibold bg-gray-900 hover:bg-gray-800" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Đang xử lý...</>
                      ) : (
                        <><ShieldCheck className="w-4 h-4 mr-1.5" /> Xác nhận đặt giá</>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* === STEP: SUCCESS === */}
              {bidModal.step === 'success' && (
                <div className="text-center py-6">
                  <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-7 h-7 text-green-500" />
                  </div>
                  <p className="text-lg font-bold text-gray-900">Đặt giá thành công!</p>
                  <p className="text-sm text-gray-500 mt-1">Bạn đã đặt <strong>{fmt(parseInt(bidAmount))}đ</strong> cho {positionMeta(bidModal.position).label}.</p>
                  <p className="text-xs text-gray-400 mt-2">Tiền đã được tạm giữ. Theo dõi trạng thái tại đây.</p>
                </div>
              )}

              {/* === STEP: ERROR === */}
              {bidModal.step === 'error' && (
                <div className="text-center py-6">
                  <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="w-7 h-7 text-red-500" />
                  </div>
                  <p className="text-lg font-bold text-gray-900">Không thành công</p>
                  <p className="text-sm text-red-600 mt-1">{bidError}</p>
                  <div className="flex gap-3 mt-4">
                    <Button variant="outline" onClick={closeModal} className="flex-1 h-10">Đóng</Button>
                    <Button onClick={() => setBidModal({ ...bidModal, step: 'input' })} className="flex-1 h-10">Thử lại</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* General error toast */}
      {bidError && !bidModal && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg max-w-md animate-in slide-in-from-bottom-2 duration-300">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{bidError}</p>
          <button onClick={() => setBidError(null)} className="ml-auto"><X className="w-4 h-4 text-red-400" /></button>
        </div>
      )}

      <Footer />
    </div>
  );
}
