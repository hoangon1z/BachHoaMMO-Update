'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X, MessageCircle, ShieldAlert, Store, Wallet, ArrowRight } from 'lucide-react';

const NOTICE_DISMISSED_KEY = 'bhmmo_maintenance_notice_dismissed_v1';

export function MaintenanceNotice() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const dismissed = localStorage.getItem(NOTICE_DISMISSED_KEY);
        if (!dismissed) {
            setShow(true);
        }
    }, []);

    const handleDismiss = () => {
        localStorage.setItem(NOTICE_DISMISSED_KEY, Date.now().toString());
        setShow(false);
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-t-2xl px-6 py-5 text-white">
                    <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                            <ShieldAlert className="w-7 h-7" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-bold">⚠️ Thông báo bảo trì hệ thống</h2>
                            <p className="text-white/80 text-sm mt-0.5">Ngày 04/03/2026</p>
                        </div>
                        <button
                            onClick={handleDismiss}
                            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    {/* Main message */}
                    <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                <p className="font-semibold text-orange-700 dark:text-orange-400 mb-1">
                                    Do sự cố kỹ thuật, một phần dữ liệu hệ thống đã bị ảnh hưởng.
                                </p>
                                <p>
                                    Chúng tôi đã khôi phục thành công dữ liệu hệ thống. Tuy nhiên, dữ liệu từ ngày <strong>21/02 đến 04/03/2026</strong> có thể bị ảnh hưởng.
                                    Chúng tôi chân thành xin lỗi và sẽ hỗ trợ xử lý tối đa cho quý khách.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-[15px]">
                            📋 Hướng dẫn xử lý:
                        </h3>

                        {/* For Buyers */}
                        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                            <div className="flex items-center gap-2 mb-2">
                                <Wallet className="w-4 h-4 text-blue-600" />
                                <span className="font-semibold text-blue-700 dark:text-blue-400 text-sm">Dành cho Buyer (Người mua)</span>
                            </div>
                            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 ml-6 list-disc">
                                <li>Nếu tài khoản của bạn không đăng nhập được, vui lòng <strong>đăng ký lại</strong> với cùng email.</li>
                                <li>Nếu bạn đã <strong>nạp tiền</strong> vào ví trong khoảng 21/02 - 04/03, hãy liên hệ Admin qua <strong>Telegram</strong> kèm ảnh chụp giao dịch để được cộng lại tiền.</li>
                            </ul>
                        </div>

                        {/* For Sellers */}
                        <div className="bg-purple-50 dark:bg-purple-950/30 rounded-xl p-4 border border-purple-100 dark:border-purple-800">
                            <div className="flex items-center gap-2 mb-2">
                                <Store className="w-4 h-4 text-purple-600" />
                                <span className="font-semibold text-purple-700 dark:text-purple-400 text-sm">Dành cho Seller (Người bán)</span>
                            </div>
                            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 ml-6 list-disc">
                                <li>Vui lòng <strong>up lại sản phẩm</strong> nếu sản phẩm của bạn bị thiếu hoặc mất.</li>
                                <li>Đơn hàng đang <strong>escrow (giữ tiền)</strong>: gửi thông tin đơn hàng qua <strong>Bot Telegram</strong> để Admin xác nhận và release tiền về ví.</li>
                                <li>Số dư ví seller sẽ được Admin cộng lại sau khi xác minh.</li>
                            </ul>
                        </div>

                        {/* Contact */}
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800">
                            <div className="flex items-center gap-2 mb-2">
                                <MessageCircle className="w-4 h-4 text-emerald-600" />
                                <span className="font-semibold text-emerald-700 dark:text-emerald-400 text-sm">Liên hệ hỗ trợ</span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                <p>Mọi vấn đề cần hỗ trợ, vui lòng liên hệ Admin qua:</p>
                                <a
                                    href="https://t.me/bachhoammo"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium mt-1"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    Telegram: @bachhoammo
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Apology */}
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center italic pt-1">
                        BachHoaMMO chân thành xin lỗi vì sự bất tiện này. Chúng tôi cam kết xử lý nhanh nhất có thể.
                    </p>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 rounded-b-2xl">
                    <button
                        onClick={handleDismiss}
                        className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-blue-500/20"
                    >
                        Tôi đã hiểu, tiếp tục sử dụng
                    </button>
                </div>
            </div>
        </div>
    );
}
