'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import {
  Store, Clock, CheckCircle, XCircle, User, Mail, Phone, 
  FileText, Calendar, Loader2, Search, Filter, Eye, Check, X,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SellerApplication {
  id: string;
  userId: string;
  fullName: string;
  shopName: string;
  email: string;
  phone: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNote?: string;
  createdAt: string;
  reviewedAt?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    avatar: string;
    createdAt: string;
  };
}

export default function AdminSellerApplicationsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0 });
  
  // Modal states
  const [selectedApp, setSelectedApp] = useState<SellerApplication | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approveNote, setApproveNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchApplications();
      fetchStats();
    }
  }, [user, statusFilter, pagination.offset]);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = `/api/admin/seller-applications?limit=${pagination.limit}&offset=${pagination.offset}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications);
        setPagination(prev => ({ ...prev, total: data.total }));
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const [pending, all] = await Promise.all([
        fetch('/api/admin/seller-applications/pending-count', {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()),
        fetch('/api/admin/seller-applications?limit=1000', {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()),
      ]);
      
      const approved = all.applications?.filter((a: SellerApplication) => a.status === 'APPROVED').length || 0;
      const rejected = all.applications?.filter((a: SellerApplication) => a.status === 'REJECTED').length || 0;
      
      setStats({
        pending: pending.count || 0,
        approved,
        rejected,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    setIsProcessing(true);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/seller-applications/${selectedApp.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ note: approveNote }),
      });

      if (res.ok) {
        setShowApproveModal(false);
        setSelectedApp(null);
        setApproveNote('');
        fetchApplications();
        fetchStats();
      }
    } catch (error) {
      console.error('Error approving:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !rejectReason.trim()) return;
    setIsProcessing(true);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/seller-applications/${selectedApp.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectReason }),
      });

      if (res.ok) {
        setShowRejectModal(false);
        setSelectedApp(null);
        setRejectReason('');
        fetchApplications();
        fetchStats();
      }
    } catch (error) {
      console.error('Error rejecting:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Clock className="w-3 h-3" />
            Chờ duyệt
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            Đã duyệt
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <XCircle className="w-3 h-3" />
            Từ chối
          </span>
        );
      default:
        return null;
    }
  };

  const filteredApplications = applications.filter(app => 
    app.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (user?.role !== 'ADMIN') {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Không có quyền truy cập</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Duyệt đăng ký Seller</h1>
        <p className="text-gray-500 mt-1">Xem và duyệt các đơn đăng ký trở thành người bán</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-600">Chờ duyệt</p>
              <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-amber-400" />
          </div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">Đã duyệt</p>
              <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600">Từ chối</p>
              <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Tìm theo tên, shop, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="PENDING">Chờ duyệt</option>
          <option value="APPROVED">Đã duyệt</option>
          <option value="REJECTED">Từ chối</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Không có đơn đăng ký nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Người đăng ký</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tên Shop</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ngày gửi</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{app.fullName}</p>
                          <p className="text-xs text-gray-500">ID: {app.userId.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{app.shopName}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">{app.email}</td>
                    <td className="px-4 py-3 text-gray-500 text-sm">
                      {new Date(app.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(app.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedApp(app);
                            setShowDetailModal(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {app.status === 'PENDING' && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                setSelectedApp(app);
                                setShowApproveModal(true);
                              }}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => {
                                setSelectedApp(app);
                                setShowRejectModal(true);
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDetailModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Chi tiết đơn đăng ký</h2>
                <button onClick={() => setShowDetailModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {getStatusBadge(selectedApp.status)}
                  <span className="text-sm text-gray-500">
                    Gửi lúc: {new Date(selectedApp.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Họ và tên</p>
                    <p className="font-medium">{selectedApp.fullName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tên Shop</p>
                    <p className="font-medium">{selectedApp.shopName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{selectedApp.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Số điện thoại</p>
                    <p className="font-medium">{selectedApp.phone || 'Không có'}</p>
                  </div>
                </div>
                
                {selectedApp.description && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Mô tả</p>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedApp.description}</p>
                  </div>
                )}
                
                {selectedApp.adminNote && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Ghi chú Admin</p>
                    <p className="text-gray-700 bg-amber-50 p-3 rounded-lg">{selectedApp.adminNote}</p>
                  </div>
                )}
              </div>
              
              {selectedApp.status === 'PENDING' && (
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setShowDetailModal(false);
                      setShowRejectModal(true);
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Từ chối
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setShowDetailModal(false);
                      setShowApproveModal(true);
                    }}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Duyệt
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowApproveModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-center mb-2">Duyệt đơn đăng ký?</h2>
              <p className="text-gray-600 text-center mb-4">
                Bạn sắp duyệt đơn đăng ký của <strong>{selectedApp.fullName}</strong> với shop <strong>{selectedApp.shopName}</strong>
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú (tùy chọn)</label>
                <textarea
                  value={approveNote}
                  onChange={(e) => setApproveNote(e.target.value)}
                  placeholder="Ghi chú cho người dùng..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowApproveModal(false)}>
                  Hủy
                </Button>
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700" 
                  onClick={handleApprove}
                  disabled={isProcessing}
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Duyệt'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowRejectModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-7 h-7 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-center mb-2">Từ chối đơn đăng ký?</h2>
              <p className="text-gray-600 text-center mb-4">
                Bạn sắp từ chối đơn đăng ký của <strong>{selectedApp.fullName}</strong>
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Lý do từ chối <span className="text-red-500">*</span></label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Nhập lý do từ chối..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowRejectModal(false)}>
                  Hủy
                </Button>
                <Button 
                  className="flex-1 bg-red-600 hover:bg-red-700" 
                  onClick={handleReject}
                  disabled={isProcessing || !rejectReason.trim()}
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Từ chối'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
