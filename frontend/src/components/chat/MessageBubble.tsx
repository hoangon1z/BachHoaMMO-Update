'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Check, CheckCheck, Download, Image as ImageIcon, FileText,
  AlertCircle, CornerUpLeft, Smile, Pin, Pencil, Trash2,
  RotateCcw, Copy, MoreHorizontal, X, Shield, Eye
} from 'lucide-react';
import { Message, ReplyTo } from '@/hooks/useChat';
import { API_BASE_URL } from '@/lib/config';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isGrouped?: boolean; // True if previous message is from same sender within 2 min
  showDateSeparator?: boolean;
  dateSeparatorText?: string;
  isAdmin?: boolean;
  onReply?: (msg: Message) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onPin?: (messageId: string) => void;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onRecall?: (messageId: string) => void;
  userId?: string;
}

const getFullUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}${url}`;
};

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉'];

const SYSTEM_ICONS: Record<string, { icon: string; color: string }> = {
  ORDER_CREATED: { icon: '🛒', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  ORDER_PAID: { icon: '💳', color: 'bg-green-50 text-green-700 border-green-200' },
  ORDER_DELIVERED: { icon: '📦', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ORDER_COMPLETED: { icon: '✅', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ORDER_CANCELLED: { icon: '❌', color: 'bg-red-50 text-red-700 border-red-200' },
  DISPUTE_OPENED: { icon: '🚨', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  DISPUTE_JOINED: { icon: '👤', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  DISPUTE_RESOLVED: { icon: '✅', color: 'bg-green-50 text-green-700 border-green-200' },
  CONVERSATION_COMPLETED: { icon: '🎉', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ADMIN_JOINED: { icon: '🛡️', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  GENERAL: { icon: 'ℹ️', color: 'bg-gray-50 text-gray-600 border-gray-200' },
};

export function MessageBubble({
  message, isOwn, isGrouped, showDateSeparator, dateSeparatorText,
  isAdmin, onReply, onReact, onPin, onEdit, onDelete, onRecall, userId
}: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showFullImage, setShowFullImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const menuRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setShowReactions(false);
      }
    };
    if (showMenu || showReactions) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu, showReactions]);

  // Focus edit input
  useEffect(() => {
    if (isEditing) editInputRef.current?.focus();
  }, [isEditing]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const handleEditSubmit = () => {
    if (editValue.trim() && editValue !== message.content) {
      onEdit?.(message._id, editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setShowMenu(false);
  };

  // =============================================
  // DATE SEPARATOR
  // =============================================
  const dateSep = showDateSeparator ? (
    <div className="flex items-center gap-3 my-3 px-2">
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 px-2 py-0.5">
        {dateSeparatorText}
      </span>
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
    </div>
  ) : null;

  // =============================================
  // SYSTEM MESSAGE (enriched)
  // =============================================
  if (message.type === 'SYSTEM') {
    const actionStyle = SYSTEM_ICONS[message.systemAction || 'GENERAL'] || SYSTEM_ICONS.GENERAL;
    return (
      <>
        {dateSep}
        <div className="flex justify-center my-3 animate-in fade-in duration-300">
          <div className={`inline-flex items-center gap-2 text-xs px-4 py-2 rounded-full border ${actionStyle.color} max-w-[85%]`}>
            <span className="text-sm flex-shrink-0">{actionStyle.icon}</span>
            <span className="text-center">{message.content}</span>
          </div>
        </div>
      </>
    );
  }

  // =============================================
  // RECALLED MESSAGE
  // =============================================
  if (message.isRecalled) {
    return (
      <>
        {dateSep}
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}>
          <div className="max-w-[75%]">
            {!isOwn && !isGrouped && (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-gray-500">{message.senderName}</span>
              </div>
            )}
            <div className="bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-[13px] px-3 py-2 rounded-2xl italic flex items-center gap-2">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Tin nhắn đã bị thu hồi</span>
            </div>
            {/* Admin can see recalled content */}
            {isAdmin && message.recalledContent && (
              <div className="mt-1 px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg">
                <div className="flex items-center gap-1 text-[10px] text-red-500 font-medium mb-0.5">
                  <Eye className="w-3 h-3" />
                  Nội dung gốc (chỉ Admin thấy)
                </div>
                <p className="text-xs text-red-700">{message.recalledContent}</p>
              </div>
            )}
            <div className={`text-[10px] text-gray-300 mt-1 ${isOwn ? 'text-right' : ''}`}>
              {formatTime(message.createdAt)}
            </div>
          </div>
        </div>
      </>
    );
  }

  // =============================================
  // HIDDEN MESSAGE
  // =============================================
  if (message.isHidden && !isAdmin) {
    return (
      <>
        {dateSep}
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <div className="bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-[13px] px-3 py-2 rounded-2xl italic flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Tin nhắn đã bị ẩn
          </div>
        </div>
      </>
    );
  }

  // =============================================
  // PRODUCT EMBED
  // =============================================
  if (message.type === 'PRODUCT' && message.productEmbed) {
    const { productEmbed } = message;
    return (
      <>
        {dateSep}
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
          <div className="max-w-[75%]">
            {!isOwn && !isGrouped && (
              <div className="flex items-center gap-2 mb-1">
                {renderAvatar(message)}
                <span className="text-xs font-semibold text-gray-700">{message.senderName}</span>
                {renderRoleBadge(message.senderRole)}
              </div>
            )}
            <a href={`/products/${productEmbed.productId}`} target="_blank"
              className="block bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-600 transition-all group">
              <div className="flex">
                <img src={productEmbed.image} alt="" className="w-20 h-20 object-cover group-hover:scale-105 transition-transform" />
                <div className="flex-1 p-3">
                  <p className="font-medium text-sm line-clamp-2 text-gray-800 dark:text-gray-200">{productEmbed.title}</p>
                  <p className="text-blue-600 font-bold mt-1">{productEmbed.price.toLocaleString('vi-VN')}đ</p>
                </div>
              </div>
            </a>
            <div className={`text-[10px] text-gray-400 mt-1 ${isOwn ? 'text-right' : ''}`}>
              {formatTime(message.createdAt)}
            </div>
          </div>
        </div>
      </>
    );
  }

  // =============================================
  // GROUP REACTIONS
  // =============================================
  const groupedReactions = (message.reactions || []).reduce<Record<string, { count: number; users: string[]; hasOwn: boolean }>>((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, users: [], hasOwn: false };
    acc[r.emoji].count++;
    acc[r.emoji].users.push(r.userName);
    if (r.userId === userId) acc[r.emoji].hasOwn = true;
    return acc;
  }, {});

  // =============================================
  // CONTEXT MENU ITEMS
  // =============================================
  const menuItems = [];
  if (onReply) menuItems.push({ icon: CornerUpLeft, label: 'Trả lời', onClick: () => { onReply(message); setShowMenu(false); } });
  menuItems.push({ icon: Copy, label: 'Sao chép', onClick: handleCopy });
  if (onReact) menuItems.push({ icon: Smile, label: 'Biểu cảm', onClick: () => { setShowReactions(true); setShowMenu(false); } });
  if (onPin) menuItems.push({ icon: Pin, label: message.isPinned ? 'Bỏ ghim' : 'Ghim', onClick: () => { onPin(message._id); setShowMenu(false); } });
  if (isOwn && message.type === 'TEXT' && onEdit) {
    menuItems.push({ icon: Pencil, label: 'Sửa', onClick: () => { setIsEditing(true); setEditValue(message.content); setShowMenu(false); } });
  }
  if (isOwn && onRecall) menuItems.push({ icon: RotateCcw, label: 'Thu hồi', onClick: () => { onRecall(message._id); setShowMenu(false); } });
  if ((isOwn || isAdmin) && onDelete) menuItems.push({ icon: Trash2, label: 'Xóa', onClick: () => { onDelete(message._id); setShowMenu(false); }, danger: true });

  // =============================================
  // MAIN MESSAGE RENDER
  // =============================================
  // Facebook-style border radius based on grouping
  const getBubbleRadius = () => {
    if (isOwn) {
      if (isGrouped) return 'rounded-[18px] rounded-tr-[4px] rounded-br-[4px]';
      return 'rounded-[18px] rounded-br-[4px]';
    } else {
      if (isGrouped) return 'rounded-[18px] rounded-tl-[4px] rounded-bl-[4px]';
      return 'rounded-[18px] rounded-bl-[4px]';
    }
  };

  // ── OWN messages (right-aligned, no avatar) ──
  if (isOwn) {
    return (
      <>
        {dateSep}
        <div className={`flex justify-end group ${isGrouped ? 'mt-0.5' : 'mt-2'}`}>
          <div className="max-w-[65%] relative">
            {/* Reply preview */}
            {message.replyTo && (
              <div className="mb-1">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100/80 dark:bg-gray-800/80 rounded-lg border-l-2 border-blue-400 max-w-full">
                  <CornerUpLeft className="w-3 h-3 text-blue-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold text-blue-600 block">{message.replyTo.senderName}</span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate block">{message.replyTo.content}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Pinned indicator */}
            {message.isPinned && (
              <div className="flex items-center gap-1 text-[10px] text-amber-600 mb-0.5 justify-end">
                <Pin className="w-2.5 h-2.5" />
                <span>Tin nhắn đã ghim</span>
              </div>
            )}

            <div className="relative">
              {/* Message bubble */}
              {isEditing ? (
                <div className="bg-white border-2 border-blue-400 rounded-[18px] px-3 py-2">
                  <textarea
                    ref={editInputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSubmit(); } if (e.key === 'Escape') setIsEditing(false); }}
                    className="w-full resize-none text-sm outline-none min-h-[40px]"
                    rows={1}
                  />
                  <div className="flex justify-end gap-1 mt-1">
                    <button onClick={() => setIsEditing(false)} className="text-[11px] text-gray-400 hover:text-gray-600 px-2 py-0.5">Hủy</button>
                    <button onClick={handleEditSubmit} className="text-[11px] text-white bg-blue-500 hover:bg-blue-600 px-3 py-0.5 rounded-full">Lưu</button>
                  </div>
                </div>
              ) : (
                <div className={`${getBubbleRadius()} px-3 py-2 bg-[#0084ff] text-white ${message.isHidden && isAdmin ? 'opacity-60' : ''}`}>
                  {(message.type === 'TEXT' || !message.type) && (
                    <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">{message.content}</p>
                  )}
                  {message.type === 'IMAGE' && message.attachments && (
                    <div className="space-y-1">
                      {message.attachments.map((att, idx) => {
                        const fullUrl = getFullUrl(att.url);
                        return (
                          <div key={idx} className="rounded-lg overflow-hidden">
                            <img src={fullUrl} alt={att.name} className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setShowFullImage(fullUrl)} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                        );
                      })}
                      {message.content && <p className="whitespace-pre-wrap break-words mt-1 text-[15px]">{message.content}</p>}
                    </div>
                  )}
                  {message.type === 'FILE' && message.attachments && (
                    <div className="space-y-1">
                      {message.attachments.map((att, idx) => {
                        const fullUrl = getFullUrl(att.url);
                        return (
                          <a key={idx} href={fullUrl} download={att.name}
                            className="flex items-center gap-2 p-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{att.name}</p>
                              <p className="text-[11px] opacity-60">{(att.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <Download className="w-4 h-4 opacity-50" />
                          </a>
                        );
                      })}
                      {message.content && <p className="whitespace-pre-wrap break-words mt-1 text-[15px]">{message.content}</p>}
                    </div>
                  )}
                  {message.isEdited && <span className="text-[10px] text-blue-200">(đã chỉnh sửa)</span>}
                </div>
              )}

              {/* Context menu button */}
              <div ref={menuRef} className="absolute top-0 -left-7 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setShowMenu(!showMenu)}
                  className="w-6 h-6 rounded-full bg-white/80 dark:bg-gray-700/80 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-center transition-colors">
                  <MoreHorizontal className="w-3.5 h-3.5 text-gray-400" />
                </button>
                {showMenu && (
                  <div className="absolute z-50 right-0 top-7 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-150">
                    {menuItems.map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <button key={idx} onClick={item.onClick}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${(item as any).danger ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30' : 'text-gray-700 dark:text-gray-300'}`}>
                          <Icon className="w-3.5 h-3.5" />{item.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick reaction picker */}
              {showReactions && (
                <div ref={menuRef} className="absolute z-50 right-0 -top-10 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 flex gap-0.5 animate-in fade-in zoom-in-95 duration-150">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button key={emoji} onClick={() => { onReact?.(message._id, emoji); setShowReactions(false); }}
                      className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-lg hover:scale-125 transition-transform">
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Reactions display */}
              {Object.keys(groupedReactions).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-0.5 justify-end">
                  {Object.entries(groupedReactions).map(([emoji, data]) => (
                    <button key={emoji} onClick={() => onReact?.(message._id, emoji)}
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border ${data.hasOwn ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                      title={data.users.join(', ')}>
                      <span>{emoji}</span>
                      {data.count > 1 && <span className="text-[10px] font-medium">{data.count}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Time + read status */}
            {!isGrouped && (
              <div className="flex items-center gap-1 mt-0.5 justify-end pr-1">
                <span className="text-[11px] text-gray-400" title={formatDate(message.createdAt)}>
                  {formatTime(message.createdAt)}
                </span>
                <span className="text-[10px]">
                  {message.readBy && message.readBy.length > 0 ? (
                    <CheckCheck className="w-3 h-3 text-blue-400" />
                  ) : (
                    <Check className="w-3 h-3 text-gray-300" />
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
        {showFullImage && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setShowFullImage(null)}>
            <button className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
              <X className="w-6 h-6 text-white" />
            </button>
            <img src={showFullImage} alt="" className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
          </div>
        )}
      </>
    );
  }

  // ── OTHER's messages (left-aligned, with avatar column) ──
  return (
    <>
      {dateSep}
      {/* Name row — only on first message of group */}
      {!isGrouped && (
        <div className={`flex items-center gap-1.5 mb-0.5 ml-10 ${isGrouped ? 'mt-0.5' : 'mt-2'}`}>
          <span className="text-[12px] font-semibold text-gray-600 dark:text-gray-400">{message.senderName}</span>
        </div>
      )}
      <div className={`flex items-end gap-2 group ${isGrouped ? 'mt-0.5' : ''}`}>
        {/* Avatar column — fixed w-8, shows avatar on first msg only */}
        <div className="w-8 flex-shrink-0">
          {!isGrouped && renderAvatar(message)}
        </div>

        {/* Bubble column */}
        <div className="max-w-[65%] relative">
          {/* Reply preview */}
          {message.replyTo && (
            <div className="mb-1">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100/80 dark:bg-gray-800/80 rounded-lg border-l-2 border-blue-400 max-w-full">
                <CornerUpLeft className="w-3 h-3 text-blue-400 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold text-blue-600 block">{message.replyTo.senderName}</span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate block">{message.replyTo.content}</span>
                </div>
              </div>
            </div>
          )}

          {/* Pinned indicator */}
          {message.isPinned && (
            <div className="flex items-center gap-1 text-[10px] text-amber-600 mb-0.5">
              <Pin className="w-2.5 h-2.5" />
              <span>Tin nhắn đã ghim</span>
            </div>
          )}

          {/* Hidden badge for admin */}
          {message.isHidden && isAdmin && (
            <div className="flex items-center gap-1 text-[10px] text-red-500 mb-0.5">
              <Shield className="w-2.5 h-2.5" />
              <span>Đã ẩn bởi Admin{message.hiddenReason ? `: ${message.hiddenReason}` : ''}</span>
            </div>
          )}

          <div className="relative">
            {/* Message bubble */}
            <div className={`${getBubbleRadius()} px-3 py-2 bg-[#e4e6eb] dark:bg-[#3a3b3c] text-gray-900 dark:text-gray-100 ${message.isHidden && isAdmin ? 'opacity-60' : ''}`}>
              {(message.type === 'TEXT' || !message.type) && (
                <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">{message.content}</p>
              )}
              {message.type === 'IMAGE' && message.attachments && (
                <div className="space-y-1">
                  {message.attachments.map((att, idx) => {
                    const fullUrl = getFullUrl(att.url);
                    return (
                      <div key={idx} className="rounded-lg overflow-hidden">
                        <img src={fullUrl} alt={att.name} className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setShowFullImage(fullUrl)} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    );
                  })}
                  {message.content && <p className="whitespace-pre-wrap break-words mt-1 text-[15px]">{message.content}</p>}
                </div>
              )}
              {message.type === 'FILE' && message.attachments && (
                <div className="space-y-1">
                  {message.attachments.map((att, idx) => {
                    const fullUrl = getFullUrl(att.url);
                    return (
                      <a key={idx} href={fullUrl} download={att.name}
                        className="flex items-center gap-2 p-2 rounded-xl bg-white/60 hover:bg-white/80 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{att.name}</p>
                          <p className="text-[11px] opacity-60">{(att.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <Download className="w-4 h-4 opacity-50" />
                      </a>
                    );
                  })}
                  {message.content && <p className="whitespace-pre-wrap break-words mt-1 text-[15px]">{message.content}</p>}
                </div>
              )}
              {message.isEdited && <span className="text-[10px] text-gray-400">(đã chỉnh sửa)</span>}
            </div>

            {/* Context menu button */}
            <div ref={menuRef} className="absolute top-0 -right-7 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setShowMenu(!showMenu)}
                className="w-6 h-6 rounded-full bg-white/80 dark:bg-gray-700/80 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-center transition-colors">
                <MoreHorizontal className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {showMenu && (
                <div className="absolute z-50 left-0 top-7 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-150">
                  {menuItems.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <button key={idx} onClick={item.onClick}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${(item as any).danger ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30' : 'text-gray-700 dark:text-gray-300'}`}>
                        <Icon className="w-3.5 h-3.5" />{item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick reaction picker */}
            {showReactions && (
              <div ref={menuRef} className="absolute z-50 left-0 -top-10 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 flex gap-0.5 animate-in fade-in zoom-in-95 duration-150">
                {REACTION_EMOJIS.map((emoji) => (
                  <button key={emoji} onClick={() => { onReact?.(message._id, emoji); setShowReactions(false); }}
                    className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-lg hover:scale-125 transition-transform">
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Reactions display */}
            {Object.keys(groupedReactions).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {Object.entries(groupedReactions).map(([emoji, data]) => (
                  <button key={emoji} onClick={() => onReact?.(message._id, emoji)}
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border ${data.hasOwn ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                    title={data.users.join(', ')}>
                    <span>{emoji}</span>
                    {data.count > 1 && <span className="text-[10px] font-medium">{data.count}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Time */}
          {!isGrouped && (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[11px] text-gray-400 dark:text-gray-500" title={formatDate(message.createdAt)}>
                {formatTime(message.createdAt)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Full image lightbox */}
      {showFullImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setShowFullImage(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
            <X className="w-6 h-6 text-white" />
          </button>
          <img src={showFullImage} alt="" className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}

// Helper: render avatar
function renderAvatar(message: Message) {
  const fullUrl = message.senderAvatar ? getFullUrl(message.senderAvatar) : '';
  if (fullUrl) {
    return <img src={fullUrl} alt="" className="w-7 h-7 rounded-full object-cover" />;
  }
  // Generate gradient avatar from name
  const initial = message.senderName?.[0]?.toUpperCase() || '?';
  const colors = [
    'from-blue-400 to-indigo-500',
    'from-pink-400 to-rose-500',
    'from-green-400 to-emerald-500',
    'from-amber-400 to-orange-500',
    'from-purple-400 to-violet-500',
    'from-cyan-400 to-teal-500',
  ];
  const colorIdx = message.senderName?.charCodeAt(0) % colors.length || 0;
  return (
    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${colors[colorIdx]} flex items-center justify-center`}>
      <span className="text-[10px] font-bold text-white">{initial}</span>
    </div>
  );
}

// Helper: render role badge — only show for Admin (important info), hide for buyer/seller
function renderRoleBadge(role: string) {
  if (role === 'ADMIN') {
    return <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-semibold">Admin</span>;
  }
  // Don't show badge for BUYER or SELLER — not useful info in the chat context
  return null;
}
