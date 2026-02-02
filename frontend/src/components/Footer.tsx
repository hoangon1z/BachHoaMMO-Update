'use client';

import Link from 'next/link';
import { Mail, Facebook, MessageCircle, Send, Phone, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SiteSettings {
  social: {
    facebook: string;
    telegram: string;
    zalo: string;
  };
  contact: {
    email: string;
    phone: string;
    address: string;
  };
  site: {
    name: string;
    description: string;
    telegramBot: string;
  };
}

export function Footer() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/site');
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching site settings:', error);
    }
  };

  // Default values
  const siteName = settings?.site?.name || 'BachHoaMMO';
  const facebookLink = settings?.social?.facebook || '#';
  const telegramLink = settings?.social?.telegram || 'https://t.me/bachhoammobot';
  const zaloLink = settings?.social?.zalo || '#';
  const contactEmail = settings?.contact?.email || 'support@bachhoammo.store';
  const contactPhone = settings?.contact?.phone || '';
  const contactAddress = settings?.contact?.address || '';
  const telegramBot = settings?.site?.telegramBot || '@bachhoammobot';

  return (
    <footer className="text-white" style={{ backgroundColor: '#0a59cc' }}>
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-xl font-bold mb-4">{siteName}</h3>
            <p className="text-gray-200 text-sm mb-4">
              Nền tảng mua bán tài khoản game, vật phẩm, dịch vụ game uy tín hàng đầu Việt Nam. 
              Cam kết giao dịch an toàn, nhanh chóng và bảo mật.
            </p>
            <div className="flex space-x-3">
              {facebookLink && facebookLink !== '#' && (
                <a href={facebookLink} target="_blank" rel="noopener noreferrer" aria-label={`Theo dõi ${siteName} trên Facebook`} className="w-10 h-10 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity" style={{ backgroundColor: '#2579f2' }}>
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {telegramLink && telegramLink !== '#' && (
                <a href={telegramLink} target="_blank" rel="noopener noreferrer" aria-label="Liên hệ qua Telegram" className="w-10 h-10 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity" style={{ backgroundColor: '#2579f2' }}>
                  <Send className="w-5 h-5" />
                </a>
              )}
              {zaloLink && zaloLink !== '#' && (
                <a href={zaloLink} target="_blank" rel="noopener noreferrer" aria-label={`Chat với ${siteName} trên Zalo`} className="w-10 h-10 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity" style={{ backgroundColor: '#2579f2' }}>
                  <MessageCircle className="w-5 h-5" />
                </a>
              )}
              {/* Show placeholder if no social links are set */}
              {(!facebookLink || facebookLink === '#') && (!telegramLink || telegramLink === '#') && (!zaloLink || zaloLink === '#') && (
                <>
                  <a href="#" aria-label="Facebook" className="w-10 h-10 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity" style={{ backgroundColor: '#2579f2' }}>
                    <Facebook className="w-5 h-5" />
                  </a>
                  <a href="#" aria-label="Telegram" className="w-10 h-10 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity" style={{ backgroundColor: '#2579f2' }}>
                    <Send className="w-5 h-5" />
                  </a>
                  <a href="#" aria-label="Zalo" className="w-10 h-10 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity" style={{ backgroundColor: '#2579f2' }}>
                    <MessageCircle className="w-5 h-5" />
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Liên kết nhanh</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="text-gray-200 hover:text-white transition-colors">Trang chủ</Link></li>
              <li><Link href="/explore" className="text-gray-200 hover:text-white transition-colors">Sản phẩm</Link></li>
              <li><Link href="/auction" className="text-gray-200 hover:text-white transition-colors">Đấu giá</Link></li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Chính sách</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/terms" className="text-gray-200 hover:text-white transition-colors">Điều khoản dịch vụ</Link></li>
              <li><Link href="/privacy" className="text-gray-200 hover:text-white transition-colors">Chính sách bảo mật</Link></li>
              <li><Link href="/refund-policy" className="text-gray-200 hover:text-white transition-colors">Chính sách đổi trả</Link></li>
              <li><Link href="/payment-guide" className="text-gray-200 hover:text-white transition-colors">Hướng dẫn thanh toán</Link></li>
              <li><Link href="/shopping-guide" className="text-gray-200 hover:text-white transition-colors">Hướng dẫn mua hàng</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Liên hệ</h3>
            <ul className="space-y-3 text-sm">
              {telegramBot && (
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#2579f2' }}>
                    <Send className="w-4 h-4" />
                  </div>
                  <a href={telegramLink} target="_blank" rel="noopener noreferrer" className="text-gray-200 hover:text-white">{telegramBot}</a>
                </li>
              )}
              {contactEmail && (
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#2579f2' }}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <a href={`mailto:${contactEmail}`} className="text-gray-200 hover:text-white">{contactEmail}</a>
                </li>
              )}
              {contactPhone && (
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#2579f2' }}>
                    <Phone className="w-4 h-4" />
                  </div>
                  <a href={`tel:${contactPhone}`} className="text-gray-200 hover:text-white">{contactPhone}</a>
                </li>
              )}
              {contactAddress && (
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#2579f2' }}>
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-gray-200">{contactAddress}</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-blue-400" style={{ backgroundColor: '#084a9e' }}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-200">
            <p>© 2026 {siteName}. Tất cả quyền được bảo lưu.</p>
            <p className="mt-2 md:mt-0">Thiết kế bởi {siteName} Team</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
