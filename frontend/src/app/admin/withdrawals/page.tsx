'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { 
  Wallet, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Building2, 
  User, 
  Calendar,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  ArrowDownCircle,
  DollarSign,
} from 'lucide-react';
import { PageHeader, StatsCard, EmptyState, StatusBadge, ConfirmDialog } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/Toast';

interface Withdrawal {
  id: string;
  amount: number;
  fee: number;
  netAmount: number;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  status: string;
  rejectedReason?: string;
  adminNote?: string;
  createdAt: string;
  completedAt?: string;
  seller: {
    id: string;
    name: string;
    email: string;
    balance: number;
    sellerProfile?: {
      shopName: string;
    };
  };
}

export default function AdminWithdrawalsPage() {
  const toast = useToast();
  const { user } = useAuthStore();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0 });
  
  // Modal states
  const [approveModal, setApproveModal] = useState<{ isOpen: boolean; withdrawal: Withdrawal | null }>({ isOpen: false, withdrawal: null });
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean; withdrawal: Withdrawal | null; reason: string }>({ isOpen: false, withdrawal: null, reason: '' });
  
  // Stats
  const [stats, setStats] = useState({ pending: 0, completed: 0, rejected: 0, totalPending: 0 });

  useEffect(() => {
    if (user) {
      fetchWithdrawals();
      fetchStats();
    }
  }, [user, statusFilter, pagination.offset]);

  const fetchWithdrawals = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      params.append('limit', pagination.limit.toString());
      params.append('offset', pagination.offset.toString());

      const response = await fetch(`/api/admin/withdrawals?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data.withdrawals);
        setPagination(prev => ({ ...prev, total: data.total }));
      }
    } catch (error) {
      console.error('Failed to fetch withdrawals:', error);
      toast.error('Không thể tải danh sách rút tiền');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch pending count
      const pendingRes = await fetch('/api/admin/withdrawals?status=PENDING&limit=1000', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      const completedRes = await fetch('/api/admin/withdrawals?status=COMPLETED&limit=1', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      const rejectedRes = await fetch('/api/admin/withdrawals?status=REJECTED&limit=1', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (pendingRes.ok && completedRes.ok && rejectedRes.ok) {
        const pendingData = await pendingRes.json();
        const completedData = await completedRes.json();
        const rejectedData = await rejectedRes.json();
        
        const totalPending = pendingData.withdrawals.reduce((sum: number, w: Withdrawal) => sum + w.netAmount, 0);
        
        setStats({
          pending: pendingData.total,
          completed: completedData.total,
          rejected: rejectedData.total,
          totalPending,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleApprove = async () => {
    if (!approveModal.withdrawal) return;
    setProcessingId(approveModal.withdrawal.id);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/withdrawals/${approveModal.withdrawal.id}/approve`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      if (response.ok) {
        toast.success('Đã duyệt yêu cầu rút tiền!');
        fetchWithdrawals();
        fetchStats();
      } else {
        const data = await response.json();
        toast.error(data.message || 'Có lỗi xảy ra!');
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra!');
    } finally {
      setProcessingId(null);
      setApproveModal({ isOpen: false, withdrawal: null });
    }
  };

  const handleReject = async () => {
    if (!rejectModal.withdrawal || !rejectModal.reason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }
    
    setProcessingId(rejectModal.withdrawal.id);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/withdrawals/${rejectModal.withdrawal.id}/reject`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: rejectModal.reason }),
      });
      
      if (response.ok) {
        toast.success('Đã từ chối yêu cầu rút tiền!');
        fetchWithdrawals();
        fetchStats();
      } else {
        const data = await response.json();
        toast.error(data.message || 'Có lỗi xảy ra!');
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra!');
    } finally {
      setProcessingId(null);
      setRejectModal({ isOpen: false, withdrawal: null, reason: '' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full flex items-center gap-1"><Clock className="w-3 h-3" /> Chờ duyệt</span>;
      case 'PROCESSING':
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Đang xử lý</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Hoàn thành</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full flex items-center gap-1"><XCircle className="w-3 h-3" /> Từ chối</span>;
      default:
        return <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">{status}</span>;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
  };

  const filteredWithdrawals = withdrawals.filter(w => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      w.seller.name?.toLowerCase().includes(query) ||
      w.seller.email?.toLowerCase().includes(query) ||
      w.bankAccount?.toLowerCase().includes(query) ||
      w.bankHolder?.toLowerCase().includes(query) ||
      w.seller.sellerProfile?.shopName?.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý rút tiền</h1>
          <p className="text-gray-600">Duyệt và quản lý các yêu cầu rút tiền của seller</p>
        </div>
        <Button onClick={() => { fetchWithdrawals(); fetchStats(); }} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-yellow-600">Chờ duyệt</p>
              <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-600">Tổng chờ thanh toán</p>
              <p className="text-xl font-bold text-blue-700">{formatPrice(stats.totalPending)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-green-600">Đã duyệt</p>
              <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-red-600">Đã từ chối</p>
              <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Tìm theo tên, email, STK..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination(prev => ({ ...prev, offset: 0 }));
            }}
            className="h-10 px-3 border border-gray-200 rounded-lg text-sm min-w-[150px]"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Chờ duyệt</option>
            <option value="COMPLETED">Đã duyệt</option>
            <option value="REJECTED">Đã từ chối</option>
          </select>
        </div>
      </div>

      {/* Withdrawals List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-12 h-12 text-blue-600 mx-auto animate-spin" />
            <p className="text-gray-500 mt-4">Đang tải...</p>
          </div>
        ) : filteredWithdrawals.length === 0 ? (
          <div className="p-12 text-center">
            <ArrowDownCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Không có yêu cầu rút tiền</h3>
            <p className="text-gray-500">Chưa có yêu cầu rút tiền nào {statusFilter ? 'với trạng thái này' : ''}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Seller</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Ngân hàng</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Số tiền</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Trạng thái</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Ngày tạo</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredWithdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{withdrawal.seller.name || 'N/A'}</p>
                        <p className="text-sm text-gray-500">{withdrawal.seller.email}</p>
                        {withdrawal.seller.sellerProfile?.shopName && (
                          <p className="text-xs text-blue-600">{withdrawal.seller.sellerProfile.shopName}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{withdrawal.bankName}</span>
                        </div>
                        <p className="text-sm text-gray-600">{withdrawal.bankAccount}</p>
                        <p className="text-xs text-gray-500">{withdrawal.bankHolder}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="text-lg font-bold text-gray-900">{formatPrice(withdrawal.amount)}</p>
                      <p className="text-xs text-gray-500">Phí: {formatPrice(withdrawal.fee)}</p>
                      <p className="text-sm font-medium text-green-600">Nhận: {formatPrice(withdrawal.netAmount)}</p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {getStatusBadge(withdrawal.status)}
                      {withdrawal.rejectedReason && (
                        <p className="text-xs text-red-500 mt-1 max-w-[150px] truncate" title={withdrawal.rejectedReason}>
                          {withdrawal.rejectedReason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-600">
                        {new Date(withdrawal.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(withdrawal.createdAt).toLocaleTimeString('vi-VN')}
                      </div>
                      {withdrawal.completedAt && (
                        <div className="text-xs text-green-600 mt-1">
                          Xử lý: {new Date(withdrawal.completedAt).toLocaleDateString('vi-VN')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {withdrawal.status === 'PENDING' && (
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => setApproveModal({ isOpen: true, withdrawal })}
                            disabled={processingId === withdrawal.id}
                          >
                            {processingId === withdrawal.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => setRejectModal({ isOpen: true, withdrawal, reason: '' })}
                            disabled={processingId === withdrawal.id}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Hiển thị {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} / {pagination.total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset - prev.limit }))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-3 py-1 text-sm text-gray-600">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {approveModal.isOpen && approveModal.withdrawal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Xác nhận duyệt rút tiền</h2>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{approveModal.withdrawal.seller.name}</p>
                    <p className="text-sm text-gray-500">{approveModal.withdrawal.seller.email}</p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ngân hàng:</span>
                    <span className="font-medium">{approveModal.withdrawal.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Số TK:</span>
                    <span className="font-medium">{approveModal.withdrawal.bankAccount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Chủ TK:</span>
                    <span className="font-medium">{approveModal.withdrawal.bankHolder}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="text-gray-500">Số tiền chuyển:</span>
                    <span className="font-bold text-green-600 text-lg">{formatPrice(approveModal.withdrawal.netAmount)}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <p className="text-sm text-yellow-700">
                  Vui lòng đảm bảo đã chuyển tiền cho seller trước khi duyệt yêu cầu này.
                </p>
              </div>
            </div>
            
            <div className="p-5 border-t border-gray-200 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setApproveModal({ isOpen: false, withdrawal: null })}
              >
                Hủy
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleApprove}
                disabled={processingId === approveModal.withdrawal.id}
              >
                {processingId === approveModal.withdrawal.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Xác nhận duyệt
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.isOpen && rejectModal.withdrawal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Từ chối rút tiền</h2>
              <button onClick={() => setRejectModal({ isOpen: false, withdrawal: null, reason: '' })} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">Yêu cầu từ</p>
                <p className="font-medium text-gray-900">{rejectModal.withdrawal.seller.name}</p>
                <p className="text-lg font-bold text-gray-900 mt-2">{formatPrice(rejectModal.withdrawal.amount)}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lý do từ chối <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectModal.reason}
                  onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Nhập lý do từ chối..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                />
              </div>
              
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">
                  Số tiền sẽ được hoàn lại vào số dư của seller.
                </p>
              </div>
            </div>
            
            <div className="p-5 border-t border-gray-200 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRejectModal({ isOpen: false, withdrawal: null, reason: '' })}
              >
                Hủy
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={handleReject}
                disabled={processingId === rejectModal.withdrawal.id || !rejectModal.reason.trim()}
              >
                {processingId === rejectModal.withdrawal.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Từ chối
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
