import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getUnreadCount,
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../../services/notificationService';
import {
  Menu,
  Bell,
  Search,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  LogOut,
  User,
  CheckCircle2,
  Calendar,
  MessageSquareWarning,
  CreditCard,
  KeyRound,
  Utensils,
  Shield,
  Clock,
  CheckCheck,
  ExternalLink,
} from 'lucide-react';

export default function Topbar({ onToggleSidebar }) {
  const { user, role, logout, login } = useAuth();
  const navigate = useNavigate();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

  // Notification States
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const notifRef = useRef(null);

  // Quick Role Switching Demo Accounts
  const demoAccounts = [
    { role: 'ADMIN', name: 'System Admin', email: 'admin@hostel.edu', badge: 'bg-rose-500/20 text-rose-300' },
    { role: 'WARDEN', name: 'Chief Warden', email: 'warden@hostel.edu', badge: 'bg-amber-500/20 text-amber-300' },
    { role: 'MESS_MANAGER', name: 'Mess Manager', email: 'mess@hostel.edu', badge: 'bg-emerald-500/20 text-emerald-300' },
    { role: 'ACCOUNTANT', name: 'Chief Accountant', email: 'accounts@hostel.edu', badge: 'bg-cyan-500/20 text-cyan-300' },
    { role: 'STUDENT', name: 'Aarav Patel (Student)', email: 'aarav.patel@student.edu', badge: 'bg-indigo-500/20 text-indigo-300' },
  ];

  const handleQuickSwitch = async (account) => {
    setShowRoleMenu(false);
    await login(account.email, 'Password@123');
  };

  // Poll for Unread Count every 20 seconds
  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const res = await getUnreadCount();
      setUnreadCount(res.data?.unreadCount || 0);
    } catch (err) {
      console.warn('Could not fetch unread notification count:', err.message);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 20000);
    return () => clearInterval(interval);
  }, [user]);

  // Fetch recent notifications when dropdown is opened
  const handleToggleNotifications = async () => {
    const nextState = !showNotificationMenu;
    setShowNotificationMenu(nextState);
    if (nextState) {
      try {
        setLoadingNotifs(true);
        const res = await getUnreadNotifications({ limit: 6 });
        setRecentNotifications(res.data || []);
      } catch (err) {
        console.warn('Could not fetch unread notifications:', err.message);
      } finally {
        setLoadingNotifs(false);
      }
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotificationMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Mark Single As Read
  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.is_read) {
        await markNotificationAsRead(notif.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      setShowNotificationMenu(false);
      if (notif.link) {
        navigate(notif.link);
      } else {
        navigate('/notifications');
      }
    } catch (err) {
      console.error('Error opening notification:', err);
    }
  };

  // Handle Mark All As Read
  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setRecentNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'LEAVE':
        return <Calendar className="w-3.5 h-3.5 text-amber-400" />;
      case 'COMPLAINT':
        return <MessageSquareWarning className="w-3.5 h-3.5 text-rose-400" />;
      case 'FEES':
        return <CreditCard className="w-3.5 h-3.5 text-emerald-400" />;
      case 'ROOM':
        return <KeyRound className="w-3.5 h-3.5 text-blue-400" />;
      case 'MESS':
        return <Utensils className="w-3.5 h-3.5 text-orange-400" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const diffMins = Math.floor((new Date() - date) / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${Math.floor(diffHours / 24)}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#0c1222]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 lg:px-8 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Search */}
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative max-w-md w-full hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search students, rooms, bills, tickets..."
            className="w-full pl-10 pr-4 py-1.5 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500/80 transition-colors"
          />
        </div>
      </div>

      {/* Right: Actions, Switcher, Notifications Bell, User */}
      <div className="flex items-center gap-3">
        {/* Quick Role Switcher Button */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-semibold transition-all duration-200"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Switch Role</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-2 border-b border-slate-800 mb-1">
                <p className="text-xs font-semibold text-white">Live Role Switching</p>
                <p className="text-[11px] text-slate-400">Instantly switch between database personas</p>
              </div>
              <div className="space-y-1">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.role}
                    onClick={() => handleQuickSwitch(acc)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors ${
                      role === acc.role
                        ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{acc.name}</p>
                      <p className="text-[10px] text-slate-400">{acc.email}</p>
                    </div>
                    {role === acc.role ? (
                      <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${acc.badge}`}>
                        {acc.role}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Real-Time Notification Bell & Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleToggleNotifications}
            className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-[#0c1222] animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotificationMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Dropdown Header */}
              <div className="p-3.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs font-bold text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Notification Items List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                {loadingNotifs ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    <p>Loading alerts...</p>
                  </div>
                ) : recentNotifications.length === 0 ? (
                  <div className="py-8 px-4 text-center">
                    <CheckCircle2 className="w-7 h-7 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">No new notifications</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">You're all caught up!</p>
                  </div>
                ) : (
                  recentNotifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className="p-3 hover:bg-slate-800/80 transition-colors cursor-pointer flex items-start gap-3"
                    >
                      <div className="p-2 rounded-xl bg-slate-800 shrink-0 border border-slate-700">
                        {getNotificationIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-slate-200 truncate">{n.title}</p>
                          <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                            {formatTime(n.created_at)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                          {n.message}
                        </p>
                      </div>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer: View All Notifications Link */}
              <div className="p-2.5 bg-slate-950/70 border-t border-slate-800 text-center">
                <button
                  onClick={() => {
                    setShowNotificationMenu(false);
                    navigate('/notifications');
                  }}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1.5 transition-colors py-1 px-3 rounded-lg hover:bg-indigo-500/10"
                >
                  <span>View All Notifications</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-800/60 transition-colors"
          >
            <img
              src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || user?.fullName || 'User')}&background=4f46e5&color=fff`}
              alt={user?.name || user?.fullName}
              className="w-8 h-8 rounded-full object-cover border border-slate-700"
            />
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-white leading-tight">{(user?.name || user?.fullName)?.split(' ')[0]}</p>
              <p className="text-[10px] text-indigo-400 font-mono">{role}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50">
              <div className="p-3 border-b border-slate-800">
                <p className="text-xs font-bold text-white">{user?.name || user?.fullName}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/profile');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <User className="w-4 h-4 text-indigo-400" />
                  <span>My Profile</span>
                </button>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/notifications');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <Bell className="w-4 h-4 text-indigo-400" />
                  <span>My Notifications</span>
                </button>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
