'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ShoppingBag, MessageSquare, Send, CheckCircle, Link2, Unlink, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';

export default function SellerNotificationsPage() {
    const router = useRouter();
    const { user } = useAuthStore();

    // Telegram states - Support 2 bots (separate connection status)
    const [orderBotConnected, setOrderBotConnected] = useState(false);
    const [orderBotLinkedAt, setOrderBotLinkedAt] = useState<string | null>(null);
    const [chatBotConnected, setChatBotConnected] = useState(false);
    const [chatBotLinkedAt, setChatBotLinkedAt] = useState<string | null>(null);
    const [telegramOrderBotLink, setTelegramOrderBotLink] = useState<string | null>(null);
    const [telegramChatBotLink, setTelegramChatBotLink] = useState<string | null>(null);
    const [isLoadingTelegram, setIsLoadingTelegram] = useState(false);
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [telegramMessage, setTelegramMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
    const [unlinkBotType, setUnlinkBotType] = useState<'order' | 'chat'>('order');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchTelegramStatus();
    }, []);

    // Fetch Telegram connection status for both bots
    const fetchTelegramStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/telegram/status', {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                // Order Bot status
                setOrderBotConnected(data.orderBotConnected || data.connected);
                setOrderBotLinkedAt(data.orderBotLinkedAt || data.linkedAt);
                // Chat Bot status
                setChatBotConnected(data.chatBotConnected || false);
                setChatBotLinkedAt(data.chatBotLinkedAt || null);
            }
        } catch (error) {
            console.error('Error fetching Telegram status:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Get Telegram links for both bots
    const getTelegramLinks = async () => {
        setIsLoadingTelegram(true);
        setTelegramMessage(null);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/telegram/links', {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setTelegramOrderBotLink(data.orderBot);
                setTelegramChatBotLink(data.chatBot);
            } else {
                // Fallback to old endpoint
                const fallbackResponse = await fetch('/api/telegram/link', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (fallbackResponse.ok) {
                    const data = await fallbackResponse.json();
                    setTelegramOrderBotLink(data.link);
                } else {
                    setTelegramMessage({ type: 'error', text: 'Không thể lấy link kết nối' });
                }
            }
        } catch (error) {
            console.error('Error getting Telegram links:', error);
            setTelegramMessage({ type: 'error', text: 'Có lỗi xảy ra' });
        } finally {
            setIsLoadingTelegram(false);
        }
    };

    // Unlink Telegram - show dialog with bot type
    const unlinkTelegramClick = (botType: 'order' | 'chat') => {
        setUnlinkBotType(botType);
        setShowUnlinkDialog(true);
    };

    const unlinkTelegramConfirm = async () => {
        setIsLoadingTelegram(true);
        setTelegramMessage(null);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/telegram/unlink?botType=${unlinkBotType}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                if (unlinkBotType === 'order') {
                    setOrderBotConnected(false);
                    setOrderBotLinkedAt(null);
                    setTelegramOrderBotLink(null);
                } else {
                    setChatBotConnected(false);
                    setChatBotLinkedAt(null);
                    setTelegramChatBotLink(null);
                }
                setTelegramMessage({ type: 'success', text: `Đã hủy kết nối ${unlinkBotType === 'order' ? 'Bot Đơn hàng' : 'Bot Tin nhắn'}` });
                setShowUnlinkDialog(false);
            } else {
                setTelegramMessage({ type: 'error', text: 'Không thể hủy kết nối' });
            }
        } catch (error) {
            console.error('Error unlinking Telegram:', error);
            setTelegramMessage({ type: 'error', text: 'Có lỗi xảy ra' });
        } finally {
            setIsLoadingTelegram(false);
        }
    };

    // Send test notification
    const sendTestNotification = async () => {
        setIsSendingTest(true);
        setTelegramMessage(null);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/telegram/test', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            const data = await response.json();
            if (data.success) {
                setTelegramMessage({ type: 'success', text: 'Đã gửi thông báo test! Kiểm tra Telegram của bạn.' });
            } else {
                setTelegramMessage({ type: 'error', text: data.message || 'Không thể gửi thông báo' });
            }
        } catch (error) {
            console.error('Error sending test:', error);
            setTelegramMessage({ type: 'error', text: 'Có lỗi xảy ra' });
        } finally {
            setIsSendingTest(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-6">
                <div className="max-w-3xl mx-auto">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 w-48 bg-gray-200 rounded"></div>
                        <div className="h-40 bg-gray-200 rounded-lg"></div>
                        <div className="h-40 bg-gray-200 rounded-lg"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Thông báo Telegram</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Kết nối Telegram để nhận thông báo đơn hàng và tin nhắn từ khách hàng
                    </p>
                </div>

                {/* Telegram Message */}
                {telegramMessage && (
                    <div className={`p-3 rounded-lg flex items-center gap-2 ${telegramMessage.type === 'success'
                        ? 'bg-green-50 border border-green-200 text-green-700'
                        : 'bg-red-50 border border-red-200 text-red-700'
                        }`}>
                        {telegramMessage.type === 'success' ? (
                            <CheckCircle className="w-4 h-4" />
                        ) : (
                            <AlertTriangle className="w-4 h-4" />
                        )}
                        <p className="text-sm">{telegramMessage.text}</p>
                    </div>
                )}

                {/* Telegram Bot 1: Order Notifications */}
                <div className="bg-white rounded-lg border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                                <ShoppingBag className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-gray-900">Telegram - Thông báo Đơn hàng</h3>
                                <p className="text-sm text-gray-500">@bachhoammobot - Nhận thông báo đơn hàng, khiếu nại, rút tiền</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        {/* Status */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-3">
                                {orderBotConnected ? (
                                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                        <Bell className="w-5 h-5 text-gray-400" />
                                    </div>
                                )}
                                <div>
                                    <p className={`font-medium ${orderBotConnected ? 'text-green-700' : 'text-gray-700'}`}>
                                        {orderBotConnected ? 'Đã kết nối' : 'Chưa kết nối'}
                                    </p>
                                    {orderBotLinkedAt && (
                                        <p className="text-xs text-gray-500">
                                            Kết nối lúc: {new Date(orderBotLinkedAt).toLocaleString('vi-VN')}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {orderBotConnected ? (
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={sendTestNotification}
                                        disabled={isSendingTest}
                                        className="gap-2"
                                    >
                                        {isSendingTest ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Bell className="w-4 h-4" />
                                        )}
                                        Test
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => unlinkTelegramClick('order')}
                                        disabled={isLoadingTelegram}
                                        className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                                    >
                                        <Unlink className="w-4 h-4" />
                                        Hủy
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={getTelegramLinks}
                                    disabled={isLoadingTelegram}
                                    className="gap-2 bg-green-600 hover:bg-green-700"
                                >
                                    {isLoadingTelegram ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Link2 className="w-4 h-4" />
                                    )}
                                    Kết nối
                                </Button>
                            )}
                        </div>

                        {/* Order Bot Link */}
                        {telegramOrderBotLink && !orderBotConnected && (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-3">
                                <div className="flex items-start gap-3">
                                    <Send className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="font-medium text-green-800 mb-1">Hướng dẫn kết nối:</p>
                                        <ol className="text-sm text-green-700 space-y-1 list-decimal list-inside">
                                            <li>Nhấn nút bên dưới để mở Telegram</li>
                                            <li>Nhấn <strong>Start</strong> trong bot</li>
                                            <li>Quay lại đây và nhấn &quot;Kiểm tra&quot;</li>
                                        </ol>
                                    </div>
                                </div>

                                <a
                                    href={telegramOrderBotLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Mở Bot Đơn hàng
                                </a>

                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                        fetchTelegramStatus();
                                        setTelegramMessage({ type: 'success', text: 'Đang kiểm tra...' });
                                        setTimeout(() => setTelegramMessage(null), 2000);
                                    }}
                                >
                                    Kiểm tra kết nối
                                </Button>
                            </div>
                        )}

                        {/* Features */}
                        <div className="text-sm text-gray-600">
                            <p className="font-medium text-gray-700 mb-2">Bạn sẽ nhận thông báo khi:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Có đơn hàng mới</li>
                                <li>Có khiếu nại cần xử lý</li>
                                <li>Yêu cầu rút tiền được duyệt/từ chối</li>
                                <li>Có thông báo từ Admin</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Telegram Bot 2: Message Notifications */}
                <div className="bg-white rounded-lg border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
                                <MessageSquare className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-gray-900">Telegram - Thông báo Tin nhắn</h3>
                                <p className="text-sm text-gray-500">@bachhoammochat_bot - Nhận thông báo tin nhắn từ khách hàng</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        {/* Status */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-3">
                                {chatBotConnected ? (
                                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                                        <CheckCircle className="w-5 h-5 text-purple-600" />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                        <MessageSquare className="w-5 h-5 text-gray-400" />
                                    </div>
                                )}
                                <div>
                                    <p className={`font-medium ${chatBotConnected ? 'text-purple-700' : 'text-gray-700'}`}>
                                        {chatBotConnected ? 'Đã kết nối' : 'Chưa kết nối'}
                                    </p>
                                    {chatBotLinkedAt && (
                                        <p className="text-xs text-gray-500">
                                            Kết nối lúc: {new Date(chatBotLinkedAt).toLocaleString('vi-VN')}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {chatBotConnected ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => unlinkTelegramClick('chat')}
                                    disabled={isLoadingTelegram}
                                    className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                                >
                                    <Unlink className="w-4 h-4" />
                                    Hủy
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={getTelegramLinks}
                                    disabled={isLoadingTelegram}
                                    className="gap-2 bg-purple-600 hover:bg-purple-700"
                                >
                                    {isLoadingTelegram ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Link2 className="w-4 h-4" />
                                    )}
                                    Kết nối
                                </Button>
                            )}
                        </div>

                        {/* Chat Bot Link */}
                        {telegramChatBotLink && !chatBotConnected && (
                            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-3">
                                <div className="flex items-start gap-3">
                                    <Send className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="font-medium text-purple-800 mb-1">Hướng dẫn kết nối:</p>
                                        <ol className="text-sm text-purple-700 space-y-1 list-decimal list-inside">
                                            <li>Nhấn nút bên dưới để mở Telegram</li>
                                            <li>Nhấn <strong>Start</strong> trong bot</li>
                                            <li>Quay lại đây và nhấn &quot;Kiểm tra&quot;</li>
                                        </ol>
                                    </div>
                                </div>

                                <a
                                    href={telegramChatBotLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Mở Bot Tin nhắn
                                </a>

                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                        fetchTelegramStatus();
                                        setTelegramMessage({ type: 'success', text: 'Đang kiểm tra...' });
                                        setTimeout(() => setTelegramMessage(null), 2000);
                                    }}
                                >
                                    Kiểm tra kết nối
                                </Button>
                            </div>
                        )}

                        {/* Features */}
                        <div className="text-sm text-gray-600">
                            <p className="font-medium text-gray-700 mb-2">Bạn sẽ nhận thông báo khi:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Có tin nhắn mới từ khách hàng</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Unlink Telegram Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showUnlinkDialog}
                onClose={() => setShowUnlinkDialog(false)}
                onConfirm={unlinkTelegramConfirm}
                title="Hủy kết nối Telegram"
                description="Bạn có chắc muốn hủy kết nối Telegram? Bạn sẽ không nhận được thông báo nữa."
                confirmText="Hủy kết nối"
                cancelText="Đóng"
                variant="warning"
                isLoading={isLoadingTelegram}
                icon={<Unlink className="w-7 h-7" />}
            />
        </div>
    );
}
