'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Save, Loader2, Gavel, Clock, Globe, Phone, Mail, MapPin, Facebook, Send, MessageCircle, Trash2, Plus, Link as LinkIcon, FileText, Megaphone, AlertTriangle, CheckCircle, Sparkles, DollarSign, Wallet, Copy } from 'lucide-react';

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
  const [isSavingUsdt, setIsSavingUsdt] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // USDT settings
  const [usdtSettings, setUsdtSettings] = useState({
    enabled: false,
    exchangeRate: 25000,
    networks: [] as { network: string; address: string }[],
  });

  // Auction settings
  const [auctionSettings, setAuctionSettings] = useState({
    startPrice: 100000,
    minIncrement: 10000,
    endDay: 0,
    endHour: 19,
  });

  const [siteSettings, setSiteSettings] = useState({
    social: {
      facebook: '',
      telegram: '',
      zalo: '',
      zaloDisplay: '',
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
    footer: {
      quickLinks: [] as { label: string; href: string }[],
      policyLinks: [] as { label: string; href: string }[],
      description: '',
    },
    announcement: {
      enabled: false,
      text: '',
      link: '',
      type: 'info',
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

      // Fetch USDT settings
      const usdtRes = await fetch('/api/admin/settings/usdt', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const usdtData = await usdtRes.json();
      if (usdtData.success) {
        setUsdtSettings(usdtData.settings);
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

  const handleSaveUsdt = async () => {
    setIsSavingUsdt(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/settings/usdt', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(usdtSettings),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Cài đặt USDT đã được lưu!' });
        setUsdtSettings(data.settings);
      } else {
        setMessage({ type: 'error', text: data.message || 'Không thể lưu cài đặt' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Có lỗi xảy ra' });
    } finally {
      setIsSavingUsdt(false);
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
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
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

      {/* Announcement Bar Settings */}
      <div className="bg-card rounded-xl border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-rose-500/10 rounded-lg flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-rose-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold">Thanh thông báo</h2>
            <p className="text-sm text-muted-foreground">Hiển thị thông báo quan trọng trên đầu website cho tất cả người dùng</p>
          </div>
          {/* Toggle */}
          <button
            onClick={() => setSiteSettings({
              ...siteSettings,
              announcement: { ...siteSettings.announcement, enabled: !siteSettings.announcement?.enabled }
            })}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${siteSettings.announcement?.enabled ? 'bg-green-500' : 'bg-gray-300'
              }`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${siteSettings.announcement?.enabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Announcement Type */}
          <div className="space-y-2">
            <Label>Kiểu thông báo</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: 'info', label: 'Thông tin', icon: Megaphone, color: 'bg-blue-600', activeRing: 'ring-blue-300' },
                { value: 'warning', label: 'Cảnh báo', icon: AlertTriangle, color: 'bg-amber-500', activeRing: 'ring-amber-300' },
                { value: 'success', label: 'Thành công', icon: CheckCircle, color: 'bg-emerald-500', activeRing: 'ring-emerald-300' },
                { value: 'promo', label: 'Khuyến mãi', icon: Sparkles, color: 'bg-gradient-to-r from-purple-600 to-pink-500', activeRing: 'ring-purple-300' },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => setSiteSettings({
                    ...siteSettings,
                    announcement: { ...siteSettings.announcement, type: t.value }
                  })}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${siteSettings.announcement?.type === t.value
                    ? `border-transparent ring-2 ${t.activeRing} ${t.color} text-white shadow-md`
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Announcement Text */}
          <div className="space-y-2">
            <Label htmlFor="announcementText">Nội dung thông báo</Label>
            <Input
              id="announcementText"
              type="text"
              placeholder="VD: 🎉 Giảm giá 50% tất cả sản phẩm hôm nay!"
              value={siteSettings.announcement?.text || ''}
              onChange={(e) => setSiteSettings({
                ...siteSettings,
                announcement: { ...siteSettings.announcement, text: e.target.value }
              })}
            />
          </div>

          {/* Announcement Link */}
          <div className="space-y-2">
            <Label htmlFor="announcementLink">Link (tuỳ chọn)</Label>
            <Input
              id="announcementLink"
              type="text"
              placeholder="https://example.com hoặc /explore"
              value={siteSettings.announcement?.link || ''}
              onChange={(e) => setSiteSettings({
                ...siteSettings,
                announcement: { ...siteSettings.announcement, link: e.target.value }
              })}
            />
            <p className="text-xs text-muted-foreground">Khi người dùng click vào thông báo sẽ mở link này</p>
          </div>

          {/* Preview */}
          {siteSettings.announcement?.text?.trim() && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Xem trước:</p>
              <div className={`rounded-lg overflow-hidden ${siteSettings.announcement.type === 'info' ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700' :
                siteSettings.announcement.type === 'warning' ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600' :
                  siteSettings.announcement.type === 'success' ? 'bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600' :
                    'bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500'
                }`}>
                <div className="flex items-center justify-center gap-2 py-2 px-4">
                  {siteSettings.announcement.type === 'info' && <Megaphone className="w-4 h-4 text-blue-200" />}
                  {siteSettings.announcement.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-200" />}
                  {siteSettings.announcement.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-200" />}
                  {siteSettings.announcement.type === 'promo' && <Sparkles className="w-4 h-4 text-pink-200" />}
                  <span className="text-sm text-white font-medium">{siteSettings.announcement.text}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Announcement */}
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSaveSite} disabled={isSavingSite}>
            {isSavingSite ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang lưu...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Lưu thông báo</>
            )}
          </Button>
        </div>
      </div>

      {/* Footer Settings */}
      <div className="bg-card rounded-xl border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Nội dung Footer</h2>
            <p className="text-sm text-muted-foreground">Quản lý các liên kết và nội dung hiển thị ở footer website</p>
          </div>
        </div>

        {/* Footer Description */}
        <div className="space-y-2 mb-6">
          <Label htmlFor="footerDesc">Mô tả footer</Label>
          <textarea
            id="footerDesc"
            rows={2}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
            placeholder="Mô tả ngắn về website hiển thị ở footer"
            value={siteSettings.footer?.description || ''}
            onChange={(e) => setSiteSettings({
              ...siteSettings,
              footer: { ...siteSettings.footer, description: e.target.value }
            })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Links */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Liên kết nhanh</h3>
              <button
                onClick={() => setSiteSettings({
                  ...siteSettings,
                  footer: {
                    ...siteSettings.footer,
                    quickLinks: [...(siteSettings.footer?.quickLinks || []), { label: '', href: '' }]
                  }
                })}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Thêm
              </button>
            </div>
            <div className="space-y-2">
              {(siteSettings.footer?.quickLinks || []).map((link, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Tên hiển thị"
                    value={link.label}
                    onChange={(e) => {
                      const links = [...(siteSettings.footer?.quickLinks || [])];
                      links[i] = { ...links[i], label: e.target.value };
                      setSiteSettings({ ...siteSettings, footer: { ...siteSettings.footer, quickLinks: links } });
                    }}
                    className="flex-1"
                  />
                  <Input
                    placeholder="/path hoặc URL"
                    value={link.href}
                    onChange={(e) => {
                      const links = [...(siteSettings.footer?.quickLinks || [])];
                      links[i] = { ...links[i], href: e.target.value };
                      setSiteSettings({ ...siteSettings, footer: { ...siteSettings.footer, quickLinks: links } });
                    }}
                    className="flex-1"
                  />
                  <button
                    onClick={() => {
                      const links = (siteSettings.footer?.quickLinks || []).filter((_, idx) => idx !== i);
                      setSiteSettings({ ...siteSettings, footer: { ...siteSettings.footer, quickLinks: links } });
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-500 flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {(siteSettings.footer?.quickLinks || []).length === 0 && (
                <p className="text-xs text-muted-foreground py-2">Chưa có liên kết nào</p>
              )}
            </div>
          </div>

          {/* Policy Links */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Chính sách</h3>
              <button
                onClick={() => setSiteSettings({
                  ...siteSettings,
                  footer: {
                    ...siteSettings.footer,
                    policyLinks: [...(siteSettings.footer?.policyLinks || []), { label: '', href: '' }]
                  }
                })}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Thêm
              </button>
            </div>
            <div className="space-y-2">
              {(siteSettings.footer?.policyLinks || []).map((link, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Tên hiển thị"
                    value={link.label}
                    onChange={(e) => {
                      const links = [...(siteSettings.footer?.policyLinks || [])];
                      links[i] = { ...links[i], label: e.target.value };
                      setSiteSettings({ ...siteSettings, footer: { ...siteSettings.footer, policyLinks: links } });
                    }}
                    className="flex-1"
                  />
                  <Input
                    placeholder="/path hoặc URL"
                    value={link.href}
                    onChange={(e) => {
                      const links = [...(siteSettings.footer?.policyLinks || [])];
                      links[i] = { ...links[i], href: e.target.value };
                      setSiteSettings({ ...siteSettings, footer: { ...siteSettings.footer, policyLinks: links } });
                    }}
                    className="flex-1"
                  />
                  <button
                    onClick={() => {
                      const links = (siteSettings.footer?.policyLinks || []).filter((_, idx) => idx !== i);
                      setSiteSettings({ ...siteSettings, footer: { ...siteSettings.footer, policyLinks: links } });
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-500 flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {(siteSettings.footer?.policyLinks || []).length === 0 && (
                <p className="text-xs text-muted-foreground py-2">Chưa có chính sách nào</p>
              )}
            </div>
          </div>
        </div>

        {/* Save Footer */}
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSaveSite} disabled={isSavingSite}>
            {isSavingSite ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang lưu...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Lưu cài đặt footer</>
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

      {/* USDT Settings */}
      <div className="bg-card rounded-xl border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold">Cổng nạp USDT</h2>
            <p className="text-sm text-muted-foreground">Cho phép người dùng nạp tiền bằng USDT (admin duyệt thủ công)</p>
          </div>
          <button
            onClick={() => setUsdtSettings({ ...usdtSettings, enabled: !usdtSettings.enabled })}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${usdtSettings.enabled ? 'bg-green-500' : 'bg-gray-300'
              }`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${usdtSettings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
          </button>
        </div>

        {/* Exchange Rate */}
        <div className="space-y-2 mb-6">
          <Label htmlFor="usdtRate">Tỷ giá (1 USDT = ? VND)</Label>
          <div className="max-w-xs">
            <Input
              id="usdtRate"
              type="number"
              value={usdtSettings.exchangeRate}
              onChange={(e) => setUsdtSettings({ ...usdtSettings, exchangeRate: parseInt(e.target.value) || 0 })}
              className="font-mono"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            VD: 10 USDT = {formatPrice(10 * usdtSettings.exchangeRate)}đ
          </p>
        </div>

        {/* Networks List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Danh sách mạng & địa chỉ ví</h3>
            <button
              onClick={() => setUsdtSettings({
                ...usdtSettings,
                networks: [...usdtSettings.networks, { network: 'TRC20', address: '' }]
              })}
              className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1 font-medium"
            >
              <Plus className="w-3 h-3" /> Thêm mạng
            </button>
          </div>

          {usdtSettings.networks.length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center bg-gray-50 rounded-lg border border-dashed">Chưa có mạng nào. Bấm &quot;Thêm mạng&quot; để bắt đầu.</p>
          )}

          {usdtSettings.networks.map((net, i) => (
            <div key={i} className="p-4 bg-gray-50 rounded-xl border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700">Mạng #{i + 1}</span>
                <button
                  onClick={() => {
                    const nets = usdtSettings.networks.filter((_, idx) => idx !== i);
                    setUsdtSettings({ ...usdtSettings, networks: nets });
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Blockchain</Label>
                  <select
                    value={net.network}
                    onChange={(e) => {
                      const nets = [...usdtSettings.networks];
                      nets[i] = { ...nets[i], network: e.target.value };
                      setUsdtSettings({ ...usdtSettings, networks: nets });
                    }}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="TRC20">TRC20 (Tron)</option>
                    <option value="ERC20">ERC20 (Ethereum)</option>
                    <option value="BEP20">BEP20 (BSC)</option>
                  </select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Địa chỉ ví</Label>
                  <Input
                    type="text"
                    placeholder="TNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={net.address}
                    onChange={(e) => {
                      const nets = [...usdtSettings.networks];
                      nets[i] = { ...nets[i], address: e.target.value };
                      setUsdtSettings({ ...usdtSettings, networks: nets });
                    }}
                    className="font-mono text-sm h-9"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Preview */}
        {usdtSettings.enabled && usdtSettings.networks.length > 0 && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 text-green-800 mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="font-medium">Xem trước (người dùng sẽ thấy):</span>
            </div>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Trạng thái: <strong className="text-green-800">Đang bật</strong></li>
              <li>• Tỷ giá: <strong>1 USDT = {formatPrice(usdtSettings.exchangeRate)}đ</strong></li>
              {usdtSettings.networks.map((net, i) => (
                <li key={i}>• {net.network}: <code className="bg-green-100 px-1 rounded text-xs">{net.address || '(chưa nhập)'}</code></li>
              ))}
            </ul>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSaveUsdt} disabled={isSavingUsdt} className="bg-green-600 hover:bg-green-700">
            {isSavingUsdt ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang lưu...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Lưu cài đặt USDT</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
