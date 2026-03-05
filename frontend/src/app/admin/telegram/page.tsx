'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Send,
    Loader2,
    Plus,
    Trash2,
    Bell,
    BellRing,
    Check,
    X,
    User,
    Hash,
    TestTube,
    RefreshCw,
    AlertCircle,
    CheckCircle
} from 'lucide-react';

interface TelegramRecipient {
    id: string;
    telegramId: string;
    name: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export default function AdminTelegramPage() {
    const router = useRouter();
    const { user, token, checkAuth } = useAuthStore();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [recipients, setRecipients] = useState<TelegramRecipient[]>([]);
    const [maxRecipients, setMaxRecipients] = useState(5);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Form for adding new recipient
    const [newTelegramId, setNewTelegramId] = useState('');
    const [newName, setNewName] = useState('');

    // Test result
    const [testResult, setTestResult] = useState<{
        success: boolean;
        channelSent: boolean;
        recipientsSent: number;
        totalRecipients: number;
    } | null>(null);

    useEffect(() => {
        const init = async () => {
            await checkAuth();
            fetchRecipients();
        };
        init();
    }, []);

    useEffect(() => {
        if (!isLoading && (!user || user.role !== 'ADMIN')) {
            router.push('/');
        }
    }, [user, isLoading]);

    const fetchRecipients = async () => {
        try {
            const res = await fetch('/api/admin/telegram/deposit-recipients', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setRecipients(data.recipients);
                setMaxRecipients(data.maxRecipients);
            }
        } catch (error) {
            console.error('Error fetching recipients:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddRecipient = async () => {
        if (!newTelegramId.trim()) {
            setMessage({ type: 'error', text: 'Vui lòng nhập Telegram ID' });
            return;
        }

        setIsSaving(true);
        setMessage(null);

        try {
            const res = await fetch('/api/admin/telegram/deposit-recipients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    telegramId: newTelegramId.trim(),
                    name: newName.trim() || undefined,
                }),
            });

            const data = await res.json();

            if (data.success) {
                setMessage({ type: 'success', text: data.message });
                setNewTelegramId('');
                setNewName('');
                fetchRecipients();
            } else {
                setMessage({ type: 'error', text: data.message });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Có lỗi xảy ra' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleActive = async (id: string, isActive: boolean) => {
        try {
            const res = await fetch(`/api/admin/telegram/deposit-recipients/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ isActive: !isActive }),
            });

            const data = await res.json();
            if (data.success) {
                fetchRecipients();
            }
        } catch (error) {
            console.error('Error toggling recipient:', error);
        }
    };

    const handleDeleteRecipient = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa tài khoản này?')) return;

        try {
            const res = await fetch(`/api/admin/telegram/deposit-recipients/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: data.message });
                fetchRecipients();
            } else {
                setMessage({ type: 'error', text: data.message });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Có lỗi xảy ra' });
        }
    };

    const handleTest = async () => {
        setIsTesting(true);
        setTestResult(null);
        setMessage(null);

        try {
            const res = await fetch('/api/admin/telegram/deposit-test', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json();
            setTestResult(data);

            if (data.success) {
                setMessage({ type: 'success', text: 'Đã gửi thông báo test thành công!' });
            } else {
                setMessage({ type: 'error', text: 'Không thể gửi thông báo test' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Có lỗi xảy ra' });
        } finally {
            setIsTesting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Thông báo Telegram"
                description="Quản lý người nhận thông báo nạp tiền qua Telegram"
                icon={<Send className="w-8 h-8" />}
            />

            {/* Message */}
            {message && (
                <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.type === 'success' ? (
                        <CheckCircle className="w-4 h-4" />
                    ) : (
                        <AlertCircle className="w-4 h-4" />
                    )}
                    {message.text}
                </div>
            )}

            {/* Info Card */}
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 text-white">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <BellRing className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold mb-1">Thông báo nạp tiền tự động</h2>
                        <p className="text-white/80 text-sm mb-3">
                            Hệ thống sẽ tự động gửi thông báo đến Telegram mỗi khi có khách hàng nạp tiền thành công qua PayOS.
                        </p>
                        <div className="flex flex-wrap gap-3 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">
                                📢 Gửi đến Channel
                            </div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">
                                👥 Tối đa {maxRecipients} người nhận
                            </div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">
                                ⚡ Realtime
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add New Recipient */}
            <div className="bg-card rounded-xl border p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                        <Plus className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Thêm người nhận thông báo</h2>
                        <p className="text-sm text-muted-foreground">
                            Thêm Telegram ID để nhận thông báo nạp tiền ({recipients.length}/{maxRecipients})
                        </p>
                    </div>
                </div>

                {recipients.length >= maxRecipients ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-medium">Đã đạt giới hạn {maxRecipients} người nhận!</span>
                        </div>
                        <p className="text-sm mt-1">Vui lòng xóa bớt người nhận để thêm mới.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="telegramId" className="flex items-center gap-2">
                                <Hash className="w-4 h-4" />
                                Telegram ID *
                            </Label>
                            <Input
                                id="telegramId"
                                placeholder="VD: 123456789"
                                value={newTelegramId}
                                onChange={(e) => setNewTelegramId(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Lấy ID bằng cách chat với @userinfobot
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name" className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Tên / Ghi chú
                            </Label>
                            <Input
                                id="name"
                                placeholder="VD: Admin Hoàng"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                            />
                        </div>

                        <div className="flex items-end">
                            <Button
                                onClick={handleAddRecipient}
                                disabled={isSaving || !newTelegramId.trim()}
                                className="w-full"
                            >
                                {isSaving ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang thêm...</>
                                ) : (
                                    <><Plus className="w-4 h-4 mr-2" /> Thêm người nhận</>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Recipients List */}
            <div className="bg-card rounded-xl border p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Bell className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Danh sách người nhận</h2>
                            <p className="text-sm text-muted-foreground">
                                {recipients.filter(r => r.isActive).length} đang hoạt động / {recipients.length} tổng
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchRecipients}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Làm mới
                    </Button>
                </div>

                {recipients.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Chưa có người nhận nào</p>
                        <p className="text-sm">Thêm Telegram ID để bắt đầu nhận thông báo</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {recipients.map((recipient) => (
                            <div
                                key={recipient.id}
                                className={`flex items-center justify-between p-4 rounded-lg border ${recipient.isActive
                                        ? 'bg-green-50/50 border-green-200'
                                        : 'bg-gray-50 border-gray-200 opacity-60'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${recipient.isActive ? 'bg-green-500' : 'bg-gray-400'
                                        }`}>
                                        <Send className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <div className="font-medium flex items-center gap-2">
                                            {recipient.name || 'Không có tên'}
                                            {recipient.isActive && (
                                                <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                                                    Đang hoạt động
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                                            <Hash className="w-3 h-3" />
                                            {recipient.telegramId}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Thêm lúc: {new Date(recipient.createdAt).toLocaleString('vi-VN')}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleToggleActive(recipient.id, recipient.isActive)}
                                        className={recipient.isActive ? '' : 'border-green-500 text-green-600 hover:bg-green-50'}
                                    >
                                        {recipient.isActive ? (
                                            <><X className="w-4 h-4 mr-1" /> Tắt</>
                                        ) : (
                                            <><Check className="w-4 h-4 mr-1" /> Bật</>
                                        )}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeleteRecipient(recipient.id)}
                                        className="text-red-600 hover:bg-red-50 border-red-200"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Test Notification */}
            <div className="bg-card rounded-xl border p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                        <TestTube className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Kiểm tra thông báo</h2>
                        <p className="text-sm text-muted-foreground">
                            Gửi thông báo test đến channel và tất cả người nhận
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Button
                        onClick={handleTest}
                        disabled={isTesting}
                        variant="outline"
                        className="border-orange-500 text-orange-600 hover:bg-orange-50"
                    >
                        {isTesting ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang gửi...</>
                        ) : (
                            <><TestTube className="w-4 h-4 mr-2" /> Gửi thông báo test</>
                        )}
                    </Button>

                    {testResult && (
                        <div className="flex items-center gap-4 text-sm">
                            <span className={testResult.channelSent ? 'text-green-600' : 'text-red-600'}>
                                {testResult.channelSent ? '✅' : '❌'} Channel
                            </span>
                            <span className={testResult.recipientsSent > 0 ? 'text-green-600' : 'text-yellow-600'}>
                                {testResult.recipientsSent}/{testResult.totalRecipients} người nhận
                            </span>
                        </div>
                    )}
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm text-muted-foreground">
                    <p className="font-medium mb-2">📝 Lưu ý:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>Người nhận cần chat với bot trước (gửi /start) để bot có quyền gửi tin nhắn</li>
                        <li>Channel ID đã được cấu hình sẵn: <code className="bg-gray-200 px-1 rounded">-1003704158152</code></li>
                        <li>Thông báo sẽ được gửi tự động mỗi khi có nạp tiền thành công qua PayOS</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
