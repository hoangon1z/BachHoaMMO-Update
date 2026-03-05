'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { VerifyBadge } from '@/components/VerifyBadge';
import { Button } from '@/components/ui/button';
import {
    BadgeCheck,
    Shield,
    TrendingUp,
    Star,
    Users,
    ArrowRight,
    CheckCircle,
    Circle,
    Phone,
    Lock,
    Store,
    Package,
    ShoppingBag,
    MessageSquare,
    Loader2,
    Sparkles,
    Eye,
    Heart,
    Award,
    Crown,
    Zap,
    Clock,
    AlertCircle,
    ExternalLink,
} from 'lucide-react';

interface StoreInfo {
    shopName: string;
    shopDescription: string;
    shopLogo: string;
    isVerified: boolean;
    contactPhone: string;
    contactTelegram: string;
    hasWithdrawalPin: boolean;
    totalSales: number;
    rating: number;
    reviewCount: number;
}

export default function SellerVerifiedPage() {
    const { user } = useAuthStore();
    const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchStoreInfo();
    }, []);

    const fetchStoreInfo = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/seller/store', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setStoreInfo(data);
            }
        } catch (error) {
            console.error('Error fetching store info:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate verification progress
    const getProgress = () => {
        if (!storeInfo) return { steps: [], completed: 0, total: 5 };

        const steps = [
            {
                id: 'store',
                label: 'Tạo cửa hàng',
                description: 'Đặt tên và mô tả cửa hàng',
                completed: !!storeInfo.shopName,
                link: '/seller/settings',
                icon: Store,
            },
            {
                id: 'logo',
                label: 'Cập nhật logo',
                description: 'Thêm logo chuyên nghiệp cho cửa hàng',
                completed: !!storeInfo.shopLogo,
                link: '/seller/settings',
                icon: Eye,
            },
            {
                id: 'contact',
                label: 'Thêm thông tin liên lạc',
                description: 'Số điện thoại hoặc Telegram',
                completed: !!(storeInfo.contactPhone || storeInfo.contactTelegram),
                link: '/seller/settings',
                icon: Phone,
            },
            {
                id: 'pin',
                label: 'Thiết lập mã PIN',
                description: 'Mã PIN 6 chữ số bảo mật rút tiền',
                completed: storeInfo.hasWithdrawalPin,
                link: '/seller/settings',
                icon: Lock,
            },
            {
                id: 'products',
                label: 'Đăng sản phẩm',
                description: 'Có ít nhất 1 sản phẩm đang bán',
                completed: (storeInfo.totalSales ?? 0) >= 0, // Has products listed
                link: '/seller/products',
                icon: Package,
            },
        ];

        const completed = steps.filter((s) => s.completed).length;
        return { steps, completed, total: steps.length };
    };

    const progress = getProgress();
    const progressPercent = Math.round((progress.completed / progress.total) * 100);

    if (isLoading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-6 space-y-8 max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-6 sm:p-8 lg:p-10 text-white">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />
                <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                <div className="absolute top-1/4 right-1/3 w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse delay-300" />
                <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-emerald-400 rounded-full animate-pulse delay-700" />

                <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <div className="flex-shrink-0">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                            <VerifyBadge size={56} isVerified={true} />
                        </div>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-5 h-5 text-yellow-400" />
                            <span className="text-xs font-semibold uppercase tracking-widest text-blue-200">Chương trình xác minh</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold mb-3">Tích Xanh Xác Minh</h1>
                        <p className="text-blue-100 text-sm sm:text-base leading-relaxed max-w-xl">
                            Tích xanh là biểu tượng uy tín giúp gian hàng của bạn nổi bật, tăng độ tin cậy
                            và thu hút nhiều khách hàng hơn trên BachHoaMMO.
                        </p>
                    </div>
                </div>

                {/* Verification status banner */}
                {storeInfo && (
                    <div className="relative mt-6 pt-6 border-t border-white/15">
                        <div className="flex items-center gap-3">
                            {storeInfo.isVerified ? (
                                <>
                                    <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-emerald-300">🎉 Gian hàng của bạn đã được cấp tích xanh!</p>
                                        <p className="text-sm text-blue-200">Tích xanh đang hiển thị trên tất cả sản phẩm và trang cửa hàng</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-amber-300">Gian hàng chưa có tích xanh</p>
                                        <p className="text-sm text-blue-200">Hoàn thành các bước bên dưới để đủ điều kiện xét duyệt</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Benefits Section */}
            <div>
                <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Award className="w-4.5 h-4.5 text-blue-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Lợi ích của Tích Xanh</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        {
                            icon: TrendingUp,
                            color: 'blue',
                            title: 'Tăng doanh số bán hàng',
                            description: 'Khách hàng tin tưởng hơn và quyết định mua nhanh hơn khi thấy tích xanh',
                        },
                        {
                            icon: Eye,
                            color: 'emerald',
                            title: 'Nổi bật trên sàn',
                            description: 'Sản phẩm của bạn sẽ hiển thị tích xanh xác minh bên cạnh tên shop, thu hút sự chú ý',
                        },
                        {
                            icon: Shield,
                            color: 'violet',
                            title: 'Xây dựng uy tín',
                            description: 'Tích xanh chứng minh gian hàng đã được BachHoaMMO xác minh và đáng tin cậy',
                        },
                        {
                            icon: Heart,
                            color: 'rose',
                            title: 'Tăng tỷ lệ quay lại',
                            description: 'Khách hàng có xu hướng mua lại nhiều hơn từ các shop có tích xanh',
                        },
                    ].map((benefit, i) => {
                        const colorClasses: Record<string, { bg: string; icon: string; border: string }> = {
                            blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-100' },
                            emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100' },
                            violet: { bg: 'bg-violet-50', icon: 'text-violet-600', border: 'border-violet-100' },
                            rose: { bg: 'bg-rose-50', icon: 'text-rose-600', border: 'border-rose-100' },
                        };
                        const colors = colorClasses[benefit.color];

                        return (
                            <div
                                key={i}
                                className={`${colors.bg} border ${colors.border} rounded-xl p-5 transition-all hover:shadow-sm`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                                        <benefit.icon className={`w-5 h-5 ${colors.icon}`} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 text-sm mb-1">{benefit.title}</h3>
                                        <p className="text-sm text-gray-600 leading-relaxed">{benefit.description}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Where badge appears */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4.5 h-4.5 text-amber-500" />
                        <h2 className="text-base font-bold text-gray-900">Tích xanh hiển thị ở đâu?</h2>
                    </div>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { icon: Package, label: 'Thẻ sản phẩm', desc: 'Trên trang danh sách sản phẩm' },
                            { icon: ShoppingBag, label: 'Chi tiết sản phẩm', desc: 'Ở phần thông tin seller' },
                            { icon: Store, label: 'Trang cửa hàng', desc: 'Bên cạnh tên shop' },
                            { icon: MessageSquare, label: 'Blog & bài viết', desc: 'Ở thông tin tác giả' },
                        ].map((item, i) => (
                            <div key={i} className="text-center p-4 rounded-xl bg-gray-50 border border-gray-100">
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                                    <item.icon className="w-6 h-6 text-blue-600" />
                                </div>
                                <p className="font-semibold text-gray-900 text-sm mb-0.5">{item.label}</p>
                                <p className="text-xs text-gray-500">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Verification Requirements */}
            <div>
                <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <BadgeCheck className="w-4.5 h-4.5 text-emerald-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Điều kiện nhận Tích Xanh</h2>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-6 space-y-4">
                        <p className="text-sm text-gray-600 mb-4">
                            Để được xét duyệt tích xanh, gian hàng của bạn cần đáp ứng các tiêu chí sau.
                            Admin BachHoaMMO sẽ xem xét và cấp tích xanh cho các gian hàng đủ điều kiện.
                        </p>

                        <div className="space-y-3">
                            {[
                                {
                                    title: 'Hoàn thiện thông tin cửa hàng',
                                    details: 'Tên shop, mô tả, logo rõ ràng và chuyên nghiệp',
                                    icon: Store,
                                },
                                {
                                    title: 'Cung cấp thông tin liên lạc',
                                    details: 'Số điện thoại hoặc Telegram để admin liên hệ khi cần',
                                    icon: Phone,
                                },
                                {
                                    title: 'Thiết lập mã PIN bảo mật',
                                    details: 'Tạo mã PIN 6 chữ số để bảo vệ tài khoản khi rút tiền',
                                    icon: Lock,
                                },
                                {
                                    title: 'Có sản phẩm chất lượng',
                                    details: 'Đăng sản phẩm với mô tả rõ ràng, hình ảnh thu hút',
                                    icon: Package,
                                },
                                {
                                    title: 'Hoạt động tích cực',
                                    details: 'Xử lý đơn hàng nhanh chóng, phản hồi khách hàng kịp thời',
                                    icon: Zap,
                                },
                                {
                                    title: 'Đánh giá tốt từ khách hàng',
                                    details: 'Duy trì đánh giá tích cực, giải quyết khiếu nại thỏa đáng',
                                    icon: Star,
                                },
                            ].map((req, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <req.icon className="w-4.5 h-4.5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm">{req.title}</p>
                                        <p className="text-sm text-gray-500 mt-0.5">{req.details}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Tracker */}
            {storeInfo && !storeInfo.isVerified && (
                <div>
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Crown className="w-4.5 h-4.5 text-purple-600" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900">Tiến trình của bạn</h2>
                        </div>
                        <span className="text-sm font-semibold text-purple-600">{progressPercent}%</span>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        {/* Progress bar */}
                        <div className="px-6 pt-5 pb-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-600">
                                    Đã hoàn thành <strong>{progress.completed}/{progress.total}</strong> bước
                                </span>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-700 ease-out"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>

                        {/* Steps */}
                        <div className="px-6 pb-5 space-y-1">
                            {progress.steps.map((step, i) => (
                                <div
                                    key={step.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${step.completed ? 'bg-green-50/60' : 'hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex-shrink-0">
                                        {step.completed ? (
                                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                                <CheckCircle className="w-4.5 h-4.5 text-green-600" />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                                <span className="text-xs font-bold text-gray-400">{i + 1}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p
                                            className={`text-sm font-medium ${step.completed ? 'text-green-800' : 'text-gray-900'
                                                }`}
                                        >
                                            {step.label}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                                    </div>
                                    {!step.completed && (
                                        <Link href={step.link}>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-xs h-8 border-blue-200 text-blue-600 hover:bg-blue-50"
                                            >
                                                Thực hiện
                                                <ArrowRight className="w-3 h-3 ml-1" />
                                            </Button>
                                        </Link>
                                    )}
                                    {step.completed && (
                                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" />
                                            Xong
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* CTA */}
                        {progress.completed === progress.total && (
                            <div className="px-6 pb-6">
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <BadgeCheck className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-blue-900 mb-1">
                                                Bạn đã hoàn thành tất cả các bước! 🎉
                                            </p>
                                            <p className="text-sm text-blue-700 leading-relaxed">
                                                Gian hàng của bạn đã đủ điều kiện cơ bản để được xét duyệt tích xanh.
                                                Admin BachHoaMMO sẽ xem xét gian hàng của bạn trong thời gian sớm nhất.
                                                Hãy tiếp tục duy trì chất lượng dịch vụ để tăng cơ hội được cấp tích xanh!
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Already Verified */}
            {storeInfo?.isVerified && (
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            <VerifyBadge size={48} isVerified={true} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-emerald-900 mb-2">
                                ✅ Gian hàng đã được xác minh
                            </h3>
                            <p className="text-sm text-emerald-700 leading-relaxed mb-3">
                                Chúc mừng! Gian hàng <strong>{storeInfo.shopName}</strong> đã được BachHoaMMO cấp tích xanh xác minh.
                                Tích xanh đang hiển thị bên cạnh tên shop trên tất cả sản phẩm, trang cửa hàng và blog của bạn.
                            </p>
                            <div className="flex flex-wrap gap-4 text-sm">
                                <div className="flex items-center gap-1.5 text-emerald-700">
                                    <Star className="w-4 h-4" />
                                    <span>Đánh giá: <strong>{storeInfo.rating?.toFixed(1) || '0.0'}</strong></span>
                                </div>
                                <div className="flex items-center gap-1.5 text-emerald-700">
                                    <ShoppingBag className="w-4 h-4" />
                                    <span>Đã bán: <strong>{storeInfo.totalSales || 0}</strong></span>
                                </div>
                                <div className="flex items-center gap-1.5 text-emerald-700">
                                    <Users className="w-4 h-4" />
                                    <span>Đánh giá: <strong>{storeInfo.reviewCount || 0}</strong></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* FAQ Section */}
            <div>
                <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                        <AlertCircle className="w-4.5 h-4.5 text-amber-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Câu hỏi thường gặp</h2>
                </div>

                <div className="space-y-3">
                    {[
                        {
                            q: 'Tích xanh có mất phí không?',
                            a: 'Hoàn toàn miễn phí! Tích xanh được admin BachHoaMMO cấp cho các gian hàng đáp ứng đủ tiêu chí. Bạn không cần trả bất kỳ khoản phí nào.',
                        },
                        {
                            q: 'Mất bao lâu để được cấp tích xanh?',
                            a: 'Sau khi hoàn thành các bước cơ bản, admin sẽ xem xét gian hàng của bạn trong vòng 1-3 ngày làm việc. Thời gian có thể nhanh hơn nếu gian hàng có hoạt động tích cực.',
                        },
                        {
                            q: 'Tích xanh có thể bị thu hồi không?',
                            a: 'Có. Nếu gian hàng vi phạm quy định (bán hàng giả, lừa đảo, nhiều khiếu nại) hoặc không duy trì chất lượng dịch vụ, admin có quyền thu hồi tích xanh.',
                        },
                        {
                            q: 'Quỹ bảo hiểm là gì?',
                            a: 'Tooltip của tích xanh hiển thị "Người dùng đã xác minh quỹ bảo hiểm". Điều này nghĩa là gian hàng đã được BachHoaMMO xác minh, đảm bảo độ tin cậy và bảo vệ quyền lợi khách hàng.',
                        },
                        {
                            q: 'Tôi cần làm gì sau khi được cấp tích xanh?',
                            a: 'Hãy tiếp tục duy trì chất lượng dịch vụ: xử lý đơn hàng nhanh, phản hồi khách hàng kịp thời, giữ đánh giá tốt. Tích xanh sẽ giúp bạn thu hút thêm nhiều khách hàng mới.',
                        },
                    ].map((faq, i) => (
                        <details
                            key={i}
                            className="bg-white border border-gray-200 rounded-xl group"
                        >
                            <summary className="px-5 py-4 cursor-pointer text-sm font-semibold text-gray-900 flex items-center gap-3 list-none [&::-webkit-details-marker]:hidden">
                                <span className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-amber-700">
                                    {i + 1}
                                </span>
                                <span className="flex-1">{faq.q}</span>
                                <ArrowRight className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90" />
                            </summary>
                            <div className="px-5 pb-4 pl-14">
                                <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                            </div>
                        </details>
                    ))}
                </div>
            </div>

            {/* Bottom CTA */}
            {storeInfo && !storeInfo.isVerified && (
                <div className="bg-gray-900 rounded-2xl p-6 sm:p-8 text-center">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <VerifyBadge size={40} isVerified={true} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Bắt đầu hành trình nhận tích xanh</h3>
                    <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                        Hoàn thiện thông tin cửa hàng và bắt đầu bán hàng để sớm được cấp tích xanh xác minh
                    </p>
                    <div className="flex items-center justify-center gap-3">
                        <Link href="/seller/settings">
                            <Button className="bg-blue-600 hover:bg-blue-700 h-11 px-6">
                                <Store className="w-4 h-4 mr-2" />
                                Cài đặt cửa hàng
                            </Button>
                        </Link>
                        <Link href="/seller/products/new">
                            <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800 h-11 px-6">
                                <Package className="w-4 h-4 mr-2" />
                                Đăng sản phẩm
                            </Button>
                        </Link>
                    </div>
                </div>
            )}

            {/* Footer note */}
            <div className="text-center pb-4">
                <p className="text-xs text-gray-400">
                    Tích xanh là quyết định của admin BachHoaMMO. Việc hoàn thành các bước không đảm bảo 100% được cấp tích xanh.
                    <br />
                    Liên hệ hỗ trợ nếu bạn có thắc mắc.
                </p>
            </div>
        </div>
    );
}
