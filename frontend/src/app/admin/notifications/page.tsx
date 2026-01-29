'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Bell, 
  Send, 
  Loader2, 
  Megaphone, 
  User, 
  CheckCircle,
  AlertCircle,
  Users
} from 'lucide-react';

export default function AdminNotificationsPage() {
  const router = useRouter();
  const { user, token, checkAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'broadcast' | 'individual'>('broadcast');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    link: '',
  });

  const [individualForm, setIndividualForm] = useState({
    userId: '',
    title: '',
    message: '',
    link: '',
  });

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setIsLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
    }
  }, [user, isLoading]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastForm.title || !broadcastForm.message) {
      setMessage({ type: 'error', text: 'Vui lòng nhập tiêu đề và nội dung' });
      return;
    }

    setIsSending(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/notifications/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(broadcastForm),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: `Đã gửi thông báo đến ${data.count} người dùng!` });
        setBroadcastForm({ title: '', message: '', link: '' });
      } else {
        setMessage({ type: 'error', text: data.message || 'Không thể gửi thông báo' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Có lỗi xảy ra' });
    } finally {
      setIsSending(false);
    }
  };

  const handleIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!individualForm.userId || !individualForm.title || !individualForm.message) {
      setMessage({ type: 'error', text: 'Vui lòng nhập đầy đủ thông tin' });
      return;
    }

    setIsSending(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(individualForm),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Đã gửi thông báo thành công!' });
        setIndividualForm({ userId: '', title: '', message: '', link: '' });
      } else {
        setMessage({ type: 'error', text: data.message || 'Không thể gửi thông báo' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Có lỗi xảy ra' });
    } finally {
      setIsSending(false);
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
        title="Gửi thông báo"
        description="Gửi thông báo đến người dùng"
        icon={<Bell className="w-8 h-8" />}
      />

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => { setActiveTab('broadcast'); setMessage(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'broadcast'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          Gửi tất cả
        </button>
        <button
          onClick={() => { setActiveTab('individual'); setMessage(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'individual'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <User className="w-4 h-4" />
          Gửi cá nhân
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {message.text}
        </div>
      )}

      {/* Broadcast Form */}
      {activeTab === 'broadcast' && (
        <div className="bg-card rounded-xl border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Gửi thông báo đến tất cả người dùng</h2>
              <p className="text-sm text-muted-foreground">Thông báo sẽ được gửi đến tất cả tài khoản</p>
            </div>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="broadcast-title">Tiêu đề *</Label>
              <Input
                id="broadcast-title"
                value={broadcastForm.title}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                placeholder="VD: Thông báo bảo trì hệ thống"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="broadcast-message">Nội dung *</Label>
              <textarea
                id="broadcast-message"
                value={broadcastForm.message}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                placeholder="Nhập nội dung thông báo..."
                className="w-full min-h-[120px] px-3 py-2 border border-input rounded-md bg-background resize-none"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {broadcastForm.message.length}/500
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="broadcast-link">Link (tùy chọn)</Label>
              <Input
                id="broadcast-link"
                value={broadcastForm.link}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, link: e.target.value })}
                placeholder="VD: /promotions/tet-2026"
              />
              <p className="text-xs text-muted-foreground">
                Người dùng sẽ được chuyển đến link này khi click "Xem chi tiết"
              </p>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSending} className="min-w-[150px]">
                {isSending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang gửi...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Gửi thông báo</>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Individual Form */}
      {activeTab === 'individual' && (
        <div className="bg-card rounded-xl border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Gửi thông báo đến người dùng cụ thể</h2>
              <p className="text-sm text-muted-foreground">Nhập User ID để gửi thông báo</p>
            </div>
          </div>

          <form onSubmit={handleIndividual} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="individual-userId">User ID *</Label>
              <Input
                id="individual-userId"
                value={individualForm.userId}
                onChange={(e) => setIndividualForm({ ...individualForm, userId: e.target.value })}
                placeholder="Nhập User ID (UUID)"
              />
              <p className="text-xs text-muted-foreground">
                Có thể lấy User ID từ trang Quản lý người dùng
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="individual-title">Tiêu đề *</Label>
              <Input
                id="individual-title"
                value={individualForm.title}
                onChange={(e) => setIndividualForm({ ...individualForm, title: e.target.value })}
                placeholder="VD: Phản hồi khiếu nại"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="individual-message">Nội dung *</Label>
              <textarea
                id="individual-message"
                value={individualForm.message}
                onChange={(e) => setIndividualForm({ ...individualForm, message: e.target.value })}
                placeholder="Nhập nội dung thông báo..."
                className="w-full min-h-[120px] px-3 py-2 border border-input rounded-md bg-background resize-none"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {individualForm.message.length}/500
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="individual-link">Link (tùy chọn)</Label>
              <Input
                id="individual-link"
                value={individualForm.link}
                onChange={(e) => setIndividualForm({ ...individualForm, link: e.target.value })}
                placeholder="VD: /complaints/abc123"
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSending} className="min-w-[150px]">
                {isSending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang gửi...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Gửi thông báo</>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-medium text-blue-800 mb-2">Mẹo sử dụng:</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Thông báo broadcast sẽ gửi đến TẤT CẢ người dùng, hãy cân nhắc kỹ trước khi gửi</li>
          <li>Sử dụng link để điều hướng người dùng đến trang cụ thể</li>
          <li>Thông báo từ admin sẽ hiển thị với icon Megaphone màu tím</li>
          <li>Người dùng sẽ thấy thông báo ngay trong dropdown Bell ở header</li>
        </ul>
      </div>
    </div>
  );
}
