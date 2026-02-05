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

// 2FA API - Get code from easyme.pro
async function get2FACode(secret: string): Promise<{ code: string; timeLeft: number }> {
  try {
    const cleanSecret = secret.replace(/\s/g, '').toUpperCase();

    const response = await fetch('https://www.easyme.pro/api/api2fa.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ codes: [cleanSecret] }),
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0 && data[0].code) {
      // Calculate time left (30 second intervals)
      const epoch = Math.floor(Date.now() / 1000);
      const timeLeft = 30 - (epoch % 30);

      return {
        code: data[0].code,
        timeLeft
      };
    }

    throw new Error('Invalid response from API');
  } catch (error) {
    throw new Error('Không thể lấy mã 2FA');
  }
}

export default function ToolsPage() {
  const { user, logout, checkAuth } = useAuthStore();

  // 2FA State
  const [secretKey, setSecretKey] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [totpError, setTotpError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading2FA, setIsLoading2FA] = useState(false);

  // Facebook Check State
  const [fbUrl, setFbUrl] = useState('');
  const [fbResults, setFbResults] = useState<Array<{ url: string; status: 'live' | 'die' | 'checking' | 'error'; message?: string; uid?: string }>>([]);
  const [isCheckingFb, setIsCheckingFb] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  // Auto-refresh TOTP code and countdown
  useEffect(() => {
    if (!secretKey || !totpCode) return;

    const interval = setInterval(async () => {
      const epoch = Math.floor(Date.now() / 1000);
      const newTimeLeft = 30 - (epoch % 30);
      setTimeLeft(newTimeLeft);

      // Refresh code when timer resets
      if (newTimeLeft === 30) {
        try {
          const result = await get2FACode(secretKey);
          setTotpCode(result.code);
          setTotpError('');
        } catch (err) {
          // Keep existing code on error
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [secretKey, totpCode]);

  const handleGenerateTOTP = async () => {
    if (!secretKey.trim()) {
      setTotpError('Vui lòng nhập secret key');
      return;
    }

    setIsLoading2FA(true);
    setTotpError('');

    try {
      const result = await get2FACode(secretKey.trim());
      setTotpCode(result.code);
      setTimeLeft(result.timeLeft);
      setTotpError('');
    } catch (err) {
      setTotpError('Secret key không hợp lệ hoặc không thể kết nối API.');
      setTotpCode('');
    } finally {
      setIsLoading2FA(false);
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
                    disabled={isLoading2FA}
                  />
                  <Button onClick={handleGenerateTOTP} className="bg-green-600 hover:bg-green-700" disabled={isLoading2FA}>
                    {isLoading2FA ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang lấy...</>
                    ) : (
                      <><Key className="w-4 h-4 mr-2" /> Lấy mã</>
                    )}
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
                        className={`h-full transition-all duration-1000 ${timeLeft <= 5 ? 'bg-red-500' : timeLeft <= 10 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                        style={{ width: `${(timeLeft / 30) * 100}%` }}
                      />
                    </div>
                    <span className={`text-sm font-medium ${timeLeft <= 5 ? 'text-red-500' : timeLeft <= 10 ? 'text-yellow-500' : 'text-gray-500'
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
                        className={`flex items-center gap-3 p-3 rounded-lg text-sm ${result.status === 'live' ? 'bg-green-50 border border-green-200' :
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
                              <span className={`text-xs ${result.status === 'live' ? 'text-green-600' :
                                result.status === 'die' ? 'text-red-600' :
                                  'text-gray-500'
                                }`}>
                                {result.message}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${result.status === 'live' ? 'bg-green-100 text-green-700' :
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
