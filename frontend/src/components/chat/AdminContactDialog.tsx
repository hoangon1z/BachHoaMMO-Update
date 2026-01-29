'use client';

import { useState } from 'react';
import { X, Send, AlertCircle, HelpCircle, ShoppingBag, CreditCard, Package, Shield, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useChat } from '@/hooks/useChat';
import { useAuthStore } from '@/store/authStore';

interface AdminContactDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
  defaultSubject?: string;
}

const CONTACT_REASONS = [
  {
    id: 'order_issue',
    label: 'Vấn đề đơn hàng',
    icon: Package,
    description: 'Đơn hàng chưa nhận, sai sản phẩm, hư hỏng...',
    color: 'text-blue-500',
  },
  {
    id: 'payment_issue',
    label: 'Vấn đề thanh toán',
    icon: CreditCard,
    description: 'Thanh toán không thành công, hoàn tiền...',
    color: 'text-green-500',
  },
  {
    id: 'seller_dispute',
    label: 'Tranh chấp với người bán',
    icon: AlertCircle,
    description: 'Người bán không phản hồi, giao hàng chậm...',
    color: 'text-red-500',
  },
  {
    id: 'product_quality',
    label: 'Chất lượng sản phẩm',
    icon: ShoppingBag,
    description: 'Sản phẩm kém chất lượng, không đúng mô tả...',
    color: 'text-orange-500',
  },
  {
    id: 'account_security',
    label: 'Bảo mật tài khoản',
    icon: Shield,
    description: 'Tài khoản bị hack, thay đổi mật khẩu...',
    color: 'text-purple-500',
  },
  {
    id: 'other',
    label: 'Vấn đề khác',
    icon: HelpCircle,
    description: 'Các vấn đề khác cần hỗ trợ',
    color: 'text-gray-500',
  },
];

export function AdminContactDialog({ isOpen, onClose, orderId, defaultSubject }: AdminContactDialogProps) {
  const { user } = useAuthStore();
  const { startConversationWithAdmin } = useChat();
  
  const [step, setStep] = useState<'select' | 'details'>('select');
  const [selectedReason, setSelectedReason] = useState('');
  const [subject, setSubject] = useState(defaultSubject || '');
  const [message, setMessage] = useState('');
  const [orderIdInput, setOrderIdInput] = useState(orderId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleReasonSelect = (reasonId: string) => {
    setSelectedReason(reasonId);
    const reason = CONTACT_REASONS.find(r => r.id === reasonId);
    if (reason && !subject) {
      setSubject(reason.label);
    }
    setStep('details');
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');
    
    try {
      const fullMessage = orderIdInput 
        ? `[Mã đơn hàng: ${orderIdInput}]\n\n${message}`
        : message;

      await startConversationWithAdmin(subject, fullMessage, orderIdInput || undefined);
      
      // Success
      setSubmitStatus('success');
      
      // Wait a bit to show success message then close
      setTimeout(() => {
        onClose();
        // Reset form
        setStep('select');
        setSelectedReason('');
        setSubject(defaultSubject || '');
        setMessage('');
        setOrderIdInput(orderId || '');
        setSubmitStatus('idle');
      }, 1500);
    } catch (error: any) {
      console.error('Failed to contact admin:', error);
      setSubmitStatus('error');
      setErrorMessage(error.message || 'Không thể gửi yêu cầu. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setStep('select');
    setSelectedReason('');
  };

  const selectedReasonData = CONTACT_REASONS.find(r => r.id === selectedReason);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-primary to-primary/80 text-white">
          <div>
            <h2 className="text-xl font-bold">Liên hệ Admin</h2>
            <p className="text-sm text-white/90 mt-1">
              {step === 'select' ? 'Chọn loại vấn đề bạn đang gặp phải' : 'Chi tiết vấn đề'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'select' ? (
            // Step 1: Select reason
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CONTACT_REASONS.map((reason) => {
                const Icon = reason.icon;
                return (
                  <button
                    key={reason.id}
                    onClick={() => handleReasonSelect(reason.id)}
                    className="p-4 border-2 border-gray-200 rounded-xl hover:border-primary hover:shadow-lg transition-all text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-3 rounded-lg bg-gray-50 group-hover:bg-primary/10 transition-colors ${reason.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {reason.label}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {reason.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            // Step 2: Enter details
            <div className="space-y-6">
              {/* Selected reason badge */}
              {selectedReasonData && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  {(() => {
                    const Icon = selectedReasonData.icon;
                    return <Icon className={`w-6 h-6 ${selectedReasonData.color}`} />;
                  })()}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{selectedReasonData.label}</p>
                    <p className="text-sm text-gray-500">{selectedReasonData.description}</p>
                  </div>
                  <button
                    onClick={handleBack}
                    className="text-sm text-primary hover:underline"
                  >
                    Thay đổi
                  </button>
                </div>
              )}

              {/* Order ID (optional) */}
              <div className="space-y-2">
                <Label htmlFor="orderId">Mã đơn hàng (nếu có)</Label>
                <Input
                  id="orderId"
                  value={orderIdInput}
                  onChange={(e) => setOrderIdInput(e.target.value)}
                  placeholder="Ví dụ: ORD-123456"
                  className="font-mono"
                />
                <p className="text-xs text-gray-500">
                  Nhập mã đơn hàng để admin hỗ trợ nhanh hơn
                </p>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject">Tiêu đề <span className="text-red-500">*</span></Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Mô tả ngắn gọn vấn đề"
                  maxLength={100}
                  required
                />
                <p className="text-xs text-gray-500 text-right">
                  {subject.length}/100 ký tự
                </p>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Chi tiết vấn đề <span className="text-red-500">*</span></Label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Mô tả chi tiết vấn đề bạn đang gặp phải. Admin sẽ phản hồi sớm nhất có thể."
                  className="w-full min-h-[150px] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  maxLength={1000}
                  required
                />
                <p className="text-xs text-gray-500 text-right">
                  {message.length}/1000 ký tự
                </p>
              </div>

              {/* Success message */}
              {submitStatus === 'success' && (
                <div className="flex gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-green-700">
                    <p className="font-medium">Gửi yêu cầu thành công!</p>
                    <p>Admin sẽ phản hồi bạn sớm nhất có thể. Đang chuyển hướng...</p>
                  </div>
                </div>
              )}

              {/* Error message */}
              {submitStatus === 'error' && (
                <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700">
                    <p className="font-medium">Gửi yêu cầu thất bại!</p>
                    <p>{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Info box */}
              {submitStatus === 'idle' && (
                <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Lưu ý:</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Admin sẽ phản hồi trong vòng 24 giờ</li>
                      <li>Bạn có thể gửi thêm hình ảnh sau khi tạo cuộc trò chuyện</li>
                      <li>Kiểm tra mục "Tin nhắn" để xem phản hồi từ admin</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'details' && (
          <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              Quay lại
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!subject.trim() || !message.trim() || isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Gửi yêu cầu
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
