'use client';

import { useEffect, useState } from 'react';
import {
    MessageSquare, AlertTriangle, Shield, ShieldOff, Eye,
    User, Clock, CheckCircle, XCircle, Search, RefreshCw,
    Phone, Mail, Link2, CreditCard, MessageCircle, ExternalLink
} from 'lucide-react';
import { PageHeader, StatsCard, Pagination } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/Toast';
import Link from 'next/link';

interface Violation {
    id: string;
    userId: string;
    userName?: string;
    userEmail?: string;
    conversationId: string | null;
    messageId: string | null;
    content: string;
    violationType: string;
    severity: string;
    score: number;
    matchedPatterns: string;
    action: string;
    isReviewed: boolean;
    reviewedBy: string | null;
    reviewNote: string | null;
    createdAt: string;
}

interface Stats {
    totalViolations: number;
    last24h: number;
    last7d: number;
    isRestricted: boolean;
    isLocked: boolean;
}

export default function ChatViolationsPage() {
    const toast = useToast();
    const [violations, setViolations] = useState<Violation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [searchUserId, setSearchUserId] = useState('');
    const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
    const [userStats, setUserStats] = useState<Stats | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [testMessage, setTestMessage] = useState('');
    const [testResult, setTestResult] = useState<any>(null);
    const [isTestingMessage, setIsTestingMessage] = useState(false);

    const itemsPerPage = 20;

    // Stats counters
    const [stats, setStats] = useState({
        total: 0,
        critical: 0,
        high: 0,
        blocked: 0,
    });

    const fetchViolations = async (page = 1, userId?: string) => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('limit', itemsPerPage.toString());
            if (userId) params.append('userId', userId);

            const response = await fetch(`/api/chat/admin/violations?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setViolations(data.violations || []);
                setTotalItems(data.total || 0);

                // Calculate stats from violations
                const critical = data.violations?.filter((v: Violation) => v.severity === 'CRITICAL').length || 0;
                const high = data.violations?.filter((v: Violation) => v.severity === 'HIGH').length || 0;
                const blocked = data.violations?.filter((v: Violation) => v.action.startsWith('BLOCK')).length || 0;

                setStats({
                    total: data.total || 0,
                    critical,
                    high,
                    blocked,
                });
            }
        } catch (error) {
            console.error('Error fetching violations:', error);
            toast.error('Không thể tải danh sách vi phạm');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUserStats = async (userId: string) => {
        setIsLoadingStats(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/chat/admin/violations/user/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setUserStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching user stats:', error);
        } finally {
            setIsLoadingStats(false);
        }
    };

    const handleUnlockUser = async (userId: string) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/chat/admin/unlock/${userId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                toast.success('Đã mở khóa chat cho user');
                fetchUserStats(userId);
            } else {
                toast.error('Không thể mở khóa user');
            }
        } catch (error) {
            toast.error('Có lỗi xảy ra');
        }
    };

    const handleTestMessage = async () => {
        if (!testMessage.trim()) return;

        setIsTestingMessage(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/chat/admin/analyze-message', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: testMessage }),
            });

            if (response.ok) {
                const data = await response.json();
                setTestResult(data.result);
            }
        } catch (error) {
            toast.error('Không thể phân tích tin nhắn');
        } finally {
            setIsTestingMessage(false);
        }
    };

    useEffect(() => {
        fetchViolations(currentPage, searchUserId || undefined);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage]);

    const handleSearch = () => {
        setCurrentPage(1);
        fetchViolations(1, searchUserId || undefined);
        if (searchUserId) {
            fetchUserStats(searchUserId);
        } else {
            setUserStats(null);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
            case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'LOW': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getActionColor = (action: string) => {
        if (action === 'BLOCK_AND_LOCK') return 'bg-red-600 text-white';
        if (action === 'BLOCK_AND_RESTRICT') return 'bg-red-500 text-white';
        if (action === 'BLOCK_AND_WARN') return 'bg-orange-500 text-white';
        if (action === 'BLOCK') return 'bg-yellow-500 text-white';
        if (action === 'WARN') return 'bg-blue-500 text-white';
        return 'bg-green-500 text-white';
    };

    const getViolationTypeIcon = (type: string) => {
        if (type.includes('PHONE')) return <Phone className="w-4 h-4" />;
        if (type.includes('EMAIL')) return <Mail className="w-4 h-4" />;
        if (type.includes('SOCIAL')) return <MessageCircle className="w-4 h-4" />;
        if (type.includes('LINK')) return <Link2 className="w-4 h-4" />;
        if (type.includes('BANK')) return <CreditCard className="w-4 h-4" />;
        return <AlertTriangle className="w-4 h-4" />;
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleString('vi-VN');
    };

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Quản lý Vi phạm Chat"
                description="Theo dõi và xử lý các vi phạm giao dịch ngoài sàn trong tin nhắn"
                icon={<Shield className="w-8 h-8 text-red-600" />}
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatsCard
                    title="Tổng vi phạm"
                    value={stats.total}
                    icon={<AlertTriangle className="w-6 h-6" />}
                    trend={{ value: 0, isPositive: false }}
                />
                <StatsCard
                    title="Vi phạm nghiêm trọng"
                    value={stats.critical}
                    icon={<XCircle className="w-6 h-6" />}
                    trend={{ value: 0, isPositive: false }}
                />
                <StatsCard
                    title="Vi phạm cao"
                    value={stats.high}
                    icon={<AlertTriangle className="w-6 h-6" />}
                    trend={{ value: 0, isPositive: false }}
                />
                <StatsCard
                    title="Tin nhắn bị chặn"
                    value={stats.blocked}
                    icon={<ShieldOff className="w-6 h-6" />}
                    trend={{ value: 0, isPositive: false }}
                />
            </div>

            {/* Search and Test Message */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Search by User */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Search className="w-5 h-5" />
                        Tìm kiếm theo User
                    </h3>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Nhập User ID..."
                            value={searchUserId}
                            onChange={(e) => setSearchUserId(e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                        <Button onClick={handleSearch} disabled={isLoading}>
                            <Search className="w-4 h-4 mr-2" />
                            Tìm
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSearchUserId('');
                                setUserStats(null);
                                fetchViolations(1);
                            }}
                        >
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* User Stats */}
                    {userStats && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                            <h4 className="font-medium text-gray-700 mb-3">Thống kê User</h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Tổng vi phạm:</span>
                                    <span className="font-semibold">{userStats.totalViolations}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">24h qua:</span>
                                    <span className="font-semibold text-orange-600">{userStats.last24h}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">7 ngày qua:</span>
                                    <span className="font-semibold">{userStats.last7d}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Trạng thái:</span>
                                    {userStats.isLocked ? (
                                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                            Đã khóa
                                        </span>
                                    ) : userStats.isRestricted ? (
                                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                            Bị hạn chế
                                        </span>
                                    ) : (
                                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                            Bình thường
                                        </span>
                                    )}
                                </div>
                            </div>
                            {(userStats.isLocked || userStats.isRestricted) && (
                                <Button
                                    size="sm"
                                    className="w-full mt-3 bg-green-600 hover:bg-green-700"
                                    onClick={() => handleUnlockUser(searchUserId)}
                                >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Mở khóa Chat
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {/* Test Message */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Test phân tích tin nhắn
                    </h3>
                    <div className="space-y-3">
                        <textarea
                            placeholder="Nhập nội dung tin nhắn để test..."
                            value={testMessage}
                            onChange={(e) => setTestMessage(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                        />
                        <Button
                            onClick={handleTestMessage}
                            disabled={isTestingMessage || !testMessage.trim()}
                            className="w-full"
                        >
                            {isTestingMessage ? 'Đang phân tích...' : 'Phân tích'}
                        </Button>
                    </div>

                    {/* Test Result */}
                    {testResult && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium text-gray-700">Kết quả</h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${testResult.isViolation ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                    }`}>
                                    {testResult.isViolation ? 'Có vi phạm' : 'Không vi phạm'}
                                </span>
                            </div>
                            {testResult.isViolation && (
                                <>
                                    <div className="text-sm space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Điểm vi phạm:</span>
                                            <span className="font-semibold text-red-600">{testResult.totalScore}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Hành động:</span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionColor(testResult.action)}`}>
                                                {testResult.action}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <span className="text-xs text-gray-500">Chi tiết vi phạm:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {testResult.violations?.map((v: any, i: number) => (
                                                <span key={i} className={`px-2 py-0.5 rounded text-xs border ${getSeverityColor(v.severity)}`}>
                                                    {v.type}: &quot;{v.matched}&quot;
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    {testResult.warningMessage && (
                                        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                                            {testResult.warningMessage}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Violations Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                        Danh sách Vi phạm ({totalItems})
                    </h3>
                    <Button variant="outline" size="sm" onClick={() => fetchViolations(currentPage, searchUserId || undefined)}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Làm mới
                    </Button>
                </div>

                {isLoading ? (
                    <div className="p-8 text-center">
                        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="mt-2 text-gray-500">Đang tải...</p>
                    </div>
                ) : violations.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Không có vi phạm nào</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thời gian</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mức độ</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Điểm</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hành động</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nội dung</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {violations.map((violation) => (
                                    <tr key={violation.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatDate(violation.createdAt)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                                    <User className="w-4 h-4 text-gray-500" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {violation.userName || 'Unknown'}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {violation.userEmail}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {violation.violationType.split(',').map((type, i) => (
                                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs">
                                                        {getViolationTypeIcon(type)}
                                                        {type}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(violation.severity)}`}>
                                                {violation.severity}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-semibold text-gray-900">{violation.score}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(violation.action)}`}>
                                                {violation.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="max-w-[200px] truncate text-sm text-gray-600" title={violation.content}>
                                                {violation.content}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedViolation(violation)}
                                                    title="Xem chi tiết"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Link href={`/admin/users/${violation.userId}`}>
                                                    <Button variant="outline" size="sm" title="Xem user">
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-100">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedViolation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setSelectedViolation(null)}
                    />
                    <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-gray-900">Chi tiết Vi phạm</h3>
                                <button
                                    onClick={() => setSelectedViolation(null)}
                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <XCircle className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 uppercase">User</label>
                                    <div className="mt-1 font-medium">{selectedViolation.userName || selectedViolation.userId}</div>
                                    <div className="text-sm text-gray-500">{selectedViolation.userEmail}</div>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase">Thời gian</label>
                                    <div className="mt-1">{formatDate(selectedViolation.createdAt)}</div>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase">Mức độ</label>
                                    <div className="mt-1">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(selectedViolation.severity)}`}>
                                            {selectedViolation.severity}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase">Hành động</label>
                                    <div className="mt-1">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(selectedViolation.action)}`}>
                                            {selectedViolation.action}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 uppercase">Loại vi phạm</label>
                                <div className="mt-1 flex flex-wrap gap-1">
                                    {selectedViolation.violationType.split(',').map((type, i) => (
                                        <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm">
                                            {getViolationTypeIcon(type)}
                                            {type}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 uppercase">Patterns đã match</label>
                                <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <code className="text-sm text-red-700 break-all">
                                        {selectedViolation.matchedPatterns}
                                    </code>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 uppercase">Nội dung tin nhắn</label>
                                <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedViolation.content}</p>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Link href={`/admin/users/${selectedViolation.userId}`} className="flex-1">
                                    <Button variant="outline" className="w-full">
                                        <User className="w-4 h-4 mr-2" />
                                        Xem Profile User
                                    </Button>
                                </Link>
                                <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    onClick={() => {
                                        handleUnlockUser(selectedViolation.userId);
                                        setSelectedViolation(null);
                                    }}
                                >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Mở khóa Chat
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
