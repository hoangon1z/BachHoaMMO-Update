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
  Gavel,
  Trophy,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  TrendingUp,
  Wallet,
  Info
} from 'lucide-react';
import Link from 'next/link';

export default function AuctionPage() {
  const router = useRouter();
  const { user, logout, checkAuth, refreshUser } = useAuthStore();
  const {
    isConnected,
    auction,
    bidHistory,
    myBids,
    settings,
    isLoading,
    error,
    outbidNotification,
    winnerNotification,
    placeBid,
    refreshAuction,
    clearNotifications,
  } = useAuction();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [bidModal, setBidModal] = useState<{ position: number; currentAmount: number } | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = useState(false);

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setIsCheckingAuth(false);
    };
    init();
  }, []);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN').format(price);

  const getTimeRemaining = () => {
    if (!auction) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    
    const end = new Date(auction.endTime).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
      expired: false,
    };
  };

  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(getTimeRemaining());
    }, 1000);
    return () => clearInterval(timer);
  }, [auction]);

  const getMinBid = (position: number) => {
    if (!settings || !auction) return 0;
    const currentHighest = auction.positions.find(p => p.position === position)?.highestBid?.amount || 0;
    return currentHighest > 0 ? currentHighest + settings.minIncrement : settings.startPrice;
  };

  const openBidModal = (position: number) => {
    if (!user) {
      router.push('/login?redirect=/auction');
      return;
    }
    if (!user.isSeller) {
      setBidError('Bạn cần đăng ký làm người bán để tham gia đấu giá');
      return;
    }

    const currentAmount = auction?.positions.find(p => p.position === position)?.highestBid?.amount || 0;
    setBidModal({ position, currentAmount });
    setBidAmount(getMinBid(position).toString());
    setBidError(null);
    setBidSuccess(false);
  };

  const handleSubmitBid = async () => {
    if (!bidModal) return;

    const amount = parseInt(bidAmount);
    const minBid = getMinBid(bidModal.position);

    if (amount < minBid) {
      setBidError(`Giá tối thiểu là ${formatPrice(minBid)}đ`);
      return;
    }

    if (user && amount > user.balance) {
      setBidError(`Số dư không đủ. Bạn có ${formatPrice(user.balance)}đ`);
      return;
    }

    setIsSubmitting(true);
    setBidError(null);

    const success = await placeBid(bidModal.position, amount);

    if (success) {
      setBidSuccess(true);
      await refreshUser(); // Update balance
      setTimeout(() => {
        setBidModal(null);
        setBidSuccess(false);
      }, 1500);
    } else {
      setBidError(error || 'Không thể đặt giá');
    }

    setIsSubmitting(false);
  };

  const getPositionStyle = (position: number) => {
    switch (position) {
      case 1:
        return { bg: 'from-yellow-400 to-yellow-600', icon: '🥇', label: 'TOP 1' };
      case 2:
        return { bg: 'from-gray-300 to-gray-500', icon: '🥈', label: 'TOP 2' };
      case 3:
        return { bg: 'from-amber-500 to-amber-700', icon: '🥉', label: 'TOP 3' };
      default:
        return { bg: 'from-gray-400 to-gray-600', icon: '', label: `TOP ${position}` };
    }
  };

  const getMyBidForPosition = (position: number) => {
    return myBids.find(b => b.position === position);
  };

  if (isCheckingAuth || isLoading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <Header
        user={user}
        onLogout={() => { logout(); router.push('/'); }}
        onSearch={(q) => router.push(`/search?q=${encodeURIComponent(q)}`)}
      />

      <div className="flex-1 container mx-auto px-4 py-6">
        {/* Outbid Notification */}
        {outbidNotification && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="font-medium text-red-800">Bạn đã bị vượt giá!</p>
                <p className="text-sm text-red-600">
                  {outbidNotification.bidderName} đặt {formatPrice(outbidNotification.amount)}đ cho vị trí #{outbidNotification.position}
                </p>
              </div>
            </div>
            <button onClick={clearNotifications} className="p-1 hover:bg-red-100 rounded">
              <X className="w-4 h-4 text-red-500" />
            </button>
          </div>
        )}

        {/* Winner Notification */}
        {winnerNotification && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-green-500" />
              <div>
                <p className="font-medium text-green-800">Chúc mừng! Bạn đã thắng!</p>
                <p className="text-sm text-green-600">
                  Vị trí #{winnerNotification.position} với giá {formatPrice(winnerNotification.amount)}đ
                </p>
              </div>
            </div>
            <button onClick={clearNotifications} className="p-1 hover:bg-green-100 rounded">
              <X className="w-4 h-4 text-green-500" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-6 text-white mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <Gavel className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Đấu giá Gian hàng TOP</h1>
                <p className="text-primary-foreground/80">
                  Tuần {auction?.weekNumber}/{auction?.year} 
                  {isConnected && <span className="ml-2 text-xs bg-green-500 px-2 py-0.5 rounded">LIVE</span>}
                </p>
              </div>
            </div>

            {/* Countdown */}
            {!timeRemaining.expired ? (
              <div className="flex gap-3">
                {[
                  { value: timeRemaining.days, label: 'Ngày' },
                  { value: timeRemaining.hours, label: 'Giờ' },
                  { value: timeRemaining.minutes, label: 'Phút' },
                  { value: timeRemaining.seconds, label: 'Giây' },
                ].map((item, i) => (
                  <div key={i} className="text-center">
                    <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center text-2xl font-bold">
                      {item.value.toString().padStart(2, '0')}
                    </div>
                    <p className="text-xs mt-1 text-primary-foreground/70">{item.label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center">
                <p className="text-lg font-bold">Đấu giá đã kết thúc</p>
                <p className="text-sm text-primary-foreground/70">Chờ phiên tiếp theo</p>
              </div>
            )}
          </div>
        </div>

        {/* Positions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {auction?.positions.map((pos) => {
            const style = getPositionStyle(pos.position);
            const myBid = getMyBidForPosition(pos.position);
            const isLeading = myBid && myBid.status === 'ACTIVE' && pos.highestBid?.sellerId === user?.id;

            return (
              <div key={pos.position} className="bg-card rounded-xl border overflow-hidden">
                {/* Position Header */}
                <div className={`bg-gradient-to-r ${style.bg} p-4 text-white`}>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{style.icon}</span>
                    <span className="text-lg font-bold">{style.label}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  {pos.highestBid ? (
                    <>
                      <p className="text-3xl font-bold text-primary">
                        {formatPrice(pos.highestBid.amount)}đ
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {pos.highestBid.shopName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pos.bidCount} lượt đấu giá
                      </p>

                      {isLeading && (
                        <div className="mt-3 flex items-center gap-2 text-green-600 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          <span>Bạn đang dẫn đầu</span>
                        </div>
                      )}

                      {myBid && myBid.status === 'OUTBID' && (
                        <div className="mt-3 flex items-center gap-2 text-red-600 text-sm">
                          <AlertCircle className="w-4 h-4" />
                          <span>Bạn đã bị vượt giá</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-muted-foreground">
                        {formatPrice(settings?.startPrice || 100000)}đ
                      </p>
                      <p className="text-sm text-muted-foreground">Giá khởi điểm</p>
                    </>
                  )}

                  <Button
                    onClick={() => openBidModal(pos.position)}
                    disabled={timeRemaining.expired || auction?.status !== 'ACTIVE'}
                    className="w-full mt-4"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Đặt giá
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* User Balance */}
        {user && (
          <div className="bg-card rounded-xl border p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-primary" />
                <span className="font-medium">Số dư của bạn:</span>
                <span className="text-xl font-bold text-primary">{formatPrice(user.balance)}đ</span>
              </div>
              <Link href="/wallet/recharge">
                <Button variant="outline" size="sm">Nạp thêm</Button>
              </Link>
            </div>
          </div>
        )}

        {/* Rules */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">Quy tắc đấu giá:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Giá khởi điểm: <strong>{formatPrice(settings?.startPrice || 100000)}đ</strong></li>
                <li>Bước giá tối thiểu: <strong>{formatPrice(settings?.minIncrement || 10000)}đ</strong></li>
                <li>Tiền sẽ được giữ khi đặt giá, hoàn lại nếu bị vượt</li>
                <li>Không thể hủy bid sau khi đặt</li>
                <li>Người thắng được hiển thị TOP trên trang chủ trong 1 tuần</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bid History */}
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h3 className="font-bold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Lịch sử đấu giá
            </h3>
          </div>
          <div className="max-h-[300px] overflow-y-auto divide-y">
            {bidHistory.length > 0 ? (
              bidHistory.map((bid) => (
                <div key={bid.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                      bid.position === 1 ? 'bg-yellow-500' :
                      bid.position === 2 ? 'bg-gray-400' : 'bg-amber-600'
                    }`}>
                      {bid.position}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{bid.shopName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(bid.createdAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-primary">{formatPrice(bid.amount)}đ</span>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-muted-foreground">
                Chưa có lượt đấu giá nào
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bid Modal */}
      {bidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-primary to-primary/80 text-white">
              <h3 className="text-lg font-bold">Đặt giá vị trí #{bidModal.position}</h3>
              <button onClick={() => setBidModal(null)} className="p-1 hover:bg-white/20 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {bidSuccess ? (
                <div className="text-center py-6">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <p className="text-xl font-bold text-green-700">Đặt giá thành công!</p>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Giá hiện tại</p>
                    <p className="text-2xl font-bold">{formatPrice(bidModal.currentAmount)}đ</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Giá tối thiểu</p>
                    <p className="text-lg font-medium text-primary">
                      {formatPrice(getMinBid(bidModal.position))}đ
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Số tiền đặt của bạn</label>
                    <Input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      className="text-lg font-mono"
                      placeholder="Nhập số tiền"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Số dư: {formatPrice(user?.balance || 0)}đ
                    </p>
                  </div>

                  {bidError && (
                    <div className="p-3 bg-red-50 rounded-lg text-sm text-red-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {bidError}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setBidModal(null)}
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      Hủy
                    </Button>
                    <Button
                      onClick={handleSubmitBid}
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang đặt...</>
                      ) : (
                        'Xác nhận đặt giá'
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
