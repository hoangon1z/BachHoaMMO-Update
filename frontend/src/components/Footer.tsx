'use client';

import Link from 'next/link';
import { Mail, Facebook, MessageCircle, Send, Phone, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';

interface FooterLink {
  label: string;
  href: string;
}

interface SiteSettings {
  social: { facebook: string; telegram: string; zalo: string; zaloDisplay?: string };
  contact: { email: string; phone: string; address: string };
  site: { name: string; description: string; telegramBot: string };
  footer?: { quickLinks: FooterLink[]; policyLinks: FooterLink[]; description: string };
}

// Default fallbacks
const DEFAULT_QUICK_LINKS: FooterLink[] = [
  { label: 'Trang chủ', href: '/' },
  { label: 'Sản phẩm', href: '/explore' },
  { label: 'Đấu giá', href: '/auction' },
];

const DEFAULT_POLICY_LINKS: FooterLink[] = [
  { label: 'Điều khoản', href: '/page/terms' },
  { label: 'Bảo mật', href: '/page/privacy' },
  { label: 'Đổi trả', href: '/page/refund-policy' },
  { label: 'Thanh toán', href: '/page/payment-guide' },
  { label: 'Mua hàng', href: '/page/shopping-guide' },
];

export function Footer() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    fetch('/api/settings/site')
      .then(res => res.json())
      .then(data => { if (data.success) setSettings(data.settings); })
      .catch(() => { });
  }, []);

  const siteName = settings?.site?.name || 'BachHoaMMO';
  const footerDesc = settings?.footer?.description || 'Nền tảng mua bán tài khoản, dịch vụ game uy tín hàng đầu Việt Nam. Giao dịch an toàn, nhanh chóng và bảo mật.';
  const facebookLink = settings?.social?.facebook || '#';
  const telegramLink = settings?.social?.telegram || 'https://t.me/bachhoammobot';
  const zaloLink = settings?.social?.zalo || '#';
  const zaloDisplay = settings?.social?.zaloDisplay || '';
  const contactEmail = settings?.contact?.email || 'support@bachhoammo.store';
  const contactPhone = settings?.contact?.phone || '';
  const contactAddress = settings?.contact?.address || '';

  const quickLinks = settings?.footer?.quickLinks?.length ? settings.footer.quickLinks : DEFAULT_QUICK_LINKS;
  const policyLinks = settings?.footer?.policyLinks?.length ? settings.footer.policyLinks : DEFAULT_POLICY_LINKS;

  const socialLinks = [
    facebookLink && facebookLink !== '#' && { href: facebookLink, icon: Facebook, label: 'Facebook' },
    telegramLink && telegramLink !== '#' && { href: telegramLink, icon: Send, label: 'Telegram' },
    zaloLink && zaloLink !== '#' && { href: zaloLink, icon: MessageCircle, label: 'Zalo' },
  ].filter(Boolean) as { href: string; icon: any; label: string }[];

  const displaySocials = socialLinks.length > 0 ? socialLinks : [
    { href: '#', icon: Facebook, label: 'Facebook' },
    { href: '#', icon: Send, label: 'Telegram' },
    { href: '#', icon: MessageCircle, label: 'Zalo' },
  ];

  const contactItems = [
    telegramLink && telegramLink !== '#' && { icon: Send, text: '@' + telegramLink.replace(/^https?:\/\/(t\.me|telegram\.me)\//, ''), href: telegramLink },
    zaloLink && zaloLink !== '#' && { icon: MessageCircle, text: 'Zalo: ' + (zaloDisplay || zaloLink.replace(/^https?:\/\/(zalo\.me|chat\.zalo\.me)\//, '')), href: zaloLink },
    contactEmail && { icon: Mail, text: contactEmail, href: `mailto:${contactEmail}` },
    contactPhone && { icon: Phone, text: contactPhone, href: `tel:${contactPhone}` },
    contactAddress && { icon: MapPin, text: contactAddress },
  ].filter(Boolean) as { icon: any; text: string; href?: string }[];

  const isExternal = (href: string) => href.startsWith('http');

  return (
    <footer className="text-white" style={{ backgroundColor: '#0a59cc' }}>
      <div className="page-wrapper">

        {/* Main content */}
        <div className="py-8 sm:py-10">
          {/* Brand + Socials */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
            <div className="max-w-md">
              <h2 className="text-lg font-bold mb-1.5">{siteName}</h2>
              <p className="text-[13px] text-blue-200 leading-relaxed">{footerDesc}</p>
            </div>
            <div className="flex gap-2">
              {displaySocials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-9 h-9 rounded-lg flex items-center justify-center hover:scale-110 transition-transform"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                >
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8">
            {/* Quick Links */}
            <div>
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-blue-200 mb-3">Liên kết</h3>
              <ul className="space-y-1.5">
                {quickLinks.map((l, i) => (
                  <li key={i}>
                    {isExternal(l.href) ? (
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-[13px] text-blue-100 hover:text-white transition-colors">
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className="text-[13px] text-blue-100 hover:text-white transition-colors">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Policies */}
            <div>
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-blue-200 mb-3">Chính sách</h3>
              <ul className="space-y-1.5">
                {policyLinks.map((l, i) => (
                  <li key={i}>
                    {isExternal(l.href) ? (
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-[13px] text-blue-100 hover:text-white transition-colors">
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className="text-[13px] text-blue-100 hover:text-white transition-colors">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className="col-span-2 sm:col-span-1">
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-blue-200 mb-3">Liên hệ</h3>
              <ul className="space-y-2">
                {contactItems.map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <item.icon className="w-3.5 h-3.5 text-blue-300 flex-shrink-0" />
                    {item.href ? (
                      <a href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="text-[13px] text-blue-100 hover:text-white transition-colors truncate">
                        {item.text}
                      </a>
                    ) : (
                      <span className="text-[13px] text-blue-100 truncate">{item.text}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-blue-500/30 py-4 flex flex-col sm:flex-row justify-between items-center gap-1">
          <p className="text-[12px] text-blue-300">© 2026 {siteName}. Tất cả quyền được bảo lưu.</p>
          <p className="text-[12px] text-blue-400">Thiết kế bởi {siteName} Team</p>
        </div>
      </div>
    </footer>
  );
}
