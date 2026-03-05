'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
    Bell,
    Check,
    CheckCheck,
    Trash2,
    PartyPopper,
    Package,
    MessageSquare,
    MessageCircle,
    Megaphone,
    Gavel,
    AlertCircle,
    Gift,
    Loader2,
    Wallet,
    ShoppingBag,
    ArrowLeft,
    Inbox,
    XCircle,
    RefreshCw,
    DollarSign
} from 'lucide-react';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    icon?: string;
    isRead: boolean;
    createdAt: string;
}

const iconMap: Record<string, any> = {
    PartyPopper,
    Package,
    MessageSquare,
    MessageCircle,
    Megaphone,
    Gavel,
    Bell,
    Gift,
    AlertCircle,
    Wallet,
    ShoppingBag,
    XCircle,
    RefreshCw,
    DollarSign,
};

const typeColors: Record<string, string> = {
    WELCOME: 'bg-green-100 text-green-600',
    ADMIN: 'bg-purple-100 text-purple-600',
    ORDER: 'bg-blue-100 text-blue-600',
    COMPLAINT: 'bg-orange-100 text-orange-600',
    SYSTEM: 'bg-gray-100 text-gray-600',
    PROMOTION: 'bg-pink-100 text-pink-600',
    AUCTION: 'bg-amber-100 text-amber-600',
    DEPOSIT: 'bg-emerald-100 text-emerald-600',
    MESSAGE: 'bg-indigo-100 text-indigo-600',
};

// Map notification links that point to non-existent routes to valid ones
const fixNotificationLink = (link?: string): string | undefined => {
    if (!link || typeof link !== 'string' || link.trim() === '') return undefined;
    if (link.startsWith('/complaints/')) return '/orders';
    // Fix seller order links - /seller/orders/:id doesn't have dynamic route
    if (/^\/seller\/orders\/[a-zA-Z0-9-]+$/.test(link)) return '/seller/orders';
    return link;
};

export default function NotificationsPage() {
    const router = useRouter();
    const { token, isInitialized, checkAuth, user, logout } = useAuthStore();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        if (isInitialized && !token) {
            router.push('/login?redirect=/notifications');
        } else if (isInitialized && token) {
            fetchNotifications();
        }
    }, [isInitialized, token]);

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    const handleSearch = (query: string) => {
        router.push(`/explore?q=${encodeURIComponent(query)}`);
    };

    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/notifications?take=50', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setNotifications(data.notifications);
                setUnreadCount(data.unreadCount);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const markAsRead = async (notificationId: string) => {
        try {
            await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await fetch('/api/notifications/read-all', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const deleteNotification = async (notificationId: string) => {
        try {
            await fetch(`/api/notifications/${notificationId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            const notification = notifications.find(n => n.id === notificationId);
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            if (notification && !notification.isRead) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 7) return `${diffDays} ngày trước`;
        return date.toLocaleDateString('vi-VN');
    };

    const getIcon = (iconName?: string, type?: string) => {
        const Icon = (iconName ? iconMap[iconName] : iconMap[type || 'Bell']) || Bell;
        return Icon;
    };

    if (!isInitialized || !token) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header user={user} onLogout={handleLogout} onSearch={handleSearch} />

            <main className="flex-1 container mx-auto px-4 py-6 max-w-3xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Thông báo</h1>
                            {unreadCount > 0 && (
                                <p className="text-sm text-gray-500">{unreadCount} chưa đọc</p>
                            )}
                        </div>
                    </div>
                    {unreadCount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={markAllAsRead}
                            className="text-sm"
                        >
                            <CheckCheck className="w-4 h-4 mr-1" />
                            Đọc tất cả
                        </Button>
                    )}
                </div>

                {/* Notifications List */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : notifications.length > 0 ? (
                        <div className="divide-y divide-gray-100">
                            {notifications.map((notification) => {
                                const Icon = getIcon(notification.icon, notification.type);
                                const colorClass = typeColors[notification.type] || typeColors.SYSTEM;

                                return (
                                    <div
                                        key={notification.id}
                                        className={`relative px-4 py-4 hover:bg-gray-50 transition-colors ${!notification.isRead ? 'bg-blue-50/30' : ''
                                            }`}
                                    >
                                        <div className="flex gap-4">
                                            {/* Icon */}
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                                                <Icon className="w-5 h-5" />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className={`text-sm text-gray-900 ${!notification.isRead ? 'font-semibold' : 'font-medium'}`}>
                                                        {notification.title}
                                                    </p>
                                                    <span className="text-xs text-gray-400 flex-shrink-0">
                                                        {formatTime(notification.createdAt)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {notification.message}
                                                </p>

                                                {/* Actions */}
                                                <div className="flex items-center gap-3 mt-3">
                                                    {fixNotificationLink(notification.link) && (
                                                        <button
                                                            onClick={() => {
                                                                try {
                                                                    if (!notification.isRead) markAsRead(notification.id);
                                                                    const safeLink = fixNotificationLink(notification.link);
                                                                    if (safeLink) router.push(safeLink);
                                                                } catch (err) {
                                                                    console.error('Error navigating to notification link:', err);
                                                                }
                                                            }}
                                                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                                        >
                                                            Xem chi tiết
                                                        </button>
                                                    )}
                                                    {!notification.isRead && (
                                                        <button
                                                            onClick={() => markAsRead(notification.id)}
                                                            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                            Đã đọc
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => deleteNotification(notification.id)}
                                                        className="text-sm text-gray-400 hover:text-red-500 ml-auto flex items-center gap-1"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        Xóa
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Unread indicator */}
                                        {!notification.isRead && (
                                            <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-16 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Inbox className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500 mb-1">Chưa có thông báo nào</p>
                            <p className="text-sm text-gray-400">Thông báo mới sẽ xuất hiện ở đây</p>
                        </div>
                    )}
                </div>
            </main >

            <Footer />
        </div >
    );
}
