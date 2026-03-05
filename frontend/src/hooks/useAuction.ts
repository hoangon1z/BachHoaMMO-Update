'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import { playNotificationSound, notifyAuctionOutbid, notifyAuctionWinner } from '@/lib/notifications';

export interface Position {
  position: number;
  highestBid: {
    id: string;
    amount: number;
    sellerId: string;
    shopName: string;
    shopLogo?: string;
    insuranceLevel?: number;
    insuranceTier?: string | null;
    createdAt: string;
  } | null;
  bidCount: number;
}

export interface Auction {
  id: string;
  weekNumber: number;
  year: number;
  startTime: string;
  endTime: string;
  lastBidAt?: string;
  status: string; // PENDING, ACTIVE, ENDED, CANCELLED
  positions: Position[];
  totalBids: number;
}

export interface BidHistoryItem {
  id: string;
  position: number;
  amount: number;
  status: string;
  shopName: string;
  insuranceLevel?: number;
  insuranceTier?: string | null;
  createdAt: string;
}

export interface AuctionSettings {
  startPrice: number;
  minIncrement: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  cooldownMinutes: number;
  autoCreate: boolean;
  // Insurance discount fields (only available for logged-in sellers)
  insuranceDiscount?: number;
  insuranceLevel?: number;
  insuranceTier?: string | null;
  discountedStartPrice?: number;
}

interface UseAuctionReturn {
  isConnected: boolean;
  auction: Auction | null;
  bidHistory: BidHistoryItem[];
  myBids: any[];
  settings: AuctionSettings | null;
  isLoading: boolean;
  error: string | null;
  outbidNotification: { position: number; amount: number; bidderName: string } | null;
  winnerNotification: { position: number; amount: number } | null;
  // Actions
  placeBid: (position: number, amount: number) => Promise<boolean>;
  refreshAuction: () => Promise<void>;
  clearNotifications: () => void;
}

function resolveSocketUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    return window.location.origin;
  }
  return 'http://localhost:3001';
}

const SOCKET_URL = resolveSocketUrl();

export function useAuction(): UseAuctionReturn {
  const { user, token } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bidHistory, setBidHistory] = useState<BidHistoryItem[]>([]);
  const [myBids, setMyBids] = useState<any[]>([]);
  const [settings, setSettings] = useState<AuctionSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outbidNotification, setOutbidNotification] = useState<{ position: number; amount: number; bidderName: string } | null>(null);
  const [winnerNotification, setWinnerNotification] = useState<{ position: number; amount: number } | null>(null);

  // Fetch initial data
  const refreshAuction = useCallback(async () => {
    try {
      const fetchPromises: Promise<Response>[] = [
        fetch('/api/auction/current'),
        fetch('/api/auction/history?limit=20'),
      ];

      if (token) {
        fetchPromises.push(
          fetch('/api/auction/settings', {
            headers: { Authorization: `Bearer ${token}` },
          })
        );
      } else {
        fetchPromises.push(fetch('/api/admin/settings/auction'));
      }

      const [auctionRes, historyRes, settingsRes] = await Promise.all(fetchPromises);

      const auctionData = await auctionRes.json();
      const historyData = await historyRes.json();
      const settingsData = await settingsRes.json();

      if (auctionData.success) {
        setAuction(auctionData.auction);
      }
      if (historyData.success) {
        setBidHistory(historyData.history);
      }
      if (settingsData.success) {
        setSettings(settingsData.settings);
      }

      // Fetch my bids if logged in
      if (token) {
        const myBidsRes = await fetch('/api/auction/my-bids', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const myBidsData = await myBidsRes.json();
        if (myBidsData.success) {
          setMyBids(myBidsData.bids);
        }
      }
    } catch (err) {
      console.error('[Auction] Error fetching data:', err);
      setError('Không thể tải dữ liệu đấu giá');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Initialize socket connection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const socket = io(`${SOCKET_URL}/auction`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('[Auction] Connected to Socket.IO');
      setIsConnected(true);
      socket.emit('auction:join');
    });

    socket.on('disconnect', () => {
      console.log('[Auction] Disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[Auction] Connection error:', err);
      setIsConnected(false);
    });

    // Handle auction updates
    socket.on('auction:update', ({ auction: updatedAuction }) => {
      console.log('[Auction] Update received');
      setAuction(updatedAuction);
      refreshAuction();
    });

    // Handle outbid notification
    socket.on('auction:outbid', (data) => {
      console.log('[Auction] Outbid notification:', data);
      setOutbidNotification({
        position: data.position,
        amount: data.newAmount,
        bidderName: data.newBidderName,
      });
      notifyAuctionOutbid(data.position, data.newAmount, data.newBidderName);
      refreshAuction();
    });

    // Handle winner notification
    socket.on('auction:winner', (data) => {
      console.log('[Auction] Winner notification:', data);
      setWinnerNotification({
        position: data.position,
        amount: data.amount,
      });
      notifyAuctionWinner(data.position, data.amount);
    });

    // Handle auction ended
    socket.on('auction:ended', ({ winners }) => {
      console.log('[Auction] Auction ended:', winners);
      refreshAuction();
    });

    socketRef.current = socket;

    // Initial data fetch
    refreshAuction();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, refreshAuction]);

  // Place bid
  const placeBid = useCallback(async (position: number, amount: number): Promise<boolean> => {
    if (!token) {
      setError('Bạn cần đăng nhập để đặt giá');
      return false;
    }

    try {
      setError(null);
      const res = await fetch('/api/auction/bid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ position, amount }),
      });

      const data = await res.json();

      if (data.success) {
        setAuction(data.auction);
        if (data.bid) {
          setMyBids(prev => {
            const exists = prev.find(b => b.position === position);
            if (exists) {
              return prev.map(b => b.position === position ? data.bid : b);
            }
            return [...prev, data.bid];
          });
        }
        return true;
      } else {
        setError(data.message || 'Không thể đặt giá');
        return false;
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
      return false;
    }
  }, [token]);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setOutbidNotification(null);
    setWinnerNotification(null);
    setError(null);
  }, []);

  return {
    isConnected,
    auction,
    bidHistory,
    myBids,
    settings,
    isLoading,
    error,
    outbidNotification,
    winnerNotification,
    placeBid,
    refreshAuction,
    clearNotifications,
  };
}
