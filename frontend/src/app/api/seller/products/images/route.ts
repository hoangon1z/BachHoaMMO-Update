import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

/**
 * Proxy seller product image upload to backend (multipart/form-data).
 * Frontend calls POST /api/seller/products/images → backend POST /seller/products/images
 */
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('image');
        if (!file || !(file instanceof Blob)) {
            return NextResponse.json({ message: 'Vui lòng chọn file ảnh' }, { status: 400 });
        }

        const backendFormData = new FormData();
        backendFormData.append('image', file);

        const response = await fetch(`${BACKEND_URL}/seller/products/images`, {
            method: 'POST',
            headers: {
                Authorization: authHeader,
                // Do NOT set Content-Type - FormData sets it with boundary
            },
            body: backendFormData,
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            return NextResponse.json(
                { message: data.message || 'Có lỗi xảy ra khi tải ảnh lên' },
                { status: response.status }
            );
        }

        // Return relative path - Next.js rewrites in next.config.js 
        // will proxy /uploads/* requests to the backend automatically
        const imageUrl = data.imageUrl || '';
        return NextResponse.json({
            ...data,
            imageUrl,
        });
    } catch (error) {
        console.error('[API] Product image upload error:', error);
        return NextResponse.json(
            { message: 'Có lỗi xảy ra, vui lòng thử lại' },
            { status: 500 }
        );
    }
}
