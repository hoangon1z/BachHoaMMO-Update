'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Shield, BadgeCheck, CheckCircle, AlertTriangle,
    Clock, ChevronDown, ChevronUp, Info, XCircle,
    Wallet, ArrowRight, ChevronRight, HelpCircle, FileText, Users
} from 'lucide-react';
import { VerifyBadge } from '@/components/VerifyBadge';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuthStore } from '@/store/authStore';

// ─── Insurance Tiers (synced with backend) ───
const INSURANCE_TIERS = [
    {
        id: 'BRONZE', name: 'Đồng', level: 1,
        deposit: 500000, maxCoverage: 200000, annualFee: 100000,
        accent: '#b45309', bg: '#fef3c7',
        features: ['Tích xanh cơ bản', 'BH đến 200.000đ/đơn', 'Hỗ trợ tranh chấp'],
    },
    {
        id: 'SILVER', name: 'Bạc', level: 2,
        deposit: 2000000, maxCoverage: 1000000, annualFee: 200000,
        accent: '#64748b', bg: '#f1f5f9',
        features: ['Tích xanh Bạc', 'BH đến 1.000.000đ/đơn', 'Ưu tiên hỗ trợ', 'Hiển thị mức BH'],
    },
    {
        id: 'GOLD', name: 'Vàng', level: 3, popular: true,
        deposit: 5000000, maxCoverage: 3000000, annualFee: 300000,
        accent: '#a16207', bg: '#fef9c3',
        features: ['Tích xanh Vàng', 'BH đến 3.000.000đ/đơn', 'Ưu tiên tìm kiếm', 'Hỗ trợ ưu tiên cao'],
    },
    {
        id: 'DIAMOND', name: 'Kim Cương', level: 4,
        deposit: 10000000, maxCoverage: 5000000, annualFee: 500000,
        accent: '#1d4ed8', bg: '#dbeafe',
        features: ['Tích xanh Kim Cương', 'BH đến 5.000.000đ/đơn', 'TOP ưu tiên cao', 'Badge nổi bật'],
    },
    {
        id: 'VIP', name: 'VIP', level: 5,
        deposit: 20000000, maxCoverage: 10000000, annualFee: 1000000,
        accent: '#7c3aed', bg: '#ede9fe',
        features: ['Tích xanh VIP', 'BH đến 10.000.000đ/đơn', 'TOP #1', 'Hỗ trợ tức thì', 'Quảng bá trang chủ'],
    },
];

const FAQ_DATA = [
    {
        q: 'Tích xanh bảo hiểm là gì?',
        a: 'Tích xanh là biểu tượng cho thấy shop đã đóng quỹ bảo hiểm tại BachHoaMMO. Khi mua hàng từ shop có tích xanh, giao dịch được bảo hiểm — nếu xảy ra tranh chấp và seller sai, buyer được bồi thường từ quỹ BH.',
    },
    {
        q: 'Phí đăng ký bảo hiểm là bao nhiêu?',
        a: 'Phí tạo hồ sơ: MIỄN PHÍ. Seller cần đóng tiền cọc (từ 500.000đ tùy gói) và phí duy trì hàng năm. Tiền cọc có thể rút lại theo điều khoản.',
    },
    {
        q: 'Buyer được bảo vệ như thế nào?',
        a: 'Khi mua hàng từ shop có tích xanh và xảy ra vấn đề (không nhận hàng, hàng sai mô tả...), admin sẽ xét xử. Nếu seller sai, buyer được bồi thường từ quỹ BH trong hạn mức gói.',
    },
    {
        q: 'Rút tiền cọc BH như thế nào?',
        a: 'Rút trước 5 tháng: hoàn 50% tiền cọc. Rút sau 5 tháng: hoàn 100%. Khi rút BH, tích xanh bị gỡ ngay lập tức. Seller có thể đăng ký lại bất kỳ lúc nào.',
    },
    {
        q: 'Khi nào quỹ BH bị trừ?',
        a: 'Khi có tranh chấp và admin xác định seller sai, tiền bồi thường cho buyer sẽ trừ từ quỹ BH. Nếu quỹ giảm dưới mức gói, seller phải nạp thêm trong 7 ngày hoặc bị hạ gói/mất tích xanh.',
    },
    {
        q: 'Tích xanh có thể bị thu hồi không?',
        a: 'Có. Nếu vi phạm nghiêm trọng (lừa đảo, hàng giả, nhiều khiếu nại), admin có quyền tịch thu 100% quỹ BH và khóa tài khoản vĩnh viễn.',
    },
    {
        q: 'Phí thay đổi thông tin BH?',
        a: 'Mỗi lần cập nhật thông tin hồ sơ BH (tên shop, SĐT...) sẽ tốn 50.000đ. Phí trừ trực tiếp từ quỹ BH.',
    },
];

function fmt(n: number) {
    return new Intl.NumberFormat('vi-VN').format(n) + 'đ';
}

export default function VerifyPage() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const { user, logout, checkAuth } = useAuthStore();
    const router = useRouter();

    useEffect(() => { checkAuth(); }, []);

    return (
        <>
            <Header user={user} onLogout={() => { logout(); router.push('/'); }} />
            <main className="min-h-screen bg-gray-50">

                {/* ══════════════ HEADER ══════════════ */}
                <section className="bg-white border-b border-gray-200">
                    <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
                        <div className="max-w-2xl">
                            <div className="flex items-center gap-2 mb-4">
                                <Shield className="w-5 h-5 text-blue-600" />
                                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Chương trình bảo hiểm</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 leading-tight">
                                Hệ thống Bảo Hiểm & Xác Minh Seller
                            </h1>
                            <p className="text-gray-500 leading-relaxed mb-6">
                                Shop có tích xanh đã đóng quỹ bảo hiểm — bảo vệ quyền lợi người mua trong mọi giao dịch.
                                Tìm hiểu cách hoạt động và quyền lợi cho cả buyer lẫn seller.
                            </p>
                            <div className="flex items-center gap-3">
                                <Link
                                    href="/seller/insurance"
                                    className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
                                >
                                    <BadgeCheck className="w-4 h-4" /> Đăng ký BH (Seller)
                                </Link>
                                <a
                                    href="#faq"
                                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    <HelpCircle className="w-4 h-4" /> Câu hỏi thường gặp
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══════════════ BADGE MEANING ══════════════ */}
                <section className="max-w-5xl mx-auto px-4 py-10">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Ý nghĩa tích xanh</h2>
                    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <VerifyBadge size={32} isVerified={true} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-900 mb-1">Tích Xanh Bảo Hiểm</h3>
                            <p className="text-sm text-gray-500 leading-relaxed mb-3">
                                Shop đã <strong>đóng quỹ bảo hiểm</strong> tại BachHoaMMO. Giao dịch với shop này được bảo vệ tài chính —
                                nếu xảy ra tranh chấp và seller sai, buyer được bồi thường từ quỹ BH trong hạn mức.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {['Đã đóng cọc quỹ bảo hiểm', 'Giao dịch được bảo vệ tài chính', 'Xử lý tranh chấp ưu tiên'].map((txt, i) => (
                                    <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                                        <CheckCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                        {txt}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══════════════ HOW BUYER IS PROTECTED ══════════════ */}
                <section className="bg-white border-y border-gray-100">
                    <div className="max-w-5xl mx-auto px-4 py-10">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded">Dành cho Buyer</span>
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 mb-5">Bạn được bảo vệ như thế nào?</h2>

                        {/* Protection flow steps */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
                            {[
                                { step: '1', title: 'Mua hàng', desc: 'Mua từ shop có tích xanh' },
                                { step: '2', title: 'Gặp vấn đề', desc: 'Mở tranh chấp với admin' },
                                { step: '3', title: 'Admin xét xử', desc: 'Xác minh và phân xử' },
                                { step: '4', title: 'Bồi thường', desc: 'Hoàn tiền từ quỹ BH seller' },
                            ].map((s, i) => (
                                <div key={i} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-sm font-bold text-gray-900 flex-shrink-0">
                                        {s.step}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
                            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-700 leading-relaxed">
                                Mức bồi thường phụ thuộc vào gói BH của seller (từ 200.000đ đến 10.000.000đ/đơn).
                                Bạn có thể xem mức BH của shop trước khi mua hàng.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ══════════════ TIER COMPARISON TABLE ══════════════ */}
                <section id="tiers" className="max-w-5xl mx-auto px-4 py-10">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">Dành cho Seller</span>
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Các gói Bảo Hiểm</h2>
                    <p className="text-sm text-gray-400 mb-5">Chọn gói phù hợp để nhận tích xanh và bảo vệ khách hàng. Phí tạo hồ sơ: <strong className="text-green-600">MIỄN PHÍ</strong></p>

                    {/* Desktop table */}
                    <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Gói</th>
                                    <th className="text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Tiền cọc</th>
                                    <th className="text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">BH tối đa/đơn</th>
                                    <th className="text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Phí/năm</th>
                                    <th className="text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">Quyền lợi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {INSURANCE_TIERS.map((tier, idx) => (
                                    <tr key={tier.id} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors ${tier.popular ? 'bg-yellow-50/30' : ''}`}>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: tier.bg }}>
                                                    <Shield className="w-4 h-4" style={{ color: tier.accent }} />
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-semibold text-sm text-gray-900">{tier.name}</span>
                                                    {tier.popular && (
                                                        <span className="text-[9px] font-bold bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded">HOT</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-right text-sm font-semibold text-gray-900 tabular-nums">{fmt(tier.deposit)}</td>
                                        <td className="px-5 py-3.5 text-right text-sm text-gray-600 tabular-nums">{fmt(tier.maxCoverage)}</td>
                                        <td className="px-5 py-3.5 text-right text-sm text-gray-500 tabular-nums">{fmt(tier.annualFee)}</td>
                                        <td className="px-5 py-3.5 text-right">
                                            <span className="text-xs text-gray-500">{tier.features.length} quyền lợi</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="sm:hidden space-y-3">
                        {INSURANCE_TIERS.map(tier => (
                            <div key={tier.id} className={`bg-white rounded-xl border ${tier.popular ? 'border-yellow-300' : 'border-gray-200'} p-4`}>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: tier.bg }}>
                                            <Shield className="w-4 h-4" style={{ color: tier.accent }} />
                                        </div>
                                        <span className="font-bold text-sm text-gray-900">{tier.name}</span>
                                        {tier.popular && <span className="text-[9px] font-bold bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded">HOT</span>}
                                    </div>
                                    <span className="text-sm font-bold text-gray-900">{fmt(tier.deposit)}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                                        <span className="text-gray-400">BH/đơn</span>
                                        <p className="font-bold text-gray-900 mt-0.5">{fmt(tier.maxCoverage)}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                                        <span className="text-gray-400">Phí/năm</span>
                                        <p className="font-bold text-gray-900 mt-0.5">{fmt(tier.annualFee)}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    {tier.features.map((f, i) => (
                                        <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                                            <CheckCircle className="w-3 h-3 flex-shrink-0" style={{ color: tier.accent }} />
                                            {f}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 text-center">
                        <Link
                            href="/seller/insurance"
                            className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            Đăng ký ngay <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </section>

                {/* ══════════════ TERMS ══════════════ */}
                <section className="bg-white border-y border-gray-100">
                    <div className="max-w-5xl mx-auto px-4 py-10">
                        <h2 className="text-lg font-bold text-gray-900 mb-5">Điều khoản quan trọng</h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            {/* Withdrawal policy */}
                            <div className="bg-gray-50 rounded-xl border border-gray-100 p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <Wallet className="w-4 h-4 text-blue-600" />
                                    <h3 className="font-bold text-sm text-gray-900">Chính sách rút quỹ BH</h3>
                                </div>
                                <div className="space-y-2">
                                    <div className="bg-white rounded-lg p-3 border border-amber-100">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                                            <span className="text-xs font-semibold text-amber-800">Rút trước 5 tháng</span>
                                        </div>
                                        <p className="text-xl font-bold text-amber-600">Hoàn 50%</p>
                                    </div>
                                    <div className="bg-white rounded-lg p-3 border border-green-100">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                            <span className="text-xs font-semibold text-green-800">Rút sau 5 tháng</span>
                                        </div>
                                        <p className="text-xl font-bold text-green-600">Hoàn 100%</p>
                                    </div>
                                </div>
                            </div>

                            {/* Fee table */}
                            <div className="bg-gray-50 rounded-xl border border-gray-100 p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <FileText className="w-4 h-4 text-violet-600" />
                                    <h3 className="font-bold text-sm text-gray-900">Các loại phí</h3>
                                </div>
                                <div className="space-y-2">
                                    {[
                                        { label: 'Phí tạo hồ sơ BH', value: 'MIỄN PHÍ', cls: 'text-green-600 font-bold' },
                                        { label: 'Phí thay đổi thông tin', value: '50.000đ/lần', cls: 'text-gray-700' },
                                        { label: 'Phí duy trì hàng năm', value: '100K - 1.000K', cls: 'text-gray-700' },
                                    ].map((f, i) => (
                                        <div key={i} className="bg-white rounded-lg px-3 py-2.5 border border-gray-100 flex justify-between text-sm">
                                            <span className="text-gray-600">{f.label}</span>
                                            <span className={f.cls}>{f.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Violations */}
                        <div className="bg-gray-50 rounded-xl border border-gray-100 p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                <h3 className="font-bold text-sm text-gray-900">Xử lý vi phạm</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {[
                                    { title: 'Tranh chấp thường', desc: 'Seller sai → trừ bồi thường từ quỹ BH', icon: AlertTriangle, color: 'text-amber-500' },
                                    { title: 'Quỹ giảm dưới mức', desc: 'Nạp thêm trong 7 ngày hoặc mất tích xanh', icon: Clock, color: 'text-blue-500' },
                                    { title: 'Vi phạm nghiêm trọng', desc: 'Tịch thu 100% quỹ + khóa tài khoản', icon: XCircle, color: 'text-red-500' },
                                ].map((v, i) => (
                                    <div key={i} className="bg-white rounded-lg p-3 border border-gray-100">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <v.icon className={`w-3.5 h-3.5 ${v.color}`} />
                                            <span className="text-xs font-semibold text-gray-900">{v.title}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 leading-relaxed">{v.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══════════════ FAQ ══════════════ */}
                <section id="faq" className="max-w-5xl mx-auto px-4 py-10">
                    <h2 className="text-lg font-bold text-gray-900 mb-5">Câu hỏi thường gặp</h2>
                    <div className="space-y-2">
                        {FAQ_DATA.map((faq, i) => (
                            <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
                                >
                                    <span className="w-6 h-6 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-gray-500">
                                        {i + 1}
                                    </span>
                                    <span className="flex-1 text-sm font-semibold text-gray-900">{faq.q}</span>
                                    {openFaq === i
                                        ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    }
                                </button>
                                {openFaq === i && (
                                    <div className="px-5 pb-4 pl-14">
                                        <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* ══════════════ BOTTOM CTA ══════════════ */}
                <section className="bg-gray-900">
                    <div className="max-w-5xl mx-auto px-4 py-12 text-center">
                        <h2 className="text-xl font-bold text-white mb-2">Bảo vệ khách hàng, nâng tầm uy tín</h2>
                        <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                            Tham gia bảo hiểm để nhận tích xanh, tăng doanh số và xây dựng niềm tin.
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            <Link
                                href="/seller/insurance"
                                className="inline-flex items-center gap-2 bg-white text-gray-900 text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <BadgeCheck className="w-4 h-4" /> Đăng ký Tích Xanh
                            </Link>
                            <Link
                                href="/messages"
                                className="inline-flex items-center gap-1.5 text-sm text-gray-400 border border-gray-700 px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
                            >
                                Liên hệ Admin
                            </Link>
                        </div>
                        <p className="mt-8 pt-6 border-t border-gray-800 text-[11px] text-gray-600 max-w-2xl mx-auto leading-relaxed">
                            Tích xanh không đảm bảo 100% giao dịch thành công. BachHoaMMO hỗ trợ giải quyết tranh chấp
                            và bồi thường trong hạn mức quỹ BH. Điều khoản có thể thay đổi. Seller tham gia đồng ý tuân thủ tất cả điều khoản.
                        </p>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}
