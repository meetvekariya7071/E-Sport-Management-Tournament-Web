import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import {
  Bell,
  CheckCheck,
  UserPlus,
  Trophy,
  Award,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NotificationAPI, NotificationItem } from '../api/notification.service';

export const NotificationBell: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const data = await NotificationAPI.getNotifications(1, 20);
      if (data.success) {
        setNotifications(data.items);
        setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      console.error('[NotificationBell] Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    fetchNotifications();

    // Socket real-time connection
    const socketUrl =
      window.location.hostname === 'localhost'
        ? 'http://localhost:5000'
        : window.location.origin;

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_user', user.id);
    });

    socket.on('notification:new', (newNotification: NotificationItem) => {
      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      socket.emit('leave_user', user.id);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user?.id]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await NotificationAPI.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await NotificationAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      try {
        await NotificationAPI.markRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        // Continue navigation regardless
      }
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'INVITE':
        return <UserPlus className="w-4 h-4 text-cyan-400" />;
      case 'MATCH_START':
        return <Trophy className="w-4 h-4 text-amber-400" />;
      case 'SCORE_UPDATE':
        return <Award className="w-4 h-4 text-emerald-400" />;
      case 'BAN':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'DISPUTE_UPDATE':
        return <AlertCircle className="w-4 h-4 text-purple-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        title="Notifications"
        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors relative"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-cyan-500 text-black font-extrabold text-[10px] rounded-full shadow-glow-cyan">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-heading font-bold text-sm text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-mono bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-slate-400 hover:text-cyan-400 flex items-center space-x-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/60">
            {loading && notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <Bell className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">No notifications yet</p>
                <p className="text-[11px] text-slate-600">
                  Matches, team invites, and score updates will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start space-x-3 transition-colors cursor-pointer hover:bg-slate-800/50 ${
                    !notif.isRead ? 'bg-cyan-950/20 border-l-2 border-cyan-400' : 'bg-transparent'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-slate-800 border border-slate-700/60 shrink-0">
                    {getTypeIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs font-semibold truncate ${!notif.isRead ? 'text-white' : 'text-slate-300'}`}>
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                      {notif.message}
                    </p>
                    {notif.link && (
                      <span className="text-[10px] text-cyan-400 hover:underline flex items-center space-x-1 mt-1 font-mono">
                        <span>View details</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  {!notif.isRead && (
                    <button
                      onClick={(e) => handleMarkAsRead(notif.id, e)}
                      title="Mark as read"
                      className="p-1 text-slate-500 hover:text-cyan-400 rounded transition-colors"
                    >
                      <div className="w-2 h-2 rounded-full bg-cyan-400" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
