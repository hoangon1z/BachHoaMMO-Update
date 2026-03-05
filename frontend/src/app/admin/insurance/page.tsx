'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Shield, Search, ChevronRight, AlertTriangle, CheckCircle, XCircle,
    Loader2, ArrowUp, ArrowDown, Eye, History, Wallet, Award, Plus, UserSearch
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ─── Types ─── */
interface Fund {
    id: string;
    sellerId: string;
    tier: string;
    level: number;
    depositAmount: number;
    currentBalance: number;
    maxCoverage: number;
    annualFee: number;
    status: string;
    activatedAt: string;
    nextRenewalAt: string;
    revokedAt: string | null;
    sellerProfile?: {
        userId: string;
        shopName: string;
        shopLogo: string | null;
        rating: number;
        totalSales: number;
        insuranceLevel: number;
        insuranceTier: string | null;
        user?: { id: string; email: string; name: string };
    };
}

interface HistoryItem {
    id: string;
    type: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    description: string;
    createdAt: string;
    fund?: { tier: string };
}

interface SellerDetail {
    seller: {
        id: string;
        email: string;
        name: string;
        balance: number;
        sellerProfile?: {
            shopName: string;
            shopLogo: string | null;
            rating: number;
            totalSales: number;
            insuranceLevel: number;
            insuranceTier: string | null;
            isVerified: boolean;
        };
    };
    activeFund: Fund | null;
    allFunds: Fund[];
    history: HistoryItem[];
}

const TIER_LABEL: Record<string, string> = {
    BRONZE: 'Đồng', SILVER: 'Bạc', GOLD: 'Vàng', DIAMOND: 'Kim Cương', VIP: 'VIP',
};
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    ACTIVE: { label: 'Hoạt động', cls: 'bg-green-100 text-green-800' },
    WITHDRAWN: { label: 'Đã rút', cls: 'bg-gray-100 text-gray-600' },
    REVOKED: { label: 'Bị thu hồi', cls: 'bg-red-100 text-red-700' },
    CONFISCATED: { label: 'Bị tịch thu', cls: 'bg-red-200 text-red-900' },
    SUSPENDED: { label: 'Tạm ngưng', cls: 'bg-yellow-100 text-yellow-800' },
};

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ';
const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN');
const fmtTime = (d: string) => {
    const dt = new Date(d);
    return `${dt.toLocaleDateString('vi-VN')} ${dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
};

export default function AdminInsurancePage() {
    const [funds, setFunds] = useState<Fund[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterTier, setFilterTier] = useState('');

    // Detail panel
    const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
    const [detail, setDetail] = useState<SellerDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // Action modal
    const [actionModal, setActionModal] = useState<{
        type: 'confiscate' | 'adjust';
        fundId: string;
        shopName: string;
        currentBalance: number;
    } | null>(null);
    const [actionReason, setActionReason] = useState('');
    const [actionAmount, setActionAmount] = useState('');
    const [actionAdjustType, setActionAdjustType] = useState<'DEDUCT' | 'TOPUP'>('DEDUCT');
    const [actionProcessing, setActionProcessing] = useState(false);

    // Set tier modal
    const [tierModal, setTierModal] = useState<{ sellerId: string; sellerName: string; currentTier: string | null } | null>(null);
    const [selectedNewTier, setSelectedNewTier] = useState<string | null>(null);
    const [tierProcessing, setTierProcessing] = useState(false);

    // Grant new insurance modal
    const [grantModal, setGrantModal] = useState(false);
    const [sellerSearch, setSellerSearch] = useState('');
    const [sellerResults, setSellerResults] = useState<Array<{ id: string; name: string; email: string; sellerProfile?: { shopName: string; insuranceTier?: string | null } }>>([]);
    const [sellerSearching, setSellerSearching] = useState(false);

    // Toast
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

    /* ─── Fetch list ─── */
    const fetchFunds = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterStatus) params.set('status', filterStatus);
            if (filterTier) params.set('tier', filterTier);
            if (search) params.set('search', search);
            params.set('limit', '50');

            const res = await fetch(`/api/admin/insurance?${params}`, { headers: headers() });
            if (res.ok) {
                const data = await res.json();
                setFunds(data.funds || []);
                setTotal(data.total || 0);
            }
        } catch { /* */ }
        finally { setLoading(false); }
    }, [filterStatus, filterTier, search]);

    useEffect(() => { fetchFunds(); }, [fetchFunds]);
    useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 5000); return () => clearTimeout(t); } }, [toast]);

    /* ─── Fetch detail ─── */
    const openDetail = async (sellerId: string) => {
        setSelectedSellerId(sellerId);
        setDetailLoading(true);
        setDetail(null);
        try {
            const res = await fetch(`/api/admin/insurance/${sellerId}`, { headers: headers() });
            if (res.ok) setDetail(await res.json());
        } catch { /* */ }
        finally { setDetailLoading(false); }
    };

    /* ─── Execute action ─── */
    const executeAction = async () => {
        if (!actionModal || actionProcessing) return;
        setActionProcessing(true);
        try {
            let url = '';
            let body: object = {};

            if (actionModal.type === 'confiscate') {
                if (actionReason.trim().length < 10) {
                    setToast({ type: 'error', msg: 'Lý do phải ít nhất 10 ký tự' });
                    setActionProcessing(false);
                    return;
                }
                url = `/api/admin/insurance/${actionModal.fundId}/confiscate`;
                body = { reason: actionReason };
            } else {
                const amount = parseInt(actionAmount);
                if (!amount || amount <= 0) {
                    setToast({ type: 'error', msg: 'Số tiền phải > 0' });
                    setActionProcessing(false);
                    return;
                }
                if (actionReason.trim().length < 5) {
                    setToast({ type: 'error', msg: 'Lý do phải ít nhất 5 ký tự' });
                    setActionProcessing(false);
                    return;
                }
                url = `/api/admin/insurance/${actionModal.fundId}/adjust`;
                body = { amount, reason: actionReason, type: actionAdjustType };
            }

            const res = await fetch(url, {
                method: 'POST',
                headers: { ...headers(), 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (res.ok) {
                setToast({ type: 'success', msg: data.message });
                setActionModal(null);
                setActionReason('');
                setActionAmount('');
                fetchFunds();
                if (selectedSellerId) openDetail(selectedSellerId);
            } else {
                setToast({ type: 'error', msg: data.message || 'Lỗi' });
            }
        } catch {
            setToast({ type: 'error', msg: 'Lỗi kết nối' });
        } finally {
            setActionProcessing(false);
        }
    };

    /* ─── Set Tier ─── */
    const executeSetTier = async () => {
        if (!tierModal || tierProcessing) return;
        setTierProcessing(true);
        try {
            const res = await fetch('/api/admin/insurance/set-tier', {
                method: 'POST',
                headers: { ...headers(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ sellerId: tierModal.sellerId, tier: selectedNewTier }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setToast({ type: 'success', msg: data.message });
                setTierModal(null);
                fetchFunds();
                if (selectedSellerId) openDetail(selectedSellerId);
            } else {
                setToast({ type: 'error', msg: data.message || 'Lỗi' });
            }
        } catch {
            setToast({ type: 'error', msg: 'Lỗi kết nối' });
        } finally {
            setTierProcessing(false);
        }
    };

    /* ─── Search sellers for granting insurance ─── */
    const searchSellers = async (q: string) => {
        setSellerSearch(q);
        if (q.length < 2) { setSellerResults([]); return; }
        setSellerSearching(true);
        try {
            const res = await fetch(`/api/admin/sellers?search=${encodeURIComponent(q)}&limit=10`, { headers: headers() });
            if (res.ok) {
                const data = await res.json();
                setSellerResults(data.sellers || []);
            }
        } catch { /* */ }
        finally { setSellerSearching(false); }
    };

    return (
        <div className="space-y-5">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-[100] max-w-sm flex items-start gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm animate-in slide-in-from-right ${toast.type === 'success' ? 'bg-white border-green-200 text-green-800' : 'bg-white border-red-200 text-red-800'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5" /> : <XCircle className="w-4 h-4 mt-0.5" />}
                    <p>{toast.msg}</p>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Quản lý Bảo Hiểm</h1>
                    <p className="text-sm text-gray-400">Xem và quản lý quỹ bảo hiểm seller</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500"><span className="font-semibold text-gray-900">{total}</span> quỹ BH</span>
                    <Button
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white h-9"
                        onClick={() => { setGrantModal(true); setSellerSearch(''); setSellerResults([]); }}
                    >
                        <Plus className="w-4 h-4 mr-1.5" /> Cấp BH cho Seller
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Tìm shop, email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full h-9 pl-9 pr-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="h-9 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="WITHDRAWN">Đã rút</option>
                    <option value="REVOKED">Thu hồi</option>
                    <option value="CONFISCATED">Tịch thu</option>
                </select>
                <select
                    value={filterTier}
                    onChange={e => setFilterTier(e.target.value)}
                    className="h-9 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                    <option value="">Tất cả gói</option>
                    {Object.entries(TIER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
            </div>

            {/* Main layout: list + detail panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* ─── Fund List ─── */}
                <div className={`${selectedSellerId ? 'lg:col-span-1' : 'lg:col-span-3'}`}>
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                        </div>
                    ) : funds.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
                            Không có quỹ BH nào
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            {funds.map((fund, idx) => {
                                const shopName = fund.sellerProfile?.shopName || fund.sellerProfile?.user?.name || 'N/A';
                                const email = fund.sellerProfile?.user?.email || '';
                                const st = STATUS_MAP[fund.status] || { label: fund.status, cls: 'bg-gray-100 text-gray-600' };
                                const isSelected = selectedSellerId === fund.sellerId;
                                const healthPct = fund.depositAmount > 0 ? Math.round((fund.currentBalance / fund.depositAmount) * 100) : 0;

                                return (
                                    <div
                                        key={fund.id}
                                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${idx < funds.length - 1 ? 'border-b border-gray-50' : ''
                                            } ${isSelected ? 'bg-amber-50' : 'hover:bg-gray-50'}`}
                                        onClick={() => openDetail(fund.sellerId)}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm text-gray-900 truncate">{shopName}</span>
                                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${st.cls}`}>{st.label}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                                                <span>{email}</span>
                                                <span className="text-gray-200">|</span>
                                                <span>Gói {TIER_LABEL[fund.tier] || fund.tier}</span>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-sm font-bold text-gray-900 tabular-nums">{fmt(fund.currentBalance)}</p>
                                            <p className="text-[10px] text-gray-400">{healthPct}% sức khỏe</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ─── Detail Panel ─── */}
                {selectedSellerId && (
                    <div className="lg:col-span-2 space-y-4">
                        {detailLoading ? (
                            <div className="bg-white rounded-xl border border-gray-200 p-8 flex items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                            </div>
                        ) : detail ? (
                            <>
                                {/* Seller info */}
                                <div className="bg-white rounded-xl border border-gray-200 p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center text-sm font-bold text-gray-600">
                                                {(detail.seller.sellerProfile?.shopName || detail.seller.name || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900">{detail.seller.sellerProfile?.shopName || detail.seller.name}</h3>
                                                <p className="text-xs text-gray-400">{detail.seller.email}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setSelectedSellerId(null)} className="text-xs text-gray-400 hover:text-gray-600">
                                            Đóng
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-3">
                                        {[
                                            { label: 'Số dư ví', value: fmt(detail.seller.balance) },
                                            { label: 'Đánh giá', value: `${detail.seller.sellerProfile?.rating?.toFixed(1) || '0.0'}/5` },
                                            { label: 'Đã bán', value: `${detail.seller.sellerProfile?.totalSales || 0} đơn` },
                                            { label: 'Gói BH', value: detail.seller.sellerProfile?.insuranceTier ? TIER_LABEL[detail.seller.sellerProfile.insuranceTier] : 'Không có' },
                                        ].map((s, i) => (
                                            <div key={i} className="bg-gray-50 rounded-lg px-3 py-2">
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{s.label}</p>
                                                <p className="text-sm font-bold text-gray-900 mt-0.5">{s.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Active Fund */}
                                {detail.activeFund && (
                                    <div className="bg-white rounded-xl border border-gray-200">
                                        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                                            <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                                                <Shield className="w-4 h-4 text-blue-600" /> Quỹ BH đang hoạt động
                                            </h4>
                                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-800">ACTIVE</span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-50 border-b border-gray-50">
                                            {[
                                                { label: 'Số dư quỹ', value: fmt(detail.activeFund.currentBalance) },
                                                { label: 'Tiền cọc', value: fmt(detail.activeFund.depositAmount) },
                                                { label: 'BH tối đa', value: fmt(detail.activeFund.maxCoverage) },
                                                { label: 'Gia hạn', value: fmtDate(detail.activeFund.nextRenewalAt) },
                                            ].map((s, i) => (
                                                <div key={i} className="px-4 py-3">
                                                    <p className="text-[10px] text-gray-400">{s.label}</p>
                                                    <p className="text-sm font-bold text-gray-900 tabular-nums mt-0.5">{s.value}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Fund health bar */}
                                        <div className="px-5 py-2.5 border-b border-gray-50">
                                            <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                                                <span>Sức khỏe quỹ</span>
                                                <span>{Math.round((detail.activeFund.currentBalance / detail.activeFund.depositAmount) * 100)}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{
                                                        width: `${Math.min(100, (detail.activeFund.currentBalance / detail.activeFund.depositAmount) * 100)}%`,
                                                        backgroundColor: (detail.activeFund.currentBalance / detail.activeFund.depositAmount) > 0.5 ? '#22c55e' : (detail.activeFund.currentBalance / detail.activeFund.depositAmount) > 0.25 ? '#f59e0b' : '#ef4444',
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Admin actions */}
                                        <div className="px-5 py-3 flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 text-xs border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                                                onClick={() => setActionModal({
                                                    type: 'adjust', fundId: detail.activeFund!.id,
                                                    shopName: detail.seller.sellerProfile?.shopName || detail.seller.name || '',
                                                    currentBalance: detail.activeFund!.currentBalance,
                                                })}
                                            >
                                                <Wallet className="w-3.5 h-3.5 mr-1" /> Điều chỉnh quỹ
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 text-xs text-red-600 border-gray-200 hover:bg-red-50 hover:border-red-200"
                                                onClick={() => setActionModal({
                                                    type: 'confiscate', fundId: detail.activeFund!.id,
                                                    shopName: detail.seller.sellerProfile?.shopName || detail.seller.name || '',
                                                    currentBalance: detail.activeFund!.currentBalance,
                                                })}
                                            >
                                                <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Tịch thu quỹ
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 text-xs border-gray-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200"
                                                onClick={() => {
                                                    setSelectedNewTier(detail.seller.sellerProfile?.insuranceTier || null);
                                                    setTierModal({
                                                        sellerId: detail.seller.id,
                                                        sellerName: detail.seller.sellerProfile?.shopName || detail.seller.name || '',
                                                        currentTier: detail.seller.sellerProfile?.insuranceTier || null,
                                                    });
                                                }}
                                            >
                                                <Award className="w-3.5 h-3.5 mr-1" /> Đặt gói BH
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Show set tier button when no active fund */}
                                {!detail.activeFund && (
                                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                                        <div className="text-center">
                                            <p className="text-sm text-gray-400 mb-3">Seller chưa có gói bảo hiểm</p>
                                            <Button
                                                size="sm"
                                                className="bg-amber-600 hover:bg-amber-700 text-white"
                                                onClick={() => {
                                                    setSelectedNewTier(null);
                                                    setTierModal({
                                                        sellerId: detail.seller.id,
                                                        sellerName: detail.seller.sellerProfile?.shopName || detail.seller.name || '',
                                                        currentTier: null,
                                                    });
                                                }}
                                            >
                                                <Award className="w-4 h-4 mr-1.5" /> Cấp gói bảo hiểm
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* All funds history */}
                                {detail.allFunds.length > 1 && (
                                    <div className="bg-white rounded-xl border border-gray-200">
                                        <div className="px-5 py-3 border-b border-gray-100">
                                            <h4 className="font-semibold text-sm text-gray-900">Lịch sử quỹ BH ({detail.allFunds.length})</h4>
                                        </div>
                                        {detail.allFunds.filter(f => f.id !== detail.activeFund?.id).map(f => {
                                            const st = STATUS_MAP[f.status] || { label: f.status, cls: 'bg-gray-100 text-gray-600' };
                                            return (
                                                <div key={f.id} className="flex items-center justify-between px-5 py-2.5 border-b border-gray-50 last:border-0 text-sm">
                                                    <div>
                                                        <span className="font-medium text-gray-700">Gói {TIER_LABEL[f.tier] || f.tier}</span>
                                                        <span className="text-xs text-gray-400 ml-2">{fmtDate(f.activatedAt)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="tabular-nums text-gray-500">{fmt(f.depositAmount)}</span>
                                                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${st.cls}`}>{st.label}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Transaction history */}
                                {detail.history.length > 0 && (
                                    <div className="bg-white rounded-xl border border-gray-200">
                                        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                                            <History className="w-4 h-4 text-gray-400" />
                                            <h4 className="font-semibold text-sm text-gray-900">Lịch sử giao dịch BH</h4>
                                        </div>
                                        <div className="max-h-[400px] overflow-y-auto">
                                            {detail.history.map((item, idx) => (
                                                <div key={item.id} className={`flex items-center gap-3 px-5 py-2.5 ${idx < detail.history.length - 1 ? 'border-b border-gray-50' : ''}`}>
                                                    <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${item.amount >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                                                        {item.amount >= 0 ? <ArrowDown className="w-3.5 h-3.5 text-green-600" /> : <ArrowUp className="w-3.5 h-3.5 text-red-500" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-gray-700 truncate">{item.description}</p>
                                                        <p className="text-[10px] text-gray-400 mt-0.5">{fmtTime(item.createdAt)}</p>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <p className={`text-xs font-semibold tabular-nums ${item.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                            {item.amount >= 0 ? '+' : ''}{fmt(item.amount)}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 tabular-nums">{fmt(item.balanceAfter)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
                                Không tìm thấy thông tin
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ═══ ACTION MODAL ═══ */}
            {actionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => !actionProcessing && setActionModal(null)} />
                    <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full">
                        <div className="p-6 space-y-4">
                            {/* Header */}
                            <div className="text-center">
                                <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center ${actionModal.type === 'confiscate' ? 'bg-red-50' : 'bg-blue-50'
                                    }`}>
                                    {actionModal.type === 'confiscate'
                                        ? <AlertTriangle className="w-6 h-6 text-red-500" />
                                        : <Wallet className="w-6 h-6 text-blue-600" />
                                    }
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">
                                    {actionModal.type === 'confiscate' ? 'Tịch thu quỹ BH' : 'Điều chỉnh quỹ BH'}
                                </h3>
                                <p className="text-sm text-gray-400 mt-1">
                                    Shop: <strong>{actionModal.shopName}</strong> — Quỹ: <strong>{fmt(actionModal.currentBalance)}</strong>
                                </p>
                            </div>

                            {/* Confiscate details */}
                            {actionModal.type === 'confiscate' && (
                                <div className="bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">
                                    <p className="text-xs text-red-700 leading-relaxed">
                                        Tịch thu toàn bộ <strong>{fmt(actionModal.currentBalance)}</strong> từ quỹ BH.
                                        Seller sẽ mất tích xanh và không được hoàn tiền.
                                    </p>
                                </div>
                            )}

                            {/* Adjust type */}
                            {actionModal.type === 'adjust' && (
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setActionAdjustType('DEDUCT')}
                                            className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${actionAdjustType === 'DEDUCT' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-50 text-gray-500 border border-gray-200'
                                                }`}
                                        >
                                            Trừ quỹ
                                        </button>
                                        <button
                                            onClick={() => setActionAdjustType('TOPUP')}
                                            className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${actionAdjustType === 'TOPUP' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-500 border border-gray-200'
                                                }`}
                                        >
                                            Nạp thêm
                                        </button>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Số tiền</label>
                                        <input
                                            type="number"
                                            placeholder="VD: 500000"
                                            value={actionAmount}
                                            onChange={e => setActionAmount(e.target.value)}
                                            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                        {actionAdjustType === 'DEDUCT' && actionAmount && parseInt(actionAmount) > actionModal.currentBalance && (
                                            <p className="text-xs text-red-500 mt-1">Vượt quá số dư quỹ ({fmt(actionModal.currentBalance)})</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Reason */}
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">
                                    Lý do {actionModal.type === 'confiscate' ? '(tối thiểu 10 ký tự)' : '(tối thiểu 5 ký tự)'}
                                </label>
                                <textarea
                                    placeholder={actionModal.type === 'confiscate' ? 'VD: Vi phạm nghiêm trọng, lừa đảo...' : 'VD: Bồi thường tranh chấp #123...'}
                                    value={actionReason}
                                    onChange={e => setActionReason(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2.5 px-6 pb-6">
                            <Button
                                variant="outline"
                                className="flex-1 h-10"
                                onClick={() => { setActionModal(null); setActionReason(''); setActionAmount(''); }}
                                disabled={actionProcessing}
                            >
                                Hủy
                            </Button>
                            <Button
                                className={`flex-1 h-10 text-white ${actionModal.type === 'confiscate' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-900 hover:bg-gray-800'
                                    }`}
                                disabled={actionProcessing}
                                onClick={executeAction}
                            >
                                {actionProcessing && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                                {actionModal.type === 'confiscate' ? 'Xác nhận tịch thu' : 'Xác nhận'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ SET TIER MODAL ═══ */}
            {tierModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => !tierProcessing && setTierModal(null)} />
                    <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full">
                        <div className="p-6 space-y-4">
                            <div className="text-center">
                                <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center bg-amber-50">
                                    <Award className="w-6 h-6 text-amber-600" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Đặt gói Bảo Hiểm</h3>
                                <p className="text-sm text-gray-400 mt-1">
                                    Shop: <strong>{tierModal.sellerName}</strong>
                                    {tierModal.currentTier && <> — Hiện tại: <strong>{TIER_LABEL[tierModal.currentTier]}</strong></>}
                                </p>
                            </div>

                            {/* Tier selection */}
                            <div className="space-y-2">
                                <label className="text-xs text-gray-500 block">Chọn gói BH</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.entries(TIER_LABEL).map(([key, label]) => (
                                        <button
                                            key={key}
                                            onClick={() => setSelectedNewTier(key)}
                                            className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-all ${selectedNewTier === key
                                                ? 'bg-amber-100 text-amber-800 border-amber-300 ring-2 ring-amber-200'
                                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                                }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setSelectedNewTier(null)}
                                        className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-all ${selectedNewTier === null
                                            ? 'bg-red-100 text-red-700 border-red-300 ring-2 ring-red-200'
                                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                            }`}
                                    >
                                        ❌ Xoá BH
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2.5 px-6 pb-6">
                            <Button
                                variant="outline"
                                className="flex-1 h-10"
                                onClick={() => setTierModal(null)}
                                disabled={tierProcessing}
                            >
                                Hủy
                            </Button>
                            <Button
                                className="flex-1 h-10 bg-amber-600 hover:bg-amber-700 text-white"
                                disabled={tierProcessing || selectedNewTier === tierModal.currentTier}
                                onClick={executeSetTier}
                            >
                                {tierProcessing && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                                Xác nhận
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ GRANT INSURANCE MODAL ═══ */}
            {grantModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setGrantModal(false)} />
                    <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col">
                        <div className="p-6 pb-3">
                            <div className="text-center mb-4">
                                <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center bg-amber-50">
                                    <UserSearch className="w-6 h-6 text-amber-600" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Cấp Bảo Hiểm cho Seller</h3>
                                <p className="text-sm text-gray-400 mt-1">Tìm seller theo tên, email hoặc tên shop</p>
                            </div>

                            <div className="relative">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Nhập tên, email hoặc tên shop..."
                                    value={sellerSearch}
                                    onChange={e => searchSellers(e.target.value)}
                                    className="w-full h-10 pl-9 pr-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    autoFocus
                                />
                                {sellerSearching && <Loader2 className="w-4 h-4 animate-spin text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 pb-2">
                            {sellerSearch.length < 2 ? (
                                <p className="text-center text-sm text-gray-400 py-6">Nhập ít nhất 2 ký tự để tìm kiếm</p>
                            ) : sellerResults.length === 0 && !sellerSearching ? (
                                <p className="text-center text-sm text-gray-400 py-6">Không tìm thấy seller nào</p>
                            ) : (
                                <div className="space-y-1">
                                    {sellerResults.map(seller => (
                                        <button
                                            key={seller.id}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-amber-50 transition-colors text-left"
                                            onClick={() => {
                                                setGrantModal(false);
                                                setSelectedNewTier(seller.sellerProfile?.insuranceTier || null);
                                                setTierModal({
                                                    sellerId: seller.id,
                                                    sellerName: seller.sellerProfile?.shopName || seller.name || seller.email,
                                                    currentTier: seller.sellerProfile?.insuranceTier || null,
                                                });
                                            }}
                                        >
                                            <div className="w-9 h-9 bg-gray-200 rounded-lg flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0">
                                                {(seller.sellerProfile?.shopName || seller.name || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 truncate">
                                                    {seller.sellerProfile?.shopName || seller.name}
                                                </p>
                                                <p className="text-[11px] text-gray-400 truncate">{seller.email}</p>
                                            </div>
                                            {seller.sellerProfile?.insuranceTier ? (
                                                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                                                    {TIER_LABEL[seller.sellerProfile.insuranceTier] || seller.sellerProfile.insuranceTier}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-500">
                                                    Chưa có BH
                                                </span>
                                            )}
                                            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="px-6 pb-6 pt-2">
                            <Button variant="outline" className="w-full h-10" onClick={() => setGrantModal(false)}>
                                Đóng
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
