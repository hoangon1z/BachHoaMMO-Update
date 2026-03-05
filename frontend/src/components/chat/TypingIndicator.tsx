'use client';

interface TypingUser {
  userId: string;
  userName: string;
  conversationId: string;
}

interface TypingIndicatorProps {
  users: TypingUser[];
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const names =
    users.length === 1
      ? users[0].userName
      : users.length === 2
        ? `${users[0].userName} và ${users[1].userName}`
        : `${users[0].userName} và ${users.length - 1} người khác`;

  return (
    <div className="flex items-center gap-2 py-2 pl-2 animate-in fade-in duration-300">
      {/* Avatar */}
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
        <span className="text-[9px] font-bold text-white">{users[0].userName?.[0]?.toUpperCase() || '?'}</span>
      </div>

      {/* Bubble */}
      <div className="bg-gray-100 rounded-2xl rounded-bl-md px-3.5 py-2 inline-flex items-center gap-2.5 border border-gray-100">
        {/* Animated dots */}
        <div className="flex gap-1">
          <span className="w-[6px] h-[6px] rounded-full bg-gray-400 animate-[bounce_1.4s_ease-in-out_0s_infinite]" />
          <span className="w-[6px] h-[6px] rounded-full bg-gray-400 animate-[bounce_1.4s_ease-in-out_0.2s_infinite]" />
          <span className="w-[6px] h-[6px] rounded-full bg-gray-400 animate-[bounce_1.4s_ease-in-out_0.4s_infinite]" />
        </div>
        <span className="text-[11px] text-gray-500">{names} đang nhập</span>
      </div>
    </div>
  );
}
