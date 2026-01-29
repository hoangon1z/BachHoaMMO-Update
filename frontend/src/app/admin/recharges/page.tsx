'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { CheckCircle, XCircle, Clock, CreditCard, User, Wallet, Calendar } from 'lucide-react';
import { PageHeader, StatsCard, EmptyState, StatusBadge, ConfirmDialog } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/Toast';

interface RechargeRequest {
  id: string;
  amount: number;
  status: string;
  description: string;
  createdAt: string;
  metadata?: string;
  user: {
    id: string;
    name: string;
    email: string;
    balance: number;
  };
}

export default function RechargesPage() {
  const toast = useToast();
  const { user } = useAuthStore();
  const [recharges, setRecharges] = useState<RechargeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; type: 'approve' | 'reject'; id: string | null }>({ isOpen: false, type: 'approve', id: null });

  useEffect(() => {
    if (user) fetchRecharges();
  }, [user]);

  const fetchRecharges = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/recharges/pending', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRecharges(data);
      }
    } catch (error) {
      console.error('Failed to fetch recharges:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirmModal.id) return;
    setProcessingId(confirmModal.id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/recharges/${confirmModal.id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success('Đã duyệt yêu cầu nạp tiền!');
        fetchRecharges();
      } else {
        toast.error('Có lỗi xảy ra!');
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra!');
    } finally {
      setProcessingId(null);
      setConfirmModal({ isOpen: false, type: 'approve', id: null });
    }
  };

  const handleReject = async () => {
    if (!confirmModal.id) return;
    setProcessingId(confirmModal.id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/recharges/${confirmModal.id}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success('Đã từ chối yêu cầu!');
        fetchRecharges();
      } else {
        toast.error('Có lỗi xảy ra!');
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra!');
    } finally {
      setProcessingId(null);
      setConfirmModal({ isOpen: false, type: 'reject', id: null });
    }
  };

  const totalAmount = recharges.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Duyệt nạp tiền"
        description="Xem và xử lý các yêu cầu nạp tiền từ người dùng"
        icon={<CreditCard className="w-6 h-6" />}
        breadcrumbs={[{ label: 'Duyệt nạp tiền' }]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title="Yêu cầu chờ duyệt"
          value={recharges.length}
          icon={<Clock className="w-6 h-6" />}
          color="orange"
        />
        <StatsCard
          title="Tổng số tiền"
          value={`${(totalAmount / 1000000).toFixed(1)}M`}
          subtitle={`${totalAmount.toLocaleString('vi-VN')}đ`}
          icon={<Wallet className="w-6 h-6" />}
          color="green"
        />
        <StatsCard
          title="Người dùng yêu cầu"
          value={new Set(recharges.map(r => r.user.id)).size}
          icon={<User className="w-6 h-6" />}
          color="blue"
        />
      </div>

      {/* Recharges List */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500">Đang tải yêu cầu...</p>
          </div>
        </div>
      ) : recharges.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100">
          <EmptyState
            icon={<CheckCircle className="w-10 h-10 text-green-400" />}
            title="Không có yêu cầu nào"
            description="Tất cả yêu cầu nạp tiền đã được xử lý"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {recharges.map((recharge) => (
            <div key={recharge.id} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:border-amber-200 transition-all">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <CreditCard className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-green-600">
                        {recharge.amount.toLocaleString('vi-VN')}đ
                      </h3>
                      <StatusBadge variant="warning" icon={<Clock className="w-3 h-3" />}>
                        Chờ duyệt
                      </StatusBadge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-gray-600">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{recharge.user.name}</span>
                        <span className="text-gray-400">({recharge.user.email})</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Wallet className="w-4 h-4" />
                          <span>Số dư hiện tại: <strong className="text-gray-700">{recharge.user.balance.toLocaleString('vi-VN')}đ</strong></span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(recharge.createdAt).toLocaleString('vi-VN')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setConfirmModal({ isOpen: true, type: 'reject', id: recharge.id })}
                    disabled={processingId === recharge.id}
                    variant="outline"
                    className="hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Từ chối
                  </Button>
                  <Button
                    onClick={() => setConfirmModal({ isOpen: true, type: 'approve', id: recharge.id })}
                    disabled={processingId === recharge.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Duyệt
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: 'approve', id: null })}
        onConfirm={confirmModal.type === 'approve' ? handleApprove : handleReject}
        title={confirmModal.type === 'approve' ? 'Duyệt nạp tiền' : 'Từ chối yêu cầu'}
        description={confirmModal.type === 'approve' 
          ? 'Xác nhận duyệt yêu cầu nạp tiền này? Số dư sẽ được cộng vào tài khoản người dùng.' 
          : 'Xác nhận từ chối yêu cầu nạp tiền này?'}
        confirmText={confirmModal.type === 'approve' ? 'Duyệt' : 'Từ chối'}
        variant={confirmModal.type === 'approve' ? 'info' : 'danger'}
        isLoading={!!processingId}
      />
    </div>
  );
}
