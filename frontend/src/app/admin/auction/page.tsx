'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/admin';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button } from '@/components/ui/button';
import {
  Gavel, Loader2, Trophy, Calendar, DollarSign, Users,
  CheckCircle, XCircle, Clock, RefreshCw, Crown, Medal, Award, Store,
  AlertTriangle, Settings, Save, Plus, Play, PauseCircle, Power, ToggleLeft, ToggleRight,
} from 'lucide-react';

interface Auction {
  id: string;
  weekNumber: number;
  year: number;
  startTime: string;
  endTime: string;
  lastBidAt?: string;
  status: string;
  totalBids: number;
  winners: { position: number; shopName: string; amount: number }[];
  revenue: number;
}

interface CurrentAuction {
  id: string;
  weekNumber: number;
  year: number;
  startTime: string;
  endTime: string;
  lastBidAt?: string;
  status: string;
  positions: {
    position: number;
    highestBid: { id: string; amount: number; sellerId: string; shopName: string; createdAt: string } | null;
    bidCount: number;
  }[];
  totalBids: number;
}

interface AuctionSettings {
  startPrice: number;
  minIncrement: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  cooldownMinutes: number;
  autoCreate: boolean;
}

const fmt = (n: number) => n?.toLocaleString('vi-VN') + 'đ';
const fmtDate = (d: string) => {
  const date = new Date(d);
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
};
const fmtTime = (d: string) => {
  const date = new Date(d);
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
};
const fmtDateOnly = (d: string) => {
  const date = new Date(d);
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });
};

export default function AdminAuctionPage() {
  const { token, user } = useAuthStore();
  const router = useRouter();

  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [currentAuction, setCurrentAuction] = useState<CurrentAuction | null>(null);
  const [settings, setSettings] = useState<AuctionSettings | null>(null);
  const [editSettings, setEditSettings] = useState<AuctionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'finalize' | 'cancel'; auctionId: string } | null>(null);

  // Create auction form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    date: new Date().toISOString().split('T')[0],
    startHour: 8,
    startMinute: 0,
    endHour: 20,
    endMinute: 0,
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!token || user?.role !== 'ADMIN') {
      router.push('/');
      return;
    }
    fetchData();
  }, [token, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      const [auctionRes, listRes, settingsRes] = await Promise.all([
        fetch('/api/auction/current'),
        fetch('/api/admin/auction/list?take=20', { headers }),
        fetch('/api/admin/auction/settings', { headers }),
      ]);

      const [auctionData, listData, settingsData] = await Promise.all([
        auctionRes.json(),
        listRes.json(),
        settingsRes.json(),
      ]);

      if (auctionData.success) setCurrentAuction(auctionData.auction);
      if (listData.success) setAuctions(listData.auctions);
      if (settingsData.success) {
        setSettings(settingsData.settings);
        setEditSettings(settingsData.settings);
      }
    } catch (err) {
      console.error('Error fetching auction data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!editSettings) return;
    try {
      setSaving(true);
      const res = await fetch('/api/admin/auction/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editSettings),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setEditSettings(data.settings);
        alert('Đã lưu cài đặt!');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAuction = async () => {
    try {
      setCreating(true);
      const res = await fetch('/api/admin/auction/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (data.success) {
        alert('Đã tạo phiên đấu giá!');
        setShowCreateForm(false);
        fetchData();
      } else {
        alert(data.message || 'Lỗi tạo phiên đấu giá');
      }
    } catch (err) {
      console.error('Error creating auction:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    try {
      const res = await fetch(`/api/admin/auction/${confirmAction.auctionId}/${confirmAction.type}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (err) {
      console.error('Error performing action:', err);
    } finally {
      setConfirmAction(null);
    }
  };

  // Status helpers
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-3 h-3" /> Chờ mở
          </span>
        );
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <Play className="w-3 h-3" /> Đang diễn ra
          </span>
        );
      case 'ENDED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <CheckCircle className="w-3 h-3" /> Đã kết thúc
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3 h-3" /> Đã hủy
          </span>
        );
      default:
        return <span className="text-xs text-gray-500">{status}</span>;
    }
  };

  const posIcon = (pos: number) => pos === 1 ? Crown : pos === 2 ? Medal : Award;
  const posColor = (pos: number) => pos === 1 ? 'text-yellow-500' : pos === 2 ? 'text-gray-400' : 'text-orange-400';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Đấu giá"
        description="Quản lý phiên đấu giá gian hàng và cài đặt"
        icon={<Gavel className="w-5 h-5" />}
      />

      {/* ====== SETTINGS SECTION ====== */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Settings className="w-5 h-5" /> Cài đặt đấu giá
          </h2>
          <Button onClick={handleSaveSettings} disabled={saving} size="sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            Lưu
          </Button>
        </div>

        {editSettings && (
          <div className="space-y-4">
            {/* Auto-create Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <div>
                <p className="font-semibold text-sm">⚡ Tự động tạo phiên hàng ngày</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editSettings.autoCreate
                    ? `Mỗi ngày hệ thống sẽ tự tạo phiên đấu giá (${String(editSettings.startHour).padStart(2, '0')}:${String(editSettings.startMinute).padStart(2, '0')} → ${String(editSettings.endHour).padStart(2, '0')}:${String(editSettings.endMinute).padStart(2, '0')})`
                    : 'Tắt: Admin phải tạo từng phiên thủ công'
                  }
                </p>
              </div>
              <button
                onClick={() => setEditSettings({ ...editSettings, autoCreate: !editSettings.autoCreate })}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${editSettings.autoCreate ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${editSettings.autoCreate ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Start Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Giá khởi điểm (đ)
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  value={editSettings.startPrice}
                  onChange={e => setEditSettings({ ...editSettings, startPrice: parseInt(e.target.value) || 0 })}
                />
              </div>

              {/* Min Increment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bước giá tối thiểu (đ)
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  value={editSettings.minIncrement}
                  onChange={e => setEditSettings({ ...editSettings, minIncrement: parseInt(e.target.value) || 0 })}
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  🟢 Giờ bắt đầu (VN)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    className="w-1/2 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    value={editSettings.startHour}
                    onChange={e => setEditSettings({ ...editSettings, startHour: parseInt(e.target.value) || 0 })}
                    placeholder="Giờ"
                  />
                  <span className="flex items-center text-gray-400">:</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    className="w-1/2 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    value={editSettings.startMinute}
                    onChange={e => setEditSettings({ ...editSettings, startMinute: parseInt(e.target.value) || 0 })}
                    placeholder="Phút"
                  />
                </div>
              </div>

              {/* End Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  🔴 Giờ kết thúc (VN)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    className="w-1/2 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    value={editSettings.endHour}
                    onChange={e => setEditSettings({ ...editSettings, endHour: parseInt(e.target.value) || 0 })}
                    placeholder="Giờ"
                  />
                  <span className="flex items-center text-gray-400">:</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    className="w-1/2 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    value={editSettings.endMinute}
                    onChange={e => setEditSettings({ ...editSettings, endMinute: parseInt(e.target.value) || 0 })}
                    placeholder="Phút"
                  />
                </div>
              </div>

              {/* Cooldown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cooldown (phút)
                </label>
                <input
                  type="number"
                  min={0}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  value={editSettings.cooldownMinutes}
                  onChange={e => setEditSettings({ ...editSettings, cooldownMinutes: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-gray-400 mt-1">0 = tắt gia hạn. Nếu &gt; 0: gia hạn khi có bid gần cuối</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ====== CURRENT AUCTION ====== */}
      {currentAuction ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Gavel className="w-5 h-5" /> Phiên đấu giá hiện tại
            </h2>
            <div className="flex items-center gap-2">
              {getStatusBadge(currentAuction.status)}
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              <p className="text-xs text-gray-400">Ngày</p>
              <p className="font-semibold">{fmtDateOnly(currentAuction.startTime)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              <p className="text-xs text-gray-400">Bắt đầu</p>
              <p className="font-semibold text-green-600">{fmtTime(currentAuction.startTime)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              <p className="text-xs text-gray-400">Kết thúc</p>
              <p className="font-semibold text-red-600">{fmtTime(currentAuction.endTime)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              <p className="text-xs text-gray-400">Tổng bid</p>
              <p className="font-semibold">{currentAuction.totalBids}</p>
            </div>
          </div>

          {/* Positions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {currentAuction.positions.map(pos => {
              const Icon = posIcon(pos.position);
              return (
                <div key={pos.position} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-5 h-5 ${posColor(pos.position)}`} />
                    <span className="font-bold">Vị trí #{pos.position}</span>
                    <span className="text-xs text-gray-400 ml-auto">{pos.bidCount} bid</span>
                  </div>
                  {pos.highestBid ? (
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium">{pos.highestBid.shopName}</span>
                      <span className="ml-auto font-bold text-emerald-600">{fmt(pos.highestBid.amount)}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Chưa có bid</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Actions */}
          {(currentAuction.status === 'ACTIVE' || currentAuction.status === 'PENDING') && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setConfirmAction({ type: 'finalize', auctionId: currentAuction.id })}
              >
                <CheckCircle className="w-4 h-4 mr-1" /> Kết thúc ngay
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setConfirmAction({ type: 'cancel', auctionId: currentAuction.id })}
              >
                <XCircle className="w-4 h-4 mr-1" /> Hủy phiên
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* No auction */
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 text-center">
          <Gavel className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-lg font-semibold text-gray-600">Không có phiên đấu giá nào đang chạy</p>
          <p className="text-sm text-gray-400 mt-1">
            {editSettings?.autoCreate
              ? 'Hệ thống sẽ tự tạo phiên mới vào ngày tiếp theo'
              : 'Hãy tạo phiên thủ công bên dưới'
            }
          </p>
        </div>
      )}

      {/* ====== CREATE AUCTION ====== */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Plus className="w-5 h-5" /> Tạo phiên đấu giá thủ công
          </h2>
          <Button size="sm" variant="outline" onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? 'Đóng' : 'Mở form'}
          </Button>
        </div>

        {showCreateForm && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  📅 Ngày
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  value={createForm.date}
                  onChange={e => setCreateForm({ ...createForm, date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  🟢 Giờ bắt đầu
                </label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    className="w-1/2 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    value={createForm.startHour}
                    onChange={e => setCreateForm({ ...createForm, startHour: parseInt(e.target.value) || 0 })}
                  />
                  <span className="flex items-center text-gray-400">:</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    className="w-1/2 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    value={createForm.startMinute}
                    onChange={e => setCreateForm({ ...createForm, startMinute: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  🔴 Giờ kết thúc
                </label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    className="w-1/2 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    value={createForm.endHour}
                    onChange={e => setCreateForm({ ...createForm, endHour: parseInt(e.target.value) || 0 })}
                  />
                  <span className="flex items-center text-gray-400">:</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    className="w-1/2 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    value={createForm.endMinute}
                    onChange={e => setCreateForm({ ...createForm, endMinute: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
            <Button onClick={handleCreateAuction} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              Tạo phiên đấu giá
            </Button>
          </div>
        )}
      </div>

      {/* ====== AUCTION HISTORY ====== */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5" /> Lịch sử đấu giá
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left py-2 px-3">Ngày</th>
                <th className="text-left py-2 px-3">Thời gian</th>
                <th className="text-center py-2 px-3">Bids</th>
                <th className="text-left py-2 px-3">Trạng thái</th>
                <th className="text-left py-2 px-3">Người thắng</th>
                <th className="text-right py-2 px-3">Doanh thu</th>
                <th className="text-right py-2 px-3">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {auctions.map(a => (
                <tr key={a.id} className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="py-2 px-3 font-medium">{fmtDateOnly(a.startTime)}</td>
                  <td className="py-2 px-3 text-gray-500">
                    {fmtTime(a.startTime)} → {fmtTime(a.endTime)}
                  </td>
                  <td className="py-2 px-3 text-center">{a.totalBids}</td>
                  <td className="py-2 px-3">{getStatusBadge(a.status)}</td>
                  <td className="py-2 px-3">
                    {a.winners.length > 0 ? (
                      <div className="space-y-0.5">
                        {a.winners.map(w => {
                          const Icon = posIcon(w.position);
                          return (
                            <div key={w.position} className="flex items-center gap-1 text-xs">
                              <Icon className={`w-3 h-3 ${posColor(w.position)}`} />
                              <span>{w.shopName}</span>
                              <span className="text-emerald-600 ml-1">{fmt(w.amount)}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right font-medium">
                    {a.revenue > 0 ? (
                      <span className="text-emerald-600">{fmt(a.revenue)}</span>
                    ) : '—'}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {(a.status === 'ACTIVE' || a.status === 'PENDING') && (
                      <div className="flex gap-1 justify-end">
                        <button
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                          onClick={() => setConfirmAction({ type: 'finalize', auctionId: a.id })}
                        >
                          Kết thúc
                        </button>
                        <button
                          className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                          onClick={() => setConfirmAction({ type: 'cancel', auctionId: a.id })}
                        >
                          Hủy
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {auctions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    Chưa có phiên đấu giá nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ====== CONFIRM DIALOG ====== */}
      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={confirmAction?.type === 'finalize' ? 'Kết thúc phiên đấu giá' : 'Hủy phiên đấu giá'}
        description={confirmAction?.type === 'finalize'
          ? 'Bạn chắc chắn muốn kết thúc ngay? Phiên đấu giá sẽ xác định người thắng và hoàn tiền cho người thua.'
          : 'Bạn chắc chắn muốn hủy? Tất cả bid sẽ được hoàn tiền.'
        }
        variant={confirmAction?.type === 'cancel' ? 'danger' : 'warning'}
      />
    </div>
  );
}
