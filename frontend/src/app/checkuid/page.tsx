'use client';

import Link from 'next/link';
import {
    Shield, Zap, Bell, Users,
    CheckCircle2, ArrowRight, Star, Sparkles,
    Globe, Music, BarChart3,
    ExternalLink, Crown, Send, ChevronRight
} from 'lucide-react';
import { useState, useEffect } from 'react';

const BOT_LINK = 'https://t.me/checkuidfbtt_bot';

const features = [
    {
        icon: Globe,
        title: 'Check Facebook Profile',
        description: 'Kiểm tra trạng thái Live/Die của tài khoản Facebook theo UID. Nhận thông báo ngay khi có thay đổi.',
    },
    {
        icon: Users,
        title: 'Check Group & Fanpage',
        description: 'Theo dõi trạng thái Group, Fanpage Facebook. Phát hiện sớm khi bị ẩn, xóa hoặc restricted.',
    },
    {
        icon: Music,
        title: 'Check TikTok',
        description: 'Kiểm tra trạng thái tài khoản TikTok theo username. Hỗ trợ theo dõi hàng loạt.',
    },
    {
        icon: Bell,
        title: 'Thông báo tức thì',
        description: 'Nhận thông báo Telegram ngay lập tức khi trạng thái UID thay đổi từ Live sang Die hoặc ngược lại.',
    },
    {
        icon: Zap,
        title: 'Upload hàng loạt',
        description: 'Upload hàng trăm UID cùng lúc. VIP hỗ trợ tới 500 UID/lần, tự động check và phân loại.',
    },
    {
        icon: BarChart3,
        title: 'Thống kê chi tiết',
        description: 'Xem tổng quan Live/Die/Unknown theo từng nền tảng. Theo dõi giá trị tổng tài sản.',
    },
];

const steps = [
    { step: '01', title: 'Mở Bot Telegram', desc: 'Nhấn nút bên dưới để mở bot @checkuidfbtt_bot trên Telegram', icon: ExternalLink },
    { step: '02', title: 'Bắt đầu sử dụng', desc: 'Gửi /start để khởi động bot, thêm UID bằng lệnh /add', icon: Sparkles },
    { step: '03', title: 'Nâng cấp VIP', desc: 'Thanh toán gói VIP trên website hoặc qua bot để unlock full tính năng', icon: Crown },
    { step: '04', title: 'Nhận thông báo', desc: 'Bot tự động check và gửi thông báo khi trạng thái UID thay đổi', icon: Bell },
];

const comparisons = [
    { feature: 'Số lượng UID', free: '10 UID', vip: 'Không giới hạn' },
    { feature: 'Tần suất check', free: '10 phút/lần', vip: '1 phút/lần' },
    { feature: 'Upload hàng loạt', free: '50 UID/lần', vip: '500 UID/lần' },
    { feature: 'Check Facebook', free: true, vip: true },
    { feature: 'Check TikTok', free: true, vip: true },
    { feature: 'Thông báo Telegram', free: true, vip: true },
    { feature: 'Thống kê chi tiết', free: true, vip: true },
    { feature: 'Ưu tiên xử lý', free: false, vip: true },
    { feature: 'Hỗ trợ ưu tiên', free: false, vip: true },
];

const commands = [
    { cmd: '/start', desc: 'Khởi động bot' },
    { cmd: '/add', desc: 'Thêm Facebook Profile' },
    { cmd: '/addgr', desc: 'Thêm Facebook Group' },
    { cmd: '/addpost', desc: 'Thêm Facebook Post/Video' },
    { cmd: '/adds', desc: 'Upload Facebook hàng loạt' },
    { cmd: '/list', desc: 'Xem danh sách Facebook' },
    { cmd: '/addtk', desc: 'Thêm TikTok' },
    { cmd: '/addtks', desc: 'Upload TikTok hàng loạt' },
    { cmd: '/listtk', desc: 'Xem danh sách TikTok' },
    { cmd: '/search', desc: 'Tìm kiếm UID' },
    { cmd: '/stats', desc: 'Thống kê Facebook' },
    { cmd: '/statstk', desc: 'Thống kê TikTok' },
    { cmd: '/profile', desc: 'Thông tin tài khoản' },
    { cmd: '/nap', desc: 'Nâng cấp VIP' },
];

export default function CheckUidLandingPage() {
    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">

            {/* Nav */}
            <nav className="flex items-center justify-between px-4 sm:px-6 py-4 max-w-6xl mx-auto">
                <Link href="/" className="text-sm font-medium text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    Trang chủ
                </Link>
                <a
                    href={BOT_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                >
                    <Send className="w-4 h-4" />
                    Mở Bot
                </a>
            </nav>

            {/* ═══════════════ HERO ═══════════════ */}
            <section className="pt-16 pb-20 sm:pt-24 sm:pb-28">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 text-gray-400 text-xs font-medium mb-8 tracking-wide uppercase">
                        <Sparkles className="w-3.5 h-3.5" />
                        Telegram Bot — Miễn phí
                    </div>

                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-[1.1]">
                        Check Live UID
                        <br />
                        <span className="text-blue-400">Facebook & TikTok</span>
                    </h1>

                    <p className="text-base sm:text-lg text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
                        Theo dõi trạng thái hàng trăm tài khoản cùng lúc.
                        Nhận thông báo tức thì qua Telegram khi có thay đổi.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-20">
                        <a
                            href={BOT_LINK}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-3 px-8 py-4 bg-blue-500 text-white font-bold text-base rounded-xl hover:bg-blue-600 active:scale-[0.98] transition-all"
                        >
                            <Send className="w-5 h-5" />
                            Mở Bot Telegram
                            <ArrowRight className="w-5 h-5" />
                        </a>
                        <a
                            href="#pricing"
                            className="inline-flex items-center gap-2 px-8 py-4 border border-white/10 text-gray-300 font-semibold text-base rounded-xl hover:border-white/20 hover:text-white transition-all"
                        >
                            <Crown className="w-5 h-5 text-amber-400" />
                            Xem gói VIP
                        </a>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-px bg-white/[0.06] rounded-xl overflow-hidden max-w-md mx-auto">
                        {[
                            { label: 'Nền tảng', value: '2+' },
                            { label: 'Check interval', value: '60s' },
                            { label: 'Uptime', value: '99.9%' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-[#0a0a0f] py-5 px-4">
                                <div className="text-xl font-black text-white">{stat.value}</div>
                                <div className="text-xs text-gray-600 mt-1">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════ FEATURES ═══════════════ */}
            <section className="py-20 sm:py-28 border-t border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="text-center mb-14">
                        <h2 className="text-2xl sm:text-3xl font-black mb-3">Tính năng nổi bật</h2>
                        <p className="text-gray-500 text-sm max-w-md mx-auto">
                            Bot Telegram mạnh mẽ với đầy đủ công cụ kiểm tra và theo dõi tài khoản
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.04] rounded-xl overflow-hidden">
                        {features.map((f, i) => (
                            <div key={i} className="bg-[#0a0a0f] p-6 hover:bg-white/[0.02] transition-colors">
                                <f.icon className="w-5 h-5 text-blue-400 mb-4" />
                                <h3 className="text-sm font-bold text-white mb-2">{f.title}</h3>
                                <p className="text-xs text-gray-500 leading-relaxed">{f.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════ HOW IT WORKS ═══════════════ */}
            <section className="py-20 sm:py-28 border-t border-white/[0.04]">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <div className="text-center mb-14">
                        <h2 className="text-2xl sm:text-3xl font-black mb-3">Cách sử dụng</h2>
                        <p className="text-gray-500 text-sm">4 bước đơn giản để bắt đầu</p>
                    </div>

                    <div className="space-y-1">
                        {steps.map((s, i) => (
                            <div key={i} className="flex items-start gap-5 p-5 rounded-lg hover:bg-white/[0.02] transition-colors">
                                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center">
                                    <span className="text-xs font-mono font-bold text-gray-500">{s.step}</span>
                                </div>
                                <div className="pt-0.5">
                                    <h3 className="text-sm font-bold text-white mb-1">{s.title}</h3>
                                    <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════ PRICING ═══════════════ */}
            <section id="pricing" className="py-20 sm:py-28 border-t border-white/[0.04]">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <div className="text-center mb-14">
                        <h2 className="text-2xl sm:text-3xl font-black mb-3">Bảng giá</h2>
                        <p className="text-gray-500 text-sm">Bắt đầu miễn phí, nâng cấp khi cần</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                        {/* Free */}
                        <div className="border border-white/[0.06] rounded-xl p-7">
                            <div className="flex items-center gap-3 mb-5">
                                <Shield className="w-5 h-5 text-gray-500" />
                                <div>
                                    <h3 className="text-base font-bold text-white">Free</h3>
                                    <p className="text-xs text-gray-600">Dùng thử miễn phí</p>
                                </div>
                            </div>
                            <div className="mb-6">
                                <span className="text-3xl font-black text-white">0đ</span>
                                <span className="text-gray-600 text-sm ml-1">/ mãi mãi</span>
                            </div>
                            <ul className="space-y-2.5 mb-7">
                                {['Tối đa 10 UID', 'Check mỗi 10 phút', 'Upload 50 UID/lần', 'Check Facebook & TikTok', 'Thông báo Telegram'].map((item, i) => (
                                    <li key={i} className="flex items-center gap-2.5 text-xs text-gray-400">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <a
                                href={BOT_LINK}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full text-center py-2.5 border border-white/10 text-white text-sm font-semibold rounded-lg hover:border-white/20 transition-colors"
                            >
                                Bắt đầu miễn phí
                            </a>
                        </div>

                        {/* VIP */}
                        <div className="border-2 border-blue-500/40 rounded-xl p-7 relative">
                            <div className="absolute -top-2.5 left-5">
                                <span className="inline-flex items-center gap-1 px-3 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded tracking-wide uppercase">
                                    <Star className="w-3 h-3" /> Phổ biến
                                </span>
                            </div>
                            <div className="flex items-center gap-3 mb-5">
                                <Crown className="w-5 h-5 text-amber-400" />
                                <div>
                                    <h3 className="text-base font-bold text-white">VIP</h3>
                                    <p className="text-xs text-blue-400">Không giới hạn</p>
                                </div>
                            </div>
                            <div className="mb-6">
                                <span className="text-3xl font-black text-white">Từ 30K</span>
                                <span className="text-gray-600 text-sm ml-1">/ tháng</span>
                            </div>
                            <ul className="space-y-2.5 mb-7">
                                {[
                                    { text: 'Không giới hạn UID', highlight: true },
                                    { text: 'Check mỗi 1 phút', highlight: true },
                                    { text: 'Upload 500 UID/lần', highlight: true },
                                    { text: 'Check Facebook & TikTok', highlight: false },
                                    { text: 'Thông báo tức thì', highlight: false },
                                    { text: 'Ưu tiên xử lý', highlight: true },
                                    { text: 'Hỗ trợ ưu tiên', highlight: true },
                                ].map((item, i) => (
                                    <li key={i} className={`flex items-center gap-2.5 text-xs ${item.highlight ? 'text-white' : 'text-gray-400'}`}>
                                        <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 ${item.highlight ? 'text-blue-400' : 'text-emerald-500'}`} />
                                        {item.text}
                                    </li>
                                ))}
                            </ul>
                            <a
                                href={BOT_LINK}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full text-center py-2.5 bg-blue-500 text-white text-sm font-bold rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                Nâng cấp VIP
                            </a>
                        </div>
                    </div>

                    {/* Comparison table */}
                    <div className="mt-14 border border-white/[0.06] rounded-xl overflow-hidden max-w-2xl mx-auto">
                        <div className="px-5 py-3 border-b border-white/[0.06]">
                            <h3 className="text-sm font-bold text-white">So sánh chi tiết</h3>
                        </div>
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/[0.04]">
                                    <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-600">Tính năng</th>
                                    <th className="text-center px-5 py-2.5 text-xs font-medium text-gray-600 w-28">Free</th>
                                    <th className="text-center px-5 py-2.5 text-xs font-medium text-blue-400 w-28">VIP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparisons.map((row, i) => (
                                    <tr key={i} className="border-b border-white/[0.02] last:border-0">
                                        <td className="px-5 py-2.5 text-xs text-gray-400">{row.feature}</td>
                                        <td className="px-5 py-2.5 text-center">
                                            {typeof row.free === 'boolean' ? (
                                                row.free ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mx-auto" /> : <span className="text-gray-700">—</span>
                                            ) : (
                                                <span className="text-xs text-gray-500">{row.free}</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-2.5 text-center">
                                            {typeof row.vip === 'boolean' ? (
                                                row.vip ? <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 mx-auto" /> : <span className="text-gray-700">—</span>
                                            ) : (
                                                <span className="text-xs text-white font-medium">{row.vip}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* ═══════════════ BOT COMMANDS ═══════════════ */}
            <section className="py-20 sm:py-28 border-t border-white/[0.04]">
                <div className="max-w-3xl mx-auto px-4 sm:px-6">
                    <div className="text-center mb-14">
                        <h2 className="text-2xl sm:text-3xl font-black mb-3">Lệnh Bot</h2>
                        <p className="text-gray-500 text-sm">Các lệnh chính để sử dụng bot</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/[0.04] rounded-xl overflow-hidden">
                        {commands.map((c, i) => (
                            <div key={i} className="flex items-center gap-4 px-5 py-3 bg-[#0a0a0f] hover:bg-white/[0.02] transition-colors">
                                <code className="text-blue-400 font-mono font-bold text-xs min-w-[80px]">{c.cmd}</code>
                                <span className="text-xs text-gray-500">{c.desc}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════ CTA ═══════════════ */}
            <section className="py-20 sm:py-28 border-t border-white/[0.04]">
                <div className="max-w-xl mx-auto px-4 sm:px-6 text-center">
                    <Send className="w-10 h-10 text-blue-400 mx-auto mb-6" />
                    <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">Bắt đầu ngay hôm nay</h2>
                    <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                        Đừng để mất tài khoản giá trị. Theo dõi tự động 24/7 với bot Telegram.
                    </p>
                    <a
                        href={BOT_LINK}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 px-8 py-4 bg-white text-black font-bold text-base rounded-xl hover:bg-gray-100 active:scale-[0.98] transition-all"
                    >
                        <Send className="w-5 h-5" />
                        Mở Bot
                        <ArrowRight className="w-5 h-5" />
                    </a>
                </div>
            </section>

            {/* Footer */}
            <div className="border-t border-white/[0.04] py-6 text-center">
                <p className="text-xs text-gray-700">
                    <Link href="/" className="hover:text-gray-400 transition-colors">BachHoaMMO</Link>
                    {' '} — Check Live UID Bot
                </p>
            </div>
        </div>
    );
}
