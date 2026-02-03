import { NextRequest, NextResponse } from 'next/server';

// Extract Facebook username/ID from URL
function extractFacebookId(url: string): string | null {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    
    // Format: facebook.com/profile.php?id=100000000000
    const idParam = urlObj.searchParams.get('id');
    if (idParam && /^\d+$/.test(idParam)) return idParam;
    
    // Format: facebook.com/username
    const pathParts = urlObj.pathname.split('/').filter(p => p && p !== 'profile.php');
    if (pathParts.length > 0) {
      const skipPaths = ['pages', 'groups', 'events', 'photos', 'videos', 'posts', 'watch', 'stories', 'reels'];
      const username = pathParts.find(p => !skipPaths.includes(p.toLowerCase()));
      if (username) return username;
    }
    
    return null;
  } catch {
    return null;
  }
}

// Get UID from username using easyme.pro API
async function getUidFromUsername(username: string): Promise<string | null> {
  try {
    // If already a numeric UID, return it
    if (/^\d+$/.test(username)) {
      return username;
    }
    
    // Call easyme.pro API to get UID
    const response = await fetch('https://www.easyme.pro/api/getUid.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify({
        url: `https://www.facebook.com/${username}`
      }),
    });
    
    const data = await response.json();
    
    if (data.status && data.uid) {
      return data.uid;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting UID:', error);
    return null;
  }
}

// Check if Facebook account is live using Graph API
// Trả về data → LIVE, trả về error → DIE
async function checkFacebookLive(uid: string): Promise<{ live: boolean; message: string; name?: string }> {
  try {
    const graphUrl = `https://graph.facebook.com/v3.3/${uid}/picture?redirect=0`;
    
    const response = await fetch(graphUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    const json = await response.json();
    
    if (json.data) {
      return { live: true, message: 'Tài khoản còn hoạt động' };
    }
    
    if (json.error) {
      return { 
        live: false, 
        message: json.error.message || 'Tài khoản không tồn tại hoặc đã bị khóa' 
      };
    }
    
    return { live: false, message: 'Không xác định được trạng thái' };
    
  } catch (error) {
    console.error('Error checking Facebook:', error);
    return { live: false, message: 'Lỗi khi kiểm tra' };
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ live: false, message: 'URL không hợp lệ' });
  }

  try {
    // Extract username/ID from URL
    const fbId = extractFacebookId(url);
    
    if (!fbId) {
      return NextResponse.json({ 
        live: false, 
        message: 'Không thể xác định username/ID từ URL' 
      });
    }

    // Get UID (if it's a username, convert to UID first)
    let uid = fbId;
    
    if (!/^\d+$/.test(fbId)) {
      // It's a username, need to get UID
      const resolvedUid = await getUidFromUsername(fbId);
      
      if (!resolvedUid) {
        return NextResponse.json({ 
          live: false, 
          message: 'Không tìm thấy UID - Username có thể không tồn tại' 
        });
      }
      
      uid = resolvedUid;
    }

    // Check if account is live
    const result = await checkFacebookLive(uid);
    
    return NextResponse.json({
      ...result,
      uid: uid,
    });
    
  } catch (error) {
    console.error('Error in check-fb API:', error);
    return NextResponse.json({ 
      live: false, 
      message: 'Lỗi hệ thống - thử lại sau' 
    });
  }
}
