'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useAuthModal } from '@/store/authModalStore';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Mail, Lock, User, Loader2, Eye, EyeOff, X,
  KeyRound, ShieldAlert, AlertTriangle, CheckCircle,
  ArrowRight, Sparkles, Shield, Zap,
} from 'lucide-react';
import { apiFetch } from '@/lib/config';

export function AuthModal() {
  const router = useRouter();
  const toast = useToast();
  const { isOpen, activeTab, redirectPath, close, setTab } = useAuthModal();
  const { login, register, verify2FA, isLoading, pendingEmail, clearPendingEmail, banInfo, clearBanInfo, error } = useAuthStore();

  // Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  // Register states
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [regError, setRegError] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // 2FA states
  const [show2FA, setShow2FA] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Animation state
  const [visible, setVisible] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Load remembered email
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Animate in/out
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setLocalError('');
      setRegError('');
      setShow2FA(false);
      setOtpCode('');
    }
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) handleClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => close(), 200);
  }, [close]);

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleLoginSuccess = useCallback(() => {
    handleClose();
    if (redirectPath) {
      router.push(redirectPath);
    } else {
      router.refresh();
    }
  }, [handleClose, redirectPath, router]);

  // ─── Login ───
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    try {
      const result = await login(email, password);
      if (result.isBanned) return;
      if (result.requires2FA) {
        setShow2FA(true);
        startCountdown();
        toast.info('Xác thực 2 bước', result.message || 'Mã OTP đã được gửi đến email');
        return;
      }
      if (rememberMe) localStorage.setItem('rememberedEmail', email);
      else localStorage.removeItem('rememberedEmail');
      toast.success('Đăng nhập thành công!', 'Chào mừng bạn trở lại');
      if (result.user && !result.user.twoFactorEnabled) {
        setTimeout(() => toast.info('Bảo mật', 'Bật 2FA trong Cài đặt → Bảo mật'), 2000);
      }
      handleLoginSuccess();
    } catch {
      const currentBanInfo = useAuthStore.getState().banInfo;
      if (!currentBanInfo) setLocalError('Email hoặc mật khẩu không đúng.');
    }
  };

  // ─── 2FA ───
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    try {
      await verify2FA(otpCode);
      if (rememberMe) localStorage.setItem('rememberedEmail', email);
      toast.success('Đăng nhập thành công!');
      handleLoginSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Mã xác thực không đúng';
      if (msg.includes('hết hạn') || msg.includes('đăng nhập lại')) {
        setShow2FA(false); clearPendingEmail();
        toast.error('Phiên đã hết hạn');
      } else setLocalError(msg);
    }
  };

  const handleResend2FA = async () => {
    if (countdown > 0) return;
    const resendEmail = pendingEmail || email || localStorage.getItem('pending2FAEmail');
    if (!resendEmail) { toast.error('Vui lòng đăng nhập lại'); setShow2FA(false); return; }
    try {
      await apiFetch('/auth/2fa/resend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: resendEmail }) });
      startCountdown(); toast.success('Đã gửi lại mã OTP');
    } catch { toast.error('Không thể gửi lại mã'); }
  };

  // ─── Register ───
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (regPassword !== confirmPassword) { setRegError('Mật khẩu không khớp'); return; }
    if (regPassword.length < 6) { setRegError('Mật khẩu tối thiểu 6 ký tự'); return; }
    if (!agreeToTerms) { setRegError('Vui lòng đồng ý Điều khoản sử dụng'); return; }
    try {
      await register(regEmail, regPassword, name);
      toast.success('Tạo tài khoản thành công!');
      handleLoginSuccess();
    } catch (err: any) {
      setRegError(err?.message || 'Đã có lỗi xảy ra');
    }
  };

  const getPasswordStrength = () => {
    if (!regPassword) return { level: 0, text: '', color: '', bg: '' };
    if (regPassword.length < 6) return { level: 1, text: 'Yếu', color: 'text-red-500', bg: 'bg-red-500' };
    if (regPassword.length < 8) return { level: 2, text: 'TB', color: 'text-amber-500', bg: 'bg-amber-500' };
    if (/[A-Z]/.test(regPassword) && /[0-9]/.test(regPassword)) return { level: 3, text: 'Mạnh', color: 'text-emerald-500', bg: 'bg-emerald-500' };
    return { level: 2, text: 'TB', color: 'text-amber-500', bg: 'bg-amber-500' };
  };
  const pwStr = getPasswordStrength();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop - no blur for performance */}
      <div
        className="absolute inset-0 bg-black/60 transition-opacity duration-200"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={handleClose}
      />

      {/* Modal Card */}
      <div
        ref={modalRef}
        className="relative w-full max-w-[440px] mx-4 transition-all duration-300 ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(16px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

          {/* ═══════ Top Section ═══════ */}
          <div className="relative overflow-hidden flex-shrink-0">
            {/* Gradient BG - different per tab */}
            <div className={`absolute inset-0 transition-colors duration-500 ${activeTab === 'login'
                ? 'bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700'
                : 'bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700'
              }`} />

            {/* Floating orbs - pure CSS, no perf hit */}
            <div className="absolute top-[-20px] right-[-20px] w-40 h-40 rounded-full bg-white/[0.07]" />
            <div className="absolute bottom-[-30px] left-[-20px] w-48 h-48 rounded-full bg-white/[0.05]" />
            <div className="absolute top-8 left-[40%] w-2 h-2 rounded-full bg-white/30 animate-pulse" />

            {/* Close */}
            <button
              onClick={handleClose}
              className="absolute top-3.5 right-3.5 z-10 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            <div className="relative px-7 pt-6 pb-5">
              {/* Logo */}
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center overflow-hidden">
                  <img src="/images/logobachhoa.png" alt="Logo" className="w-7 h-7 object-contain" />
                </div>
                <span className="text-[15px] font-bold text-white tracking-tight">BachHoaMMO</span>
              </div>

              {/* Title - animates with tab */}
              <h2 className="text-2xl font-bold text-white mb-1">
                {activeTab === 'login' ? 'Chào mừng trở lại!' : 'Tạo tài khoản mới'}
              </h2>
              <p className="text-sm text-white/70">
                {activeTab === 'login' ? 'Đăng nhập để tiếp tục mua sắm' : 'Bắt đầu khám phá ngay hôm nay'}
              </p>

              {/* Tab Switcher - pill style */}
              <div className="flex mt-5 bg-white/[0.12] rounded-2xl p-1 gap-1">
                <button
                  onClick={() => { setTab('login'); setLocalError(''); }}
                  className={`flex-1 py-2.5 text-[13px] font-semibold rounded-xl transition-all duration-200 ${activeTab === 'login'
                      ? 'bg-white text-gray-900 shadow-lg shadow-black/10'
                      : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
                    }`}
                >
                  Đăng nhập
                </button>
                <button
                  onClick={() => { setTab('register'); setRegError(''); }}
                  className={`flex-1 py-2.5 text-[13px] font-semibold rounded-xl transition-all duration-200 ${activeTab === 'register'
                      ? 'bg-white text-gray-900 shadow-lg shadow-black/10'
                      : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
                    }`}
                >
                  Đăng ký
                </button>
              </div>
            </div>
          </div>

          {/* ═══════ Form Content ═══════ */}
          <div className="overflow-y-auto flex-1 px-7 py-5">

            {/* ─── LOGIN ─── */}
            {activeTab === 'login' && (
              <>
                {/* Ban Info */}
                {banInfo && (
                  <div className="mb-4 bg-red-50 border border-red-100 rounded-2xl p-4">
                    <div className="flex gap-3 mb-2">
                      <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-700">Tài khoản đã bị khóa</p>
                        <p className="text-xs text-red-500 mt-1">Lý do: {banInfo.reason}</p>
                        {banInfo.bannedAt && (
                          <p className="text-[10px] text-red-400 mt-1">
                            {new Date(banInfo.bannedAt).toLocaleString('vi-VN')}
                          </p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => clearBanInfo()} className="text-[11px] text-red-400 hover:text-red-600 font-medium">
                      Đóng
                    </button>
                  </div>
                )}

                {/* Error */}
                {localError && !banInfo && (
                  <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-[13px] text-red-600">{localError}</p>
                  </div>
                )}

                {/* 2FA */}
                {show2FA ? (
                  <form onSubmit={handleVerify2FA} className="space-y-4">
                    <div className="text-center py-2">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                        <KeyRound className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">Xác thực 2 bước</h3>
                      <p className="text-xs text-gray-500 mt-1">Nhập mã 6 số từ email của bạn</p>
                    </div>

                    <Input
                      id="modal-otp"
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="h-14 text-center text-2xl font-mono tracking-[0.5em] rounded-2xl border-2 border-gray-200 focus:border-blue-500 bg-gray-50 focus:bg-white"
                      maxLength={6}
                      required
                      autoFocus
                    />

                    <Button type="submit" className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/25" disabled={isLoading || otpCode.length !== 6}>
                      {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Xác nhận'}
                    </Button>

                    <div className="flex items-center justify-between pt-1">
                      <button type="button" onClick={() => { setShow2FA(false); setOtpCode(''); clearPendingEmail(); }}
                        className="text-[13px] text-gray-500 hover:text-gray-700 font-medium">
                        ← Quay lại
                      </button>
                      <button type="button" onClick={handleResend2FA} disabled={countdown > 0}
                        className={`text-[13px] font-medium ${countdown > 0 ? 'text-gray-400' : 'text-blue-600 hover:text-blue-700'}`}>
                        {countdown > 0 ? `${countdown}s` : 'Gửi lại OTP'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleLogin} className="space-y-4">
                    {/* Email */}
                    <div>
                      <Label htmlFor="m-email" className="text-[13px] font-semibold text-gray-700 mb-1.5 block">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                        <Input
                          id="m-email" type="email" placeholder="you@email.com"
                          value={email} onChange={(e) => { setEmail(e.target.value); setLocalError(''); }}
                          className="h-12 pl-12 pr-4 bg-gray-50/80 border-2 border-gray-200 rounded-2xl focus:bg-white focus:border-blue-500 focus:ring-0 text-[15px] transition-colors"
                          required disabled={isLoading}
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <Label htmlFor="m-pass" className="text-[13px] font-semibold text-gray-700 mb-1.5 block">Mật khẩu</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                        <Input
                          id="m-pass" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                          value={password} onChange={(e) => { setPassword(e.target.value); setLocalError(''); }}
                          className="h-12 pl-12 pr-12 bg-gray-50/80 border-2 border-gray-200 rounded-2xl focus:bg-white focus:border-blue-500 focus:ring-0 text-[15px] transition-colors"
                          required disabled={isLoading}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                          {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                        </button>
                      </div>
                    </div>

                    {/* Remember + Forgot */}
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer group select-none">
                        <input type="checkbox" className="w-4 h-4 rounded-md border-2 border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                          checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} disabled={isLoading}
                        />
                        <span className="text-[13px] text-gray-600 group-hover:text-gray-800">Ghi nhớ</span>
                      </label>
                      <Link href="/forgot-password" onClick={handleClose}
                        className="text-[13px] font-semibold text-blue-600 hover:text-blue-700">
                        Quên mật khẩu?
                      </Link>
                    </div>

                    {/* Submit */}
                    <Button type="submit"
                      className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-semibold text-[15px] shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all"
                      disabled={isLoading}>
                      {isLoading ? (
                        <><Loader2 className="mr-2 w-5 h-5 animate-spin" /> Đang đăng nhập...</>
                      ) : (
                        <><span>Đăng nhập</span><ArrowRight className="ml-2 w-4 h-4" /></>
                      )}
                    </Button>

                    {/* Trust badges */}
                    <div className="flex items-center justify-center gap-4 pt-2">
                      {[
                        { icon: Shield, text: 'An toàn' },
                        { icon: Zap, text: 'SSL 256-bit' },
                        { icon: Sparkles, text: '24/7' },
                      ].map((b, i) => (
                        <div key={i} className="flex items-center gap-1 text-gray-400">
                          <b.icon className="w-3 h-3" />
                          <span className="text-[10px] font-medium">{b.text}</span>
                        </div>
                      ))}
                    </div>
                  </form>
                )}
              </>
            )}

            {/* ─── REGISTER ─── */}
            {activeTab === 'register' && (
              <>
                {(regError || error) && (
                  <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-[13px] text-red-600">{regError || error}</p>
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-3.5">
                  {/* Name */}
                  <div>
                    <Label htmlFor="m-name" className="text-[13px] font-semibold text-gray-700 mb-1.5 block">Họ và tên</Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                      <Input id="m-name" type="text" placeholder="Nguyễn Văn A" value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-12 pl-12 pr-4 bg-gray-50/80 border-2 border-gray-200 rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-0 text-[15px]"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <Label htmlFor="m-remail" className="text-[13px] font-semibold text-gray-700 mb-1.5 block">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                      <Input id="m-remail" type="email" placeholder="you@email.com" value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="h-12 pl-12 pr-4 bg-gray-50/80 border-2 border-gray-200 rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-0 text-[15px]"
                        required disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <Label htmlFor="m-rpass" className="text-[13px] font-semibold text-gray-700 mb-1.5 block">
                      Mật khẩu <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                      <Input id="m-rpass" type={showRegPassword ? 'text' : 'password'} placeholder="••••••••"
                        value={regPassword} onChange={(e) => setRegPassword(e.target.value)}
                        className="h-12 pl-12 pr-12 bg-gray-50/80 border-2 border-gray-200 rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-0 text-[15px]"
                        required disabled={isLoading} minLength={6}
                      />
                      <button type="button" onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                        {showRegPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                      </button>
                    </div>
                    {regPassword && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex gap-1 flex-1">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= pwStr.level ? pwStr.bg : 'bg-gray-200'}`} />
                          ))}
                        </div>
                        <span className={`text-[11px] font-semibold ${pwStr.color}`}>{pwStr.text}</span>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <Label htmlFor="m-cpass" className="text-[13px] font-semibold text-gray-700 mb-1.5 block">
                      Xác nhận mật khẩu <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                      <Input id="m-cpass" type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••"
                        value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`h-12 pl-12 pr-12 bg-gray-50/80 border-2 rounded-2xl focus:bg-white focus:ring-0 text-[15px] transition-colors ${confirmPassword
                            ? regPassword === confirmPassword ? 'border-emerald-400 focus:border-emerald-500' : 'border-red-300 focus:border-red-400'
                            : 'border-gray-200 focus:border-emerald-500'
                          }`}
                        required disabled={isLoading}
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                        {showConfirmPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                      </button>
                    </div>
                    {confirmPassword && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {regPassword === confirmPassword ? (
                          <><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[11px] text-emerald-600 font-medium">Khớp</span></>
                        ) : (
                          <><X className="w-3.5 h-3.5 text-red-400" /><span className="text-[11px] text-red-500 font-medium">Không khớp</span></>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Terms */}
                  <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                    <input type="checkbox" checked={agreeToTerms} onChange={(e) => setAgreeToTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded-md border-2 border-gray-300 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0"
                      disabled={isLoading}
                    />
                    <span className="text-[12px] text-gray-500 leading-relaxed">
                      Đồng ý với{' '}
                      <Link href="/terms" onClick={handleClose} className="font-semibold text-emerald-600 hover:text-emerald-700">Điều khoản</Link>
                      {' & '}
                      <Link href="/privacy" onClick={handleClose} className="font-semibold text-emerald-600 hover:text-emerald-700">Bảo mật</Link>
                    </span>
                  </label>

                  {/* Submit */}
                  <Button type="submit"
                    className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl font-semibold text-[15px] shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all mt-1"
                    disabled={isLoading}>
                    {isLoading ? (
                      <><Loader2 className="mr-2 w-5 h-5 animate-spin" /> Đang tạo...</>
                    ) : (
                      <><span>Tạo tài khoản</span><ArrowRight className="ml-2 w-4 h-4" /></>
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
