'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Copy,
  ShoppingBag,
  Store,
  Calendar,
  AlertTriangle,
  ThumbsUp,
  MessageSquare,
  Flag,
  X,
  Loader2,
  Send,
  AlertCircle,
  Star,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

interface Delivery {
  id: string;
  accountData: string;
  deliveredAt: string;
  viewedAt: string | null;
  parsedData: Record<string, string>;
}

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  total: number;
  deliveredQuantity: number;
  product: {
    id: string;
    title: string;
    images: string;
    accountTemplate?: {
      name: string;
      fields: string;
      fieldLabels: string;
    };
  };
  deliveries: Delivery[];
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  total: number;
  subtotal: number;
  commission: number;
  status: string;
  deliveredAt: string | null;
  confirmedAt: string | null;
  disputeDeadline: string | null;
  items: OrderItem[];
  seller: {
    id: string;
    name: string;
    email: string;
    sellerProfile?: {
      shopName: string;
      shopLogo: string;
    };
  };
  review?: Review | null;
}

// Complaint reasons
const COMPLAINT_REASONS = [
  { id: 'wrong_account', label: 'Tài khoản sai thông tin' },
  { id: 'not_working', label: 'Tài khoản không hoạt động' },
  { id: 'already_used', label: 'Tài khoản đã bị sử dụng' },
  { id: 'password_changed', label: 'Mật khẩu đã bị thay đổi' },
  { id: 'not_as_described', label: 'Không đúng mô tả' },
  { id: 'missing_features', label: 'Thiếu tính năng như cam kết' },
  { id: 'other', label: 'Lý do khác' },
];

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const { user, checkAuth, logout, isInitialized } = useAuthStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleAccounts, setVisibleAccounts] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  
  // Complaint state
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [complaintDetails, setComplaintDetails] = useState('');
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successConversationId, setSuccessConversationId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Confirm order dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmSuccessModal, setConfirmSuccessModal] = useState(false);
  const [confirmErrorModal, setConfirmErrorModal] = useState<string | null>(null);

  // Review state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHoverRating, setReviewHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessModal, setReviewSuccessModal] = useState(false);
  const [orderReview, setOrderReview] = useState<Review | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && orderId) {
      fetchOrder();
      fetchReview();
    }
  }, [user, orderId]);

  const fetchReview = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/orders/${orderId}/review`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setOrderReview(data);
        }
      }
    } catch (error) {
      // Review not found is ok
    }
  };

  const fetchOrder = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        router.push('/orders');
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmOrder = async () => {
    setShowConfirmDialog(false);
    setIsConfirming(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/orders/${orderId}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setConfirmSuccessModal(true);
        fetchOrder();
      } else {
        const data = await res.json();
        setConfirmErrorModal(data.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Failed to confirm order:', error);
      setConfirmErrorModal('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsConfirming(false);
    }
  };

  // Handle review submission
  const handleSubmitReview = async () => {
    if (reviewRating === 0) {
      setErrorMessage('Vui lòng chọn số sao đánh giá');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/orders/${orderId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setOrderReview(data.review);
        setShowReviewModal(false);
        setReviewSuccessModal(true);
        setReviewRating(0);
        setReviewComment('');
      } else {
        const errorData = await res.json();
        setErrorMessage(errorData.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
      setErrorMessage('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const toggleAccountVisibility = (deliveryId: string) => {
    const newSet = new Set(visibleAccounts);
    if (newSet.has(deliveryId)) {
      newSet.delete(deliveryId);
    } else {
      newSet.add(deliveryId);
    }
    setVisibleAccounts(newSet);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleSearch = (query: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  // Handle contact seller
  const handleContactSeller = async () => {
    if (!order?.seller?.id) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/chat/start-with-seller', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          sellerId: order.seller.id,
          orderId: order.id,
          message: `Xin chào! Tôi muốn hỏi về đơn hàng ${order.orderNumber}`
        }),
      });
      
      const data = await response.json();
      if (data.success && data.conversation?._id) {
        // Redirect to messages page with conversation ID
        router.push(`/messages?id=${data.conversation._id}`);
      } else {
        setErrorMessage(data.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
      setErrorMessage('Có lỗi xảy ra, vui lòng thử lại');
    }
  };

  // Handle complaint submission
  const handleSubmitComplaint = async () => {
    if (!selectedReason) {
      setErrorMessage('Vui lòng chọn lý do khiếu nại');
      return;
    }
    
    if (!order?.seller?.id) return;
    
    setIsSubmittingComplaint(true);
    setErrorMessage(null);
    
    try {
      const token = localStorage.getItem('token');
      const reasonLabel = COMPLAINT_REASONS.find(r => r.id === selectedReason)?.label || selectedReason;
      
      // Build complaint message
      let complaintMessage = `🚨 **KHIẾU NẠI ĐƠN HÀNG** 🚨\n\n`;
      complaintMessage += `📋 **Mã đơn hàng:** ${order.orderNumber}\n`;
      complaintMessage += `📦 **Sản phẩm:** ${order.items.map(i => i.product?.title).join(', ')}\n`;
      complaintMessage += `💰 **Giá trị:** ${formatPrice(order.total)}\n\n`;
      complaintMessage += `⚠️ **Lý do khiếu nại:** ${reasonLabel}\n`;
      if (complaintDetails.trim()) {
        complaintMessage += `\n📝 **Chi tiết:** ${complaintDetails.trim()}\n`;
      }
      complaintMessage += `\n---\nKhách hàng yêu cầu được hỗ trợ giải quyết vấn đề này.`;
      
      // Start conversation with seller and send complaint message
      const response = await fetch('/api/chat/start-with-seller', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          sellerId: order.seller.id,
          orderId: order.id,
          message: complaintMessage,
          isComplaint: true, // Flag this as a complaint
        }),
      });
      
      const data = await response.json();
      if (data.success && data.conversation?._id) {
        setShowComplaintModal(false);
        setSelectedReason('');
        setComplaintDetails('');
        setSuccessConversationId(data.conversation._id);
        setShowSuccessModal(true);
      } else {
        setErrorMessage(data.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Failed to submit complaint:', error);
      setErrorMessage('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsSubmittingComplaint(false);
    }
  };

  // Navigate to conversation
  const handleGoToConversation = () => {
    if (successConversationId) {
      router.push(`/messages?id=${successConversationId}`);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, any> = {
      PENDING: { icon: Clock, color: 'bg-yellow-100 text-yellow-700', label: 'Chờ xử lý' },
      PROCESSING: { icon: Package, color: 'bg-blue-100 text-blue-700', label: 'Đang xử lý' },
      COMPLETED: { icon: CheckCircle, color: 'bg-green-100 text-green-700', label: 'Hoàn thành' },
      CANCELLED: { icon: XCircle, color: 'bg-red-100 text-red-700', label: 'Đã hủy' },
      REFUNDED: { icon: XCircle, color: 'bg-orange-100 text-orange-700', label: 'Hoàn tiền' },
    };
    return configs[status] || configs.PENDING;
  };

  const getFieldLabel = (field: string, fieldLabels?: string) => {
    if (fieldLabels) {
      try {
        const labels = JSON.parse(fieldLabels);
        return labels[field] || field;
      } catch {}
    }
    const defaultLabels: Record<string, string> = {
      username: 'Tên đăng nhập',
      email: 'Email',
      password: 'Mật khẩu',
      '2fa': 'Mã 2FA',
      recovery_email: 'Email khôi phục',
      cookie: 'Cookie',
      key: 'Key',
      data: 'Dữ liệu',
    };
    return defaultLabels[field] || field;
  };

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header user={user} onLogout={handleLogout} onSearch={handleSearch} />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-gray-500">Không tìm thấy đơn hàng</p>
          <Link href="/orders">
            <Button className="mt-4">Quay lại</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;
  const canConfirm = order.deliveredAt && !order.confirmedAt && order.status !== 'COMPLETED';
  const disputeDeadlinePassed = order.disputeDeadline && new Date(order.disputeDeadline) < new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={handleLogout} onSearch={handleSearch} />

      <div className="container mx-auto px-4 py-6 lg:py-8 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-6">
          <Link href="/" className="text-gray-500 hover:text-blue-600">Trang chủ</Link>
          <span className="text-gray-300">/</span>
          <Link href="/orders" className="text-gray-500 hover:text-blue-600">Đơn hàng</Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-900 font-medium">{order.orderNumber}</span>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusConfig.color}`}>
                  <StatusIcon className="w-4 h-4" />
                  {statusConfig.label}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(order.createdAt).toLocaleString('vi-VN')}
                </span>
                <span className="flex items-center gap-1">
                  <Store className="w-4 h-4" />
                  {order.seller?.sellerProfile?.shopName || order.seller?.name}
                </span>
                <Link 
                  href={`/shop/${order.seller?.id}`}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  Xem Shop
                </Link>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {canConfirm && (
                <Button
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={isConfirming}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  {isConfirming ? 'Đang xử lý...' : 'Xác nhận nhận hàng'}
                </Button>
              )}
              
              {/* Complaint button - show when order has been delivered or completed */}
              {(order.deliveredAt || order.status === 'COMPLETED' || order.status === 'PROCESSING') && 
               order.status !== 'CANCELLED' && 
               order.status !== 'REFUNDED' && (
                <Button 
                  variant="outline"
                  onClick={() => setShowComplaintModal(true)}
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Khiếu nại
                </Button>
              )}
              
              <Button variant="outline" onClick={handleContactSeller}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Liên hệ shop
              </Button>
              
              {/* Review button - show when COMPLETED and not yet reviewed */}
              {order.status === 'COMPLETED' && !orderReview && (
                <Button
                  onClick={() => setShowReviewModal(true)}
                  className="bg-yellow-500 hover:bg-yellow-600"
                >
                  <Star className="w-4 h-4 mr-2" />
                  Đánh giá
                </Button>
              )}
              
              {/* Show review badge if already reviewed */}
              {orderReview && (
                <div className="flex items-center gap-1 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                  <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  Đã đánh giá {orderReview.rating} sao
                </div>
              )}
            </div>
          </div>

          {/* Deadline warning */}
          {order.disputeDeadline && !order.confirmedAt && !disputeDeadlinePassed && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Hạn khiếu nại</p>
                <p className="text-yellow-700">
                  Bạn có thể khiếu nại đến {new Date(order.disputeDeadline).toLocaleString('vi-VN')}. 
                  Sau thời gian này, đơn hàng sẽ tự động hoàn tất.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Products & Accounts */}
        <div className="space-y-6">
          {order.items.map((item) => {
            let images: string[] = [];
            try {
              images = JSON.parse(item.product?.images || '[]');
            } catch {}

            return (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Product Header */}
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <Link 
                      href={`/products/${item.productId}`}
                      className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 hover:opacity-80 transition-opacity"
                    >
                      {images[0] ? (
                        <img src={images[0]} alt={item.product?.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </Link>
                    <div className="flex-1">
                      <Link 
                        href={`/products/${item.productId}`}
                        className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {item.product?.title}
                      </Link>
                      <p className="text-sm text-gray-500">
                        Số lượng: {item.quantity} × {formatPrice(item.price)}
                      </p>
                      <p className="text-sm font-medium text-blue-600 mt-1">
                        Đã nhận: {item.deliveredQuantity}/{item.quantity} tài khoản
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{formatPrice(item.total)}</p>
                      <Link 
                        href={`/products/${item.productId}`}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 justify-end mt-1"
                      >
                        Xem sản phẩm
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Delivered Accounts */}
                {item.deliveries.length > 0 && (
                  <div className="p-5 bg-gray-50">
                    <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <Package className="w-5 h-5 text-green-600" />
                      Tài khoản đã nhận ({item.deliveries.length})
                    </h4>
                    <div className="space-y-4">
                      {item.deliveries.map((delivery, idx) => {
                        const isVisible = visibleAccounts.has(delivery.id);
                        const parsedData = delivery.parsedData || { data: delivery.accountData };

                        return (
                          <div key={delivery.id} className="bg-white rounded-xl border border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-medium text-gray-700">Tài khoản #{idx + 1}</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleAccountVisibility(delivery.id)}
                                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                  {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  {isVisible ? 'Ẩn' : 'Hiện'}
                                </button>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              {Object.entries(parsedData).map(([field, value]) => (
                                <div key={field} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                  <span className="text-sm text-gray-500">
                                    {getFieldLabel(field, item.product?.accountTemplate?.fieldLabels)}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <code className="text-sm bg-gray-100 px-3 py-1 rounded font-mono">
                                      {isVisible ? value : '••••••••'}
                                    </code>
                                    {isVisible && (
                                      <button
                                        onClick={() => copyToClipboard(value, `${delivery.id}-${field}`)}
                                        className="p-1 hover:bg-gray-100 rounded"
                                        title="Copy"
                                      >
                                        <Copy className={`w-4 h-4 ${copiedId === `${delivery.id}-${field}` ? 'text-green-600' : 'text-gray-400'}`} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {isVisible && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <button
                                  onClick={() => copyToClipboard(delivery.accountData, delivery.id)}
                                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                  <Copy className={`w-4 h-4 ${copiedId === delivery.id ? 'text-green-600' : ''}`} />
                                  {copiedId === delivery.id ? 'Đã copy!' : 'Copy tất cả'}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {item.deliveries.length === 0 && (
                  <div className="p-5 bg-gray-50 text-center">
                    <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Đang chờ giao hàng...</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Tóm tắt đơn hàng</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tạm tính</span>
              <span className="text-gray-900">{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between font-semibold pt-3 border-t">
              <span>Tổng cộng</span>
              <span className="text-blue-600 text-lg">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Back button */}
        <div className="mt-6">
          <Link href="/orders">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại danh sách đơn hàng
            </Button>
          </Link>
        </div>
      </div>

      <Footer />

      {/* Complaint Modal */}
      {showComplaintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isSubmittingComplaint && setShowComplaintModal(false)}
          />
          
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Flag className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Khiếu nại đơn hàng</h2>
                  <p className="text-sm text-gray-500">Đơn hàng: {order.orderNumber}</p>
                </div>
              </div>
              <button 
                onClick={() => !isSubmittingComplaint && setShowComplaintModal(false)}
                disabled={isSubmittingComplaint}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Order info */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  {order.items[0]?.product?.images && (
                    <img 
                      src={JSON.parse(order.items[0].product.images)[0]} 
                      alt="" 
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {order.items.map(i => i.product?.title).join(', ')}
                    </p>
                    <p className="text-sm text-gray-500">
                      Giá trị: {formatPrice(order.total)} • Shop: {order.seller?.sellerProfile?.shopName || order.seller?.name}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Reason selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Lý do khiếu nại <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {COMPLAINT_REASONS.map((reason) => (
                    <label 
                      key={reason.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedReason === reason.id 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="complaint_reason"
                        value={reason.id}
                        checked={selectedReason === reason.id}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                      />
                      <span className={`text-sm ${selectedReason === reason.id ? 'text-red-700 font-medium' : 'text-gray-700'}`}>
                        {reason.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Additional details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mô tả chi tiết (không bắt buộc)
                </label>
                <textarea
                  ref={textareaRef}
                  value={complaintDetails}
                  onChange={(e) => setComplaintDetails(e.target.value)}
                  placeholder="Mô tả vấn đề bạn gặp phải..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Vui lòng mô tả rõ ràng để shop có thể hỗ trợ bạn tốt hơn
                </p>
              </div>
              
              {/* Info notice */}
              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Quy trình khiếu nại</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-600">
                      <li>Khiếu nại sẽ được gửi đến shop qua tin nhắn</li>
                      <li>Shop sẽ phản hồi trong vòng 24 giờ</li>
                      <li>Nếu không được giải quyết, bạn có thể liên hệ Admin</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            {/* Error message */}
            {errorMessage && (
              <div className="mx-5 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{errorMessage}</p>
                <button 
                  onClick={() => setErrorMessage(null)}
                  className="ml-auto p-1 hover:bg-red-100 rounded"
                >
                  <X className="w-4 h-4 text-red-500" />
                </button>
              </div>
            )}

            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setShowComplaintModal(false);
                  setErrorMessage(null);
                }}
                disabled={isSubmittingComplaint}
              >
                Hủy
              </Button>
              <Button 
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={handleSubmitComplaint}
                disabled={!selectedReason || isSubmittingComplaint}
              >
                {isSubmittingComplaint ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Gửi khiếu nại
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Order Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowConfirmDialog(false)}
          />
          
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                  <ThumbsUp className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Xác nhận đơn hàng</h2>
                  <p className="text-sm text-gray-500">Hành động này không thể hoàn tác</p>
                </div>
              </div>
              
              {/* Content */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 mb-1">Vui lòng kiểm tra kỹ trước khi xác nhận</p>
                    <ul className="text-amber-700 space-y-1">
                      <li>• Đã nhận được đầy đủ tài khoản</li>
                      <li>• Tài khoản hoạt động bình thường</li>
                      <li>• Thông tin tài khoản chính xác</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-700 text-center mb-6">
                Bạn xác nhận đã nhận được tài khoản và <strong>hài lòng</strong> với đơn hàng này?
              </p>
              
              {/* Actions */}
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 h-11"
                  onClick={() => setShowConfirmDialog(false)}
                >
                  Hủy
                </Button>
                <Button 
                  className="flex-1 h-11 bg-green-600 hover:bg-green-700"
                  onClick={handleConfirmOrder}
                  disabled={isConfirming}
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Xác nhận
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Success Modal */}
      {confirmSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              {/* Success Icon */}
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Xác nhận thành công!
              </h2>
              <p className="text-gray-600 mb-6">
                Cảm ơn bạn đã xác nhận đơn hàng. Tiền sẽ được chuyển cho người bán.
              </p>
              
              {/* Info box */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl mb-6 text-left">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-700">
                    <p className="font-medium mb-1">Đơn hàng đã hoàn thành</p>
                    <p className="text-green-600">
                      Nếu có vấn đề gì, bạn vẫn có thể liên hệ shop qua tin nhắn.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setConfirmSuccessModal(false)}
                >
                  Đóng
                </Button>
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => router.push('/orders')}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Xem đơn hàng
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Error Modal */}
      {confirmErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setConfirmErrorModal(null)}
          />
          
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              {/* Error Icon */}
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Không thể xác nhận</h3>
              <p className="text-gray-600 mb-6">{confirmErrorModal}</p>
              
              <Button 
                className="w-full"
                onClick={() => setConfirmErrorModal(null)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              {/* Success Icon */}
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Gửi khiếu nại thành công!
              </h2>
              <p className="text-gray-600 mb-6">
                Khiếu nại của bạn đã được gửi đến shop. Bạn có thể theo dõi và trao đổi trực tiếp với shop qua tin nhắn.
              </p>
              
              {/* Info box */}
              <div className="p-4 bg-blue-50 rounded-xl mb-6 text-left">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Tiếp theo</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-600">
                      <li>Shop sẽ phản hồi trong vòng 24h</li>
                      <li>Kiểm tra tin nhắn để cập nhật</li>
                      <li>Liên hệ Admin nếu cần hỗ trợ thêm</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowSuccessModal(false)}
                >
                  Đóng
                </Button>
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleGoToConversation}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Xem tin nhắn
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal (for general errors) */}
      {errorMessage && !showComplaintModal && !showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setErrorMessage(null)}
          />
          
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              {/* Error Icon */}
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Có lỗi xảy ra</h3>
              <p className="text-gray-600 mb-6">{errorMessage}</p>
              
              <Button 
                className="w-full"
                onClick={() => setErrorMessage(null)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isSubmittingReview && setShowReviewModal(false)}
          />
          
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Star className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Đánh giá đơn hàng</h2>
                  <p className="text-sm text-gray-500">{order.orderNumber}</p>
                </div>
              </div>
              <button 
                onClick={() => !isSubmittingReview && setShowReviewModal(false)}
                disabled={isSubmittingReview}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Order info */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  {order.items[0]?.product?.images && (
                    <img 
                      src={JSON.parse(order.items[0].product.images)[0]} 
                      alt="" 
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {order.items.map(i => i.product?.title).join(', ')}
                    </p>
                    <p className="text-sm text-gray-500">
                      Shop: {order.seller?.sellerProfile?.shopName || order.seller?.name}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Star Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                  Bạn hài lòng với đơn hàng này như thế nào?
                </label>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      onMouseEnter={() => setReviewHoverRating(star)}
                      onMouseLeave={() => setReviewHoverRating(0)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-10 h-10 transition-colors ${
                          star <= (reviewHoverRating || reviewRating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-center text-sm text-gray-500 mt-2">
                  {reviewRating === 0 && 'Chọn số sao để đánh giá'}
                  {reviewRating === 1 && 'Rất không hài lòng'}
                  {reviewRating === 2 && 'Không hài lòng'}
                  {reviewRating === 3 && 'Bình thường'}
                  {reviewRating === 4 && 'Hài lòng'}
                  {reviewRating === 5 && 'Rất hài lòng'}
                </p>
              </div>
              
              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nhận xét (không bắt buộc)
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Chia sẻ trải nghiệm của bạn với sản phẩm và shop..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all text-sm"
                />
              </div>
              
              {/* Info notice */}
              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p>Đánh giá sẽ được hiển thị công khai với tên của bạn trên trang sản phẩm.</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Error message in modal */}
            {errorMessage && showReviewModal && (
              <div className="mx-5 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{errorMessage}</p>
                <button 
                  onClick={() => setErrorMessage(null)}
                  className="ml-auto p-1 hover:bg-red-100 rounded"
                >
                  <X className="w-4 h-4 text-red-500" />
                </button>
              </div>
            )}

            {/* Footer */}
            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setShowReviewModal(false);
                  setErrorMessage(null);
                  setReviewRating(0);
                  setReviewComment('');
                }}
                disabled={isSubmittingReview}
              >
                Hủy
              </Button>
              <Button 
                className="flex-1 bg-yellow-500 hover:bg-yellow-600"
                onClick={handleSubmitReview}
                disabled={reviewRating === 0 || isSubmittingReview}
              >
                {isSubmittingReview ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Star className="w-4 h-4 mr-2" />
                    Gửi đánh giá
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Review Success Modal */}
      {reviewSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              {/* Success Icon */}
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-100 flex items-center justify-center">
                <Star className="w-10 h-10 text-yellow-500 fill-yellow-500" />
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Cảm ơn bạn đã đánh giá!
              </h2>
              <p className="text-gray-600 mb-6">
                Đánh giá của bạn sẽ giúp những người mua khác có thêm thông tin hữu ích.
              </p>
              
              {/* Rating display */}
              <div className="flex items-center justify-center gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-8 h-8 ${
                      star <= (orderReview?.rating || 0)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              
              <div className="flex gap-3">
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => setReviewSuccessModal(false)}
                >
                  Đóng
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setReviewSuccessModal(false);
                    router.push('/orders');
                  }}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Xem đơn hàng
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
