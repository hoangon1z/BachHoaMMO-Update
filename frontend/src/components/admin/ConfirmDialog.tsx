'use client';

import { ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  icon?: ReactNode;
  /** Chế độ thông báo: chỉ hiển thị nút Đóng (không có Hủy / Xác nhận) */
  alertMode?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'danger',
  isLoading = false,
  icon,
  alertMode = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: { icon: 'bg-red-100 text-red-600', button: 'bg-red-600 hover:bg-red-700' },
    warning: { icon: 'bg-amber-100 text-amber-600', button: 'bg-amber-500 hover:bg-amber-600' },
    info: { icon: 'bg-sky-100 text-sky-600', button: 'bg-amber-500 hover:bg-amber-600' },
  };

  const styles = variantStyles[variant];
  const handleConfirm = () => {
    if (alertMode) {
      onClose();
    } else {
      onConfirm?.();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <X className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center text-center">
          <div className={`w-14 h-14 rounded-full ${styles.icon} flex items-center justify-center mb-4`}>
            {icon || <AlertTriangle className="w-7 h-7" />}
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
          {description && <p className="text-gray-500 text-sm mb-6">{description}</p>}
          <div className="flex items-center gap-3 w-full">
            {!alertMode && (
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={isLoading}>{cancelText}</Button>
            )}
            <Button
              className={`flex-1 text-white ${styles.button} ${alertMode ? 'w-full' : ''}`}
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Đang xử lý...' : alertMode ? 'Đóng' : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
