'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import {
  Wallet,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Building2,
  AlertCircle,
  Lock,
  MessageCircle,
  Info,
  Eye,
  EyeOff
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

interface BankInfo {
  hasBankInfo: boolean;
  bankName: string | null;
  bankAccount: string | null;
  bankHolder: string | null;
  bankBranch: string | null;
  bankInfoAddedAt: string | null;
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
  const [showBankModal, setShowBankModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [error, setError] = useState('');
  const [cancelDialog, setCancelDialog] = useState<{ isOpen: boolean; withdrawalId: string | null }>({
    isOpen: false,
    withdrawalId: null,
  });
  const [isCanceling, setIsCanceling] = useState(false);

  // Bank info state
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [bankFormData, setBankFormData] = useState({
    bankName: '',
    bankAccount: '',
    bankHolder: '',
    bankBranch: '',
  });
  const [bankError, setBankError] = useState('');
  const [isAddingBank, setIsAddingBank] = useState(false);

  // Fee preview state
  const [feePreview, setFeePreview] = useState<{
    feeRate: number;
    fee: number;
    netAmount: number;
    freeWithdrawalsLeftThisWeek: number;
    message: string;
  } | null>(null);
  const [isLoadingFee, setIsLoadingFee] = useState(false);

  // PIN state for withdrawal
  const [withdrawPin, setWithdrawPin] = useState('');
  const [showWithdrawPin, setShowWithdrawPin] = useState(false);
  const [hasPinSet, setHasPinSet] = useState(false);

  useEffect(() => {
    fetchWithdrawals();
    fetchBankInfo();
    fetchFeePreview(0); // Get initial fee info
    fetchPinStatus();
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

  const fetchBankInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/seller/bank-info', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setBankInfo(data);
      }
    } catch (error) {
      console.error('Error fetching bank info:', error);
    }
  };

  const fetchFeePreview = async (amount: number) => {
    setIsLoadingFee(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/seller/withdrawals/fee-preview?amount=${amount}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setFeePreview(data);
      }
    } catch (error) {
      console.error('Error fetching fee preview:', error);
    } finally {
      setIsLoadingFee(false);
    }
  };

  const fetchPinStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/seller/withdrawal-pin/status', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setHasPinSet(data.hasPin);
      }
    } catch (error) {
      console.error('Error fetching PIN status:', error);
    }
  };

  // Update fee preview when amount changes
  useEffect(() => {
    const amount = parseInt(withdrawAmount) || 0;
    if (amount >= 10000) {
      const timeoutId = setTimeout(() => {
        fetchFeePreview(amount);
      }, 300); // Debounce
      return () => clearTimeout(timeoutId);
    }
  }, [withdrawAmount]);

  const handleAddBankInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankError('');

    if (!bankFormData.bankName || !bankFormData.bankAccount || !bankFormData.bankHolder) {
      setBankError('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    setIsAddingBank(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/seller/bank-info', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bankFormData),
      });

      if (response.ok) {
        await fetchBankInfo();
        setShowBankModal(false);
        setBankFormData({ bankName: '', bankAccount: '', bankHolder: '', bankBranch: '' });
      } else {
        const data = await response.json();
        setBankError(data.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error adding bank info:', error);
      setBankError('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsAddingBank(false);
    }
  };

  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amount = parseInt(withdrawAmount);
    if (!amount || amount < 10000) {
      setError('Số tiền rút tối thiểu là 10.000đ');
      return;
    }

    if (amount > (user?.balance || 0)) {
      setError('Số dư không đủ');
      return;
    }

    if (!withdrawPin || withdrawPin.length !== 6) {
      setError('Vui lòng nhập mã PIN 6 chữ số');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/seller/withdrawals', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, pin: withdrawPin }),
      });

      if (response.ok) {
        setShowModal(false);
        setWithdrawAmount('');
        setWithdrawPin('');
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

  const handleOpenWithdrawModal = () => {
    if (!bankInfo?.hasBankInfo) {
      // Pre-fill bankHolder with user's name
      const removeAccents = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const userName = user?.name ? removeAccents(user.name).toUpperCase() : '';
      setBankFormData(prev => ({ ...prev, bankHolder: userName }));
      setShowBankModal(true);
    } else if (!hasPinSet) {
      setError('Bạn cần tạo mã PIN rút tiền trước. Vui lòng vào phần Cài đặt cửa hàng.');
    } else {
      setWithdrawPin('');
      setShowWithdrawPin(false);
      setShowModal(true);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rút tiền</h1>
          <p className="text-gray-600">Rút tiền về tài khoản ngân hàng</p>
        </div>
        <Button onClick={handleOpenWithdrawModal} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Tạo yêu cầu rút tiền
        </Button>
      </div>

      {/* Error banner (for errors set outside of modals) */}
      {error && !showModal && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PIN not set warning */}
      {!hasPinSet && bankInfo?.hasBankInfo && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Chưa tạo mã PIN rút tiền</p>
            <p className="text-sm text-amber-700 mt-1">
              Bạn cần tạo mã PIN 6 chữ số trước khi rút tiền.{' '}
              <a href="/seller/settings" className="text-blue-600 hover:underline font-medium">Vào cài đặt cửa hàng →</a>
            </p>
          </div>
        </div>
      )}

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
        <div className="flex flex-wrap gap-2 text-sm">
          {feePreview && feePreview.freeWithdrawalsLeftThisWeek > 0 ? (
            <span className="px-3 py-1 bg-green-500/20 rounded-full text-green-100">
              Còn {feePreview.freeWithdrawalsLeftThisWeek} lần miễn phí trong tuần
            </span>
          ) : feePreview ? (
            <span className="px-3 py-1 bg-yellow-500/20 rounded-full text-yellow-100">
              Phí rút tiền lần này: {feePreview.feeRate}%
            </span>
          ) : (
            <span className="text-blue-200">Miễn phí 2 lần/tuần • Từ lần 3: 3%→6%→9%...</span>
          )}
          <span className="px-3 py-1 bg-white/10 rounded-full text-blue-200">
            Rút tối thiểu: 10.000đ
          </span>
        </div>
      </div>

      {/* Bank Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-500" />
            Thông tin ngân hàng
          </h2>
          {!bankInfo?.hasBankInfo && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const removeAccents = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const userName = user?.name ? removeAccents(user.name).toUpperCase() : '';
                setBankFormData(prev => ({ ...prev, bankHolder: userName }));
                setShowBankModal(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Thêm ngân hàng
            </Button>
          )}
        </div>

        <div className="p-4">
          {!bankInfo?.hasBankInfo ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Bạn chưa thêm thông tin ngân hàng</p>
              <p className="text-sm text-gray-500 mb-4">
                Vui lòng thêm thông tin ngân hàng để có thể rút tiền
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">Thông tin ngân hàng đã được khóa</p>
                  <p className="text-amber-700 mt-1">
                    Để đảm bảo an toàn, thông tin ngân hàng chỉ có thể thêm một lần và không thể chỉnh sửa.
                    Nếu cần thay đổi, vui lòng{' '}
                    <Link href="/seller/messages" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      liên hệ hỗ trợ
                    </Link>
                    .
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Ngân hàng</p>
                  <p className="font-medium text-gray-900">{bankInfo.bankName}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Chi nhánh</p>
                  <p className="font-medium text-gray-900">{bankInfo.bankBranch || 'Không có'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Số tài khoản</p>
                  <p className="font-medium text-gray-900">{bankInfo.bankAccount}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Chủ tài khoản</p>
                  <p className="font-medium text-gray-900">{bankInfo.bankHolder}</p>
                </div>
              </div>

              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Đã thêm vào: {bankInfo.bankInfoAddedAt ? new Date(bankInfo.bankInfoAddedAt).toLocaleString('vi-VN') : 'N/A'}
              </p>
            </div>
          )}
        </div>
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

      {/* Add Bank Info Modal */}
      {showBankModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Thêm thông tin ngân hàng</h2>
              <button onClick={() => setShowBankModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
            </div>

            <form onSubmit={handleAddBankInfo} className="p-4 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Lưu ý quan trọng</p>
                    <p className="mt-1">Thông tin ngân hàng chỉ có thể thêm một lần và không thể chỉnh sửa sau đó. Vui lòng kiểm tra kỹ trước khi lưu.</p>
                  </div>
                </div>
              </div>

              {bankError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {bankError}
                </div>
              )}

              <div className="space-y-2">
                <Label>Ngân hàng *</Label>
                <select
                  value={bankFormData.bankName}
                  onChange={(e) => setBankFormData(prev => ({ ...prev, bankName: e.target.value }))}
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
                <Label>Chi nhánh (không bắt buộc)</Label>
                <Input
                  placeholder="VD: Chi nhánh Quận 1"
                  value={bankFormData.bankBranch}
                  onChange={(e) => setBankFormData(prev => ({ ...prev, bankBranch: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Số tài khoản *</Label>
                <Input
                  placeholder="Nhập số tài khoản"
                  value={bankFormData.bankAccount}
                  onChange={(e) => setBankFormData(prev => ({ ...prev, bankAccount: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Tên chủ tài khoản *</Label>
                <Input
                  placeholder="Nhập tên chủ tài khoản (không dấu, viết hoa)"
                  value={bankFormData.bankHolder}
                  onChange={(e) => {
                    // Remove accents and convert to uppercase
                    const removeAccents = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    setBankFormData(prev => ({ ...prev, bankHolder: removeAccents(e.target.value).toUpperCase() }));
                  }}
                  required
                />
                <p className="text-xs text-gray-500">
                  Tên phải trùng khớp với tên đăng ký tài khoản ngân hàng
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowBankModal(false)}>
                  Hủy
                </Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={isAddingBank}>
                  {isAddingBank ? 'Đang lưu...' : 'Lưu thông tin'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Withdrawal Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Tạo yêu cầu rút tiền</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
            </div>

            <form onSubmit={handleSubmitWithdrawal} className="p-4 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {/* Bank Info Summary */}
              <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                <p className="text-sm font-medium text-gray-700">Tài khoản nhận tiền:</p>
                <div className="text-sm">
                  <p className="text-gray-900">{bankInfo?.bankName}</p>
                  <p className="text-gray-600">{bankInfo?.bankAccount} • {bankInfo?.bankHolder}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Số tiền rút</Label>
                <Input
                  type="number"
                  placeholder="Nhập số tiền"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  min="10000"
                  max={user?.balance || 0}
                />
                <p className="text-xs text-gray-500">Số dư: {(user?.balance || 0).toLocaleString('vi-VN')}đ</p>
              </div>

              {withdrawAmount && parseInt(withdrawAmount) >= 10000 && feePreview && (
                <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                  {feePreview.freeWithdrawalsLeftThisWeek > 0 ? (
                    <div className="text-sm text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Miễn phí! Còn {feePreview.freeWithdrawalsLeftThisWeek} lần miễn phí trong tuần
                    </div>
                  ) : (
                    <div className="text-sm text-amber-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      Bạn đã hết lượt rút miễn phí trong tuần
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Phí ({feePreview.feeRate}%)</span>
                    <span className="text-gray-900">{feePreview.fee > 0 ? `-${feePreview.fee.toLocaleString('vi-VN')}đ` : 'Miễn phí'}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-900">Thực nhận</span>
                    <span className="text-green-600">{feePreview.netAmount.toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>
              )}

              {/* PIN Input */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-purple-500" />
                  Mã PIN rút tiền
                </Label>
                <div className="relative">
                  <Input
                    type={showWithdrawPin ? 'text' : 'password'}
                    placeholder="Nhập mã PIN 6 chữ số"
                    value={withdrawPin}
                    onChange={(e) => setWithdrawPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWithdrawPin(!showWithdrawPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showWithdrawPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
