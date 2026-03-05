'use client';

import { useEffect, useState } from 'react';
import { X, Megaphone, AlertTriangle, CheckCircle, Sparkles, ExternalLink } from 'lucide-react';

interface AnnouncementData {
    enabled: boolean;
    text: string;
    link: string;
    type: 'info' | 'warning' | 'success' | 'promo';
}

const TYPE_STYLES: Record<string, { bg: string; border: string; text: string; icon: any; iconColor: string }> = {
    info: {
        bg: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700',
        border: 'border-blue-400/20',
        text: 'text-white',
        icon: Megaphone,
        iconColor: 'text-blue-200',
    },
    warning: {
        bg: 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600',
        border: 'border-amber-400/20',
        text: 'text-white',
        icon: AlertTriangle,
        iconColor: 'text-amber-200',
    },
    success: {
        bg: 'bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600',
        border: 'border-emerald-400/20',
        text: 'text-white',
        icon: CheckCircle,
        iconColor: 'text-emerald-200',
    },
    promo: {
        bg: 'bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500',
        border: 'border-purple-400/20',
        text: 'text-white',
        icon: Sparkles,
        iconColor: 'text-pink-200',
    },
};

export function AnnouncementBar() {
    const [announcement, setAnnouncement] = useState<AnnouncementData | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if dismissed this session
        const dismissedKey = sessionStorage.getItem('announcement_dismissed');
        if (dismissedKey) {
            setDismissed(true);
        }

        fetch('/api/settings/site')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.settings?.announcement) {
                    const ann = data.settings.announcement;
                    if (ann.enabled && ann.text?.trim()) {
                        setAnnouncement(ann);
                        // Check if this announcement has changed since last dismissal
                        const lastDismissedText = sessionStorage.getItem('announcement_dismissed_text');
                        if (lastDismissedText !== ann.text) {
                            setDismissed(false);
                            sessionStorage.removeItem('announcement_dismissed');
                        }
                        // Small delay for entrance animation
                        setTimeout(() => setIsVisible(true), 50);
                    }
                }
            })
            .catch(() => { });
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        setTimeout(() => {
            setDismissed(true);
            sessionStorage.setItem('announcement_dismissed', 'true');
            if (announcement?.text) {
                sessionStorage.setItem('announcement_dismissed_text', announcement.text);
            }
        }, 300);
    };

    if (!announcement || !announcement.enabled || !announcement.text?.trim() || dismissed) {
        return null;
    }

    const style = TYPE_STYLES[announcement.type] || TYPE_STYLES.info;
    const IconComp = style.icon;

    const content = (
        <span className="flex items-center gap-2">
            <span className="font-medium">{announcement.text}</span>
            {announcement.link && (
                <ExternalLink className="w-3 h-3 opacity-70 flex-shrink-0" />
            )}
        </span>
    );

    return (
        <div
            className={`relative overflow-hidden transition-all duration-300 ${style.bg} ${style.border} border-b ${isVisible ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'
                }`}
        >
            {/* Decorative elements */}
            <div className="absolute left-0 top-0 w-20 h-full bg-white/5 -skew-x-12 transform" />
            <div className="absolute right-16 top-0 w-10 h-full bg-white/5 -skew-x-12 transform" />

            <div className="page-wrapper relative">
                <div className="flex items-center justify-center py-2 px-8">
                    {/* Icon */}
                    <IconComp className={`w-4 h-4 ${style.iconColor} mr-2 flex-shrink-0 animate-pulse`} />

                    {/* Content */}
                    {announcement.link ? (
                        <a
                            href={announcement.link}
                            target={announcement.link.startsWith('http') ? '_blank' : undefined}
                            rel="noopener noreferrer"
                            className={`text-xs sm:text-sm ${style.text} hover:opacity-90 transition-opacity truncate`}
                        >
                            {content}
                        </a>
                    ) : (
                        <span className={`text-xs sm:text-sm ${style.text} truncate`}>
                            {content}
                        </span>
                    )}

                    {/* Dismiss button */}
                    <button
                        onClick={handleDismiss}
                        className="absolute right-2 sm:right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
                        aria-label="Đóng thông báo"
                    >
                        <X className={`w-3.5 h-3.5 ${style.text} opacity-70 hover:opacity-100`} />
                    </button>
                </div>
            </div>
        </div>
    );
}
