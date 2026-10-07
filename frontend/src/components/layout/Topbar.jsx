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
    { role: 'ADMIN', name: 'System Admin', email: 'admin@hostel.edu', badge: 'bg-rose-50 text-rose-700 border border-rose-200' },
    { role: 'WARDEN', name: 'Chief Warden', email: 'warden@hostel.edu', badge: 'bg-amber-50 text-amber-700 border border-amber-200' },
    { role: 'MESS_MANAGER', name: 'Mess Manager', email: 'mess@hostel.edu', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    { role: 'ACCOUNTANT', name: 'Chief Accountant', email: 'accounts@hostel.edu', badge: 'bg-teal-50 text-teal-700 border border-teal-200' },
    { role: 'STUDENT', name: 'Aarav Patel (Student)', email: 'aarav.patel@student.edu', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
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
        return <Calendar className="w-3.5 h-3.5 text-amber-600" />;
      case 'COMPLAINT':
        return <MessageSquareWarning className="w-3.5 h-3.5 text-rose-600" />;
      case 'FEES':
        return <CreditCard className="w-3.5 h-3.5 text-emerald-600" />;
      case 'ROOM':
        return <KeyRound className="w-3.5 h-3.5 text-teal-600" />;
      case 'MESS':
        return <Utensils className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-emerald-600" />;
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
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 flex items-center justify-between gap-4 shadow-xs">
      {/* Left: Mobile Toggle & Search */}
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative max-w-md w-full hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search students, rooms, bills, tickets..."
            className="w-full pl-10 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Right: Actions, Switcher, Notifications Bell, User */}
      <div className="flex items-center gap-3">
        {/* Quick Role Switcher Button */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline">Switch Role</span>
            <ChevronDown className="w-3 h-3 text-emerald-600" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-2.5 border-b border-slate-100 mb-1">
                <p className="text-xs font-bold text-slate-900">Live Role Switching</p>
                <p className="text-[11px] text-slate-500">Instantly test different database personas</p>
              </div>
              <div className="space-y-1">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.role}
                    onClick={() => handleQuickSwitch(acc)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                      role === acc.role
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{acc.name}</p>
                      <p className="text-[10px] text-slate-400">{acc.email}</p>
                    </div>
                    {role === acc.role ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${acc.badge}`}>
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
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotificationMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Dropdown Header */}
              <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Notification Items List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {loadingNotifs ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    <p>Loading alerts...</p>
                  </div>
                ) : recentNotifications.length === 0 ? (
                  <div className="py-8 px-4 text-center">
                    <img
                      src="/images/illustrations/empty-notifications.svg"
                      alt="No notifications"
                      className="w-20 h-20 mx-auto mb-2 opacity-80"
                    />
                    <p className="text-xs font-semibold text-slate-700">No new notifications</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">You're all caught up!</p>
                  </div>
                ) : (
                  recentNotifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className="p-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3"
                    >
                      <div className="p-2 rounded-xl bg-slate-50 shrink-0 border border-slate-200">
                        {getNotificationIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-slate-800 truncate">{n.title}</p>
                          <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                            {formatTime(n.created_at)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                          {n.message}
                        </p>
                      </div>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer: View All Notifications Link */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                <button
                  onClick={() => {
                    setShowNotificationMenu(false);
                    navigate('/notifications');
                  }}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1.5 transition-colors py-1 px-3 rounded-lg hover:bg-emerald-50 cursor-pointer"
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
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <img
              src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || user?.fullName || 'User')}&background=059669&color=fff`}
              alt={user?.name || user?.fullName}
              className="w-8 h-8 rounded-full object-cover border border-emerald-200 shadow-xs"
            />
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-slate-800 leading-tight">{(user?.name || user?.fullName)?.split(' ')[0]}</p>
              <p className="text-[10px] text-emerald-600 font-semibold">{role}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-50">
              <div className="p-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{user?.name || user?.fullName}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/profile');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 rounded-xl transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>My Profile</span>
                </button>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/notifications');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 rounded-xl transition-colors cursor-pointer"
                >
                  <Bell className="w-4 h-4 text-emerald-600" />
                  <span>My Notifications</span>
                </button>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
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
