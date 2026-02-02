'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Save, Loader2, Gavel, Clock, Globe, Phone, Mail, MapPin, Facebook, Send, MessageCircle } from 'lucide-react';

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
  const [isSavingAuction, setIsSavingAuction] = useState(false);
  const [isSavingSite, setIsSavingSite] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auction settings
  const [auctionSettings, setAuctionSettings] = useState({
    startPrice: 100000,
    minIncrement: 10000,
    endDay: 0,
    endHour: 19,
  });

  // Site settings
  const [siteSettings, setSiteSettings] = useState({
    social: {
      facebook: '',
      telegram: '',
      zalo: '',
    },
    contact: {
      email: '',
      phone: '',
      address: '',
    },
    site: {
      name: 'BachHoaMMO',
      description: '',
      telegramBot: '',
    },
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
      // Fetch auction settings
      const auctionRes = await fetch('/api/admin/settings/auction', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const auctionData = await auctionRes.json();
      if (auctionData.success) {
        setAuctionSettings(auctionData.settings);
      }

      // Fetch site settings
      const siteRes = await fetch('/api/admin/settings/site', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const siteData = await siteRes.json();
      if (siteData.success) {
        setSiteSettings(siteData.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAuction = async () => {
    setIsSavingAuction(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/admin/settings/auction', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(auctionSettings),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Cài đặt đấu giá đã được lưu!' });
        setAuctionSettings(data.settings);
      } else {
        setMessage({ type: 'error', text: data.message || 'Không thể lưu cài đặt' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Có lỗi xảy ra' });
    } finally {
      setIsSavingAuction(false);
    }
  };

  const handleSaveSite = async () => {
    setIsSavingSite(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/admin/settings/site', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(siteSettings),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Cài đặt trang web đã được lưu!' });
        setSiteSettings(data.settings);
      } else {
        setMessage({ type: 'error', text: data.message || 'Không thể lưu cài đặt' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Có lỗi xảy ra' });
    } finally {
      setIsSavingSite(false);
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
        description="Quản lý các cài đặt cho website và hệ thống đấu giá"
        icon={<Settings className="w-8 h-8" />}
      />

      {/* Message */}
      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Site Settings - Social Links */}
      <div className="bg-card rounded-xl border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
            <Globe className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Mạng xã hội & Liên hệ</h2>
            <p className="text-sm text-muted-foreground">Cấu hình link mạng xã hội và thông tin liên hệ hiển thị trên website</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Social Links Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Mạng xã hội</h3>
            
            {/* Facebook */}
            <div className="space-y-2">
              <Label htmlFor="facebook" className="flex items-center gap-2">
                <Facebook className="w-4 h-4 text-blue-600" />
                Link Facebook Fanpage
              </Label>
              <Input
                id="facebook"
                type="url"
                placeholder="https://facebook.com/bachhoammo"
                value={siteSettings.social.facebook}
                onChange={(e) => setSiteSettings({
                  ...siteSettings,
                  social: { ...siteSettings.social, facebook: e.target.value }
                })}
              />
            </div>

            {/* Telegram */}
            <div className="space-y-2">
              <Label htmlFor="telegram" className="flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-500" />
                Link Telegram
              </Label>
              <Input
                id="telegram"
                type="url"
                placeholder="https://t.me/bachhoammobot"
                value={siteSettings.social.telegram}
                onChange={(e) => setSiteSettings({
                  ...siteSettings,
                  social: { ...siteSettings.social, telegram: e.target.value }
                })}
              />
            </div>

            {/* Zalo */}
            <div className="space-y-2">
              <Label htmlFor="zalo" className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-blue-600" />
                Link Zalo
              </Label>
              <Input
                id="zalo"
                type="url"
                placeholder="https://zalo.me/bachhoammo"
                value={siteSettings.social.zalo}
                onChange={(e) => setSiteSettings({
                  ...siteSettings,
                  social: { ...siteSettings.social, zalo: e.target.value }
                })}
              />
            </div>
          </div>

          {/* Contact Info Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Thông tin liên hệ</h3>
            
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="contactEmail" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-orange-500" />
                Email hỗ trợ
              </Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="support@bachhoammo.store"
                value={siteSettings.contact.email}
                onChange={(e) => setSiteSettings({
                  ...siteSettings,
                  contact: { ...siteSettings.contact, email: e.target.value }
                })}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="contactPhone" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-green-500" />
                Số điện thoại
              </Label>
              <Input
                id="contactPhone"
                type="tel"
                placeholder="0123 456 789"
                value={siteSettings.contact.phone}
                onChange={(e) => setSiteSettings({
                  ...siteSettings,
                  contact: { ...siteSettings.contact, phone: e.target.value }
                })}
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="contactAddress" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-500" />
                Địa chỉ
              </Label>
              <Input
                id="contactAddress"
                type="text"
                placeholder="123 Đường ABC, Quận XYZ, TP.HCM"
                value={siteSettings.contact.address}
                onChange={(e) => setSiteSettings({
                  ...siteSettings,
                  contact: { ...siteSettings.contact, address: e.target.value }
                })}
              />
            </div>
          </div>
        </div>

        {/* Site Info Section */}
        <div className="mt-6 pt-6 border-t space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Thông tin website</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Site Name */}
            <div className="space-y-2">
              <Label htmlFor="siteName">Tên website</Label>
              <Input
                id="siteName"
                type="text"
                placeholder="BachHoaMMO"
                value={siteSettings.site.name}
                onChange={(e) => setSiteSettings({
                  ...siteSettings,
                  site: { ...siteSettings.site, name: e.target.value }
                })}
              />
            </div>

            {/* Site Description */}
            <div className="space-y-2">
              <Label htmlFor="siteDescription">Slogan</Label>
              <Input
                id="siteDescription"
                type="text"
                placeholder="Chợ MMO uy tín #1 Việt Nam"
                value={siteSettings.site.description}
                onChange={(e) => setSiteSettings({
                  ...siteSettings,
                  site: { ...siteSettings.site, description: e.target.value }
                })}
              />
            </div>

            {/* Telegram Bot */}
            <div className="space-y-2">
              <Label htmlFor="telegramBot">Telegram Bot username</Label>
              <Input
                id="telegramBot"
                type="text"
                placeholder="@bachhoammobot"
                value={siteSettings.site.telegramBot}
                onChange={(e) => setSiteSettings({
                  ...siteSettings,
                  site: { ...siteSettings.site, telegramBot: e.target.value }
                })}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSaveSite} disabled={isSavingSite}>
            {isSavingSite ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang lưu...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Lưu cài đặt website</>
            )}
          </Button>
        </div>
      </div>

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
              value={auctionSettings.startPrice}
              onChange={(e) => setAuctionSettings({ ...auctionSettings, startPrice: parseInt(e.target.value) || 0 })}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Giá bid tối thiểu: {formatPrice(auctionSettings.startPrice)}đ
            </p>
          </div>

          {/* Min Increment */}
          <div className="space-y-2">
            <Label htmlFor="minIncrement">Bước giá tối thiểu (VND)</Label>
            <Input
              id="minIncrement"
              type="number"
              value={auctionSettings.minIncrement}
              onChange={(e) => setAuctionSettings({ ...auctionSettings, minIncrement: parseInt(e.target.value) || 0 })}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Mỗi lần đặt giá phải cao hơn ít nhất {formatPrice(auctionSettings.minIncrement)}đ
            </p>
          </div>

          {/* End Day */}
          <div className="space-y-2">
            <Label htmlFor="endDay">Ngày kết thúc đấu giá</Label>
            <select
              id="endDay"
              value={auctionSettings.endDay}
              onChange={(e) => setAuctionSettings({ ...auctionSettings, endDay: parseInt(e.target.value) })}
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
                value={auctionSettings.endHour}
                onChange={(e) => setAuctionSettings({ ...auctionSettings, endHour: parseInt(e.target.value) || 0 })}
                className="w-24"
              />
              <span className="text-muted-foreground">:00</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Đấu giá kết thúc lúc {auctionSettings.endHour}:00 {DAYS_OF_WEEK.find(d => d.value === auctionSettings.endDay)?.label} hàng tuần
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
            <li>• Giá khởi điểm: <strong>{formatPrice(auctionSettings.startPrice)}đ</strong></li>
            <li>• Bước giá tối thiểu: <strong>{formatPrice(auctionSettings.minIncrement)}đ</strong></li>
            <li>• Kết thúc: <strong>{auctionSettings.endHour}:00 {DAYS_OF_WEEK.find(d => d.value === auctionSettings.endDay)?.label}</strong> hàng tuần</li>
          </ul>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSaveAuction} disabled={isSavingAuction}>
            {isSavingAuction ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang lưu...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Lưu cài đặt đấu giá</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
