'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/admin';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { 
  Gavel, 
  Loader2, 
  Trophy, 
  Calendar,
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw
} from 'lucide-react';

interface Auction {
  id: string;
  weekNumber: number;
  year: number;
  startTime: string;
  endTime: string;
  status: string;
  totalBids: number;
  winners: { position: number; shopName: string; amount: number }[];
  revenue: number;
}

interface Position {
  position: number;
  highestBid: {
    id: string;
    amount: number;
    sellerId: string;
    shopName: string;
    createdAt: string;
  } | null;
  bidCount: number;
}

interface CurrentAuction {
  id: string;
  weekNumber: number;
  year: number;
  startTime: string;
  endTime: string;
  status: string;
  positions: Position[];
  totalBids: number;
}

export default function AdminAuctionPage() {
  const router = useRouter();
  const { user, token, checkAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [currentAuction, setCurrentAuction] = useState<CurrentAuction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'finalize' | 'cancel' | null;
    auctionId: string | null;
  }>({ isOpen: false, type: null, auctionId: null });

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      fetchData();
    };
    init();
  }, []);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
    }
  }, [user, isLoading]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [auctionsRes, currentRes] = await Promise.all([
        fetch('/api/admin/auction/list', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/auction/current'),
      ]);

      const auctionsData = await auctionsRes.json();
      const currentData = await currentRes.json();

      if (auctionsData.success) {
        setAuctions(auctionsData.auctions);
      }
      if (currentData.success) {
        setCurrentAuction(currentData.auction);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalizeClick = (auctionId: string) => {
    setConfirmDialog({ isOpen: true, type: 'finalize', auctionId });
  };

  const handleCancelClick = (auctionId: string) => {
    setConfirmDialog({ isOpen: true, type: 'cancel', auctionId });
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog.auctionId || !confirmDialog.type) return;

    setIsProcessing(true);
    try {
      const endpoint = confirmDialog.type === 'finalize' ? 'finalize' : 'cancel';
      const res = await fetch(`/api/admin/auction/${confirmDialog.auctionId}/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        fetchData();
        setConfirmDialog({ isOpen: false, type: null, auctionId: null });
      }
    } catch (error) {
      console.error(`Error ${confirmDialog.type}ing auction:`, error);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('vi-VN').format(price);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeRemaining = (endTime: string) => {
    const end = new Date(endTime).getTime();
    const now = Date.now();
    const diff = end - now;
    
    if (diff <= 0) return 'Đã kết thúc';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Đang diễn ra</span>;
      case 'ENDED':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Đã kết thúc</span>;
      case 'CANCELLED':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Đã hủy</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Đấu giá"
        description="Theo dõi và quản lý các phiên đấu giá gian hàng TOP"
        icon={<Gavel className="w-8 h-8" />}
        actions={
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Làm mới
          </Button>
        }
      />

      {/* Current Auction */}
      {currentAuction && (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Đấu giá đang diễn ra</h2>
                <p className="text-primary-foreground/80 text-sm">
                  Tuần {currentAuction.weekNumber}/{currentAuction.year}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>Còn lại: {getTimeRemaining(currentAuction.endTime)}</span>
                </div>
                <p className="text-xs text-primary-foreground/70 mt-1">
                  Kết thúc: {formatDate(currentAuction.endTime)}
                </p>
              </div>
            </div>
          </div>

          {/* Positions */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {currentAuction.positions.map((pos) => (
                <div key={pos.position} className="border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      pos.position === 1 ? 'bg-yellow-500' :
                      pos.position === 2 ? 'bg-gray-400' : 'bg-amber-600'
                    }`}>
                      {pos.position}
                    </div>
                    <span className="font-medium">Vị trí #{pos.position}</span>
                  </div>
                  
                  {pos.highestBid ? (
                    <>
                      <p className="text-2xl font-bold text-primary">
                        {formatPrice(pos.highestBid.amount)}đ
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {pos.highestBid.shopName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pos.bidCount} lượt đấu giá
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Chưa có bid</p>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            {currentAuction.status === 'ACTIVE' && (
              <div className="flex gap-3">
                <Button
                  onClick={() => handleFinalizeClick(currentAuction.id)}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Kết thúc ngay
                </Button>
                <Button
                  onClick={() => handleCancelClick(currentAuction.id)}
                  disabled={isProcessing}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Hủy đấu giá
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{auctions.length}</p>
              <p className="text-sm text-muted-foreground">Tổng phiên</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {formatPrice(auctions.reduce((sum, a) => sum + a.revenue, 0))}đ
              </p>
              <p className="text-sm text-muted-foreground">Tổng doanh thu</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {auctions.reduce((sum, a) => sum + a.totalBids, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Tổng lượt bid</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {auctions.filter(a => a.status === 'ENDED').length}
              </p>
              <p className="text-sm text-muted-foreground">Đã hoàn thành</p>
            </div>
          </div>
        </div>
      </div>

      {/* Auction History */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-bold">Lịch sử đấu giá</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Tuần</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Thời gian</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Trạng thái</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Lượt bid</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Người thắng</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Doanh thu</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {auctions.map((auction) => (
                <tr key={auction.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <span className="font-medium">Tuần {auction.weekNumber}/{auction.year}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(auction.endTime)}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(auction.status)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {auction.totalBids}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {auction.winners.length > 0 ? (
                      <div className="space-y-1">
                        {auction.winners.map((w) => (
                          <div key={w.position} className="flex items-center gap-1">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${
                              w.position === 1 ? 'bg-yellow-500' :
                              w.position === 2 ? 'bg-gray-400' : 'bg-amber-600'
                            }`}>
                              {w.position}
                            </span>
                            <span>{w.shopName}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatPrice(auction.revenue)}đ
                  </td>
                </tr>
              ))}
              
              {auctions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Chưa có phiên đấu giá nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: null, auctionId: null })}
        onConfirm={handleConfirmAction}
        title={confirmDialog.type === 'finalize' ? 'Kết thúc đấu giá' : 'Hủy đấu giá'}
        description={
          confirmDialog.type === 'finalize'
            ? 'Bạn có chắc muốn kết thúc đấu giá này? Hành động này không thể hoàn tác.'
            : 'Bạn có chắc muốn hủy đấu giá này? Tất cả tiền đặt cọc sẽ được hoàn lại.'
        }
        confirmText={confirmDialog.type === 'finalize' ? 'Kết thúc' : 'Hủy đấu giá'}
        cancelText="Đóng"
        variant={confirmDialog.type === 'finalize' ? 'warning' : 'danger'}
        isLoading={isProcessing}
        icon={confirmDialog.type === 'finalize' ? <CheckCircle className="w-7 h-7" /> : <XCircle className="w-7 h-7" />}
      />
    </div>
  );
}
