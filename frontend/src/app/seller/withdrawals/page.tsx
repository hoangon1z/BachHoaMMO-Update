'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { 
  Wallet, 
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Building2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';

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
  createdAt: string;
  completedAt?: string;
}

// Danh sách ngân hàng Việt Nam đầy đủ
const BANKS = [
  // Ngân hàng thương mại cổ phần nhà nước
  { code: 'VCB', name: 'Vietcombank - Ngân hàng TMCP Ngoại thương Việt Nam' },
  { code: 'BIDV', name: 'BIDV - Ngân hàng TMCP Đầu tư và Phát triển Việt Nam' },
  { code: 'CTG', name: 'VietinBank - Ngân hàng TMCP Công thương Việt Nam' },
  { code: 'AGR', name: 'Agribank - Ngân hàng Nông nghiệp và Phát triển Nông thôn' },
  
  // Ngân hàng thương mại cổ phần tư nhân lớn
  { code: 'TCB', name: 'Techcombank - Ngân hàng TMCP Kỹ thương Việt Nam' },
  { code: 'MBB', name: 'MB Bank - Ngân hàng TMCP Quân đội' },
  { code: 'ACB', name: 'ACB - Ngân hàng TMCP Á Châu' },
  { code: 'VPB', name: 'VPBank - Ngân hàng TMCP Việt Nam Thịnh Vượng' },
  { code: 'STB', name: 'Sacombank - Ngân hàng TMCP Sài Gòn Thương Tín' },
  { code: 'TPB', name: 'TPBank - Ngân hàng TMCP Tiên Phong' },
  { code: 'HDB', name: 'HDBank - Ngân hàng TMCP Phát triển TP.HCM' },
  { code: 'VIB', name: 'VIB - Ngân hàng TMCP Quốc tế Việt Nam' },
  { code: 'SHB', name: 'SHB - Ngân hàng TMCP Sài Gòn - Hà Nội' },
  { code: 'EIB', name: 'Eximbank - Ngân hàng TMCP Xuất Nhập Khẩu Việt Nam' },
  { code: 'MSB', name: 'MSB - Ngân hàng TMCP Hàng Hải Việt Nam' },
  { code: 'LPB', name: 'LienVietPostBank - Ngân hàng TMCP Bưu điện Liên Việt' },
  { code: 'OCB', name: 'OCB - Ngân hàng TMCP Phương Đông' },
  { code: 'NAB', name: 'Nam A Bank - Ngân hàng TMCP Nam Á' },
  { code: 'SCB', name: 'SCB - Ngân hàng TMCP Sài Gòn' },
  { code: 'SSB', name: 'SeABank - Ngân hàng TMCP Đông Nam Á' },
  { code: 'PGB', name: 'PGBank - Ngân hàng TMCP Xăng dầu Petrolimex' },
  { code: 'BVB', name: 'Bac A Bank - Ngân hàng TMCP Bắc Á' },
  { code: 'ABB', name: 'ABBank - Ngân hàng TMCP An Bình' },
  { code: 'KLB', name: 'Kienlongbank - Ngân hàng TMCP Kiên Long' },
  { code: 'VAB', name: 'VietABank - Ngân hàng TMCP Việt Á' },
  { code: 'SAIGONBANK', name: 'Saigonbank - Ngân hàng TMCP Sài Gòn Công Thương' },
  { code: 'NCB', name: 'NCB - Ngân hàng TMCP Quốc Dân' },
  { code: 'VRB', name: 'VRB - Ngân hàng Liên doanh Việt - Nga' },
  { code: 'PVB', name: 'PVcomBank - Ngân hàng TMCP Đại Chúng Việt Nam' },
  { code: 'VIETBANK', name: 'VietBank - Ngân hàng TMCP Việt Nam Thương Tín' },
  { code: 'BaoVietBank', name: 'BaoVietBank - Ngân hàng TMCP Bảo Việt' },
  { code: 'GPB', name: 'GPBank - Ngân hàng TMCP Dầu khí Toàn cầu' },
  { code: 'CAKE', name: 'CAKE by VPBank - Ngân hàng số CAKE' },
  { code: 'Ubank', name: 'Ubank by VPBank - Ngân hàng số Ubank' },
  { code: 'TIMO', name: 'Timo by Bản Việt - Ngân hàng số Timo' },
  
  // Ví điện tử (hỗ trợ rút tiền)
  { code: 'MOMO', name: 'MoMo - Ví điện tử MoMo' },
  { code: 'ZALOPAY', name: 'ZaloPay - Ví điện tử ZaloPay' },
  { code: 'VNPAY', name: 'VNPAY - Ví điện tử VNPAY' },
];

export default function SellerWithdrawalsPage() {
  const { user } = useAuthStore();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [formData, setFormData] = useState({
    amount: '',
    bankName: '',
    bankAccount: '',
    bankHolder: '',
  });
  const [error, setError] = useState('');
  const [cancelDialog, setCancelDialog] = useState<{ isOpen: boolean; withdrawalId: string | null }>({
    isOpen: false,
    withdrawalId: null,
  });
  const [isCanceling, setIsCanceling] = useState(false);

  useEffect(() => {
    fetchWithdrawals();
  }, [pagination.page]);

  const fetchWithdrawals = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      const response = await fetch(
        `/api/seller/withdrawals?${params}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data.withdrawals);
        setPagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amount = parseInt(formData.amount);
    if (!amount || amount < 10000) {
      setError('Số tiền rút tối thiểu là 10.000đ');
      return;
    }

    if (amount > (user?.balance || 0)) {
      setError('Số dư không đủ');
      return;
    }

    if (!formData.bankName || !formData.bankAccount || !formData.bankHolder) {
      setError('Vui lòng điền đầy đủ thông tin ngân hàng');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/seller/withdrawals`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount,
            bankName: formData.bankName,
            bankAccount: formData.bankAccount,
            bankHolder: formData.bankHolder,
          }),
        }
      );

      if (response.ok) {
        setShowModal(false);
        setFormData({ amount: '', bankName: '', bankAccount: '', bankHolder: '' });
        fetchWithdrawals();
        // Refresh user balance
        window.location.reload();
      } else {
        const data = await response.json();
        setError(data.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error creating withdrawal:', error);
      setError('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = (id: string) => {
    setCancelDialog({ isOpen: true, withdrawalId: id });
  };

  const handleCancelConfirm = async () => {
    if (!cancelDialog.withdrawalId) return;

    setIsCanceling(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/seller/withdrawals/${cancelDialog.withdrawalId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (response.ok) {
        fetchWithdrawals();
        setCancelDialog({ isOpen: false, withdrawalId: null });
        window.location.reload();
      }
    } catch (error) {
      console.error('Error canceling withdrawal:', error);
    } finally {
      setIsCanceling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full flex items-center gap-1"><Clock className="w-3 h-3" /> Chờ duyệt</span>;
      case 'PROCESSING':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Đang xử lý</span>;
      case 'COMPLETED':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Hoàn thành</span>;
      case 'REJECTED':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full flex items-center gap-1"><XCircle className="w-3 h-3" /> Từ chối</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">{status}</span>;
    }
  };

  const fee = formData.amount ? Math.round(parseInt(formData.amount) * 0.02) : 0;
  const netAmount = formData.amount ? parseInt(formData.amount) - fee : 0;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rút tiền</h1>
          <p className="text-gray-600">Rút tiền về tài khoản ngân hàng</p>
        </div>
        <Button onClick={() => {
          // Pre-fill bankHolder with user's name (uppercase, no accents for bank compatibility)
          const removeAccents = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const userName = user?.name ? removeAccents(user.name).toUpperCase() : '';
          setFormData(prev => ({ ...prev, bankHolder: userName }));
          setShowModal(true);
        }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Tạo yêu cầu rút tiền
        </Button>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-blue-100">Số dư khả dụng</p>
            <p className="text-3xl font-bold">{(user?.balance || 0).toLocaleString('vi-VN')}đ</p>
          </div>
        </div>
        <p className="text-sm text-blue-200">Phí rút tiền: 2% • Rút tối thiểu: 10.000đ</p>
      </div>

      {/* Withdrawals List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Lịch sử rút tiền</h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="p-8 text-center">
            <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Chưa có yêu cầu rút tiền nào</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {withdrawals.map((withdrawal) => (
              <div key={withdrawal.id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-900">{withdrawal.bankName}</span>
                      {getStatusBadge(withdrawal.status)}
                    </div>
                    <p className="text-sm text-gray-500">
                      {withdrawal.bankAccount} • {withdrawal.bankHolder}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(withdrawal.createdAt).toLocaleString('vi-VN')}
                    </p>
                    {withdrawal.rejectedReason && (
                      <p className="text-sm text-red-600 mt-1">Lý do: {withdrawal.rejectedReason}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{withdrawal.amount.toLocaleString('vi-VN')}đ</p>
                    <p className="text-sm text-gray-500">
                      Phí: {withdrawal.fee.toLocaleString('vi-VN')}đ
                    </p>
                    <p className="text-sm text-green-600 font-medium">
                      Nhận: {withdrawal.netAmount.toLocaleString('vi-VN')}đ
                    </p>
                  </div>
                  {withdrawal.status === 'PENDING' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleCancelClick(withdrawal.id)}
                    >
                      Hủy
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">Trang {pagination.page} / {pagination.totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>Trước</Button>
              <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>Sau</Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Withdrawal Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Tạo yêu cầu rút tiền</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label>Số tiền rút</Label>
                <Input
                  type="number"
                  placeholder="Nhập số tiền"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  min="10000"
                  max={user?.balance || 0}
                />
                <p className="text-xs text-gray-500">Số dư: {(user?.balance || 0).toLocaleString('vi-VN')}đ</p>
              </div>

              {formData.amount && parseInt(formData.amount) >= 10000 && (
                <div className="p-3 bg-blue-50 rounded-lg space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Phí (2%)</span>
                    <span className="text-gray-900">-{fee.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-900">Thực nhận</span>
                    <span className="text-green-600">{netAmount.toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Ngân hàng</Label>
                <select
                  value={formData.bankName}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm"
                  required
                >
                  <option value="">Chọn ngân hàng</option>
                  {BANKS.map(bank => (
                    <option key={bank.code} value={bank.name}>{bank.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Số tài khoản</Label>
                <Input
                  placeholder="Nhập số tài khoản"
                  value={formData.bankAccount}
                  onChange={(e) => setFormData(prev => ({ ...prev, bankAccount: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Tên chủ tài khoản</Label>
                <Input
                  placeholder="Nhập tên chủ tài khoản (không dấu, viết hoa)"
                  value={formData.bankHolder}
                  onChange={(e) => {
                    // Remove accents and convert to uppercase
                    const removeAccents = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    setFormData(prev => ({ ...prev, bankHolder: removeAccents(e.target.value).toUpperCase() }));
                  }}
                  required
                />
                {!user?.name && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Bạn chưa cập nhật họ tên trong hồ sơ. Vui lòng nhập chính xác tên chủ tài khoản ngân hàng.
                  </p>
                )}
                {user?.name && (
                  <p className="text-xs text-gray-500">
                    Tên phải trùng khớp với tên đăng ký tài khoản ngân hàng
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                  Hủy
                </Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang xử lý...' : 'Tạo yêu cầu'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={cancelDialog.isOpen}
        onClose={() => setCancelDialog({ isOpen: false, withdrawalId: null })}
        onConfirm={handleCancelConfirm}
        title="Hủy yêu cầu rút tiền"
        description="Bạn có chắc muốn hủy yêu cầu rút tiền này? Số tiền sẽ được hoàn lại vào tài khoản của bạn."
        confirmText="Hủy yêu cầu"
        cancelText="Đóng"
        variant="warning"
        isLoading={isCanceling}
        icon={<XCircle className="w-7 h-7" />}
      />
    </div>
  );
}
