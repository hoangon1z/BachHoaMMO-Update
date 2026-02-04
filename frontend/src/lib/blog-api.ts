import { API_BASE_URL } from './config';

export interface BlogAuthor {
  id: string;
  name: string;
  avatar?: string;
  sellerProfile?: {
    shopName: string;
    shopLogo?: string;
    isVerified: boolean;
  };
}

export interface BlogPost {
  id: string;
  authorId: string;
  author: BlogAuthor;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  coverImage?: string;
  tags: string[];
  category?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt?: string;
  views: number;
  likesCount: number;
  commentsCount: number;
  bookmarksCount: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: string;
  updatedAt: string;
  isLiked?: boolean;
  isBookmarked?: boolean;
}

export interface BlogComment {
  id: string;
  postId: string;
  authorId: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  parentId?: string;
  replies?: BlogComment[];
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BlogQueryParams {
  search?: string;
  category?: string;
  tag?: string;
  authorId?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

// ============================================
// PUBLIC API (no auth required)
// ============================================

export async function getPublicPosts(params?: BlogQueryParams): Promise<{
  posts: BlogPost[];
  pagination: BlogPagination;
}> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.append('search', params.search);
  if (params?.category) searchParams.append('category', params.category);
  if (params?.tag) searchParams.append('tag', params.tag);
  if (params?.authorId) searchParams.append('authorId', params.authorId);
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);

  const response = await fetch(`${API_BASE_URL}/blog/posts?${searchParams}`);
  if (!response.ok) throw new Error('Failed to fetch posts');
  return response.json();
}

export async function getPostBySlug(slug: string, token?: string): Promise<BlogPost> {
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/blog/posts/slug/${slug}`, {
    headers,
  });
  if (!response.ok) throw new Error('Post not found');
  return response.json();
}

export async function getPopularPosts(limit = 6): Promise<BlogPost[]> {
  const response = await fetch(`${API_BASE_URL}/blog/posts/popular?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch popular posts');
  return response.json();
}

export async function getCategories(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/blog/categories`);
  if (!response.ok) throw new Error('Failed to fetch categories');
  return response.json();
}

export async function getTags(): Promise<{ tag: string; count: number }[]> {
  const response = await fetch(`${API_BASE_URL}/blog/tags`);
  if (!response.ok) throw new Error('Failed to fetch tags');
  return response.json();
}

export async function getPostComments(
  postId: string,
  page = 1,
  limit = 20
): Promise<{ comments: BlogComment[]; pagination: BlogPagination }> {
  const response = await fetch(
    `${API_BASE_URL}/blog/posts/${postId}/comments?page=${page}&limit=${limit}`
  );
  if (!response.ok) throw new Error('Failed to fetch comments');
  return response.json();
}

// ============================================
// AUTHENTICATED API
// ============================================

export async function toggleLike(
  postId: string,
  token: string
): Promise<{ liked: boolean }> {
  const response = await fetch(`${API_BASE_URL}/blog/posts/${postId}/like`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to toggle like');
  return response.json();
}

export async function toggleBookmark(
  postId: string,
  token: string
): Promise<{ bookmarked: boolean }> {
  const response = await fetch(`${API_BASE_URL}/blog/posts/${postId}/bookmark`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to toggle bookmark');
  return response.json();
}

export async function getBookmarkedPosts(
  token: string,
  params?: BlogQueryParams
): Promise<{ posts: BlogPost[]; pagination: BlogPagination }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());

  const response = await fetch(`${API_BASE_URL}/blog/bookmarks?${searchParams}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to fetch bookmarks');
  return response.json();
}

export async function addComment(
  postId: string,
  content: string,
  token: string,
  parentId?: string
): Promise<BlogComment> {
  const response = await fetch(`${API_BASE_URL}/blog/posts/${postId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content, parentId }),
  });
  if (!response.ok) throw new Error('Failed to add comment');
  return response.json();
}

export async function deleteComment(
  commentId: string,
  token: string
): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/blog/comments/${commentId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to delete comment');
  return response.json();
}

// ============================================
// SELLER API (for authors)
// ============================================

export async function getMyPosts(
  token: string,
  params?: BlogQueryParams
): Promise<{ posts: BlogPost[]; pagination: BlogPagination }> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.append('status', params.status);
  if (params?.search) searchParams.append('search', params.search);
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());

  const response = await fetch(`${API_BASE_URL}/blog/my-posts?${searchParams}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to fetch my posts');
  return response.json();
}

export async function getMyPost(postId: string, token: string): Promise<BlogPost> {
  const response = await fetch(`${API_BASE_URL}/blog/my-posts/${postId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to fetch post');
  return response.json();
}

export async function createPost(
  data: {
    title: string;
    excerpt?: string;
    content: string;
    coverImage?: string;
    tags?: string[];
    category?: string;
    status?: 'DRAFT' | 'PUBLISHED';
    metaTitle?: string;
    metaDescription?: string;
  },
  token: string
): Promise<BlogPost> {
  const response = await fetch(`${API_BASE_URL}/blog/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create post');
  }
  return response.json();
}

export async function updatePost(
  postId: string,
  data: {
    title?: string;
    excerpt?: string;
    content?: string;
    coverImage?: string;
    tags?: string[];
    category?: string;
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    metaTitle?: string;
    metaDescription?: string;
  },
  token: string
): Promise<BlogPost> {
  const response = await fetch(`${API_BASE_URL}/blog/posts/${postId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update post');
  }
  return response.json();
}

export async function deletePost(
  postId: string,
  token: string
): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/blog/posts/${postId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to delete post');
  return response.json();
}
