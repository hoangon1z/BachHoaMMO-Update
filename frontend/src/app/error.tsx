'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Application error:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Đã xảy ra lỗi</h2>
                <p className="text-gray-500 mb-6">
                    Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại hoặc quay về trang chủ.
                </p>
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={reset}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Thử lại
                    </button>
                    <a
                        href="/"
                        className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-medium transition-colors"
                    >
                        <Home className="w-4 h-4" />
                        Trang chủ
                    </a>
                </div>
            </div>
        </div>
    );
}
