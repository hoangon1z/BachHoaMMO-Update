'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, Loader2, ArrowLeft, Shield, Zap, Headphones, Eye, EyeOff, KeyRound } from 'lucide-react';
import { apiFetch } from '@/lib/config';

export default function LoginPage() {
  const router = useRouter();
  const { login, verify2FA, isLoading, pendingEmail, clearPendingEmail } = useAuthStore();
  const toast = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  
  // 2FA state
  const [show2FA, setShow2FA] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Start countdown for resend
  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    try {
      const result = await login(email, password);
      
      // Check if 2FA is required
      if (result.requires2FA) {
        setShow2FA(true);
        startCountdown();
        toast.info('Xác thực 2 bước', result.message || 'Mã OTP đã được gửi đến email');
        return;
      }
      
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      toast.success('Đăng nhập thành công!', 'Chào mừng bạn trở lại');
      router.push('/');
    } catch (err: any) {
      // Show friendly error message for all login failures
      setLocalError('Tên đăng nhập hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.');
      toast.error('Đăng nhập thất bại', 'Tên đăng nhập hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.');
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    try {
      await verify2FA(otpCode);
      
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      }
      
      toast.success('Đăng nhập thành công!', 'Xác thực 2 bước thành công');
      router.push('/');
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Mã xác thực không đúng';
      // If session expired, go back to login form
      if (errorMessage.includes('hết hạn') || errorMessage.includes('đăng nhập lại')) {
        setShow2FA(false);
        clearPendingEmail();
        toast.error('Phiên đã hết hạn', 'Vui lòng đăng nhập lại');
      } else {
        setLocalError(errorMessage);
      }
    }
  };

  const handleResend2FA = async () => {
    if (countdown > 0) return;
    const resendEmail = pendingEmail || email || localStorage.getItem('pending2FAEmail');
    if (!resendEmail) {
      toast.error('Không tìm thấy email', 'Vui lòng đăng nhập lại');
      setShow2FA(false);
      return;
    }
    try {
      await apiFetch('/auth/2fa/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      });
      startCountdown();
      toast.success('Đã gửi lại mã OTP');
    } catch {
      toast.error('Không thể gửi lại mã OTP');
    }
  };

  const handleBack = () => {
    setShow2FA(false);
    setOtpCode('');
    clearPendingEmail();
  };

  const displayError = localError; // Only show friendly local errors

  const features = [
    { icon: Shield, title: 'Giao dịch an toàn', desc: 'Bảo mật thanh toán đa lớp' },
    { icon: Zap, title: 'Giao hàng tức thì', desc: 'Nhận ngay sau thanh toán' },
    { icon: Headphones, title: 'Hỗ trợ 24/7', desc: 'Luôn sẵn sàng hỗ trợ bạn' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[45%] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <span className="text-2xl font-bold text-white">M</span>
            </div>
            <span className="text-2xl font-bold text-white">BachHoaMMO</span>
          </Link>
          
          {/* Main Content */}
          <div className="my-auto py-12">
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
              Chào mừng<br />trở lại!
            </h1>
            <p className="text-lg text-blue-100 mb-12 max-w-md leading-relaxed">
              Đăng nhập để khám phá hàng ngàn sản phẩm số chất lượng cao với giá tốt nhất.
            </p>
            
            {/* Features */}
            <div className="space-y-5">
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{feature.title}</h3>
                    <p className="text-sm text-blue-200">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Footer */}
          <p className="text-sm text-blue-200">
            © 2026 BachHoaMMO. Chợ MMO uy tín #1 Việt Nam
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 xl:w-[55%] flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <Link href="/" className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-xl font-bold text-white">M</span>
            </div>
            <span className="text-xl font-bold text-gray-900">MMO<span className="text-blue-600">MARKET</span></span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Đăng nhập</h2>
            <p className="text-gray-500">Nhập thông tin để tiếp tục</p>
          </div>

          {/* Error Message */}
          {displayError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-red-600 text-xs">!</span>
              </div>
              <p className="text-sm text-red-600">{displayError}</p>
            </div>
          )}

          {/* 2FA Form */}
          {show2FA ? (
            <form onSubmit={handleVerify2FA} className="space-y-5">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Xác thực 2 bước</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Nhập mã OTP đã gửi đến email của bạn
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp" className="text-sm font-medium text-gray-700">
                  Mã OTP (6 số)
                </Label>
                <Input
                  id="otp"
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="h-14 text-center text-2xl font-mono tracking-[0.5em] rounded-xl"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium"
                disabled={isLoading || otpCode.length !== 6}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Xác nhận'
                )}
              </Button>

              <div className="text-center space-y-2">
                <button
                  type="button"
                  onClick={handleResend2FA}
                  disabled={countdown > 0}
                  className={`text-sm ${countdown > 0 ? 'text-gray-400' : 'text-blue-600 hover:underline'}`}
                >
                  {countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại mã OTP'}
                </button>
                <br />
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Quay lại đăng nhập
                </button>
              </div>
            </form>
          ) : (
          /* Login Form */
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setLocalError(''); }}
                  className="h-12 pl-12 pr-4 bg-gray-50 border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-blue-500 transition-colors"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Mật khẩu
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setLocalError(''); }}
                  className="h-12 pl-12 pr-12 bg-gray-50 border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-blue-500 transition-colors"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-colors"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                />
                <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                  Ghi nhớ đăng nhập
                </span>
              </label>
              <Link 
                href="/forgot-password" 
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Quên mật khẩu?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                'Đăng nhập'
              )}
            </Button>
          </form>
          )}

          {/* Hide social login when showing 2FA */}
          {!show2FA && (
            <>
              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-gray-50 text-gray-500">hoặc</span>
                </div>
              </div>

              {/* Social Login Placeholder */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="h-11 px-4 border border-gray-200 rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
                  disabled
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>
                <button
                  type="button"
                  className="h-11 px-4 border border-gray-200 rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
                  disabled
                >
                  <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </button>
              </div>
            </>
          )}

          {/* Register Link */}
          <p className="text-center mt-8 text-gray-600">
            Chưa có tài khoản?{' '}
            <Link 
              href="/register" 
              className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Đăng ký miễn phí
            </Link>
          </p>

          {/* Back to Home */}
          <div className="text-center mt-6">
            <Link 
              href="/" 
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại trang chủ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
