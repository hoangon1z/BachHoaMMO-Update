'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, Mail, Calendar, Wallet, ShoppingBag, TrendingUp, 
  User as UserIcon, Eye, EyeOff, Key, Shield, Store, Save, 
  RefreshCw, Phone, MapPin, Crown, Package, AlertCircle, CheckCircle2, X
} from 'lucide-react';
import Link from 'next/link';

interface SellerProfile {
  id: string;
  shopName: string;
  shopDescription: string;
  shopLogo: string;
  rating: number;
  totalSales: number;
  commission: number;
  isVerified: boolean;
}

interface UserDetail {
  id: string;
  email: string;
  name: string;
  password: string;
  role: string;
  isSeller: boolean;
  avatar: string;
  phone: string;
  address: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
  sellerProfile: SellerProfile | null;
  _count: {
    orders: number;
    sales: number;
    products: number;
    transactions: number;
  };
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  createdAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  buyer?: { name: string };
  seller?: { name: string };
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sales, setSales] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'transactions' | 'orders' | 'sales'>('info');
  
  // Edit form state
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    role: '',
    isSeller: false,
    balance: 0,
  });
  
  // Password reset state
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Modal state for success/error messages
  const [modalMessage, setModalMessage] = useState<{ type: 'success' | 'error'; title: string; text: string } | null>(null);

  useEffect(() => {
    if (currentUser) {
      fetchUserDetail();
    }
  }, [currentUser, params.id]);

  const fetchUserDetail = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch user detail from new API endpoint
      const response = await fetch(`/api/admin/users/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setTransactions(data.recentTransactions || []);
        setOrders(data.recentOrders || []);
        setSales(data.recentSales || []);
        
        // Initialize form data
        setFormData({
          name: data.user.name || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          address: data.user.address || '',
          role: data.user.role || 'BUYER',
          isSeller: data.user.isSeller || false,
          balance: data.user.balance || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch user detail:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${params.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchUserDetail();
        setEditMode(false);
        setModalMessage({ type: 'success', title: 'Thành công', text: 'Cập nhật thông tin người dùng thành công!' });
      } else {
        setModalMessage({ type: 'error', title: 'Lỗi', text: 'Có lỗi xảy ra khi cập nhật' });
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      setModalMessage({ type: 'error', title: 'Lỗi', text: 'Có lỗi xảy ra khi cập nhật' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${params.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword }),
      });

      if (response.ok) {
        setShowResetPassword(false);
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError('');
        setModalMessage({ type: 'success', title: 'Thành công', text: 'Đặt lại mật khẩu thành công!' });
        await fetchUserDetail();
      } else {
        setModalMessage({ type: 'error', title: 'Lỗi', text: 'Có lỗi xảy ra khi đặt lại mật khẩu' });
      }
    } catch (error) {
      console.error('Failed to reset password:', error);
      setModalMessage({ type: 'error', title: 'Lỗi', text: 'Có lỗi xảy ra khi đặt lại mật khẩu' });
    } finally {
      setIsSaving(false);
    }
  };

  const getTotalDeposit = () => {
    return transactions
      .filter(tx => tx.type === 'DEPOSIT' && tx.status === 'COMPLETED')
      .reduce((sum, tx) => sum + tx.amount, 0);
  };

  const getTotalPurchase = () => {
    return transactions
      .filter(tx => tx.type === 'PURCHASE')
      .reduce((sum, tx) => sum + tx.amount, 0);
  };

  const getTotalEarning = () => {
    return transactions
      .filter(tx => tx.type === 'EARNING')
      .reduce((sum, tx) => sum + tx.amount, 0);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Không tìm thấy người dùng</p>
        <Link href="/admin/users">
          <Button>Quay lại</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại danh sách
          </Button>
        </Link>
        <div className="flex gap-2">
          {!editMode ? (
            <Button onClick={() => setEditMode(true)} variant="outline">
              Chỉnh sửa
            </Button>
          ) : (
            <>
              <Button onClick={() => setEditMode(false)} variant="ghost">
                Hủy
              </Button>
              <Button onClick={handleSaveChanges} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* User Profile Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
            {(user.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{user.name || 'Không có tên'}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                {user.email}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Tham gia: {new Date(user.createdAt).toLocaleDateString('vi-VN')}
              </div>
              {user.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {user.phone}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {user.role === 'ADMIN' && (
                <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Admin
                </span>
              )}
              {user.isSeller && (
                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full flex items-center gap-1">
                  <Store className="w-3 h-3" /> Seller
                </span>
              )}
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full flex items-center gap-1">
                <UserIcon className="w-3 h-3" /> User
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-1">Số dư hiện tại</p>
            <p className="text-3xl font-bold text-green-600">
              {user.balance.toLocaleString('vi-VN')}đ
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Tổng nạp</p>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">
            {getTotalDeposit().toLocaleString('vi-VN')}đ
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Tổng chi</p>
            <ShoppingBag className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {getTotalPurchase().toLocaleString('vi-VN')}đ
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Thu nhập</p>
            <Wallet className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-600">
            {getTotalEarning().toLocaleString('vi-VN')}đ
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Đơn mua</p>
            <ShoppingBag className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-600">{user._count?.orders || 0}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Sản phẩm</p>
            <Package className="w-5 h-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-indigo-600">{user._count?.products || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b flex">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-6 py-3 text-sm font-medium ${activeTab === 'info' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Thông tin tài khoản
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-6 py-3 text-sm font-medium ${activeTab === 'transactions' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Giao dịch ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-3 text-sm font-medium ${activeTab === 'orders' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Đơn mua ({orders.length})
          </button>
          {user.isSeller && (
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-6 py-3 text-sm font-medium ${activeTab === 'sales' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Đơn bán ({sales.length})
            </button>
          )}
        </div>

        <div className="p-6">
          {/* Account Info Tab */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <UserIcon className="w-5 h-5" /> Thông tin cơ bản
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên</label>
                    {editMode ? (
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    ) : (
                      <p className="text-gray-900">{user.name || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    {editMode ? (
                      <Input
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    ) : (
                      <p className="text-gray-900">{user.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                    {editMode ? (
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    ) : (
                      <p className="text-gray-900">{user.phone || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                    {editMode ? (
                      <Input
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    ) : (
                      <p className="text-gray-900">{user.address || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số dư</label>
                    {editMode ? (
                      <Input
                        type="number"
                        value={formData.balance}
                        onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                      />
                    ) : (
                      <p className="text-gray-900 font-semibold text-green-600">{user.balance.toLocaleString('vi-VN')}đ</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Password & Permissions */}
              <div className="space-y-6">
                {/* Password Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Key className="w-5 h-5" /> Mật khẩu
                  </h3>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Password Hash</label>
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {showPassword ? 'Ẩn' : 'Hiện'}
                      </button>
                    </div>
                    <p className="text-xs font-mono bg-white p-2 rounded border break-all">
                      {showPassword ? user.password : '••••••••••••••••••••••••••••••••'}
                    </p>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Đặt lại mật khẩu
                    </Button>

                    {showResetPassword && (
                      <div className="mt-4 space-y-3 p-4 bg-white rounded-lg border">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
                          <Input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Nhập mật khẩu mới"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu</label>
                          <Input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Nhập lại mật khẩu mới"
                          />
                        </div>
                        {passwordError && (
                          <p className="text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" /> {passwordError}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleResetPassword} disabled={isSaving}>
                            {isSaving ? 'Đang xử lý...' : 'Xác nhận'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => {
                            setShowResetPassword(false);
                            setNewPassword('');
                            setConfirmPassword('');
                            setPasswordError('');
                          }}>
                            Hủy
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Permissions Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Shield className="w-5 h-5" /> Quyền hạn
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò (Role)</label>
                      {editMode ? (
                        <select
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="BUYER">Buyer (Người mua)</option>
                          <option value="SELLER">Seller (Người bán)</option>
                          <option value="ADMIN">Admin (Quản trị)</option>
                        </select>
                      ) : (
                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                          user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'SELLER' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role === 'ADMIN' ? 'Admin' : user.role === 'SELLER' ? 'Seller' : 'Buyer'}
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quyền bán hàng (Seller)</label>
                      {editMode ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.isSeller}
                            onChange={(e) => setFormData({ ...formData, isSeller: e.target.checked })}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm">Cho phép bán hàng</span>
                        </label>
                      ) : (
                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                          user.isSeller ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.isSeller ? 'Đã kích hoạt' : 'Chưa kích hoạt'}
                        </span>
                      )}
                    </div>

                    {user.sellerProfile && (
                      <div className="mt-4 p-4 bg-green-50 rounded-lg">
                        <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                          <Store className="w-4 h-4" /> Thông tin Shop
                        </h4>
                        <div className="text-sm space-y-1 text-green-700">
                          <p><strong>Tên shop:</strong> {user.sellerProfile.shopName}</p>
                          <p><strong>Mô tả:</strong> {user.sellerProfile.shopDescription || '-'}</p>
                          <p><strong>Rating:</strong> {user.sellerProfile.rating} ⭐</p>
                          <p><strong>Tổng đơn bán:</strong> {user.sellerProfile.totalSales}</p>
                          <p><strong>Hoa hồng:</strong> {user.sellerProfile.commission}%</p>
                          <p><strong>Xác minh:</strong> {user.sellerProfile.isVerified ? '✅ Đã xác minh' : '❌ Chưa xác minh'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div>
              {transactions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Chưa có giao dịch</p>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between pb-3 border-b last:border-0">
                      <div>
                        <p className="font-medium text-sm">{tx.description}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(tx.createdAt).toLocaleDateString('vi-VN')} - {new Date(tx.createdAt).toLocaleTimeString('vi-VN')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-sm ${
                          tx.type === 'DEPOSIT' || tx.type === 'EARNING' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {tx.type === 'DEPOSIT' || tx.type === 'EARNING' ? '+' : '-'}
                          {tx.amount.toLocaleString('vi-VN')}đ
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          tx.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          tx.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div>
              {orders.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Chưa có đơn mua</p>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between pb-3 border-b last:border-0">
                      <div>
                        <p className="font-medium text-sm">#{order.orderNumber}</p>
                        <p className="text-xs text-gray-500">
                          Seller: {order.seller?.name || '-'} • {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-green-600">
                          {order.total.toLocaleString('vi-VN')}đ
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sales Tab */}
          {activeTab === 'sales' && (
            <div>
              {sales.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Chưa có đơn bán</p>
              ) : (
                <div className="space-y-3">
                  {sales.map((order) => (
                    <div key={order.id} className="flex items-center justify-between pb-3 border-b last:border-0">
                      <div>
                        <p className="font-medium text-sm">#{order.orderNumber}</p>
                        <p className="text-xs text-gray-500">
                          Buyer: {order.buyer?.name || '-'} • {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-green-600">
                          {order.total.toLocaleString('vi-VN')}đ
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Message Modal */}
      {modalMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setModalMessage(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                modalMessage.type === 'success' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {modalMessage.type === 'success' ? (
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-red-600" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{modalMessage.title}</h3>
              <p className="text-gray-600 mb-6">{modalMessage.text}</p>
              <Button 
                className="w-full"
                onClick={() => setModalMessage(null)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
