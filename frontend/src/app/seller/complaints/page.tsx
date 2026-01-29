'use client';

import { useEffect, useState } from 'react';
import { 
  MessageSquareWarning, 
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  User,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Complaint {
  id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  resolution?: string;
  createdAt: string;
  buyer: { id: string; name: string; email: string };
  order: {
    id: string;
    orderNumber: string;
    items: { product: { title: string; images: string } }[];
  };
  messages: { id: string; message: string; createdAt: string; sender: { name: string } }[];
}

export default function SellerComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchComplaints();
  }, [pagination.page, statusFilter]);

  const fetchComplaints = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/seller/complaints?${params}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setComplaints(data.complaints);
        setPagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComplaintDetail = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/seller/complaints/${id}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setSelectedComplaint(data);
      }
    } catch (error) {
      console.error('Error fetching complaint:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedComplaint) return;

    setIsSending(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/seller/complaints/${selectedComplaint.id}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: newMessage }),
        }
      );

      if (response.ok) {
        setNewMessage('');
        fetchComplaintDetail(selectedComplaint.id);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateStatus = async (status: string, resolution?: string) => {
    if (!selectedComplaint) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/seller/complaints/${selectedComplaint.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status, resolution }),
        }
      );
      fetchComplaints();
      fetchComplaintDetail(selectedComplaint.id);
    } catch (error) {
      console.error('Error updating complaint:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Mở</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full flex items-center gap-1"><Clock className="w-3 h-3" /> Đang xử lý</span>;
      case 'RESOLVED':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Đã giải quyết</span>;
      case 'CLOSED':
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">Đã đóng</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">{status}</span>;
    }
  };

  const getTypeBadge = (type: string) => {
    const types: Record<string, string> = {
      PRODUCT_ISSUE: 'Vấn đề sản phẩm',
      NOT_RECEIVED: 'Chưa nhận được',
      WRONG_ITEM: 'Sai sản phẩm',
      REFUND_REQUEST: 'Yêu cầu hoàn tiền',
      OTHER: 'Khác',
    };
    return types[type] || type;
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý khiếu nại</h1>
        <p className="text-gray-600">Xử lý các khiếu nại từ khách hàng</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="OPEN">Mở</option>
          <option value="IN_PROGRESS">Đang xử lý</option>
          <option value="RESOLVED">Đã giải quyết</option>
          <option value="CLOSED">Đã đóng</option>
        </select>
      </div>

      {/* Complaints List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquareWarning className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Chưa có khiếu nại nào</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {complaints.map((complaint) => (
              <div 
                key={complaint.id} 
                className="p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => fetchComplaintDetail(complaint.id)}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">{complaint.title}</p>
                      {getStatusBadge(complaint.status)}
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{getTypeBadge(complaint.type)}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <User className="w-4 h-4" />
                      <span>{complaint.buyer?.name || complaint.buyer?.email}</span>
                      <span>•</span>
                      <span>Đơn #{complaint.order?.orderNumber}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(complaint.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Complaint Detail Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">{selectedComplaint.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(selectedComplaint.status)}
                  <span className="text-sm text-gray-500">{getTypeBadge(selectedComplaint.type)}</span>
                </div>
              </div>
              <button onClick={() => setSelectedComplaint(null)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Description */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700">{selectedComplaint.description}</p>
              </div>

              {/* Messages */}
              <div className="space-y-3">
                {selectedComplaint.messages?.map((msg) => (
                  <div key={msg.id} className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                      {msg.sender?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{msg.sender?.name}</p>
                        <p className="text-xs text-gray-500">{new Date(msg.createdAt).toLocaleString('vi-VN')}</p>
                      </div>
                      <p className="text-gray-700 text-sm mt-1">{msg.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            {selectedComplaint.status !== 'CLOSED' && (
              <div className="p-4 border-t border-gray-200 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 h-10 px-3 border border-gray-200 rounded-lg"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button onClick={handleSendMessage} disabled={isSending}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  {selectedComplaint.status === 'OPEN' && (
                    <Button size="sm" variant="outline" onClick={() => handleUpdateStatus('IN_PROGRESS')}>
                      Bắt đầu xử lý
                    </Button>
                  )}
                  {selectedComplaint.status !== 'RESOLVED' && (
                    <Button size="sm" className="bg-green-600" onClick={() => handleUpdateStatus('RESOLVED', 'Đã giải quyết')}>
                      Đánh dấu đã giải quyết
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

