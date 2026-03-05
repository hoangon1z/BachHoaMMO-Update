'use client';

import Link from 'next/link';
import { Home, Search, ArrowLeft, AlertCircle } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="max-w-lg w-full text-center">
                {/* 404 Number */}
                <div className="mb-6">
                    <h1 className="text-[120px] sm:text-[160px] font-bold text-gray-200 leading-none select-none">
                        404
                    </h1>
                </div>

                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-blue-600" />
                    </div>
                </div>

                {/* Message */}
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3">
                    Không tìm thấy trang
                </h2>
                <p className="text-gray-500 mb-8">
                    Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Home className="w-4 h-4" />
                        Về Trang Chủ
                    </Link>
                    <Link
                        href="/explore"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                        <Search className="w-4 h-4" />
                        Khám Phá
                    </Link>
                </div>

                {/* Popular Links */}
                <div className="bg-white rounded-xl p-5 border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">
                        Có thể bạn quan tâm
                    </h3>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {[
                            { name: 'Netflix', href: '/explore?q=netflix' },
                            { name: 'Spotify', href: '/explore?q=spotify' },
                            { name: 'Canva Pro', href: '/explore?q=canva' },
                            { name: 'ChatGPT', href: '/explore?q=chatgpt' },
                        ].map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md text-sm hover:bg-gray-200 transition-colors"
                            >
                                {item.name}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Back Link */}
                <button
                    onClick={() => typeof window !== 'undefined' && window.history.back()}
                    className="mt-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Quay lại
                </button>

                {/* Support Link */}
                <p className="mt-8 text-xs text-gray-400">
                    Cần hỗ trợ?{' '}
                    <Link href="/messages" className="text-blue-600 hover:underline">
                        Liên hệ chúng tôi
                    </Link>
                </p>
            </div>
        </div>
    );
}
