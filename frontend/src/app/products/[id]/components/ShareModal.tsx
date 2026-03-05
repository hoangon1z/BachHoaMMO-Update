'use client';

import { X, Copy, Facebook, Send } from 'lucide-react';
import { formatPrice } from './types';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    productTitle: string;
    productImage: string;
    productPrice: number;
    productUrl: string;
    shareText: string;
    onToast: (msg: { type: 'success' | 'error'; text: string }) => void;
}

export function ShareModal({
    isOpen, onClose, productTitle, productImage, productPrice, productUrl, shareText, onToast,
}: ShareModalProps) {
    if (!isOpen) return null;

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(productUrl);
            onToast({ type: 'success', text: 'Đã sao chép link sản phẩm!' });
            onClose();
        } catch {
            const textArea = document.createElement('textarea');
            textArea.value = productUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            onToast({ type: 'success', text: 'Đã sao chép link sản phẩm!' });
            onClose();
        }
    };

    const openShare = (url: string) => { window.open(url, '_blank', 'width=600,height=400'); onClose(); };

    const shareToFacebook = () => openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`);
    const shareToMessenger = () => openShare(`https://www.facebook.com/dialog/send?link=${encodeURIComponent(productUrl)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(productUrl)}`);
    const shareToZalo = () => openShare(`https://zalo.me/share?url=${encodeURIComponent(productUrl)}`);
    const shareToTelegram = () => openShare(`https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(shareText)}`);
    const shareToTwitter = () => openShare(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(productUrl)}`);

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Chia sẻ sản phẩm</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                        <X className="w-4 h-4 text-gray-600" />
                    </button>
                </div>

                {/* Preview */}
                <div className="p-4 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <img src={productImage || '/placeholder.png'} alt={productTitle} className="w-14 h-14 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{productTitle}</p>
                            <p className="text-sm text-blue-600 font-semibold">{formatPrice(productPrice)}</p>
                        </div>
                    </div>
                </div>

                {/* Share Options */}
                <div className="p-4">
                    <p className="text-sm text-gray-500 mb-3">Chia sẻ qua</p>
                    <div className="grid grid-cols-5 gap-3 mb-4">
                        <button onClick={shareToFacebook} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-50">
                            <div className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center"><Facebook className="w-6 h-6 text-white" /></div>
                            <span className="text-xs text-gray-600">Facebook</span>
                        </button>
                        <button onClick={shareToMessenger} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-50">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00B2FF] to-[#006AFF] flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.14.26.35.27.57l.05 1.78c.02.64.72 1.04 1.3.75l1.97-.87c.17-.07.36-.09.54-.05.9.23 1.84.35 2.73.35 5.64 0 10-4.13 10-9.7S17.64 2 12 2zm6.03 7.55l-2.93 4.66a1.5 1.5 0 01-2.17.45l-2.33-1.75a.6.6 0 00-.72 0l-3.15 2.39c-.42.32-.97-.19-.69-.64l2.93-4.66a1.5 1.5 0 012.17-.45l2.33 1.75a.6.6 0 00.72 0l3.15-2.39c.42-.32.97.19.69.64z" /></svg>
                            </div>
                            <span className="text-xs text-gray-600">Messenger</span>
                        </button>
                        <button onClick={shareToZalo} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-50">
                            <div className="w-12 h-12 rounded-full bg-[#0068FF] flex items-center justify-center"><span className="text-white font-bold text-sm">Zalo</span></div>
                            <span className="text-xs text-gray-600">Zalo</span>
                        </button>
                        <button onClick={shareToTelegram} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-50">
                            <div className="w-12 h-12 rounded-full bg-[#0088CC] flex items-center justify-center"><Send className="w-5 h-5 text-white" /></div>
                            <span className="text-xs text-gray-600">Telegram</span>
                        </button>
                        <button onClick={shareToTwitter} className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-50">
                            <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                            </div>
                            <span className="text-xs text-gray-600">X</span>
                        </button>
                    </div>

                    {/* Copy Link */}
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-600 truncate">{productUrl}</p>
                        </div>
                        <button onClick={copyToClipboard} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex-shrink-0">
                            <Copy className="w-4 h-4" /> Sao chép
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
