'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    Shield, ArrowUp, ArrowDown, Clock, AlertTriangle, CheckCircle, XCircle,
    Loader2, ChevronRight, ChevronDown, Info, History, Wallet, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VerifyBadge } from '@/components/VerifyBadge';
import { InsuranceTierIcon } from '@/components/InsuranceTierIcon';

/* ═══════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════ */
interface InsuranceFund {
    id: string;
    depositAmount: number;
    currentBalance: number;
    maxCoverage: number;
    annualFee: number;
    status: string;
    activatedAt: string;
    nextRenewalAt: string;
    canWithdrawFull: boolean;
}

interface TierConfig {
    tier: string;
    level: number;
    deposit: number;
    maxCoverage: number;
    annualFee: number;
    label: string;
}

interface InsuranceStatus {
    hasInsurance: boolean;
    tier: string | null;
    level: number;
    tierLabel: string | null;
    fund: InsuranceFund | null;
    availableTiers: TierConfig[];
}

interface HistoryItem {
    id: string;
    type: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    description: string;
    createdAt: string;
}

/* ═══════════════════════════════════════════════
   Styling maps
   ═══════════════════════════════════════════════ */
const TIER_ACCENT: Record<string, string> = {
    BRONZE: '#b45309', SILVER: '#64748b', GOLD: '#a16207', DIAMOND: '#1d4ed8', VIP: '#7c3aed',
};
const TIER_BG: Record<string, string> = {
    BRONZE: '#fef3c7', SILVER: '#f1f5f9', GOLD: '#fef9c3', DIAMOND: '#dbeafe', VIP: '#ede9fe',
};
const TIER_BADGE_CLS: Record<string, string> = {
    BRONZE: 'bg-amber-100 text-amber-800',
    SILVER: 'bg-slate-100 text-slate-700',
    GOLD: 'bg-yellow-100 text-yellow-800',
    DIAMOND: 'bg-blue-100 text-blue-800',
    VIP: 'bg-violet-100 text-violet-800',
};

/* ═══════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════ */
export default function SellerInsurancePage() {
    const [status, setStatus] = useState<InsuranceStatus | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [userBalance, setUserBalance] = useState<number | null>(null);

    // UI state
    const [activeModal, setActiveModal] = useState<'register' | 'upgrade' | 'withdraw' | null>(null);
    const [selectedTier, setSelectedTier] = useState<TierConfig | null>(null);
    const [showAllTiers, setShowAllTiers] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    /* ── Data fetching ── */
    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const h = { Authorization: `Bearer ${token}` };
            const [sRes, hRes, bRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/seller/insurance`, { headers: h }),
                fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/seller/insurance/history?limit=15`, { headers: h }),
                fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/seller/dashboard`, { headers: h }),
            ]);
            if (sRes.ok) setStatus(await sRes.json());
            if (hRes.ok) { const d = await hRes.json(); setHistory(d.history || []); setHistoryTotal(d.total || 0); }
            if (bRes.ok) { const d = await bRes.json(); setUserBalance(d.balance ?? d.walletBalance ?? null); }
        } catch {
            setToast({ type: 'error', msg: 'Không thể tải dữ liệu bảo hiểm' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 5000); return () => clearTimeout(t); } }, [toast]);

    /* ── API call helper ── */
    const apiCall = async (url: string, body?: object) => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}${url}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                ...(body ? { body: JSON.stringify(body) } : {}),
            });
            const data = await res.json();
            if (res.ok) {
                setToast({ type: 'success', msg: data.message });
                setActiveModal(null);
                setSelectedTier(null);
                await fetchData();
            } else {
                setToast({ type: 'error', msg: data.message || 'Có lỗi xảy ra' });
            }
        } catch {
            setToast({ type: 'error', msg: 'Lỗi kết nối server' });
        } finally {
            setIsProcessing(false);
        }
    };

    /* ── Formatters ── */
    const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ';
    const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN');
    const fmtTime = (d: string) => {
        const dt = new Date(d);
        return `${dt.toLocaleDateString('vi-VN')} ${dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    };

    /* ── Computed ── */
    const monthsSince = status?.fund
        ? Math.floor((Date.now() - new Date(status.fund.activatedAt).getTime()) / (1000 * 60 * 60 * 24 * 30))
        : 0;

    /* ── Loading ── */
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            </div>
        );
    }

    if (!status) return null;

    const tierStyle = status.tier ? { accent: TIER_ACCENT[status.tier], bg: TIER_BG[status.tier], badge: TIER_BADGE_CLS[status.tier] } : null;

    return (
        <div className="max-w-4xl mx-auto px-4 py-5 lg:px-6 lg:py-6 space-y-5">

            {/* ═══ TOAST ═══ */}
            {toast && (
                <div className={`fixed top-5 right-5 z-[100] max-w-sm animate-in slide-in-from-right fade-in duration-300 flex items-start gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm ${toast.type === 'success' ? 'bg-white border-green-200 text-green-800' : 'bg-white border-red-200 text-red-800'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle className="w-4.5 h-4.5 text-green-500 mt-0.5 flex-shrink-0" /> : <XCircle className="w-4.5 h-4.5 text-red-500 mt-0.5 flex-shrink-0" />}
                    <p className="leading-snug">{toast.msg}</p>
                    <button onClick={() => setToast(null)} className="ml-2 text-gray-300 hover:text-gray-500 flex-shrink-0">
                        <XCircle className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ═══ PAGE HEADER ═══ */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Quỹ Bảo Hiểm</h1>
                    <p className="text-[13px] text-gray-400 mt-0.5">Bảo vệ giao dịch, tăng uy tín gian hàng</p>
                </div>
                <Link href="/verify" target="_blank" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                    Chính sách BH <ChevronRight className="w-3 h-3" />
                </Link>
            </div>

            {/* ═══ MAIN CONTENT ═══ */}
            {status.hasInsurance && status.fund && tierStyle ? (
                /* ─────────── HAS INSURANCE ─────────── */
                <>
                    {/* Status Card */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        {/* Top bar */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <VerifyBadge size={36} isVerified={true} insuranceLevel={status.level} insuranceTier={status.tier} />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-900">Gói {status.tierLabel}</span>
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tierStyle.badge}`}>
                                            Level {status.level}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Kích hoạt {fmtDate(status.fund.activatedAt)} — {monthsSince} tháng
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                                </span>
                                <span className="text-xs font-medium text-green-600">Hoạt động</span>
                            </div>
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4">
                            {[
                                { label: 'Số dư quỹ BH', value: fmt(status.fund.currentBalance), sub: `/ ${fmt(status.fund.depositAmount)}` },
                                { label: 'Bảo hiểm tối đa', value: fmt(status.fund.maxCoverage), sub: 'cho mỗi đơn hàng' },
                                { label: 'Phí duy trì', value: fmt(status.fund.annualFee), sub: 'mỗi năm' },
                                { label: 'Gia hạn tiếp theo', value: fmtDate(status.fund.nextRenewalAt), sub: '' },
                            ].map((s, i) => (
                                <div key={i} className={`px-5 py-4 ${i < 3 ? 'border-r border-gray-50' : ''} ${i < 2 ? 'border-b sm:border-b-0 border-gray-50' : ''}`}>
                                    <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">{s.label}</p>
                                    <p className="text-[15px] font-bold text-gray-900 tabular-nums">{s.value}</p>
                                    {s.sub && <p className="text-[11px] text-gray-400 mt-0.5">{s.sub}</p>}
                                </div>
                            ))}
                        </div>

                        {/* Progress bar — fund health */}
                        <div className="px-5 py-3 border-t border-gray-100">
                            <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1.5">
                                <span>Sức khỏe quỹ BH</span>
                                <span>{Math.round((status.fund.currentBalance / status.fund.depositAmount) * 100)}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${Math.min(100, (status.fund.currentBalance / status.fund.depositAmount) * 100)}%`,
                                        backgroundColor: (status.fund.currentBalance / status.fund.depositAmount) > 0.5 ? '#22c55e' : (status.fund.currentBalance / status.fund.depositAmount) > 0.25 ? '#f59e0b' : '#ef4444',
                                    }}
                                />
                            </div>
                        </div>

                        {/* Warning if early withdrawal */}
                        {monthsSince < 5 && (
                            <div className="mx-5 mb-4 bg-amber-50 border border-amber-100 rounded-lg px-3.5 py-2.5 flex gap-2.5">
                                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-amber-700 leading-relaxed">
                                    <strong>Rút sớm mất 50% tiền cọc.</strong> Đã hoạt động {monthsSince}/5 tháng.
                                    Chờ thêm {5 - monthsSince} tháng nữa để rút được 100%.
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="px-5 py-3.5 border-t border-gray-100 flex items-center gap-2.5">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 text-[13px] border-gray-200 hover:bg-gray-50"
                                onClick={() => { setShowAllTiers(true); setActiveModal('upgrade'); }}
                            >
                                <ArrowUp className="w-3.5 h-3.5 mr-1.5" /> Nâng cấp gói
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 text-[13px] border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-200"
                                onClick={() => setActiveModal('withdraw')}
                            >
                                <ArrowDown className="w-3.5 h-3.5 mr-1.5" /> Rút quỹ BH
                            </Button>
                        </div>
                    </div>
                </>
            ) : (
                /* ─────────── NO INSURANCE ─────────── */
                <>
                    {/* Intro card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex items-start gap-4">
                            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <Shield className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <h2 className="font-bold text-gray-900 text-[15px]">Đăng ký Quỹ Bảo Hiểm</h2>
                                <p className="text-[13px] text-gray-400 mt-1 leading-relaxed">
                                    Cọc quỹ bảo hiểm để nhận tích xanh, tăng uy tín gian hàng.
                                    Người mua sẽ yên tâm hơn khi giao dịch với shop có bảo hiểm.
                                </p>
                                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
                                    <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Tích xanh trên shop</span>
                                    <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-blue-500" /> Bảo vệ giao dịch</span>
                                    <span className="flex items-center gap-1"><ArrowUp className="w-3.5 h-3.5 text-violet-500" /> Ưu tiên hiển thị</span>
                                </div>
                            </div>
                        </div>
                        {userBalance !== null && (
                            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
                                <Wallet className="w-3.5 h-3.5" />
                                <span>Số dư ví hiện tại: <strong className="text-gray-700">{fmt(userBalance)}</strong></span>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ═══ TIER SELECTION ═══ */}
            {(!status.hasInsurance || activeModal === 'upgrade') && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-[15px] text-gray-900">
                            {status.hasInsurance ? 'Nâng cấp gói bảo hiểm' : 'Chọn gói bảo hiểm'}
                        </h3>
                        {activeModal === 'upgrade' && (
                            <button onClick={() => { setActiveModal(null); setShowAllTiers(false); }} className="text-xs text-gray-400 hover:text-gray-600">
                                Hủy
                            </button>
                        )}
                    </div>

                    {/* Tier comparison table */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        {/* Table header */}
                        <div className="hidden sm:grid sm:grid-cols-5 text-[11px] font-medium text-gray-400 uppercase tracking-wide px-5 py-2.5 border-b border-gray-100 bg-gray-50">
                            <div>Gói</div>
                            <div className="text-right">Tiền cọc</div>
                            <div className="text-right">BH tối đa/đơn</div>
                            <div className="text-right">Phí/năm</div>
                            <div className="text-right" />
                        </div>

                        {/* Tier rows */}
                        {status.availableTiers
                            .filter(t => !status.hasInsurance || t.level > status.level)
                            .map((tier, idx, arr) => {
                                const accent = TIER_ACCENT[tier.tier];
                                const bg = TIER_BG[tier.tier];
                                const badgeCls = TIER_BADGE_CLS[tier.tier];
                                const diff = status.fund ? Math.max(0, tier.deposit - status.fund.currentBalance) : 0;
                                const canAfford = userBalance !== null ? (status.hasInsurance ? userBalance >= diff : userBalance >= tier.deposit) : true;

                                return (
                                    <div
                                        key={tier.tier}
                                        className={`group ${idx < arr.length - 1 ? 'border-b border-gray-50' : ''}`}
                                    >
                                        {/* Mobile layout */}
                                        <div className="sm:hidden p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: bg }}>
                                                        <InsuranceTierIcon tier={tier.tier} size={32} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-sm text-gray-900">{tier.label}</span>
                                                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${badgeCls}`}>Lv.{tier.level}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <div className="bg-gray-50 rounded-lg py-2 px-1">
                                                    <p className="text-[10px] text-gray-400">Cọc</p>
                                                    <p className="text-xs font-bold text-gray-900 mt-0.5">{fmt(tier.deposit)}</p>
                                                </div>
                                                <div className="bg-gray-50 rounded-lg py-2 px-1">
                                                    <p className="text-[10px] text-gray-400">BH/đơn</p>
                                                    <p className="text-xs font-bold text-gray-900 mt-0.5">{fmt(tier.maxCoverage)}</p>
                                                </div>
                                                <div className="bg-gray-50 rounded-lg py-2 px-1">
                                                    <p className="text-[10px] text-gray-400">Phí/năm</p>
                                                    <p className="text-xs font-bold text-gray-900 mt-0.5">{fmt(tier.annualFee)}</p>
                                                </div>
                                            </div>
                                            <Button
                                                className="w-full h-9 text-[13px] bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-40"
                                                disabled={isProcessing || !canAfford}
                                                onClick={() => {
                                                    setSelectedTier(tier);
                                                    setActiveModal(status.hasInsurance ? 'upgrade' : 'register');
                                                }}
                                            >
                                                {!canAfford ? 'Không đủ số dư' : status.hasInsurance ? `Nâng cấp (+${fmt(diff)})` : 'Đăng ký gói này'}
                                            </Button>
                                        </div>

                                        {/* Desktop layout */}
                                        <div className="hidden sm:grid sm:grid-cols-5 items-center px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: bg }}>
                                                    <InsuranceTierIcon tier={tier.tier} size={28} />
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-sm text-gray-900">{tier.label}</span>
                                                    <span className={`ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded ${badgeCls}`}>Lv.{tier.level}</span>
                                                </div>
                                            </div>
                                            <div className="text-right text-sm font-semibold text-gray-900 tabular-nums">{fmt(tier.deposit)}</div>
                                            <div className="text-right text-sm text-gray-600 tabular-nums">{fmt(tier.maxCoverage)}</div>
                                            <div className="text-right text-sm text-gray-500 tabular-nums">{fmt(tier.annualFee)}</div>
                                            <div className="text-right">
                                                <Button
                                                    size="sm"
                                                    className="h-8 text-xs bg-gray-900 hover:bg-gray-800 text-white px-4 disabled:opacity-40"
                                                    disabled={isProcessing || !canAfford}
                                                    onClick={() => {
                                                        setSelectedTier(tier);
                                                        setActiveModal(status.hasInsurance ? 'upgrade' : 'register');
                                                    }}
                                                >
                                                    {!canAfford ? 'Không đủ dư' : status.hasInsurance ? `+${fmt(diff)}` : 'Đăng ký'}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>

                    {!status.hasInsurance && (
                        <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-1.5 text-xs text-gray-500 leading-relaxed">
                            <p className="flex items-start gap-1.5"><Info className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" /> Tiền cọc trừ từ số dư ví. Rút BH trước 5 tháng hoàn 50%, sau 5 tháng hoàn 100%.</p>
                            <p className="flex items-start gap-1.5"><Info className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" /> Phí cập nhật thông tin hồ sơ BH: 50.000đ/lần. Phí duy trì thu hàng năm.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ HISTORY ═══ */}
            {history.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <History className="w-4 h-4 text-gray-400" />
                            <h3 className="font-semibold text-sm text-gray-900">Lịch sử giao dịch BH</h3>
                        </div>
                        <span className="text-[11px] text-gray-400">{historyTotal} bản ghi</span>
                    </div>
                    <div>
                        {history.map((item, idx) => (
                            <div key={item.id} className={`flex items-center gap-3 px-5 py-3 ${idx < history.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-gray-50/30 transition-colors`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.amount >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                                    {item.amount >= 0 ? <ArrowDown className="w-3.5 h-3.5 text-green-600" /> : <ArrowUp className="w-3.5 h-3.5 text-red-500" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] text-gray-700 truncate">{item.description}</p>
                                    <p className="text-[11px] text-gray-400 mt-0.5">{fmtTime(item.createdAt)}</p>
                                </div>
                                <div className="text-right flex-shrink-0 pl-3">
                                    <p className={`text-[13px] font-semibold tabular-nums ${item.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {item.amount >= 0 ? '+' : ''}{fmt(item.amount)}
                                    </p>
                                    <p className="text-[10px] text-gray-400 tabular-nums mt-0.5">Sau: {fmt(item.balanceAfter)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════
         MODALS
         ═══════════════════════════════════════════════ */}

            {/* ─── Register Confirmation ─── */}
            {activeModal === 'register' && selectedTier && (
                <ModalOverlay onClose={() => { setActiveModal(null); setSelectedTier(null); }}>
                    <div className="p-6 space-y-5">
                        <div className="text-center">
                            <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: TIER_BG[selectedTier.tier] }}>
                                <InsuranceTierIcon tier={selectedTier.tier} size={48} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Đăng ký gói {selectedTier.label}</h3>
                            <p className="text-sm text-gray-400 mt-1">Xác nhận đăng ký bảo hiểm Level {selectedTier.level}</p>
                        </div>

                        {/* Details */}
                        <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
                            {[
                                { label: 'Tiền cọc', value: fmt(selectedTier.deposit), bold: true },
                                { label: 'Bảo hiểm tối đa/đơn', value: fmt(selectedTier.maxCoverage) },
                                { label: 'Phí duy trì/năm', value: fmt(selectedTier.annualFee) },
                                ...(userBalance !== null ? [{ label: 'Số dư ví hiện tại', value: fmt(userBalance), bold: false }] : []),
                                ...(userBalance !== null ? [{ label: 'Sau khi đăng ký', value: fmt(Math.max(0, userBalance - selectedTier.deposit)), bold: true }] : []),
                            ].map((row, i) => (
                                <div key={i} className="flex justify-between px-4 py-2.5 text-sm">
                                    <span className="text-gray-500">{row.label}</span>
                                    <span className={row.bold ? 'font-bold text-gray-900' : 'text-gray-700'}>{row.value}</span>
                                </div>
                            ))}
                        </div>

                        {/* Rules summary */}
                        <div className="space-y-2 text-xs text-gray-500">
                            <p className="flex items-start gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" /> Shop sẽ nhận tích xanh ngay sau đăng ký</p>
                            <p className="flex items-start gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" /> Rút trước 5 tháng hoàn 50% cọc, sau 5 tháng hoàn 100%</p>
                            <p className="flex items-start gap-1.5"><RefreshCw className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" /> Phí duy trì tự động trừ hàng năm</p>
                        </div>

                        {/* Wallet insufficient warning */}
                        {userBalance !== null && userBalance < selectedTier.deposit && (
                            <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 flex gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-red-700">
                                    Số dư không đủ. Cần thêm <strong>{fmt(selectedTier.deposit - userBalance)}</strong>.
                                    <Link href="/wallet/recharge" className="underline ml-1">Nạp tiền</Link>
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2.5 px-6 pb-6">
                        <Button variant="outline" className="flex-1 h-10" onClick={() => { setActiveModal(null); setSelectedTier(null); }} disabled={isProcessing}>
                            Hủy
                        </Button>
                        <Button
                            className="flex-1 h-10 bg-gray-900 hover:bg-gray-800 text-white"
                            disabled={isProcessing || (userBalance !== null && userBalance < selectedTier.deposit)}
                            onClick={() => apiCall('/seller/insurance/register', { tier: selectedTier.tier })}
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                            Xác nhận đăng ký
                        </Button>
                    </div>
                </ModalOverlay>
            )}

            {/* ─── Upgrade Confirmation ─── */}
            {activeModal === 'upgrade' && selectedTier && status.fund && (
                <ModalOverlay onClose={() => { setActiveModal(null); setSelectedTier(null); }}>
                    <div className="p-6 space-y-5">
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: TIER_BG[status.tier!] }}>
                                    <InsuranceTierIcon tier={status.tier!} size={36} />
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-300" />
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: TIER_BG[selectedTier.tier] }}>
                                    <InsuranceTierIcon tier={selectedTier.tier} size={36} />
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Nâng cấp lên gói {selectedTier.label}</h3>
                            <p className="text-sm text-gray-400 mt-1">{status.tierLabel} (Lv.{status.level}) → {selectedTier.label} (Lv.{selectedTier.level})</p>
                        </div>

                        {(() => {
                            const diff = Math.max(0, selectedTier.deposit - status.fund!.currentBalance);
                            return (
                                <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
                                    {[
                                        { label: 'Cọc gói mới', value: fmt(selectedTier.deposit) },
                                        { label: 'Số dư quỹ hiện tại', value: fmt(status.fund!.currentBalance) },
                                        { label: 'Cần trả thêm', value: fmt(diff), bold: true },
                                        ...(userBalance !== null ? [{ label: 'Số dư ví', value: fmt(userBalance) }] : []),
                                    ].map((row, i) => (
                                        <div key={i} className="flex justify-between px-4 py-2.5 text-sm">
                                            <span className="text-gray-500">{row.label}</span>
                                            <span className={row.bold ? 'font-bold text-gray-900' : 'text-gray-700'}>{row.value}</span>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                    <div className="flex gap-2.5 px-6 pb-6">
                        <Button variant="outline" className="flex-1 h-10" onClick={() => { setActiveModal(null); setSelectedTier(null); }} disabled={isProcessing}>
                            Hủy
                        </Button>
                        <Button
                            className="flex-1 h-10 bg-gray-900 hover:bg-gray-800 text-white"
                            disabled={isProcessing}
                            onClick={() => apiCall('/seller/insurance/upgrade', { newTier: selectedTier.tier })}
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                            Nâng cấp ngay
                        </Button>
                    </div>
                </ModalOverlay>
            )}

            {/* ─── Withdraw Confirmation ─── */}
            {activeModal === 'withdraw' && status.fund && (
                <ModalOverlay onClose={() => !isProcessing && setActiveModal(null)}>
                    <div className="p-6 space-y-5">
                        <div className="text-center">
                            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-3">
                                <AlertTriangle className="w-7 h-7 text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Rút quỹ Bảo Hiểm</h3>
                            <p className="text-sm text-gray-400 mt-1">
                                {monthsSince < 5 ? 'Rút sớm — chỉ hoàn 50% tiền cọc' : 'Đủ 5 tháng — hoàn 100% tiền cọc'}
                            </p>
                        </div>

                        {(() => {
                            const early = monthsSince < 5;
                            const refund = early ? Math.floor(status.fund!.currentBalance * 0.5) : status.fund!.currentBalance;
                            const penalty = status.fund!.currentBalance - refund;

                            return (
                                <>
                                    <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
                                        {[
                                            { label: 'Số dư quỹ hiện tại', value: fmt(status.fund!.currentBalance) },
                                            { label: 'Tỷ lệ hoàn', value: early ? '50%' : '100%' },
                                            { label: 'Hoàn về ví', value: fmt(refund), cls: 'text-green-600 font-bold' },
                                            ...(early ? [{ label: 'Mất (phí rút sớm)', value: `-${fmt(penalty)}`, cls: 'text-red-500 font-bold' }] : []),
                                        ].map((row, i) => (
                                            <div key={i} className="flex justify-between px-4 py-2.5 text-sm">
                                                <span className="text-gray-500">{row.label}</span>
                                                <span className={row.cls || 'text-gray-700'}>{row.value}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {early && (
                                        <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 flex gap-2">
                                            <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                            <p className="text-xs text-amber-700">
                                                Còn <strong>{5 - monthsSince} tháng</strong> nữa để rút được 100%.
                                                Bạn sẽ mất <strong>{fmt(penalty)}</strong> nếu rút ngay.
                                            </p>
                                        </div>
                                    )}
                                </>
                            );
                        })()}

                        <p className="text-xs text-gray-400 text-center leading-relaxed">
                            Shop sẽ mất tích xanh bảo hiểm ngay lập tức. Bạn có thể đăng ký lại sau.
                        </p>
                    </div>
                    <div className="flex gap-2.5 px-6 pb-6">
                        <Button variant="outline" className="flex-1 h-10" onClick={() => setActiveModal(null)} disabled={isProcessing}>
                            Giữ lại BH
                        </Button>
                        <Button
                            className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white"
                            disabled={isProcessing}
                            onClick={() => apiCall('/seller/insurance/withdraw')}
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                            Xác nhận rút
                        </Button>
                    </div>
                </ModalOverlay>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════
   Modal Overlay component
   ═══════════════════════════════════════════════ */
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                {children}
            </div>
        </div>
    );
}
