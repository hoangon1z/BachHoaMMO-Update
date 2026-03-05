'use client';

import { useState } from 'react';
import { Package } from 'lucide-react';

interface ProductGalleryProps {
    images: string[];
    title: string;
    discount?: number;
}

export function ProductGallery({ images, title, discount }: ProductGalleryProps) {
    const [selectedImage, setSelectedImage] = useState(0);

    return (
        <div>
            {/* Main image */}
            <div className="relative aspect-square bg-gray-50 overflow-hidden">
                {images[selectedImage] ? (
                    <img
                        src={images[selectedImage]}
                        alt={title}
                        className="w-full h-full object-contain transition-opacity duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-16 h-16 text-gray-200" />
                    </div>
                )}
                {discount !== undefined && discount > 0 && (
                    <span className="absolute top-3 left-3 px-2 py-0.5 bg-red-500 text-white text-[11px] font-bold rounded">
                        -{discount}%
                    </span>
                )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
                <div className="flex gap-1.5 p-3 overflow-x-auto scrollbar-hide">
                    {images.map((img, idx) => (
                        <button
                            key={idx}
                            onClick={() => setSelectedImage(idx)}
                            className={`w-14 h-14 rounded overflow-hidden flex-shrink-0 transition-all
                ${selectedImage === idx
                                    ? 'ring-2 ring-blue-500 ring-offset-1'
                                    : 'opacity-60 hover:opacity-100'
                                }`}
                        >
                            <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
