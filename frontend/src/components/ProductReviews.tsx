'use client';

import { useState } from 'react';
import { Star, ThumbsUp, MessageCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface Review {
  id: string;
  user: {
    name: string;
    avatar?: string;
  };
  rating: number;
  date: string;
  comment: string;
  images?: string[];
  helpful: number;
}

interface ProductReviewsProps {
  productId: string;
  rating: number;
  totalReviews: number;
}

// Mock reviews
const mockReviews: Review[] = [
  {
    id: '1',
    user: {
      name: 'Nguyễn Văn A',
      avatar: 'https://picsum.photos/seed/user1/50/50',
    },
    rating: 5,
    date: '2024-01-20',
    comment: 'Sản phẩm rất tốt, giao hàng nhanh. Shop tư vấn nhiệt tình. Sẽ ủng hộ thêm!',
    helpful: 12,
  },
  {
    id: '2',
    user: {
      name: 'Trần Thị B',
    },
    rating: 4,
    date: '2024-01-18',
    comment: 'Chất lượng ok, giá hợp lý. Tuy nhiên cần cải thiện thời gian giao hàng.',
    helpful: 5,
  },
  {
    id: '3',
    user: {
      name: 'Lê Văn C',
      avatar: 'https://picsum.photos/seed/user3/50/50',
    },
    rating: 5,
    date: '2024-01-15',
    comment: 'Đã mua nhiều lần, lần nào cũng hài lòng. Recommend!',
    images: ['https://picsum.photos/seed/review1/200/200'],
    helpful: 8,
  },
];

export function ProductReviews({ productId, rating, totalReviews }: ProductReviewsProps) {
  const [reviews] = useState<Review[]>(mockReviews);
  const [filter, setFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');

  const ratingDistribution = [
    { stars: 5, count: 250, percentage: 76 },
    { stars: 4, count: 50, percentage: 15 },
    { stars: 3, count: 20, percentage: 6 },
    { stars: 2, count: 5, percentage: 2 },
    { stars: 1, count: 3, percentage: 1 },
  ];

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

  return (
    <div className="bg-card rounded-lg border p-6">
      <h2 className="text-xl font-bold mb-6">Đánh giá sản phẩm</h2>

      {/* Rating Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b">
        {/* Overall Rating */}
        <div className="text-center">
          <div className="text-5xl font-bold text-primary mb-2">{rating}</div>
          <div className="flex items-center justify-center gap-1 mb-2">
            {renderStars(Math.round(rating))}
          </div>
          <p className="text-sm text-muted-foreground">{totalReviews} đánh giá</p>
        </div>

        {/* Rating Distribution */}
        <div className="space-y-2">
          {ratingDistribution.map((item) => (
            <div key={item.stars} className="flex items-center gap-2">
              <span className="text-sm w-12">{item.stars} sao</span>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400"
                  style={{ width: `${item.percentage}%` }}
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
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          <TabsTrigger value="5">5 sao</TabsTrigger>
          <TabsTrigger value="4">4 sao</TabsTrigger>
          <TabsTrigger value="3">3 sao</TabsTrigger>
          <TabsTrigger value="2">2 sao</TabsTrigger>
          <TabsTrigger value="1">1 sao</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="pb-4 border-b last:border-b-0">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                {review.user.avatar ? (
                  <img
                    src={review.user.avatar}
                    alt={review.user.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-semibold">
                    {review.user.name.charAt(0)}
                  </span>
                )}
              </div>

              {/* Review Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{review.user.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(review.date).toLocaleDateString('vi-VN')}
                  </span>
                </div>

                <div className="flex items-center gap-1 mb-2">
                  {renderStars(review.rating)}
                </div>

                <p className="text-sm mb-2">{review.comment}</p>

                {/* Review Images */}
                {review.images && review.images.length > 0 && (
                  <div className="flex gap-2 mb-2">
                    {review.images.map((img, index) => (
                      <img
                        key={index}
                        src={img}
                        alt={`Review image ${index + 1}`}
                        className="w-20 h-20 object-cover rounded"
                      />
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-4 text-sm">
                  <button className="flex items-center gap-1 text-muted-foreground hover:text-primary">
                    <ThumbsUp className="w-4 h-4" />
                    <span>Hữu ích ({review.helpful})</span>
                  </button>
                  <button className="flex items-center gap-1 text-muted-foreground hover:text-primary">
                    <MessageCircle className="w-4 h-4" />
                    <span>Phản hồi</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      <div className="text-center mt-6">
        <Button variant="outline">Xem thêm đánh giá</Button>
      </div>
    </div>
  );
}
