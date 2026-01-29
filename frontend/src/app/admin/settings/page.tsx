'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { PageHeader, StatsCard } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Save, Loader2, Gavel, Clock } from 'lucide-react';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Chủ nhật' },
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
];

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, token, checkAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [settings, setSettings] = useState({
    startPrice: 100000,
    minIncrement: 10000,
    endDay: 0,
    endHour: 19,
  });

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      fetchSettings();
    };
    init();
  }, []);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
    }
  }, [user, isLoading]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings/auction', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/admin/settings/auction', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Cài đặt đã được lưu!' });
        setSettings(data.settings);
      } else {
        setMessage({ type: 'error', text: data.message || 'Không thể lưu cài đặt' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Có lỗi xảy ra' });
    } finally {
      setIsSaving(false);
    }
  };

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('vi-VN').format(price);

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
        title="Cài đặt hệ thống"
        description="Quản lý các cài đặt cho hệ thống đấu giá"
        icon={<Settings className="w-8 h-8" />}
      />

      {/* Auction Settings */}
      <div className="bg-card rounded-xl border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Gavel className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Cài đặt Đấu giá</h2>
            <p className="text-sm text-muted-foreground">Cấu hình giá khởi điểm, bước giá và thời gian kết thúc</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Start Price */}
          <div className="space-y-2">
            <Label htmlFor="startPrice">Giá khởi điểm (VND)</Label>
            <Input
              id="startPrice"
              type="number"
              value={settings.startPrice}
              onChange={(e) => setSettings({ ...settings, startPrice: parseInt(e.target.value) || 0 })}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Giá bid tối thiểu: {formatPrice(settings.startPrice)}đ
            </p>
          </div>

          {/* Min Increment */}
          <div className="space-y-2">
            <Label htmlFor="minIncrement">Bước giá tối thiểu (VND)</Label>
            <Input
              id="minIncrement"
              type="number"
              value={settings.minIncrement}
              onChange={(e) => setSettings({ ...settings, minIncrement: parseInt(e.target.value) || 0 })}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Mỗi lần đặt giá phải cao hơn ít nhất {formatPrice(settings.minIncrement)}đ
            </p>
          </div>

          {/* End Day */}
          <div className="space-y-2">
            <Label htmlFor="endDay">Ngày kết thúc đấu giá</Label>
            <select
              id="endDay"
              value={settings.endDay}
              onChange={(e) => setSettings({ ...settings, endDay: parseInt(e.target.value) })}
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
            >
              {DAYS_OF_WEEK.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>

          {/* End Hour */}
          <div className="space-y-2">
            <Label htmlFor="endHour">Giờ kết thúc</Label>
            <div className="flex items-center gap-2">
              <Input
                id="endHour"
                type="number"
                min="0"
                max="23"
                value={settings.endHour}
                onChange={(e) => setSettings({ ...settings, endHour: parseInt(e.target.value) || 0 })}
                className="w-24"
              />
              <span className="text-muted-foreground">:00</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Đấu giá kết thúc lúc {settings.endHour}:00 {DAYS_OF_WEEK.find(d => d.value === settings.endDay)?.label} hàng tuần
            </p>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 text-blue-800 mb-2">
            <Clock className="w-4 h-4" />
            <span className="font-medium">Tóm tắt cài đặt:</span>
          </div>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Giá khởi điểm: <strong>{formatPrice(settings.startPrice)}đ</strong></li>
            <li>• Bước giá tối thiểu: <strong>{formatPrice(settings.minIncrement)}đ</strong></li>
            <li>• Kết thúc: <strong>{settings.endHour}:00 {DAYS_OF_WEEK.find(d => d.value === settings.endDay)?.label}</strong> hàng tuần</li>
          </ul>
        </div>

        {/* Message */}
        {message && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang lưu...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Lưu cài đặt</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
