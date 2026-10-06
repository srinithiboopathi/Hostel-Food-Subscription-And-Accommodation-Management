import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  broadcastAnnouncement,
} from '../../services/notificationService';
import {
  Bell,
  CheckCircle2,
  Clock,
  Trash2,
  CheckCheck,
  Search,
  Filter,
  RefreshCw,
  X,
  AlertCircle,
  ExternalLink,
  MessageSquareWarning,
  CreditCard,
  KeyRound,
  Utensils,
  Calendar,
  Shield,
  Loader2,
  Sliders,
  Send,
  Sparkles,
  Info,
  CalendarRange,
} from 'lucide-react';

const NOTIFICATION_CATEGORIES = [
  { value: '', label: 'All Categories', icon: Bell, color: 'text-slate-400 bg-slate-800/80 border-slate-700' },
  { value: 'FEES', label: 'Fees & Payments', icon: CreditCard, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { value: 'ROOM', label: 'Accommodation', icon: KeyRound, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  { value: 'MESS', label: 'Food & Mess', icon: Utensils, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { value: 'COMPLAINT', label: 'Complaints', icon: MessageSquareWarning, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
  { value: 'LEAVE', label: 'Leave & Out-Pass', icon: Calendar, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  { value: 'SYSTEM', label: 'System & Security', icon: Shield, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
];

export default function NotificationsPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  // Data States
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Filters
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'UNREAD' | 'READ'
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Preferences Modal State
  const [showPrefModal, setShowPrefModal] = useState(false);
  const [prefLoading, setPrefLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    paymentAlerts: true,
    accommodationAlerts: true,
    foodAlerts: true,
    complaintAlerts: true,
    leaveAlerts: true,
    systemAlerts: true,
  });

  // Broadcast Modal State (Admin / Warden)
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastData, setBroadcastData] = useState({
    title: '',
    message: '',
    type: 'SYSTEM',
    targetRole: 'ALL',
    link: '',
  });

  // Fetch Notifications
  const fetchNotificationsData = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const isReadParam = activeTab === 'UNREAD' ? 'false' : activeTab === 'READ' ? 'true' : undefined;

      const params = {
        page,
        limit: 15,
        search: search.trim() || undefined,
        isRead: isReadParam,
        type: selectedCategory || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      const [listRes, countRes] = await Promise.all([
        getNotifications(params),
        getUnreadCount(),
      ]);

      setNotifications(listRes.data?.data || listRes.data || []);
      if (listRes.data?.pagination) {
        setPagination(listRes.data.pagination);
      }
      setUnreadCount(countRes.data?.data?.unreadCount || countRes.data?.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.response?.data?.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificationsData(1);
  }, [activeTab, selectedCategory, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchNotificationsData(1);
  };

  // Mark single as read
  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking as read:', err);
      setError(err.response?.data?.message || 'Failed to mark as read.');
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      setActionLoading(true);
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
      setSuccessMessage('All notifications marked as read.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error marking all as read:', err);
      setError(err.response?.data?.message || 'Failed to mark all as read.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete notification
  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      setSuccessMessage('Notification removed.');
      setTimeout(() => setSuccessMessage(null), 3000);
      const countRes = await getUnreadCount();
      setUnreadCount(countRes.data?.data?.unreadCount || countRes.data?.unreadCount || 0);
    } catch (err) {
      console.error('Error deleting notification:', err);
      setError(err.response?.data?.message || 'Failed to delete notification.');
    }
  };

  // Handle clicking notification card
  const handleNotificationClick = (notif) => {
    if (!notif.is_read) {
      handleMarkAsRead(notif.id);
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  // Open Preferences Modal
  const handleOpenPreferences = async () => {
    setShowPrefModal(true);
    try {
      setPrefLoading(true);
      const res = await getNotificationPreferences();
      if (res.data?.data) {
        setPreferences(res.data.data);
      }
    } catch (err) {
      console.error('Could not load preferences:', err);
    } finally {
      setPrefLoading(false);
    }
  };

  // Save Preferences
  const handleSavePreferences = async () => {
    try {
      setPrefLoading(true);
      await updateNotificationPreferences(preferences);
      setSuccessMessage('Notification preferences updated.');
      setShowPrefModal(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Could not save preferences:', err);
      setError('Failed to update preferences.');
    } finally {
      setPrefLoading(false);
    }
  };

  // Dispatch Broadcast Announcement (Admin, Warden)
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastData.title || !broadcastData.message) return;
    try {
      setBroadcastLoading(true);
      await broadcastAnnouncement(broadcastData);
      setSuccessMessage('Announcement broadcasted successfully to targeted users.');
      setShowBroadcastModal(false);
      setBroadcastData({ title: '', message: '', type: 'SYSTEM', targetRole: 'ALL', link: '' });
      fetchNotificationsData(1);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Could not broadcast announcement:', err);
      setError(err.response?.data?.message || 'Failed to dispatch broadcast.');
    } finally {
      setBroadcastLoading(false);
    }
  };

  // Type Icon helper
  const getTypeConfig = (type) => {
    const raw = (type || '').toUpperCase();
    if (raw === 'FEES' || raw === 'PAYMENT') {
      return { label: 'Fees & Payment', icon: CreditCard, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    }
    if (raw === 'ROOM' || raw === 'ACCOMMODATION') {
      return { label: 'Accommodation', icon: KeyRound, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
    }
    if (raw === 'MESS' || raw === 'FOOD') {
      return { label: 'Food & Mess', icon: Utensils, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    }
    if (raw === 'COMPLAINT') {
      return { label: 'Complaint', icon: MessageSquareWarning, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
    }
    if (raw === 'LEAVE') {
      return { label: 'Leave', icon: Calendar, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
    }
    if (raw === 'SYSTEM' || raw === 'STUDENT') {
      return { label: 'System', icon: Shield, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' };
    }
    return { label: 'Notice', icon: Bell, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' };
  };

  const formatTimestamp = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const canBroadcast = role === 'ADMIN' || role === 'WARDEN';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800/80 rounded-2xl text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              Live Updates
            </span>
            {unreadCount > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-300 text-[11px] font-medium animate-pulse">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-2 text-white">
            Notification Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time alerts for room allocations, food subscriptions, fee payments, complaints, and leave requests.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5 shrink-0">
          {canBroadcast && (
            <button
              onClick={() => setShowBroadcastModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 border border-purple-500/40 text-xs font-semibold transition-all hover:scale-[1.02]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Broadcast Notice</span>
            </button>
          )}

          <button
            onClick={handleOpenPreferences}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all hover:scale-[1.02]"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Preferences</span>
          </button>

          <button
            onClick={() => fetchNotificationsData(pagination.page)}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all hover:scale-[1.02]"
            title="Refresh Notifications"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02]"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 text-xs font-medium flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-700/50 text-rose-300 text-xs font-medium flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Status Tab Navigation & Category Filters */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 border-b border-slate-800 pb-3">
          {/* Read/Unread Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              All Alerts
            </button>
            <button
              onClick={() => setActiveTab('UNREAD')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'UNREAD'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('READ')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'READ'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Read
            </button>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by title, message..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition-all"
            />
          </form>
        </div>

        {/* Category Pills & Date Pickers */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Category Pills */}
          <div className="flex items-center flex-wrap gap-2">
            {NOTIFICATION_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    isSelected
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 font-semibold shadow-xs'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Date Range Filters */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-xl">
              <CalendarRange className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-slate-300 text-[11px] focus:outline-hidden"
              />
              <span className="text-slate-600">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-slate-300 text-[11px] focus:outline-hidden"
              />
            </div>

            {(selectedCategory || startDate || endDate || search) && (
              <button
                onClick={() => {
                  setSelectedCategory('');
                  setStartDate('');
                  setEndDate('');
                  setSearch('');
                }}
                className="px-2.5 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all border border-rose-500/20"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications Cards Stream */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
            <p className="text-xs font-medium">Fetching notifications from MySQL...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-white">No Notifications Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              {activeTab === 'UNREAD'
                ? "You're all caught up! No unread notifications found."
                : 'No alerts or notifications match your current filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {notifications.map((notif) => {
              const isUnread = !notif.is_read;
              const typeCfg = getTypeConfig(notif.type);
              const TypeIcon = typeCfg.icon;

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-all cursor-pointer ${
                    isUnread
                      ? 'bg-slate-800/40 hover:bg-slate-800/70 border-l-4 border-l-indigo-500'
                      : 'hover:bg-slate-800/30 bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-start gap-3.5 max-w-3xl">
                    {/* Category Icon Badge */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${typeCfg.color}`}>
                      <TypeIcon className="w-4 h-4" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`text-xs ${isUnread ? 'font-bold text-white' : 'font-semibold text-slate-300'}`}>
                          {notif.title}
                        </h4>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 animate-pulse" />
                        )}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          {typeCfg.label}
                        </span>
                        {notif.related_entity_type && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
                            #{notif.related_entity_type}:{notif.related_entity_id || ''}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed">{notif.message}</p>

                      <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-600" />
                          {formatTimestamp(notif.created_at)}
                        </span>
                        {notif.read_at && (
                          <span className="text-slate-600 font-mono">
                            • Read {formatTimestamp(notif.read_at)}
                          </span>
                        )}
                        {notif.link && (
                          <span className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
                            <span>Open Details</span>
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isUnread && (
                      <button
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                        className="p-2 rounded-xl text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/20 border border-slate-700/60 transition-all"
                        title="Mark as read"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={(e) => handleDelete(notif.id, e)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 border border-slate-700/60 transition-all"
                      title="Delete notification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && notifications.length > 0 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing {notifications.length} of {pagination.total} notifications
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchNotificationsData(pagination.page - 1)}
                className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition-all"
              >
                Previous
              </button>
              <span className="px-2 font-mono text-[11px] text-slate-400">
                Page {pagination.page} / {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchNotificationsData(pagination.page + 1)}
                className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notification Preferences Modal */}
      {showPrefModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Notification Preferences</h3>
              </div>
              <button onClick={() => setShowPrefModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Customize which notifications you wish to receive. Critical account and billing security alerts remain permanently active.
            </p>

            <div className="space-y-3">
              {[
                { key: 'paymentAlerts', label: 'Payment & Fee Alerts', desc: 'Receipts, overdue dues and fee updates' },
                { key: 'accommodationAlerts', label: 'Accommodation Updates', desc: 'Room allocations, bed transfers and vacating' },
                { key: 'foodAlerts', label: 'Food & Mess Updates', desc: 'Subscription renewals, pauses and menu changes' },
                { key: 'complaintAlerts', label: 'Complaint Grievances', desc: 'Ticket status transitions and staff resolution notes' },
                { key: 'leaveAlerts', label: 'Leave & Out-Pass', desc: 'Approvals, rejections and check-in records' },
                { key: 'systemAlerts', label: 'System & Security', desc: 'Administrative announcements and portal alerts' },
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 cursor-pointer">
                  <div>
                    <p className="text-xs font-semibold text-white">{item.label}</p>
                    <p className="text-[11px] text-slate-400">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences[item.key] ?? true}
                    onChange={(e) => setPreferences({ ...preferences, [item.key]: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500"
                  />
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowPrefModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreferences}
                disabled={prefLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
              >
                {prefLoading ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Announcement Modal (Admin / Warden) */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSendBroadcast} className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Broadcast Announcement</h3>
              </div>
              <button type="button" onClick={() => setShowBroadcastModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Target Audience</label>
                <select
                  value={broadcastData.targetRole}
                  onChange={(e) => setBroadcastData({ ...broadcastData, targetRole: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-hidden focus:border-purple-500"
                >
                  <option value="ALL">All Active Users (Campus-wide)</option>
                  <option value="STUDENT">All Students Only</option>
                  <option value="WARDEN">All Wardens</option>
                  <option value="MESS_MANAGER">Mess Managers</option>
                  <option value="ACCOUNTANT">Accountants</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Announcement Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Maintenance Notice or Campus Fest Schedule"
                  value={broadcastData.title}
                  onChange={(e) => setBroadcastData({ ...broadcastData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-hidden focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Message Content *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detailed announcement content..."
                  value={broadcastData.message}
                  onChange={(e) => setBroadcastData({ ...broadcastData, message: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-hidden focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Optional Link / Action Route</label>
                <input
                  type="text"
                  placeholder="e.g. /menu or /hostels"
                  value={broadcastData.link}
                  onChange={(e) => setBroadcastData({ ...broadcastData, link: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-hidden focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={broadcastLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30"
              >
                {broadcastLoading ? 'Dispatching...' : 'Send Broadcast'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
