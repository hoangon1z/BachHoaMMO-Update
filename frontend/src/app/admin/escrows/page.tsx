'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { DollarSign, Clock, CheckCircle, Send, User, Store, ShoppingBag, Calendar } from 'lucide-react';
import { PageHeader, StatsCard, FilterBar, EmptyState, StatusBadge, ConfirmDialog } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/Toast';

interface Escrow {
  id: string;
  amount: number;
  status: string;
  holdUntil: string;
  releasedAt?: string;
  createdAt: string;
  order: { orderNumber: string; total: number; createdAt: string };
  buyer: { name: string; email: string };
  seller: { name: string; email: string };
}

export default function EscrowsPage() {
  const toast = useToast();
  const { user } = useAuthStore();
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [filter, setFilter] = useState<string>('HOLDING');
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });

  useEffect(() => {
    if (user) fetchEscrows();
  }, [user, filter]);

  const fetchEscrows = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = filter ? `/api/admin/escrows?status=${filter}` : '/api/admin/escrows';
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        setEscrows(data);
      }
    } catch (error) {
      console.error('Failed to fetch escrows:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRelease = async () => {
    if (!confirmModal.id) return;
    setProcessingId(confirmModal.id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/escrows/${confirmModal.id}/release`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success('Đã release escrow thành công!');
        fetchEscrows();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Không thể release');
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra!');
    } finally {
      setProcessingId(null);
      setConfirmModal({ isOpen: false, id: null });
    }
  };

  const isReleasable = (escrow: Escrow) => escrow.status === 'HOLDING' && new Date(escrow.holdUntil) <= new Date();
  const holdingTotal = escrows.filter(e => e.status === 'HOLDING').reduce((sum, e) => sum + e.amount, 0);
  const readyToRelease = escrows.filter(e => isReleasable(e)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Escrow"
        description="Quản lý các khoản tiền đang được giữ và release cho seller"
        icon={<DollarSign className="w-6 h-6" />}
        breadcrumbs={[{ label: 'Escrow' }]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Tổng escrow" value={escrows.length} icon={<DollarSign className="w-6 h-6" />} color="blue" />
        <StatsCard title="Đang giữ" value={`${(holdingTotal / 1000000).toFixed(1)}M`} subtitle={`${holdingTotal.toLocaleString('vi-VN')}đ`} icon={<Clock className="w-6 h-6" />} color="orange" />
        <StatsCard title="Sẵn sàng release" value={readyToRelease} icon={<Send className="w-6 h-6" />} color="green" />
        <StatsCard title="Đã release" value={escrows.filter(e => e.status === 'RELEASED').length} icon={<CheckCircle className="w-6 h-6" />} color="gray" />
      </div>

      {/* Filters */}
      <FilterBar
        filters={[{
          key: 'status',
          label: 'Tất cả',
          value: filter,
          options: [{ value: 'HOLDING', label: 'Đang giữ' }, { value: 'RELEASED', label: 'Đã release' }],
          onChange: setFilter,
        }]}
        showClearButton
        onClearFilters={() => setFilter('')}
      />

      {/* Escrows List */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500">Đang tải escrows...</p>
          </div>
        </div>
      ) : escrows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100">
          <EmptyState icon={<DollarSign className="w-10 h-10 text-gray-400" />} title="Không có escrow" description="Không có escrow nào phù hợp với bộ lọc" />
        </div>
      ) : (
        <div className="space-y-4">
          {escrows.map((escrow) => {
            const canRelease = isReleasable(escrow);
            const daysLeft = Math.ceil((new Date(escrow.holdUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            
            return (
              <div key={escrow.id} className={`bg-white rounded-2xl border p-6 transition-all hover:shadow-lg ${canRelease ? 'border-green-200 bg-green-50/30' : 'border-gray-100'}`}>
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-2xl font-bold text-green-600">{escrow.amount.toLocaleString('vi-VN')}đ</h3>
                      {escrow.status === 'HOLDING' ? (
                        <StatusBadge variant="warning" icon={<Clock className="w-3 h-3" />}>Đang giữ</StatusBadge>
                      ) : (
                        <StatusBadge variant="success" icon={<CheckCircle className="w-3 h-3" />}>Đã release</StatusBadge>
                      )}
                      {canRelease && <StatusBadge variant="success" dot>Sẵn sàng release</StatusBadge>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center"><ShoppingBag className="w-5 h-5 text-blue-600" /></div>
                        <div><p className="text-xs text-gray-500">Đơn hàng</p><p className="font-semibold">#{escrow.order.orderNumber}</p></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center"><User className="w-5 h-5 text-purple-600" /></div>
                        <div><p className="text-xs text-gray-500">Buyer</p><p className="font-semibold">{escrow.buyer.name}</p></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center"><Store className="w-5 h-5 text-green-600" /></div>
                        <div><p className="text-xs text-gray-500">Seller</p><p className="font-semibold">{escrow.seller.name}</p></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center"><Calendar className="w-5 h-5 text-orange-600" /></div>
                        <div>
                          <p className="text-xs text-gray-500">{escrow.status === 'HOLDING' ? 'Release vào' : 'Released lúc'}</p>
                          <p className="font-semibold">{escrow.status === 'HOLDING' ? new Date(escrow.holdUntil).toLocaleDateString('vi-VN') : escrow.releasedAt && new Date(escrow.releasedAt).toLocaleDateString('vi-VN')}</p>
                          {escrow.status === 'HOLDING' && daysLeft > 0 && <p className="text-xs text-orange-600">({daysLeft} ngày nữa)</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {escrow.status === 'HOLDING' && (
                    <Button onClick={() => setConfirmModal({ isOpen: true, id: escrow.id })} disabled={processingId === escrow.id} className={canRelease ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}>
                      <Send className="w-4 h-4 mr-2" />
                      {processingId === escrow.id ? 'Đang xử lý...' : canRelease ? 'Release ngay' : 'Release sớm'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ isOpen: false, id: null })} onConfirm={handleRelease} title="Release Escrow" description="Xác nhận release tiền cho seller? Số tiền sẽ được chuyển vào ví của seller." confirmText="Release" variant="info" isLoading={!!processingId} />
    </div>
  );
}
