'use client';

import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

function getImageUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/uploads')) return `${API_BASE_URL}${url}`;
    return url;
}

interface CategoryShowcase {
    id: string;
    title: string;
    image: string;
    link: string;
    position: number;
    isActive: boolean;
}

interface CategoryShowcaseGridProps {
    showcases: CategoryShowcase[];
}

export function CategoryShowcaseGrid({ showcases }: CategoryShowcaseGridProps) {
    if (!showcases || showcases.length === 0) return null;

    return (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {showcases.map((item) => (
                <Link
                    key={item.id}
                    href={item.link}
                    className="group block relative rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
                    style={{ aspectRatio: '568 / 296' }}
                >
                    <img
                        src={getImageUrl(item.image)}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                    />
                    {/* Subtle gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Link>
            ))}
        </div>
    );
}
