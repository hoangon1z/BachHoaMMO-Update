'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Eye,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Send,
  User,
  Clock,
  Tag,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import {
  BlogPost,
  BlogComment,
  getPostBySlug,
  getPostComments,
  toggleLike,
  toggleBookmark,
  addComment,
  deleteComment,
  getPopularPosts,
} from '@/lib/blog-api';
import { BlogCard } from '@/components/blog/BlogCard';

export default function BlogDetailPage() {
  const params = useParams();
  const router = useRouter();
    const { user, token, logout } = useAuthStore();
  const slug = params.slug as string;

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleSearch = (query: string) => {
    router.push(`/explore?q=${encodeURIComponent(query)}`);
  };

  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  
  // Comments state
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    loadPost();
    loadRelatedPosts();
  }, [slug, token]);

  useEffect(() => {
    if (post) {
      loadComments();
    }
  }, [post?.id]);

  const loadPost = async () => {
    setIsLoading(true);
    try {
      const data = await getPostBySlug(slug, token || undefined);
      setPost(data);
    } catch (error) {
      console.error('Error loading post:', error);
      router.push('/blogs');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRelatedPosts = async () => {
    try {
      const posts = await getPopularPosts(4);
      setRelatedPosts(posts.filter(p => p.slug !== slug));
    } catch (error) {
      console.error('Error loading related posts:', error);
    }
  };

  const loadComments = async () => {
    if (!post) return;
    try {
      const data = await getPostComments(post.id);
      setComments(data.comments);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleLike = async () => {
    if (!token) {
      router.push('/login');
      return;
    }
    if (!post || isLiking) return;

    setIsLiking(true);
    try {
      const result = await toggleLike(post.id, token);
      setPost({
        ...post,
        isLiked: result.liked,
        likesCount: result.liked ? post.likesCount + 1 : post.likesCount - 1,
      });
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleBookmark = async () => {
    if (!token) {
      router.push('/login');
      return;
    }
    if (!post || isBookmarking) return;

    setIsBookmarking(true);
    try {
      const result = await toggleBookmark(post.id, token);
      setPost({
        ...post,
        isBookmarked: result.bookmarked,
        bookmarksCount: result.bookmarked
          ? post.bookmarksCount + 1
          : post.bookmarksCount - 1,
      });
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      router.push('/login');
      return;
    }
    if (!post || !newComment.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      await addComment(post.id, newComment.trim(), token, replyTo?.id);
      setNewComment('');
      setReplyTo(null);
      // Reload comments
      await loadComments();
      // Update comments count
      setPost({ ...post, commentsCount: post.commentsCount + 1 });
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!token || !post) return;

    try {
      await deleteComment(commentId, token);
      await loadComments();
      // Update comments count
      setPost({ ...post, commentsCount: Math.max(0, post.commentsCount - 1) });
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title,
          text: post?.excerpt,
          url: window.location.href,
        });
      } catch (error) {
        // User cancelled or error
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Đã sao chép link!');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const estimateReadTime = (content: string) => {
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return minutes;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header user={user} onLogout={handleLogout} onSearch={handleSearch} />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8" />
            <div className="aspect-[16/9] bg-gray-200 rounded-xl mb-8" />
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header user={user} onLogout={handleLogout} onSearch={handleSearch} />

      <main className="flex-1">
        <article className="max-w-4xl mx-auto px-4 py-8">
          {/* Back Button */}
          <Link
            href="/blogs"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại Blog
          </Link>

          {/* Header */}
          <header className="mb-8">
            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/blogs?tag=${tag}`}
                    className="px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded-full hover:bg-blue-100 transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {post.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(post.publishedAt || post.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {estimateReadTime(post.content)} phút đọc
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {post.views} lượt xem
              </span>
            </div>

            {/* Author */}
            <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
              {post.author?.avatar ? (
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-lg font-semibold">
                  {(post.author?.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <Link
                  href={`/shop/${post.authorId}`}
                  className="font-semibold text-gray-900 hover:text-gray-700"
                >
                  {post.author?.sellerProfile?.shopName || post.author?.name}
                </Link>
                {post.author?.sellerProfile?.isVerified && (
                  <span className="ml-2 text-gray-500 text-sm">Đã xác minh</span>
                )}
                <p className="text-sm text-gray-500">Seller</p>
              </div>
              <Link
                href={`/shop/${post.authorId}`}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Xem shop
              </Link>
            </div>
          </header>

          {/* Cover Image */}
          {post.coverImage && (
            <div className="aspect-[16/9] rounded-xl overflow-hidden mb-8">
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div
            className="prose prose-lg max-w-none mb-8"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Action Bar */}
          <div className="sticky bottom-4 flex items-center justify-center gap-4 p-4 bg-white rounded-full border border-gray-200 shadow w-fit mx-auto">
            <button
              onClick={handleLike}
              disabled={isLiking}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                post.isLiked
                  ? 'bg-red-50 text-red-500'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-current' : ''}`} />
              <span className="font-medium">{post.likesCount}</span>
            </button>

            <button
              onClick={handleBookmark}
              disabled={isBookmarking}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                post.isBookmarked
                  ? 'bg-yellow-50 text-yellow-600'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <Bookmark
                className={`w-5 h-5 ${post.isBookmarked ? 'fill-current' : ''}`}
              />
              <span className="font-medium">{post.bookmarksCount}</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <Share2 className="w-5 h-5" />
              <span className="font-medium">Chia sẻ</span>
            </button>
          </div>

          {/* Comments Section */}
          <section className="mt-12 pt-8 border-t">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <MessageCircle className="w-6 h-6" />
              Bình luận ({post.commentsCount})
            </h2>

            {/* Comment Form */}
            <form onSubmit={handleSubmitComment} className="mb-8">
              {replyTo && (
                <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                  <span>Đang trả lời {replyTo.name}</span>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className="text-red-500 hover:underline"
                  >
                    Hủy
                  </button>
                </div>
              )}
              <div className="flex gap-3">
                {user ? (
                  user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold flex-shrink-0">
                      {(user.name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={
                      user
                        ? 'Viết bình luận của bạn...'
                        : 'Đăng nhập để bình luận'
                    }
                    disabled={!user}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 disabled:bg-gray-50"
                    rows={3}
                  />
                  <div className="flex justify-end mt-2">
                    <Button
                      type="submit"
                      disabled={!user || !newComment.trim() || isSubmittingComment}
                      className="gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {isSubmittingComment ? 'Đang gửi...' : 'Gửi bình luận'}
                    </Button>
                  </div>
                </div>
              </div>
            </form>

            {/* Comments List */}
            {comments && comments.length > 0 ? (
              <div className="space-y-6">
                {comments.map((comment: BlogComment) => (
                  <div key={comment.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex gap-3">
                      {comment.author?.avatar ? (
                        <img
                          src={comment.author.avatar}
                          alt={comment.author.name}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold flex-shrink-0 text-sm">
                          {(comment.author?.name || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {comment.author?.name || 'Unknown'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-gray-700">{comment.content}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <button
                            onClick={() =>
                              setReplyTo({
                                id: comment.id,
                                name: comment.author?.name || 'Unknown',
                              })
                            }
                            className="text-sm text-gray-500 hover:text-gray-900"
                          >
                            Trả lời
                          </button>
                          {(user?.id === comment.authorId ||
                            user?.id === post.authorId) && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-sm text-red-500 hover:text-red-600"
                            >
                              Xóa
                            </button>
                          )}
                        </div>

                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-4 space-y-4 pl-4 border-l-2 border-gray-100">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="flex gap-3">
                                {reply.author?.avatar ? (
                                  <img
                                    src={reply.author.avatar}
                                    alt={reply.author.name}
                                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-semibold flex-shrink-0">
                                    {(reply.author?.name || 'U').charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm text-gray-900">
                                      {reply.author?.name || 'Unknown'}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {formatDate(reply.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700">
                                    {reply.content}
                                  </p>
                                  {(user?.id === reply.authorId ||
                                    user?.id === post.authorId) && (
                                    <button
                                      onClick={() => handleDeleteComment(reply.id)}
                                      className="text-xs text-red-500 hover:text-red-600 mt-1"
                                    >
                                      Xóa
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Chưa có bình luận nào</p>
                <p className="text-sm text-gray-400">
                  Hãy là người đầu tiên bình luận!
                </p>
              </div>
            )}
          </section>
        </article>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="bg-white border-t py-12">
            <div className="max-w-7xl mx-auto px-4">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Bài viết liên quan
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedPosts.slice(0, 3).map((relatedPost) => (
                  <BlogCard key={relatedPost.id} post={relatedPost} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
