'use client';

interface OnlineStatusProps {
  isOnline: boolean;
  lastSeen?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function OnlineStatus({ isOnline, lastSeen, showText = true, size = 'md' }: OnlineStatusProps) {
  const formatLastSeen = (dateString?: string) => {
    if (!dateString) return 'Không rõ';
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return 'Vừa xong';
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} giờ trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`${sizeClasses[size]} rounded-full ${
          isOnline ? 'bg-green-500' : 'bg-gray-400'
        }`}
      />
      {showText && (
        <span className="text-xs text-gray-500">
          {isOnline ? 'Đang hoạt động' : `Hoạt động ${formatLastSeen(lastSeen)}`}
        </span>
      )}
    </div>
  );
}
