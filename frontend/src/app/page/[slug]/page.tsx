'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, FileX } from 'lucide-react';

interface PageData {
    id: string;
    slug: string;
    title: string;
    content: string;
    description?: string;
    updatedAt: string;
}

export default function DynamicPage() {
    const params = useParams();
    const slug = params.slug as string;
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const [page, setPage] = useState<PageData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!slug) return;
        const fetchPage = async () => {
            try {
                const res = await fetch(`/api/pages/${slug}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setPage(data.page);
                    } else {
                        setNotFound(true);
                    }
                } else {
                    setNotFound(true);
                }
            } catch {
                setNotFound(true);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPage();
    }, [slug]);

    const handleLogout = () => { logout(); router.push('/'); };
    const handleSearch = (q: string) => router.push(`/explore?q=${encodeURIComponent(q)}`);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header user={user} onLogout={handleLogout} onSearch={handleSearch} />
                <div className="max-w-2xl mx-auto px-4 py-20 text-center">
                    <FileX className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Trang không tồn tại</h1>
                    <p className="text-gray-500 mb-6">Trang bạn tìm kiếm không tồn tại hoặc đã bị gỡ.</p>
                    <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                        <ArrowLeft className="w-4 h-4" /> Về trang chủ
                    </Link>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header user={user} onLogout={handleLogout} onSearch={handleSearch} />

            <main className="page-wrapper py-6 sm:py-8">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm mb-6">
                    <Link href="/" className="text-gray-500 hover:text-blue-600 transition-colors">Trang chủ</Link>
                    <span className="text-gray-300">/</span>
                    <span className="text-gray-900 font-medium">{page?.title}</span>
                </nav>

                {/* Content card */}
                <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                    {/* Title header */}
                    <div className="px-6 sm:px-8 py-6 border-b border-gray-100">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{page?.title}</h1>
                        {page?.updatedAt && (
                            <p className="text-sm text-gray-400 mt-1">
                                Cập nhật: {new Date(page.updatedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </p>
                        )}
                    </div>

                    {/* HTML content */}
                    <div
                        className="px-6 sm:px-8 py-6 prose prose-sm sm:prose max-w-none text-gray-600 leading-relaxed
              prose-headings:font-bold prose-headings:text-gray-900
              prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
              prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
              prose-p:my-2 prose-a:text-blue-600
              prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5
              prose-li:my-0.5
              prose-blockquote:border-l-2 prose-blockquote:border-blue-400 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-500
              prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-4
              prose-code:bg-gray-100 prose-code:px-1.5 prose-code:rounded prose-code:text-[13px]
              prose-img:rounded-lg prose-img:my-4
              prose-table:border-collapse prose-table:border prose-table:border-gray-200
              prose-th:bg-gray-50 prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:border prose-th:border-gray-200
              prose-td:px-4 prose-td:py-2 prose-td:border prose-td:border-gray-200
              prose-strong:text-gray-900
              [&>section]:mb-6 [&>section]:p-5 [&>section]:bg-gray-50 [&>section]:rounded-lg"
                        dangerouslySetInnerHTML={{ __html: page?.content || '' }}
                    />
                </div>

                {/* Back link */}
                <div className="mt-6">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Quay lại trang chủ
                    </Link>
                </div>
            </main>

            <Footer />
        </div>
    );
}
