import React, { useState, useEffect, useRef } from 'react';
import useAuth from '../hooks/useAuth';
import { formatRole, formatTimeAgo } from '../utils/formatters';
import { notificationService } from '../services/dataService';
import {
  LogOut,
  ShieldCheck,
  UserCog,
  User,
  Bell,
  Check,
  CheckCheck,
  Clock,
  MessageSquare,
  AlertCircle,
  FolderPlus,
  UserMinus,
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await notificationService.getAll();
      if (res.success) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for background deadline or new event alerts
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'TASK_ASSIGNED':
      case 'TASK_STATUS_CHANGED':
        return <Clock className="w-3.5 h-3.5 text-navy-950" />;
      case 'COMMENT_ADDED':
        return <MessageSquare className="w-3.5 h-3.5 text-blue-600" />;
      case 'DEADLINE_APPROACHING':
        return <AlertCircle className="w-3.5 h-3.5 text-amber-600" />;
      case 'PROJECT_MEMBER_ADDED':
        return <FolderPlus className="w-3.5 h-3.5 text-emerald-600" />;
      case 'PROJECT_MEMBER_REMOVED':
        return <UserMinus className="w-3.5 h-3.5 text-rose-600" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'ADMIN':
        return <ShieldCheck className="w-4 h-4 text-white" />;
      case 'PROJECT_MANAGER':
        return <UserCog className="w-4 h-4 text-white" />;
      default:
        return <User className="w-4 h-4 text-white" />;
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Tagline */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-navy-950 flex items-center justify-center text-white shadow-sm font-bold text-base">
              K
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold tracking-tight text-navy-950">KnowTheTask</span>
                <span className="text-xs px-2 py-0.5 bg-slate-100 text-navy-900 border border-slate-200 rounded font-semibold">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Project & Team Management Platform
              </p>
            </div>
          </div>

          {/* User profile, Notifications & Logout */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            
            {/* Notification Bell Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(!isOpen);
                  if (!isOpen) fetchNotifications();
                }}
                className={`relative p-2 rounded-lg border transition-colors cursor-pointer ${
                  isOpen
                    ? 'bg-slate-100 border-slate-300 text-navy-950'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-navy-950 hover:bg-slate-50'
                }`}
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown Popover */}
              {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-xs font-bold text-navy-950">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="inline-flex items-center space-x-1 text-[11px] font-semibold text-navy-950 hover:text-navy-900 cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5 mr-1" />
                        <span>Mark all as read</span>
                      </button>
                    )}
                  </div>

                  {/* Notification List */}
                  <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="py-10 text-center px-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                          <Bell className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-semibold text-navy-950">All caught up!</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          You don't have any notifications right now.
                        </p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3.5 flex items-start justify-between gap-3 transition-colors ${
                            !n.is_read
                              ? 'bg-blue-50/40 hover:bg-blue-50/60 border-l-2 border-navy-900'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start space-x-2.5 flex-1 min-w-0">
                            <div className="p-1.5 rounded-lg bg-slate-100 shrink-0 mt-0.5">
                              {getNotificationIcon(n.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <h4
                                  className={`text-xs truncate ${
                                    !n.is_read
                                      ? 'font-bold text-navy-950'
                                      : 'font-medium text-slate-700'
                                  }`}
                                >
                                  {n.title}
                                </h4>
                                {!n.is_read && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-navy-950 shrink-0"></span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-600 mt-0.5 break-words leading-relaxed">
                                {n.message}
                              </p>
                              <span className="text-[10px] text-slate-400 font-medium block mt-1">
                                {formatTimeAgo(n.created_at)}
                              </span>
                            </div>
                          </div>

                          {!n.is_read && (
                            <button
                              type="button"
                              onClick={(e) => handleMarkAsRead(n.id, e)}
                              className="shrink-0 p-1 text-slate-400 hover:text-navy-950 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              title="Mark as read"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Details */}
            <div className="flex items-center space-x-3 border-r border-slate-200 pr-3 sm:pr-4">
              <div className="w-9 h-9 rounded-full bg-navy-900 flex items-center justify-center text-white">
                {getRoleIcon(user?.role)}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-sm font-semibold text-navy-950 leading-tight">
                  {user?.name}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {formatRole(user?.role)} &bull; {user?.email}
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold text-navy-950 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm cursor-pointer"
              title="Logout from session"
            >
              <LogOut className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

