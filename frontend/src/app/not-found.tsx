'use client';

import Link from 'next/link';
import { Home, Search, ArrowLeft, ShoppingBag } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
            <div className="max-w-2xl w-full text-center">
                {/* Animated 404 */}
                <div className="relative mb-8">
                    <h1 className="text-[150px] sm:text-[200px] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 leading-none select-none animate-pulse">
                        404
                    </h1>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm flex items-center justify-center animate-bounce">
                            <ShoppingBag className="w-16 h-16 sm:w-20 sm:h-20 text-blue-600" />
                        </div>
                    </div>
                </div>

                {/* Message */}
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                    Oops! Trang không tồn tại
                </h2>
                <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
                    Xin lỗi, trang bạn đang tìm kiếm có thể đã bị xóa, đổi tên hoặc tạm thời không khả dụng.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                        <Home className="w-5 h-5" />
                        Về Trang Chủ
                    </Link>
                    <Link
                        href="/explore"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:text-blue-600 transition-all shadow-md hover:shadow-lg"
                    >
                        <Search className="w-5 h-5" />
                        Khám Phá Sản Phẩm
                    </Link>
                </div>

                {/* Popular Categories */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Danh mục phổ biến
                    </h3>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {[
                            { name: 'Netflix Premium', href: '/explore?q=netflix' },
                            { name: 'Spotify Premium', href: '/explore?q=spotify' },
                            { name: 'CapCut Pro', href: '/explore?q=capcut' },
                            { name: 'Canva Pro', href: '/explore?q=canva' },
                            { name: 'ChatGPT Plus', href: '/explore?q=chatgpt' },
                            { name: 'Gemini AI', href: '/explore?q=gemini' },
                        ].map((category) => (
                            <Link
                                key={category.name}
                                href={category.href}
                                className="px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-full text-sm font-medium hover:from-blue-50 hover:to-purple-50 hover:text-blue-600 transition-all border border-gray-200 hover:border-blue-200"
                            >
                                {category.name}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Back Link */}
                <button
                    onClick={() => typeof window !== 'undefined' && window.history.back()}
                    className="mt-8 inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Quay lại trang trước
                </button>

                {/* Footer */}
                <p className="mt-12 text-sm text-gray-400">
                    Nếu bạn cho rằng đây là lỗi, vui lòng{' '}
                    <Link href="/messages" className="text-blue-600 hover:underline">
                        liên hệ hỗ trợ
                    </Link>
                </p>
            </div>
        </div>
    );
}
