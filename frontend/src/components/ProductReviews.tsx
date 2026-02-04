'use client';

import { useState, useEffect } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { Button } from './ui/button';

interface ReviewBuyer {
  name: string;
  avatar: string | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  buyer: ReviewBuyer;
  sellerResponse?: string | null;
  sellerRespondedAt?: string | null;
}

interface RatingBreakdown {
  star: number;
  count: number;
}

interface RatingStats {
  average: number;
  total: number;
  breakdown: RatingBreakdown[];
}

interface ProductReviewsProps {
  productId: string;
  rating: number;
  totalReviews: number;
}

export function ProductReviews({ productId, rating, totalReviews }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const REVIEWS_PER_PAGE = 10;

  const fetchReviews = async (skip: number = 0, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      const res = await fetch(`/api/products/${productId}/reviews?skip=${skip}&take=${REVIEWS_PER_PAGE}`);
      if (res.ok) {
        const data = await res.json();
        if (append) {
          setReviews(prev => [...prev, ...data.reviews]);
        } else {
          setReviews(data.reviews);
        }
        setRatingStats(data.ratingStats);
        setHasMore(data.reviews.length === REVIEWS_PER_PAGE && skip + data.reviews.length < data.total);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchReviews(0);
    }
  }, [productId]);

  const handleLoadMore = () => {
    const newSkip = (page + 1) * REVIEWS_PER_PAGE;
    setPage(page + 1);
    fetchReviews(newSkip, true);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  // Filter reviews by star rating
  const filteredReviews = filter === 'all' 
    ? reviews 
    : reviews.filter(r => r.rating === parseInt(filter));

  // Calculate percentage for rating distribution
  const getPercentage = (count: number) => {
    if (!ratingStats || ratingStats.total === 0) return 0;
    return Math.round((count / ratingStats.total) * 100);
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-bold mb-6">Đánh giá sản phẩm</h2>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border p-6">
      <h2 className="text-xl font-bold mb-6">Đánh giá sản phẩm</h2>

      {/* Rating Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b">
        {/* Overall Rating */}
        <div className="text-center">
          <div className="text-5xl font-bold text-primary mb-2">
            {ratingStats?.average.toFixed(1) || rating.toFixed(1)}
          </div>
          <div className="flex items-center justify-center gap-1 mb-2">
            {renderStars(Math.round(ratingStats?.average || rating))}
          </div>
          <p className="text-sm text-muted-foreground">
            {ratingStats?.total || totalReviews} đánh giá
          </p>
        </div>

        {/* Rating Distribution */}
        <div className="space-y-2">
          {ratingStats?.breakdown.map((item) => (
            <div key={item.star} className="flex items-center gap-2">
              <span className="text-sm w-12">{item.star} sao</span>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 transition-all duration-300"
                  style={{ width: `${getPercentage(item.count)}%` }}
                />
              </div>
              <span className="text-sm text-muted-foreground w-12 text-right">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['all', '5', '4', '3', '2', '1'].map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {value === 'all' ? 'Tất cả' : `${value} sao`}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <div className="text-center py-12">
          <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {filter === 'all' 
              ? 'Chưa có đánh giá nào cho sản phẩm này'
              : `Chưa có đánh giá ${filter} sao nào`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <div key={review.id} className="pb-4 border-b last:border-b-0">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {review.buyer?.avatar ? (
                    <img
                      src={review.buyer.avatar}
                      alt={review.buyer.name}
                      className="w-full h-full rounded-full object-cover"
                      onError={(e) => {
                        // Hide image and show fallback letter
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <span className={`text-sm font-semibold text-white ${review.buyer?.avatar ? 'hidden' : ''}`}>
                    {review.buyer?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>

                {/* Review Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{review.buyer?.name || 'Người dùng'}</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 mb-2">
                    {renderStars(review.rating)}
                  </div>

                  {review.comment && (
                    <p className="text-sm mb-2 text-gray-700">{review.comment}</p>
                  )}

                  {/* Seller Response */}
                  {review.sellerResponse && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">
                        Phản hồi từ Shop • {review.sellerRespondedAt && new Date(review.sellerRespondedAt).toLocaleDateString('vi-VN')}
                      </p>
                      <p className="text-sm text-gray-700">{review.sellerResponse}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && filteredReviews.length > 0 && filter === 'all' && (
        <div className="text-center mt-6">
          <Button 
            variant="outline" 
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang tải...
              </>
            ) : (
              'Xem thêm đánh giá'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
