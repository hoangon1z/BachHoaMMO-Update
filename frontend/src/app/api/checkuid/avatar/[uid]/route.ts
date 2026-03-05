import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ uid: string }> }
) {
    const { uid } = await context.params;

    try {
        const response = await fetch(`${BACKEND_URL}/checkuid/avatar/${uid}`, {
            timeout: 30000,
        } as any);

        if (!response.ok) {
            return NextResponse.redirect(
                `https://ui-avatars.com/api/?name=${uid.slice(0, 2)}&background=dbeafe&color=3b82f6&size=200`
            );
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';

        // If it's a redirect (placeholder), forward it
        if (response.redirected) {
            return NextResponse.redirect(response.url);
        }

        const buffer = await response.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (error) {
        return NextResponse.redirect(
            `https://ui-avatars.com/api/?name=${uid.slice(0, 2)}&background=dbeafe&color=3b82f6&size=200`
        );
    }
}
