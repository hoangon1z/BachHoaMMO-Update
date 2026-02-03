'use client';

import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Wrench, Key, Facebook, Copy, Check, RefreshCw, Loader2, 
  AlertCircle, CheckCircle, XCircle, Clock, Shield
} from 'lucide-react';

// TOTP Algorithm Implementation
function generateTOTP(secret: string): { code: string; timeLeft: number } {
  try {
    // Clean and validate secret
    const cleanSecret = secret.replace(/\s/g, '').toUpperCase();
    
    // Base32 decode
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (const char of cleanSecret) {
      const index = base32Chars.indexOf(char);
      if (index === -1) throw new Error('Invalid base32 character');
      bits += index.toString(2).padStart(5, '0');
    }
    
    // Convert bits to bytes
    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.substring(i, i + 8), 2));
    }
    const keyBytes = new Uint8Array(bytes);
    
    // Get current time step (30 seconds)
    const epoch = Math.floor(Date.now() / 1000);
    const timeStep = Math.floor(epoch / 30);
    const timeLeft = 30 - (epoch % 30);
    
    // Convert time to 8 bytes (big endian)
    const timeBytes = new Uint8Array(8);
    let temp = timeStep;
    for (let i = 7; i >= 0; i--) {
      timeBytes[i] = temp & 0xff;
      temp = Math.floor(temp / 256);
    }
    
    // HMAC-SHA1 (simplified - using Web Crypto would be better but this works for demo)
    // For production, use a proper TOTP library
    const hmac = simpleHMACSHA1(keyBytes, timeBytes);
    
    // Dynamic truncation
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code = (
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)
    ) % 1000000;
    
    return {
      code: code.toString().padStart(6, '0'),
      timeLeft
    };
  } catch (error) {
    throw new Error('Invalid secret key');
  }
}

// Simple HMAC-SHA1 implementation
function simpleHMACSHA1(key: Uint8Array, message: Uint8Array): Uint8Array {
  const blockSize = 64;
  
  // Pad or hash key to block size
  let keyBlock = new Uint8Array(blockSize);
  if (key.length > blockSize) {
    keyBlock.set(sha1(key).slice(0, blockSize));
  } else {
    keyBlock.set(key);
  }
  
  // Create inner and outer padding
  const ipad = new Uint8Array(blockSize);
  const opad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    ipad[i] = keyBlock[i] ^ 0x36;
    opad[i] = keyBlock[i] ^ 0x5c;
  }
  
  // Inner hash
  const innerData = new Uint8Array(blockSize + message.length);
  innerData.set(ipad);
  innerData.set(message, blockSize);
  const innerHash = sha1(innerData);
  
  // Outer hash
  const outerData = new Uint8Array(blockSize + 20);
  outerData.set(opad);
  outerData.set(innerHash, blockSize);
  
  return sha1(outerData);
}

// Simple SHA1 implementation
function sha1(data: Uint8Array): Uint8Array {
  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  
  // Pre-processing
  const msgLen = data.length;
  const bitLen = msgLen * 8;
  const padLen = ((msgLen + 8) % 64 < 56) ? 56 - (msgLen + 8) % 64 : 120 - (msgLen + 8) % 64;
  
  const padded = new Uint8Array(msgLen + 1 + padLen + 8);
  padded.set(data);
  padded[msgLen] = 0x80;
  
  // Append length in bits (big endian)
  for (let i = 0; i < 8; i++) {
    padded[padded.length - 1 - i] = (bitLen >>> (i * 8)) & 0xff;
  }
  
  // Process each 512-bit chunk
  for (let chunkStart = 0; chunkStart < padded.length; chunkStart += 64) {
    const w = new Array(80).fill(0);
    
    for (let i = 0; i < 16; i++) {
      w[i] = (padded[chunkStart + i * 4] << 24) |
             (padded[chunkStart + i * 4 + 1] << 16) |
             (padded[chunkStart + i * 4 + 2] << 8) |
             padded[chunkStart + i * 4 + 3];
    }
    
    for (let i = 16; i < 80; i++) {
      w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    }
    
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    
    for (let i = 0; i < 80; i++) {
      let f: number, k: number;
      if (i < 20) {
        f = (b & c) | ((~b) & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      
      const temp = (rotl(a, 5) + f + e + k + w[i]) >>> 0;
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = temp;
    }
    
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }
  
  const result = new Uint8Array(20);
  [h0, h1, h2, h3, h4].forEach((h, i) => {
    result[i * 4] = (h >>> 24) & 0xff;
    result[i * 4 + 1] = (h >>> 16) & 0xff;
    result[i * 4 + 2] = (h >>> 8) & 0xff;
    result[i * 4 + 3] = h & 0xff;
  });
  
  return result;
}

function rotl(n: number, s: number): number {
  return ((n << s) | (n >>> (32 - s))) >>> 0;
}

export default function ToolsPage() {
  const { user, logout, checkAuth } = useAuthStore();
  
  // 2FA State
  const [secretKey, setSecretKey] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [totpError, setTotpError] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Facebook Check State
  const [fbUrl, setFbUrl] = useState('');
  const [fbResults, setFbResults] = useState<Array<{ url: string; status: 'live' | 'die' | 'checking' | 'error'; message?: string; uid?: string }>>([]);
  const [isCheckingFb, setIsCheckingFb] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  // Auto-refresh TOTP code
  useEffect(() => {
    if (!secretKey) return;
    
    const interval = setInterval(() => {
      try {
        const result = generateTOTP(secretKey);
        setTotpCode(result.code);
        setTimeLeft(result.timeLeft);
        setTotpError('');
      } catch (err) {
        // Keep existing code, don't update on error
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [secretKey]);

  const handleGenerateTOTP = () => {
    if (!secretKey.trim()) {
      setTotpError('Vui lòng nhập secret key');
      return;
    }
    
    try {
      const result = generateTOTP(secretKey.trim());
      setTotpCode(result.code);
      setTimeLeft(result.timeLeft);
      setTotpError('');
    } catch (err) {
      setTotpError('Secret key không hợp lệ. Vui lòng kiểm tra lại.');
      setTotpCode('');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCheckFacebook = async () => {
    if (!fbUrl.trim()) return;
    
    // Parse URLs (support multiple URLs separated by newline)
    const urls = fbUrl.split('\n').map(u => u.trim()).filter(u => u);
    
    if (urls.length === 0) return;
    
    setIsCheckingFb(true);
    
    // Initialize results
    const initialResults = urls.map(url => ({
      url,
      status: 'checking' as const
    }));
    setFbResults(initialResults);
    
    // Check each URL
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      
      try {
        // Build the check URL
        const checkUrl = url.startsWith('http') ? url : `https://facebook.com/${url}`;
        
        // Call API to check
        const response = await fetch(`/api/check-fb?url=${encodeURIComponent(checkUrl)}`, {
          method: 'GET',
        });
        
        const data = await response.json();
        
        setFbResults(prev => prev.map((r, idx) => 
          idx === i ? { 
            ...r, 
            status: data.live ? 'live' : 'die',
            message: data.message,
            uid: data.uid
          } : r
        ));
      } catch (error) {
        setFbResults(prev => prev.map((r, idx) => 
          idx === i ? { 
            ...r, 
            status: 'error',
            message: 'Không thể kiểm tra URL này' 
          } : r
        ));
      }
      
      // Small delay between requests to avoid rate limiting
      if (i < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }
    
    setIsCheckingFb(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header user={user} onLogout={logout} />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4">
            <Wrench className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Công Cụ Tiện Ích</h1>
          <p className="text-gray-600">Các công cụ hữu ích cho người dùng MMO</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* 2FA Code Generator */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Get 2FA Code</h2>
                  <p className="text-sm text-gray-600">Lấy mã xác thực 2 lớp từ secret key</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secret Key (Base32)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Nhập secret key (VD: JBSWY3DPEHPK3PXP)"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value.toUpperCase())}
                    className="flex-1 font-mono"
                  />
                  <Button onClick={handleGenerateTOTP} className="bg-green-600 hover:bg-green-700">
                    <Key className="w-4 h-4 mr-2" />
                    Lấy mã
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Secret key thường được cung cấp khi bật 2FA trên tài khoản
                </p>
              </div>

              {totpError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {totpError}
                </div>
              )}

              {totpCode && !totpError && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-6 text-center">
                    <p className="text-sm text-gray-500 mb-2">Mã 2FA của bạn</p>
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-4xl font-bold font-mono tracking-widest text-gray-900">
                        {totpCode.slice(0, 3)} {totpCode.slice(3)}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(totpCode)}
                        className="h-10"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <div className="flex-1 max-w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${
                          timeLeft <= 5 ? 'bg-red-500' : timeLeft <= 10 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${(timeLeft / 30) * 100}%` }}
                      />
                    </div>
                    <span className={`text-sm font-medium ${
                      timeLeft <= 5 ? 'text-red-500' : timeLeft <= 10 ? 'text-yellow-500' : 'text-gray-500'
                    }`}>
                      {timeLeft}s
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Facebook Live Check */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Facebook className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Check Live Facebook</h2>
                  <p className="text-sm text-gray-600">Kiểm tra tài khoản Facebook còn sống hay đã die</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL Facebook (mỗi dòng 1 URL)
                </label>
                <textarea
                  placeholder="https://facebook.com/username&#10;https://facebook.com/profile.php?id=100000000000"
                  value={fbUrl}
                  onChange={(e) => setFbUrl(e.target.value)}
                  className="w-full h-32 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
                />
              </div>
              
              <Button 
                onClick={handleCheckFacebook} 
                disabled={isCheckingFb || !fbUrl.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isCheckingFb ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang kiểm tra...</>
                ) : (
                  <><RefreshCw className="w-4 h-4 mr-2" /> Kiểm tra ngay</>
                )}
              </Button>

              {/* Results */}
              {fbResults.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-sm font-medium text-gray-700">Kết quả:</p>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {fbResults.map((result, idx) => (
                      <div 
                        key={idx}
                        className={`flex items-center gap-3 p-3 rounded-lg text-sm ${
                          result.status === 'live' ? 'bg-green-50 border border-green-200' :
                          result.status === 'die' ? 'bg-red-50 border border-red-200' :
                          result.status === 'checking' ? 'bg-yellow-50 border border-yellow-200' :
                          'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        {result.status === 'checking' ? (
                          <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />
                        ) : result.status === 'live' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : result.status === 'die' ? (
                          <XCircle className="w-5 h-5 text-red-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-gray-500" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-mono text-xs">{result.url}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {result.uid && (
                              <span className="text-xs text-blue-600 font-mono bg-blue-50 px-1.5 py-0.5 rounded">
                                UID: {result.uid}
                              </span>
                            )}
                            {result.message && (
                              <span className={`text-xs ${
                                result.status === 'live' ? 'text-green-600' :
                                result.status === 'die' ? 'text-red-600' :
                                'text-gray-500'
                              }`}>
                                {result.message}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          result.status === 'live' ? 'bg-green-100 text-green-700' :
                          result.status === 'die' ? 'bg-red-100 text-red-700' :
                          result.status === 'checking' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {result.status === 'live' ? 'LIVE' :
                           result.status === 'die' ? 'DIE' :
                           result.status === 'checking' ? '...' : 'ERROR'}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Summary */}
                  {!isCheckingFb && fbResults.length > 0 && (
                    <div className="flex gap-4 text-sm pt-2 border-t border-gray-100">
                      <span className="text-green-600">
                        Live: {fbResults.filter(r => r.status === 'live').length}
                      </span>
                      <span className="text-red-600">
                        Die: {fbResults.filter(r => r.status === 'die').length}
                      </span>
                      <span className="text-gray-500">
                        Error: {fbResults.filter(r => r.status === 'error').length}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
