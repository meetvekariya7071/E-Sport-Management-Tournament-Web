import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Trophy,
  ShieldAlert,
  Flame,
  UserPlus,
  AlertCircle,
  Clock,
  ExternalLink,
  X
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { notificationApi, NotificationItem } from '../services/notification.service';

export const NotificationBell: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Initial fetch and WebSocket connection
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    // Fetch unread count initially
    const loadUnreadCount = async () => {
      try {
        const count = await notificationApi.getUnreadCount();
        setUnreadCount(count);
      } catch (err) {
        // quiet fallback
      }
    };
    loadUnreadCount();

    // Socket.io connection
    const socketUrl =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000'
        : window.location.origin;

    const socket: Socket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join:user', user.id);
    });

    socket.on('notification:new', (newNotif: NotificationItem) => {
      setUnreadCount((prev) => prev + 1);
      setNotifications((prev) => [newNotif, ...prev.slice(0, 19)]);
    });

    return () => {
      socket.emit('leave:user', user.id);
      socket.disconnect();
    };
  }, [isAuthenticated, user?.id]);

  // Fetch list when dropdown opens
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchNotifications();
    }
  }, [isOpen, isAuthenticated]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationApi.getNotifications({ limit: 15 });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notif: NotificationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationApi.markAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === notif.id ? { ...item, isRead: true } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      await notificationApi.markAsRead(notif.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((item) => (item.id === notif.id ? { ...item, isRead: true } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'INVITE':
        return <UserPlus className="w-4 h-4 text-emerald-400" />;
      case 'MATCH_START':
        return <Trophy className="w-4 h-4 text-amber-400" />;
      case 'SCORE_UPDATE':
        return <Flame className="w-4 h-4 text-cyan-400" />;
      case 'BAN':
        return <ShieldAlert className="w-4 h-4 text-red-400" />;
      case 'DISPUTE':
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors relative focus:outline-none"
      >
        <Bell className="w-5 h-5 transition-transform hover:scale-105" />
        {unreadCount > 0 && (
          <>
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping"></span>
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] text-[10px] font-bold font-mono bg-cyan-500 text-black rounded-full border border-slate-900 shadow-glow-cyan flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[32rem] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-2">
              <span className="font-heading font-semibold text-sm text-white tracking-wide">
                NOTIFICATIONS
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-full">
                  {unreadCount} NEW
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-300 rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-800/60">
            {loading ? (
              <div className="py-10 text-center text-slate-500 text-xs">
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading alerts...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                <p className="text-xs text-slate-400 font-medium">No alerts right now</p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Match updates, invites, and verifications will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 transition-colors cursor-pointer flex gap-3 items-start relative hover:bg-slate-800/50 ${
                    !notif.isRead ? 'bg-cyan-950/20' : 'bg-transparent'
                  }`}
                >
                  {/* Unread indicator dot */}
                  {!notif.isRead && (
                    <span className="absolute left-1.5 top-5 w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                  )}

                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center shrink-0 mt-0.5">
                    {getTypeIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4
                        className={`text-xs font-semibold truncate ${
                          !notif.isRead ? 'text-white' : 'text-slate-300'
                        }`}
                      >
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-mono flex items-center gap-0.5 shrink-0">
                        <Clock className="w-2.5 h-2.5" />
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1">
                      <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500">
                        {notif.type.replace('_', ' ')}
                      </span>

                      {!notif.isRead && (
                        <button
                          onClick={(e) => handleMarkAsRead(notif, e)}
                          title="Mark read"
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
                        >
                          <Check className="w-3 h-3" />
                          <span>Dismiss</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
