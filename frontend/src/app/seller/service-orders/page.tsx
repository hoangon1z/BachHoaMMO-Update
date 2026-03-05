'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
    Zap, Search, Filter, Eye, Play, CheckCircle2, XCircle,
    AlertTriangle, Clock, Package, ChevronDown, ChevronUp,
    ExternalLink, RefreshCw, Shield, TrendingUp, BarChart3,
    Loader2
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ServiceOrder {
    id: string;
    serviceLink: string;
    platform: string;
    serviceType: string;
    quantity: number;
    delivered: number;
    progress: number;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    warrantyDays: number;
    warrantyExpiry: string | null;
    sellerNote: string | null;
    cancelReason: string | null;
    refundedAmount: number | null;
    createdAt: string;
    product: { id: string; title: string; images: string; servicePlatform: string; serviceType: string };
    buyer: { id: string; name: string; email: string };
    orderItem: { id: string; orderId: string; price: number; total: number; order: { orderNumber: string } };
    warrantyRequests: { id: string }[];
}

interface Stats {
    pending: number;
    processing: number;
    completed: number;
    partial: number;
    cancelled: number;
    total: number;
    totalDelivered: number;
    pendingWarranties: number;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    PENDING: { label: 'Chờ xử lý', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock },
    PROCESSING: { label: 'Đang xử lý', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: RefreshCw },
    COMPLETED: { label: 'Hoàn thành', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: CheckCircle2 },
    PARTIAL: { label: 'Hoàn thành 1 phần', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: AlertTriangle },
    CANCELLED: { label: 'Đã hủy', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: XCircle },
};

const platformIcons: Record<string, string> = {
    FACEBOOK: '📘', INSTAGRAM: '📸', TIKTOK: '🎵', YOUTUBE: '▶️',
    TWITTER: '🐦', TELEGRAM: '✈️', SHOPEE: '🛒', OTHER: '🌐',
};

export default function SellerServiceOrdersPage() {
    const { token } = useAuthStore();
    const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Modals
    const [progressModal, setProgressModal] = useState<{ order: ServiceOrder; type: 'progress' | 'partial' | 'cancel' } | null>(null);
    const [progressValue, setProgressValue] = useState(0);
    const [progressNote, setProgressNote] = useState('');
    const [cancelReason, setCancelReason] = useState('');

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/service-orders/seller/stats`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setStats(await res.json());
        } catch (e) { console.error(e); }
    }, [token]);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: page.toString(), limit: '20' });
            if (statusFilter) params.set('status', statusFilter);
            if (search) params.set('search', search);

            const res = await fetch(`${API_URL}/service-orders/seller?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setServiceOrders(data.serviceOrders);
                setTotalPages(data.totalPages);
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    }, [token, page, statusFilter, search]);

    useEffect(() => { fetchStats(); }, [fetchStats]);
    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const handleAction = async (orderId: string, action: string, body?: any) => {
        setActionLoading(orderId);
        try {
            const method = action === 'progress' ? 'PUT' : 'POST';
            const url = `${API_URL}/service-orders/seller/${orderId}/${action}`;
            const res = await fetch(url, {
                method,
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: body ? JSON.stringify(body) : undefined,
            });
            if (res.ok) {
                fetchOrders();
                fetchStats();
                setProgressModal(null);
            } else {
                const err = await res.json();
                alert(err.message || 'Lỗi xử lý');
            }
        } catch (e) { alert('Lỗi kết nối'); }
        setActionLoading(null);
    };

    const handleWarranty = async (warrantyId: string, action: 'APPROVED' | 'REJECTED', note?: string) => {
        setActionLoading(warrantyId);
        try {
            const res = await fetch(`${API_URL}/service-orders/seller/warranty/${warrantyId}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, sellerNote: note }),
            });
            if (res.ok) {
                fetchOrders();
                fetchStats();
            } else {
                const err = await res.json();
                alert(err.message || 'Lỗi xử lý');
            }
        } catch (e) { alert('Lỗi kết nối'); }
        setActionLoading(null);
    };

    return (
        <div className="p-4 lg:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Zap className="w-7 h-7 text-blue-600" />
                        Đơn dịch vụ
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Quản lý đơn buff like, follow, view, sub...</p>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 text-amber-600 mb-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs font-medium">Chờ xử lý</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 text-blue-600 mb-1">
                            <RefreshCw className="w-4 h-4" />
                            <span className="text-xs font-medium">Đang xử lý</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stats.processing}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 text-green-600 mb-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-xs font-medium">Hoàn thành</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 text-purple-600 mb-1">
                            <BarChart3 className="w-4 h-4" />
                            <span className="text-xs font-medium">Tổng đơn</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 text-red-600 mb-1">
                            <Shield className="w-4 h-4" />
                            <span className="text-xs font-medium">Bảo hành chờ</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stats.pendingWarranties}</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm theo link hoặc mã đơn..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {['', 'PENDING', 'PROCESSING', 'COMPLETED', 'PARTIAL', 'CANCELLED'].map((s) => (
                            <button
                                key={s}
                                onClick={() => { setStatusFilter(s); setPage(1); }}
                                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${statusFilter === s
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                {s ? statusConfig[s]?.label : 'Tất cả'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Orders List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                ) : serviceOrders.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                        <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Chưa có đơn dịch vụ nào</p>
                    </div>
                ) : (
                    serviceOrders.map((order) => {
                        const config = statusConfig[order.status] || statusConfig.PENDING;
                        const StatusIcon = config.icon;
                        const isExpanded = expandedOrder === order.id;

                        return (
                            <div key={order.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                {/* Order Header */}
                                <div
                                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <div className="text-2xl">{platformIcons[order.platform] || '🌐'}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-semibold text-gray-900">{order.product.title}</span>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.color}`}>
                                                        <StatusIcon className="w-3 h-3" />
                                                        {config.label}
                                                    </span>
                                                    {order.warrantyRequests?.length > 0 && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                                                            <Shield className="w-3 h-3" /> Bảo hành
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1 truncate">
                                                    🔗 {order.serviceLink}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                    <span>👤 {order.buyer.name || order.buyer.email}</span>
                                                    <span>📋 {order.orderItem.order.orderNumber}</span>
                                                    <span>📅 {new Date(order.createdAt).toLocaleDateString('vi-VN')}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-gray-900">{order.delivered}/{order.quantity}</p>
                                                <p className="text-xs text-gray-500">{order.progress}%</p>
                                            </div>
                                            {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    {['PROCESSING', 'PARTIAL', 'COMPLETED'].includes(order.status) && (
                                        <div className="mt-3">
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${order.status === 'COMPLETED' ? 'bg-green-500' :
                                                        order.status === 'PARTIAL' ? 'bg-orange-500' : 'bg-blue-500'
                                                        }`}
                                                    style={{ width: `${Math.min(order.progress, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100 p-4 bg-gray-50">
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                                            <div>
                                                <p className="text-xs text-gray-500">Nền tảng</p>
                                                <p className="text-sm font-medium">{order.platform}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Loại dịch vụ</p>
                                                <p className="text-sm font-medium">{order.serviceType}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Tổng tiền</p>
                                                <p className="text-sm font-medium text-green-600">{order.orderItem.total?.toLocaleString('vi-VN')}đ</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Bảo hành</p>
                                                <p className="text-sm font-medium">{order.warrantyDays > 0 ? `${order.warrantyDays} ngày` : 'Không'}</p>
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <p className="text-xs text-gray-500 mb-1">Link dịch vụ</p>
                                            <a href={order.serviceLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline break-all">
                                                {order.serviceLink}
                                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                            </a>
                                        </div>

                                        {order.sellerNote && (
                                            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                                                <p className="text-xs text-blue-600 font-medium mb-1">Ghi chú</p>
                                                <p className="text-sm text-blue-800">{order.sellerNote}</p>
                                            </div>
                                        )}

                                        {order.cancelReason && (
                                            <div className="mb-4 p-3 bg-red-50 rounded-lg">
                                                <p className="text-xs text-red-600 font-medium mb-1">Lý do hủy</p>
                                                <p className="text-sm text-red-800">{order.cancelReason}</p>
                                            </div>
                                        )}

                                        {order.refundedAmount && order.refundedAmount > 0 && (
                                            <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                                                <p className="text-xs text-yellow-700 font-medium">Đã hoàn tiền: {order.refundedAmount.toLocaleString('vi-VN')}đ</p>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex flex-wrap gap-2">
                                            {order.status === 'PENDING' && (
                                                <>
                                                    <button
                                                        onClick={() => handleAction(order.id, 'start')}
                                                        disabled={actionLoading === order.id}
                                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                                    >
                                                        {actionLoading === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                                        Bắt đầu xử lý
                                                    </button>
                                                    <button
                                                        onClick={() => { setProgressModal({ order, type: 'cancel' }); setCancelReason(''); }}
                                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors border border-red-200"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                        Hủy đơn
                                                    </button>
                                                </>
                                            )}
                                            {['PENDING', 'PROCESSING'].includes(order.status) && (
                                                <>
                                                    <button
                                                        onClick={() => { setProgressModal({ order, type: 'progress' }); setProgressValue(order.delivered); setProgressNote(''); }}
                                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                                                    >
                                                        <TrendingUp className="w-4 h-4" />
                                                        Cập nhật tiến độ
                                                    </button>
                                                    <button
                                                        onClick={() => { setProgressModal({ order, type: 'partial' }); setProgressValue(order.delivered || 1); setProgressNote(''); }}
                                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors border border-orange-200"
                                                    >
                                                        <AlertTriangle className="w-4 h-4" />
                                                        Hoàn thành 1 phần
                                                    </button>
                                                </>
                                            )}
                                            {order.status === 'PROCESSING' && (
                                                <button
                                                    onClick={() => { setProgressModal({ order, type: 'cancel' }); setCancelReason(''); }}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors border border-red-200"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                    Hủy đơn
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Trước
                    </button>
                    <span className="text-sm text-gray-600">Trang {page}/{totalPages}</span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Sau
                    </button>
                </div>
            )}

            {/* Progress/Partial/Cancel Modal */}
            {progressModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setProgressModal(null)}>
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">
                                {progressModal.type === 'progress' && '📊 Cập nhật tiến độ'}
                                {progressModal.type === 'partial' && '⚠️ Hoàn thành 1 phần'}
                                {progressModal.type === 'cancel' && '❌ Hủy đơn dịch vụ'}
                            </h3>

                            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm font-medium text-gray-700">{progressModal.order.product.title}</p>
                                <p className="text-xs text-gray-500 truncate">{progressModal.order.serviceLink}</p>
                                <p className="text-xs text-gray-500 mt-1">Số lượng đặt: {progressModal.order.quantity}</p>
                            </div>

                            {progressModal.type !== 'cancel' ? (
                                <>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Số lượng đã giao
                                        </label>
                                        <input
                                            type="number"
                                            min={progressModal.type === 'partial' ? 1 : 0}
                                            max={progressModal.type === 'partial' ? progressModal.order.quantity - 1 : progressModal.order.quantity}
                                            value={progressValue}
                                            onChange={(e) => setProgressValue(parseInt(e.target.value) || 0)}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        />
                                        {progressModal.type === 'partial' && progressValue > 0 && (
                                            <p className="text-xs text-orange-600 mt-1">
                                                Sẽ hoàn {Math.round((progressModal.order.orderItem.total / progressModal.order.quantity) * (progressModal.order.quantity - progressValue)).toLocaleString('vi-VN')}đ cho buyer
                                            </p>
                                        )}
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú (tuỳ chọn)</label>
                                        <textarea
                                            value={progressNote}
                                            onChange={(e) => setProgressNote(e.target.value)}
                                            rows={2}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                                            placeholder="VD: Đang chạy, dự kiến hoàn thành trong 2h..."
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Lý do hủy *</label>
                                    <textarea
                                        value={cancelReason}
                                        onChange={(e) => setCancelReason(e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                                        placeholder="Nhập lý do hủy đơn..."
                                    />
                                    <p className="text-xs text-red-500 mt-1">
                                        ⚠️ Buyer sẽ được hoàn {progressModal.order.orderItem.total?.toLocaleString('vi-VN')}đ
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setProgressModal(null)}
                                    className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                    Đóng
                                </button>
                                <button
                                    onClick={() => {
                                        if (progressModal.type === 'progress') {
                                            handleAction(progressModal.order.id, 'progress', { delivered: progressValue, note: progressNote || undefined });
                                        } else if (progressModal.type === 'partial') {
                                            handleAction(progressModal.order.id, 'partial', { delivered: progressValue, note: progressNote || undefined });
                                        } else {
                                            if (!cancelReason.trim()) return alert('Vui lòng nhập lý do hủy');
                                            handleAction(progressModal.order.id, 'cancel', { reason: cancelReason });
                                        }
                                    }}
                                    disabled={actionLoading === progressModal.order.id}
                                    className={`px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 ${progressModal.type === 'cancel' ? 'bg-red-600 hover:bg-red-700' :
                                        progressModal.type === 'partial' ? 'bg-orange-600 hover:bg-orange-700' :
                                            'bg-blue-600 hover:bg-blue-700'
                                        }`}
                                >
                                    {actionLoading === progressModal.order.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : progressModal.type === 'cancel' ? 'Xác nhận hủy' : 'Xác nhận'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
