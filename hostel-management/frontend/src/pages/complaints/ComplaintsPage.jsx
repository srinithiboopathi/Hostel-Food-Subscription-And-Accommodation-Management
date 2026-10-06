import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getComplaints,
  getMyComplaints,
  getComplaintById,
  createComplaint,
  updateComplaint,
  deleteComplaint,
  getComplaintStatistics,
} from '../../services/complaintService';
import { getStudents } from '../../services/studentService';
import {
  MessageSquareWarning,
  Plus,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Wrench,
  Wifi,
  UtensilsCrossed,
  Sparkles,
  Shield,
  Volume2,
  HelpCircle,
  Building2,
  UserCheck,
  Calendar,
  X,
  RefreshCw,
  Loader2,
  User,
  ArrowRight,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  ChevronRight,
  Send,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];

const CATEGORIES = [
  { value: 'ROOM_MAINTENANCE', label: 'Room Maintenance', icon: Building2, color: 'text-amber-500' },
  { value: 'ELECTRICAL', label: 'Electrical & Power', icon: Zap, color: 'text-yellow-500' },
  { value: 'PLUMBING', label: 'Plumbing & Water', icon: Wrench, color: 'text-blue-500' },
  { value: 'MESS_FOOD', label: 'Mess & Food', icon: UtensilsCrossed, color: 'text-orange-500' },
  { value: 'CLEANLINESS', label: 'Cleanliness & Hygiene', icon: Sparkles, color: 'text-teal-500' },
  { value: 'INTERNET', label: 'Wi-Fi & Internet', icon: Wifi, color: 'text-indigo-500' },
  { value: 'SECURITY', label: 'Security & Safety', icon: Shield, color: 'text-rose-500' },
  { value: 'NOISE', label: 'Noise & Disturbance', icon: Volume2, color: 'text-purple-500' },
  { value: 'OTHER', label: 'General / Other', icon: HelpCircle, color: 'text-slate-500' },
];

export default function ComplaintsPage() {
  const { user } = useAuth();
  const isStudent = user?.role === 'STUDENT';
  const canManage = ['ADMIN', 'WARDEN', 'MESS_MANAGER'].includes(user?.role);
  const isAdmin = user?.role === 'ADMIN';

  // Data States
  const [complaints, setComplaints] = useState([]);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showCharts, setShowCharts] = useState(true);

  // Create Complaint Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);
  const initialCreateForm = {
    studentId: '',
    category: 'ELECTRICAL',
    title: '',
    description: '',
    priority: 'MEDIUM',
  };
  const [createForm, setCreateForm] = useState(initialCreateForm);

  // Details & Timeline Modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Update / Assign Modal
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [complaintToUpdate, setComplaintToUpdate] = useState(null);
  const [updateSubmitting, setUpdateSubmitting] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [updateForm, setUpdateForm] = useState({
    status: '',
    priority: '',
    assignedTo: '',
    remarks: '',
  });

  // Load Students for Admin/Warden when raising ticket
  useEffect(() => {
    if (canManage) {
      getStudents({ limit: 100, status: 'ACTIVE' })
        .then((res) => setStudents(res.data?.data || []))
        .catch((err) => console.error('Failed to load students:', err));
    }
  }, [canManage]);

  // Load Statistics
  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await getComplaintStatistics();
      if (res.data?.data) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Fetch Complaints List
  const fetchComplaints = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const fetchFn = isStudent ? getMyComplaints : getComplaints;
      const res = await fetchFn({
        page,
        limit: pagination.limit,
        search,
        category: categoryFilter,
        status: statusFilter,
        priority: priorityFilter,
      });

      if (res.data?.data) {
        setComplaints(res.data.data);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints(1);
  }, [search, categoryFilter, statusFilter, priorityFilter]);

  // Handle Create Complaint
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError(null);

    try {
      const res = await createComplaint(createForm);
      const created = res.data?.data;
      setActionSuccess(`Ticket ${created?.ticket_number || ''} registered successfully!`);
      setCreateModalOpen(false);
      setCreateForm(initialCreateForm);
      fetchComplaints(1);
      loadStats();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to register complaint');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Details & Timeline Modal
  const handleViewDetails = async (id) => {
    setLoadingDetails(true);
    setDetailsModalOpen(true);
    try {
      const res = await getComplaintById(id);
      if (res.data?.data) {
        setSelectedComplaint(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load complaint details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Open Update / Assign Modal
  const openUpdateModal = (complaint) => {
    setComplaintToUpdate(complaint);
    setUpdateForm({
      status: complaint.status,
      priority: complaint.priority,
      assignedTo: complaint.assigned_to ? complaint.assigned_to.toString() : '',
      remarks: '',
    });
    setUpdateError(null);
    setUpdateModalOpen(true);
  };

  // Handle Update / Assign Submit
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setUpdateSubmitting(true);
    setUpdateError(null);

    try {
      const res = await updateComplaint(complaintToUpdate.id, updateForm);
      setActionSuccess(`Complaint ${complaintToUpdate.ticket_number} updated to ${res.data?.data?.status}!`);
      setUpdateModalOpen(false);
      fetchComplaints(pagination.page);
      loadStats();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err) {
      setUpdateError(err.response?.data?.message || 'Failed to update complaint');
    } finally {
      setUpdateSubmitting(false);
    }
  };

  // Handle Delete (Admin Only)
  const handleDelete = async (id, ticketNo) => {
    if (!window.confirm(`Are you sure you want to delete complaint ${ticketNo}?`)) return;
    try {
      await deleteComplaint(id);
      setActionSuccess(`Complaint ${ticketNo} deleted.`);
      fetchComplaints(pagination.page);
      loadStats();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete complaint');
    }
  };

  // Category Icon & Label
  const getCategoryMeta = (catVal) => {
    const found = CATEGORIES.find((c) => c.value === catVal);
    return found || { label: catVal, icon: HelpCircle, color: 'text-slate-400' };
  };

  // Priority Badge
  const renderPriorityBadge = (prio) => {
    switch (prio) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white animate-pulse shadow-sm">
            <AlertTriangle className="w-3 h-3" /> Urgent
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            High
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            Low
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            Medium
          </span>
        );
    }
  };

  // Status Badge
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5 animate-spin" /> In Progress
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <X className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 text-sm font-medium mb-1">
            <MessageSquareWarning className="w-4 h-4" />
            <span>Grievance & Facilities Maintenance</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Complaints & Maintenance Hub
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            {isStudent
              ? 'Raise maintenance issues, track real-time resolution timelines, and stay updated with warden actions.'
              : 'Real-time ticket tracking, staff dispatch, multi-step repair workflows, and facility health telemetry.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canManage && (
            <button
              onClick={() => setShowCharts(!showCharts)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm backdrop-blur-sm transition-all border border-white/10"
            >
              <BarChart3 className="w-4 h-4" />
              <span>{showCharts ? 'Hide Analytics' : 'Show Analytics'}</span>
            </button>
          )}

          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>{isStudent ? 'Raise Grievance' : 'Log Maintenance Ticket'}</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-sm font-medium">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tickets */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Registered</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <MessageSquareWarning className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {statsLoading ? '...' : stats?.overview?.total_complaints || complaints.length}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              All Grievance Tickets
            </div>
          </div>
        </div>

        {/* Pending Action */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pending Review</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {statsLoading ? '...' : stats?.overview?.pending_count || 0}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {stats?.overview?.unassigned_count || 0} Unassigned
            </div>
          </div>
        </div>

        {/* In Progress / Active Repairs */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">In Progress</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {statsLoading ? '...' : stats?.overview?.in_progress_count || 0}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Active Technician Dispatches
            </div>
          </div>
        </div>

        {/* Resolved Successfully */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Resolved</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {statsLoading ? '...' : stats?.overview?.resolved_count || 0}
            </div>
            <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
              Closed & Verified Fixes
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts Section (Collapsible) */}
      {showCharts && stats && canManage && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Category Breakdown Bar Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-500" />
                  Grievances by Category
                </h3>
                <p className="text-xs text-slate-500">Distribution of facility maintenance tickets</p>
              </div>
            </div>
            <div className="h-64">
              {stats.category_distribution && stats.category_distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.category_distribution} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <XAxis dataKey="category" stroke="#94A3B8" fontSize={10} tickLine={false} tickFormatter={(v) => v.replace('_', ' ').slice(0, 10)} />
                    <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} />
                    <Tooltip
                      formatter={(val) => [val, 'Tickets']}
                      contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', color: '#fff', borderRadius: '0.75rem' }}
                    />
                    <Bar dataKey="count" fill="#6366F1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  No categorized complaint data available yet.
                </div>
              )}
            </div>
          </div>

          {/* Priority Distribution Pie */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-blue-500" />
                  Severity / Priority Split
                </h3>
                <p className="text-xs text-slate-500">Open and resolved urgency split</p>
              </div>
            </div>
            <div className="h-64">
              {stats.priority_distribution && stats.priority_distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.priority_distribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="count"
                      nameKey="priority"
                    >
                      {stats.priority_distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', color: '#fff', borderRadius: '0.75rem' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  No priority data available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticket, title, student..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={() => {
              fetchComplaints(pagination.page);
              loadStats();
            }}
            title="Refresh Complaints"
            className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Complaints Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-4">Ticket / Category</th>
                <th className="py-3.5 px-4">Complaint Title</th>
                <th className="py-3.5 px-4">Student / Room</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Assigned Staff</th>
                <th className="py-3.5 px-4">Date Logged</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    <span>Loading real-time complaints from MySQL...</span>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="8" className="py-10 text-center text-rose-500">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                    <span>{error}</span>
                  </td>
                </tr>
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <MessageSquareWarning className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <span>No complaints found matching criteria.</span>
                  </td>
                </tr>
              ) : (
                complaints.map((c) => {
                  const catMeta = getCategoryMeta(c.category);
                  const Icon = catMeta.icon;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Ticket & Category */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          {c.ticket_number}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <Icon className={`w-3.5 h-3.5 ${catMeta.color}`} />
                          <span>{catMeta.label}</span>
                        </div>
                      </td>

                      {/* Title */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {c.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {c.description}
                        </div>
                      </td>

                      {/* Student & Room */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {c.student_name}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{c.roll_number}</span>
                          {c.room_number && (
                            <>
                              <span>·</span>
                              <span>Room {c.room_number}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4">
                        {renderPriorityBadge(c.priority)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {renderStatusBadge(c.status)}
                      </td>

                      {/* Assigned Staff */}
                      <td className="py-3.5 px-4 text-xs">
                        {c.assigned_to_name ? (
                          <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{c.assigned_to_name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(c.created_at).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Timeline / Details Button */}
                          <button
                            onClick={() => handleViewDetails(c.id)}
                            title="View Timeline & Details"
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Assign / Update Button (Staff/Warden/Admin) */}
                          {canManage && (
                            <button
                              onClick={() => openUpdateModal(c)}
                              title="Update Status / Assign"
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-semibold transition"
                            >
                              Update
                            </button>
                          )}

                          {/* Delete (Admin Only) */}
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(c.id, c.ticket_number)}
                              title="Delete Complaint"
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {complaints.length} of {pagination.total} tickets
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchComplaints(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Previous
              </button>
              <span className="px-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchComplaints(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. RAISE COMPLAINT MODAL */}
      {/* ========================================================================= */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <MessageSquareWarning className="w-5 h-5" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {isStudent ? 'Raise Grievance Ticket' : 'Log Maintenance Complaint'}
                </h2>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4 text-sm">
              {/* For Staff: Select Student */}
              {!isStudent && (
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Student Resident *
                  </label>
                  <select
                    required
                    value={createForm.studentId}
                    onChange={(e) => setCreateForm({ ...createForm, studentId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose Student --</option>
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.student_name} ({st.roll_number})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Category & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Priority *
                  </label>
                  <select
                    required
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Subject / Short Title *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Study Lamp Switch Tripping in Room 204"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Description *
                </label>
                <textarea
                  rows="4"
                  required
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Provide complete details (e.g. location in room, when it started, any damage)..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold shadow-md transition"
                >
                  {createSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Ticket</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. COMPLAINT DETAILS & AUDIT TIMELINE MODAL */}
      {/* ========================================================================= */}
      {detailsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <MessageSquareWarning className="w-5 h-5" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Complaint Details & Resolution Timeline
                </h2>
              </div>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetails || !selectedComplaint ? (
              <div className="py-12 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                <span>Loading complete complaint lifecycle and timeline...</span>
              </div>
            ) : (
              <div className="mt-4 space-y-5 text-sm">
                {/* Header Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <span className="text-xs text-slate-400 block">Ticket No</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {selectedComplaint.ticket_number}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <span className="text-xs text-slate-400 block">Category</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {selectedComplaint.category}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <span className="text-xs text-slate-400 block">Priority</span>
                    <div className="mt-0.5">{renderPriorityBadge(selectedComplaint.priority)}</div>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <span className="text-xs text-slate-400 block">Status</span>
                    <div className="mt-0.5">{renderStatusBadge(selectedComplaint.status)}</div>
                  </div>
                </div>

                {/* Subject & Description */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {selectedComplaint.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                    {selectedComplaint.description}
                  </p>
                  <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400 border-t border-slate-200 dark:border-slate-700 mt-2">
                    <span>Resident: {selectedComplaint.student_name} ({selectedComplaint.roll_number})</span>
                    <span>Hostel: {selectedComplaint.hostel_name || 'N/A'} (Room {selectedComplaint.room_number || 'N/A'})</span>
                    <span>Assigned: {selectedComplaint.assigned_to_name || 'Unassigned'}</span>
                  </div>
                </div>

                {/* Audit Timeline */}
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    Resolution Activity Timeline ({selectedComplaint.updates?.length || 0})
                  </h4>

                  <div className="space-y-4 max-h-56 overflow-y-auto pl-2 border-l-2 border-indigo-200 dark:border-indigo-900 ml-3">
                    {selectedComplaint.updates && selectedComplaint.updates.length > 0 ? (
                      selectedComplaint.updates.map((upd, idx) => (
                        <div key={upd.id} className="relative pl-6">
                          {/* Dot indicator */}
                          <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-900 shadow-sm" />

                          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {upd.status_to ? `Status: ${upd.status_to}` : 'Update Logged'}
                              </span>
                              <span className="text-slate-400 text-[11px]">
                                {new Date(upd.created_at).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 mb-1.5">{upd.remarks}</p>
                            <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                              Logged by: {upd.updated_by_name} ({upd.updated_by_role})
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic pl-4">No audit updates found for this ticket.</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  {canManage && (
                    <button
                      onClick={() => {
                        setDetailsModalOpen(false);
                        openUpdateModal(selectedComplaint);
                      }}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition"
                    >
                      Update / Assign Staff
                    </button>
                  )}
                  <button
                    onClick={() => setDetailsModalOpen(false)}
                    className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 font-semibold text-sm transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. UPDATE / ASSIGN COMPLAINT MODAL */}
      {/* ========================================================================= */}
      {updateModalOpen && complaintToUpdate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <UserCheck className="w-5 h-5" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Update Ticket: {complaintToUpdate.ticket_number}
                </h2>
              </div>
              <button
                onClick={() => setUpdateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {updateError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{updateError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateSubmit} className="mt-4 space-y-4 text-sm">
              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Update Status *
                  </label>
                  <select
                    required
                    value={updateForm.status}
                    onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={updateForm.priority}
                    onChange={(e) => setUpdateForm({ ...updateForm, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
              </div>

              {/* Assign Staff */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Assign Staff Technician
                </label>
                <select
                  value={updateForm.assignedTo}
                  onChange={(e) => setUpdateForm({ ...updateForm, assignedTo: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                >
                  <option value="">-- Unassigned --</option>
                  {stats?.staff_list?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.designation || s.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Remarks / Resolution Notes */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Maintenance Remarks / Resolution Note *
                </label>
                <textarea
                  rows="3"
                  required
                  value={updateForm.remarks}
                  onChange={(e) => setUpdateForm({ ...updateForm, remarks: e.target.value })}
                  placeholder="e.g. Electrician dispatched; wire replaced and socket tested."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setUpdateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold shadow-md transition"
                >
                  {updateSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
