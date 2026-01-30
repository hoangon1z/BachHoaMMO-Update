// Notification utilities for chat messages

let audioContext: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;
let originalTitle = '';
let unreadMessageCount = 0;
let titleBlinkInterval: NodeJS.Timeout | null = null;

// Initialize audio on first user interaction
export function initNotificationSound() {
  if (typeof window === 'undefined') return;
  
  // Store original title
  if (!originalTitle) {
    originalTitle = document.title;
  }

  // Preload audio
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Load the sound file
      fetch('/sounds/newmessage.wav')
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext!.decodeAudioData(arrayBuffer))
        .then(buffer => {
          audioBuffer = buffer;
          console.log('[Notification] Sound loaded successfully');
        })
        .catch(err => {
          console.warn('[Notification] Could not load notification sound:', err);
        });
    } catch (err) {
      console.warn('[Notification] Web Audio API not supported');
    }
  }
}

// Play notification sound
export function playNotificationSound() {
  if (typeof window === 'undefined') return;

  // Try Web Audio API first (more reliable)
  if (audioContext && audioBuffer) {
    try {
      // Resume context if suspended (browser autoplay policy)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);
      return;
    } catch (err) {
      console.warn('[Notification] Web Audio playback failed:', err);
    }
  }

  // Fallback to HTML5 Audio
  try {
    const audio = new Audio('/sounds/newmessage.wav');
    audio.volume = 0.5;
    audio.play().catch(err => {
      console.warn('[Notification] HTML5 Audio playback failed:', err);
    });
  } catch (err) {
    console.warn('[Notification] Could not play notification sound');
  }
}

// Update browser tab title with unread count
export function updateTabTitle(count: number, hasNewMessage = false) {
  if (typeof window === 'undefined') return;

  unreadMessageCount = count;

  // Clear any existing blink interval
  if (titleBlinkInterval) {
    clearInterval(titleBlinkInterval);
    titleBlinkInterval = null;
  }

  if (count > 0) {
    // Show count in title
    document.title = `(${count}) Tin nhắn mới - BachHoaMMO`;
    
    // Blink effect for new message
    if (hasNewMessage && !document.hasFocus()) {
      let showCount = true;
      titleBlinkInterval = setInterval(() => {
        document.title = showCount 
          ? `(${count}) Tin nhắn mới - BachHoaMMO`
          : '💬 Tin nhắn mới!';
        showCount = !showCount;
      }, 1000);
    }
  } else {
    // Restore original title
    document.title = originalTitle || 'BachHoaMMO';
  }
}

// Reset title when window gains focus
export function setupFocusHandler() {
  if (typeof window === 'undefined') return;

  const handleFocus = () => {
    if (titleBlinkInterval) {
      clearInterval(titleBlinkInterval);
      titleBlinkInterval = null;
    }
    // Keep the count but stop blinking
    if (unreadMessageCount > 0) {
      document.title = `(${unreadMessageCount}) Tin nhắn mới - BachHoaMMO`;
    }
  };

  window.addEventListener('focus', handleFocus);
  return () => window.removeEventListener('focus', handleFocus);
}

// Request browser notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// Show browser notification
export function showBrowserNotification(title: string, body: string, icon?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  // Don't show if page is focused
  if (document.hasFocus()) {
    return;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: icon || '/logo.png',
      badge: '/logo.png',
      tag: 'chat-message', // Prevents multiple notifications stacking
      renotify: true,
    } as NotificationOptions);

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  } catch (err) {
    console.warn('[Notification] Could not show browser notification:', err);
  }
}

// Combined notification function
export function notifyNewMessage(senderName: string, messagePreview: string, currentUserId?: string, senderId?: string) {
  // Don't notify for own messages
  if (currentUserId && senderId && currentUserId === senderId) {
    return;
  }

  // Play sound
  playNotificationSound();

  // Update tab title (this will be called from useChat with the actual count)
  // Here we just trigger the notification

  // Show browser notification if page not focused
  if (!document.hasFocus()) {
    showBrowserNotification(
      `${senderName} đã gửi tin nhắn`,
      messagePreview.length > 50 ? messagePreview.substring(0, 50) + '...' : messagePreview
    );
  }
}

// Auction notification - outbid
export function notifyAuctionOutbid(position: number, amount: number, bidderName: string) {
  // Play sound
  playNotificationSound();

  // Show browser notification
  showBrowserNotification(
    '🔔 Bạn đã bị vượt giá!',
    `${bidderName} đặt ${amount.toLocaleString('vi-VN')}đ cho vị trí #${position}`
  );
}

// Auction notification - winner
export function notifyAuctionWinner(position: number, amount: number) {
  // Play sound
  playNotificationSound();

  // Show browser notification
  showBrowserNotification(
    '🏆 Chúc mừng bạn đã thắng!',
    `Vị trí #${position} với giá ${amount.toLocaleString('vi-VN')}đ`
  );
}

// Initialize on module load (client-side only)
if (typeof window !== 'undefined') {
  // Setup focus handler
  setupFocusHandler();
  
  // Initialize audio on first user interaction
  const initOnInteraction = () => {
    initNotificationSound();
    document.removeEventListener('click', initOnInteraction);
    document.removeEventListener('keydown', initOnInteraction);
  };
  
  document.addEventListener('click', initOnInteraction);
  document.addEventListener('keydown', initOnInteraction);
}
