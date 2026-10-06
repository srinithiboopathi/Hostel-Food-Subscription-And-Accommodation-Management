import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getLeaves,
  getLeaveById,
  updateLeaveStatus,
  deleteLeave,
  getLeaveStatistics,
} from '../../services/leaveService';
import { getHostels } from '../../services/hostelService';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  FileText,
  RotateCcw,
  Trash2,
  Shield,
  Loader2,
  User,
  GraduationCap,
  Building2,
  BedDouble,
  ArrowRight,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  AlertTriangle,
  Send,
  UserCheck,
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

const CHART_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const LEAVE_TYPES = [
  { value: 'HOME_VISIT', label: 'Home Visit' },
  { value: 'MEDICAL', label: 'Medical Emergency' },
  { value: 'ACADEMIC_EVENT', label: 'Academic Event' },
  { value: 'EMERGENCY', label: 'Emergency' },
  { value: 'OTHER', label: 'Other' },
];

export default function LeaveManagementPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isWarden = user?.role === 'WARDEN' || isAdmin;

  // Data States
  const [leaves, setLeaves] = useState([]);
  const [stats, setStats] = useState(null);
  const [hostels, setHostels] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [hostelFilter, setHostelFilter] = useState('');
  const [showCharts, setShowCharts] = useState(true);

  // Modals
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    action: null, // 'APPROVED' | 'REJECTED' | 'RETURNED'
    leaveId: null,
    studentName: '',
    remarks: '',
    loading: false,
    error: null,
  });

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    leaveId: null,
    loading: false,
  });

  // 1. Fetch KPI Statistics from backend
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await getLeaveStatistics();
      setStats(res.data);
    } catch (err) {
      console.warn('Could not fetch leave statistics:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // 2. Fetch Hostels for filter dropdown
  const fetchHostelsList = async () => {
    try {
      const res = await getHostels();
      setHostels(res.data || []);
    } catch (err) {
      console.warn('Could not load hostels:', err);
    }
  };

  // 3. Fetch Leaves Table with pagination & filters
  const fetchLeaves = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        leaveType: typeFilter || undefined,
        hostelId: hostelFilter || undefined,
      };

      const res = await getLeaves(params);
      setLeaves(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Error fetching leaves:', err);
      setError(err.response?.data?.message || 'Failed to load leave requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchHostelsList();
  }, []);

  useEffect(() => {
    fetchLeaves(1);
  }, [statusFilter, typeFilter, hostelFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLeaves(1);
  };

  // Open Details Modal
  const handleViewDetails = async (id) => {
    try {
      setDetailsLoading(true);
      setDetailsModalOpen(true);
      const res = await getLeaveById(id);
      setSelectedLeave(res.data);
    } catch (err) {
      console.error('Error fetching leave details:', err);
      setError(err.response?.data?.message || 'Failed to load details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  // Open Review (Approve/Reject/Returned) Modal
  const openReviewModal = (action, leave) => {
    setReviewModal({
      isOpen: true,
      action,
      leaveId: leave.id,
      studentName: leave.student_name,
      remarks: action === 'APPROVED' ? 'Approved by Hostel Administration' : '',
      loading: false,
      error: null,
    });
  };

  // Submit Review Status Update
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    const { action, leaveId, remarks } = reviewModal;

    if (action === 'REJECTED' && !remarks.trim()) {
      setReviewModal((prev) => ({ ...prev, error: 'Rejection reason is required.' }));
      return;
    }

    try {
      setReviewModal((prev) => ({ ...prev, loading: true, error: null }));

      await updateLeaveStatus(leaveId, {
        status: action,
        reviewRemarks: remarks.trim() || undefined,
      });

      setReviewModal({ isOpen: false, action: null, leaveId: null, studentName: '', remarks: '', loading: false, error: null });
      setActionSuccess(`Leave request #${leaveId} has been marked as ${action}.`);
      setTimeout(() => setActionSuccess(null), 4000);

      // Refresh data and telemetry
      fetchLeaves(pagination.page);
      fetchStats();
    } catch (err) {
      console.error('Error updating leave status:', err);
      setReviewModal((prev) => ({
        ...prev,
        loading: false,
        error: err.response?.data?.message || 'Failed to update leave status.',
      }));
    }
  };

  // Delete Action
  const handleDeleteLeave = async () => {
    const { leaveId } = deleteModal;
    if (!leaveId) return;

    try {
      setDeleteModal((prev) => ({ ...prev, loading: true }));
      await deleteLeave(leaveId);
      setDeleteModal({ isOpen: false, leaveId: null, loading: false });
      setActionSuccess(`Leave request #${leaveId} deleted successfully.`);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchLeaves(pagination.page);
      fetchStats();
    } catch (err) {
      console.error('Error deleting leave:', err);
      setError(err.response?.data?.message || 'Failed to delete leave request.');
      setDeleteModal({ isOpen: false, leaveId: null, loading: false });
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Approved
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            Pending
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Rejected
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <X className="w-3.5 h-3.5 text-slate-500" />
            Cancelled
          </span>
        );
      case 'RETURNED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
            Returned
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-xs font-semibold">
              Hostel Administration
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              MySQL Live Sync
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-2 text-white">
            Leave & Out-Pass Management
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Review student leave applications, verify emergency contacts, authorize departures, and log hostel return check-ins.
          </p>
        </div>

        <button
          onClick={() => setShowCharts(!showCharts)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 transition-all shrink-0"
        >
          <BarChart3 className="w-4 h-4 text-indigo-400" />
          <span>{showCharts ? 'Hide Analytics' : 'Show Analytics'}</span>
        </button>
      </div>

      {/* Action Success Toast */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Real-Time Database KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Requests */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-slate-500">Total Applications</p>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl font-bold text-slate-800 mt-1">
            {statsLoading ? '...' : stats?.overview?.total_requests || 0}
          </p>
        </div>

        {/* Pending Approvals */}
        <div
          onClick={() => setStatusFilter('PENDING')}
          className={`p-4 bg-white rounded-2xl border shadow-2xs cursor-pointer transition-all ${
            statusFilter === 'PENDING' ? 'border-amber-500 ring-2 ring-amber-200 bg-amber-50/20' : 'border-slate-200 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-amber-700">Pending Approvals</p>
            <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
          </div>
          <p className="text-xl font-bold text-amber-600 mt-1">
            {statsLoading ? '...' : stats?.overview?.pending_count || 0}
          </p>
        </div>

        {/* Currently On Leave */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-slate-500">Currently On Leave</p>
            <UserCheck className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-blue-600 mt-1">
            {statsLoading ? '...' : stats?.overview?.currently_on_leave || 0}
          </p>
        </div>

        {/* Today Departures */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-slate-500">Today's Departures</p>
            <ArrowRight className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl font-bold text-purple-600 mt-1">
            {statsLoading ? '...' : stats?.overview?.today_departures || 0}
          </p>
        </div>

        {/* Approved Total */}
        <div
          onClick={() => setStatusFilter('APPROVED')}
          className={`p-4 bg-white rounded-2xl border shadow-2xs cursor-pointer transition-all ${
            statusFilter === 'APPROVED' ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50/20' : 'border-slate-200 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-emerald-700">Total Approved</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            {statsLoading ? '...' : stats?.overview?.approved_count || 0}
          </p>
        </div>

        {/* Rejected Total */}
        <div
          onClick={() => setStatusFilter('REJECTED')}
          className={`p-4 bg-white rounded-2xl border shadow-2xs cursor-pointer transition-all ${
            statusFilter === 'REJECTED' ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/20' : 'border-slate-200 hover:border-rose-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-rose-700">Rejected</p>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl font-bold text-rose-600 mt-1">
            {statsLoading ? '...' : stats?.overview?.rejected_count || 0}
          </p>
        </div>
      </div>

      {/* Analytics Visualizations */}
      {showCharts && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart 1: Leave Type Distribution */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-800">Leave Applications by Category</h3>
              </div>
            </div>
            {stats.leave_type_distribution?.length === 0 ? (
              <p className="text-xs text-slate-400 py-10 text-center">No category data yet.</p>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.leave_type_distribution}
                      dataKey="count"
                      nameKey="leave_type"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      innerRadius={42}
                      paddingAngle={3}
                    >
                      {stats.leave_type_distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name, item) => [`${val} requests (${item.payload.approved} approved)`, name.replace('_', ' ')]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 2: Monthly Trends */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-800">Monthly Leave Volume (Last 6 Months)</h3>
              </div>
            </div>
            {stats.monthly_trends?.length === 0 ? (
              <p className="text-xs text-slate-400 py-10 text-center">No trend data recorded.</p>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.monthly_trends}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="total" name="Total Applied" fill="#6366F1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="approved" name="Approved" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search student, roll, destination..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
          />
        </form>

        {/* Filter Dropdowns */}
        <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-700 font-medium focus:outline-hidden focus:border-indigo-500 transition-all"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="RETURNED">Returned</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-700 font-medium focus:outline-hidden focus:border-indigo-500 transition-all"
          >
            <option value="">All Categories</option>
            {LEAVE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <select
            value={hostelFilter}
            onChange={(e) => setHostelFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-700 font-medium focus:outline-hidden focus:border-indigo-500 transition-all"
          >
            <option value="">All Hostels</option>
            {hostels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>

          {(statusFilter || typeFilter || hostelFilter || search) && (
            <button
              onClick={() => {
                setStatusFilter('');
                setTypeFilter('');
                setHostelFilter('');
                setSearch('');
              }}
              className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Leave Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
            <p className="text-xs font-medium">Fetching student leave requests from MySQL...</p>
          </div>
        ) : leaves.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Leave Applications Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              No leave requests match your search or filter settings.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Leave Duration</th>
                  <th className="py-3 px-4">Purpose & Location</th>
                  <th className="py-3 px-4">Emergency Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Review & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {leaves.map((leave) => {
                  const isPending = leave.status === 'PENDING';
                  const isApproved = leave.status === 'APPROVED';

                  return (
                    <tr key={leave.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Student Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{leave.student_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-mono text-slate-700 font-medium">{leave.roll_number}</span>
                          <span>•</span>
                          <span>{leave.hostel_name || 'No Hostel'} {leave.room_number ? `(${leave.room_number})` : ''}</span>
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(leave.start_date)}</span>
                          <span className="text-slate-400">→</span>
                          <span>{formatDate(leave.end_date)}</span>
                        </div>
                        <span className="text-[11px] text-indigo-600 font-semibold">
                          {leave.duration_days} {leave.duration_days === 1 ? 'day' : 'days'}
                        </span>
                      </td>

                      {/* Purpose & Destination */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 inline-block mb-1">
                          {leave.leave_type.replace('_', ' ')}
                        </span>
                        <div className="text-slate-800 font-medium truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{leave.destination_address}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate" title={leave.reason}>
                          {leave.reason}
                        </p>
                      </td>

                      {/* Emergency Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-slate-700 font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{leave.emergency_contact}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(leave.status)}
                        {leave.reviewed_by_name && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            By {leave.reviewed_by_name}
                          </p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View details */}
                          <button
                            onClick={() => handleViewDetails(leave.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Warden Approval Actions */}
                          {isWarden && isPending && (
                            <>
                              <button
                                onClick={() => openReviewModal('APPROVED', leave)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] shadow-xs flex items-center gap-1 transition-all"
                                title="Approve Leave"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => openReviewModal('REJECTED', leave)}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px] shadow-xs flex items-center gap-1 transition-all"
                                title="Reject Leave"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {/* Warden Log Return */}
                          {isWarden && isApproved && (
                            <button
                              onClick={() => openReviewModal('RETURNED', leave)}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] shadow-xs flex items-center gap-1 transition-all"
                              title="Mark Student Returned to Hostel"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Returned</span>
                            </button>
                          )}

                          {/* Admin Delete */}
                          {isAdmin && (
                            <button
                              onClick={() => setDeleteModal({ isOpen: true, leaveId: leave.id, loading: false })}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && leaves.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {leaves.length} of {pagination.total} leave requests
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchLeaves(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-700 transition-all"
              >
                Previous
              </button>
              <span className="px-2 font-mono text-[11px] text-slate-600">
                Page {pagination.page} / {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchLeaves(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-700 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review (Approve/Reject/Return) Modal */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    reviewModal.action === 'APPROVED'
                      ? 'bg-emerald-50 text-emerald-600'
                      : reviewModal.action === 'REJECTED'
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  {reviewModal.action === 'APPROVED' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : reviewModal.action === 'REJECTED' ? (
                    <XCircle className="w-5 h-5" />
                  ) : (
                    <RotateCcw className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {reviewModal.action === 'APPROVED'
                      ? 'Approve Leave Request'
                      : reviewModal.action === 'REJECTED'
                      ? 'Reject Leave Request'
                      : 'Record Student Return'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Student: {reviewModal.studentName}</p>
                </div>
              </div>
              <button
                onClick={() => setReviewModal({ isOpen: false, action: null, leaveId: null, studentName: '', remarks: '', loading: false, error: null })}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reviewModal.error && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{reviewModal.error}</span>
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {reviewModal.action === 'REJECTED' ? (
                    <span>
                      Rejection Reason / Remarks <span className="text-rose-500">*</span>
                    </span>
                  ) : (
                    <span>Administrative Review Notes</span>
                  )}
                </label>
                <textarea
                  rows={3}
                  value={reviewModal.remarks}
                  onChange={(e) => setReviewModal({ ...reviewModal, remarks: e.target.value })}
                  placeholder={
                    reviewModal.action === 'REJECTED'
                      ? 'Specify why the leave is rejected (e.g., exam dates clash, disciplinary policy)...'
                      : 'Add any optional approval condition or warden notes...'
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-hidden focus:border-indigo-500"
                  required={reviewModal.action === 'REJECTED'}
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setReviewModal({ isOpen: false, action: null, leaveId: null, studentName: '', remarks: '', loading: false, error: null })}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewModal.loading}
                  className={`px-5 py-2 rounded-xl text-white font-semibold flex items-center gap-2 shadow-md ${
                    reviewModal.action === 'APPROVED'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                      : reviewModal.action === 'REJECTED'
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                      : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
                  } disabled:opacity-50`}
                >
                  {reviewModal.loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>
                      Confirm {reviewModal.action === 'APPROVED' ? 'Approval' : reviewModal.action === 'REJECTED' ? 'Rejection' : 'Return'}
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Details Modal */}
      {detailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Student Leave Details</h3>
                  <p className="text-[11px] text-slate-400">Request ID #{selectedLeave?.id}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailsLoading || !selectedLeave ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
                <p className="text-xs">Loading leave record from database...</p>
              </div>
            ) : (
              <div className="space-y-4 mt-4 text-xs">
                {/* Current Status */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-slate-600">Application Status:</span>
                  {getStatusBadge(selectedLeave.status)}
                </div>

                {/* Student Full Bio */}
                <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-2.5">
                  <h4 className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider">
                    Student Profile
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Full Name</span>
                      <span className="font-semibold text-slate-900">{selectedLeave.student_name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Roll Number</span>
                      <span className="font-mono font-semibold text-slate-900">{selectedLeave.roll_number}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Department & Course</span>
                      <span>{selectedLeave.department} • {selectedLeave.course}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Hostel & Room</span>
                      <span>
                        {selectedLeave.hostel_name || 'N/A'}{' '}
                        {selectedLeave.room_number ? `(Floor ${selectedLeave.room_floor}, Rm ${selectedLeave.room_number})` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Guardian Name</span>
                      <span>{selectedLeave.guardian_name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Guardian Phone</span>
                      <span className="font-mono">{selectedLeave.guardian_phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Leave Specifics */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Departure Date</span>
                      <span className="font-semibold text-slate-800">{formatDate(selectedLeave.start_date)}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Expected Return</span>
                      <span className="font-semibold text-slate-800">{formatDate(selectedLeave.end_date)}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Destination Address</span>
                    <span className="text-slate-800 font-medium">{selectedLeave.destination_address}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Emergency Contact</span>
                    <span className="font-mono text-slate-800 font-medium">{selectedLeave.emergency_contact}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Reason for Out-Pass</span>
                    <p className="text-slate-800 leading-relaxed">{selectedLeave.reason}</p>
                  </div>
                </div>

                {/* Warden Review */}
                {selectedLeave.reviewed_by && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Administrative Review Note
                    </h4>
                    <p className="text-slate-700 italic">
                      "{selectedLeave.review_remarks || 'No specific remarks.'}"
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Reviewed by: {selectedLeave.reviewed_by_name} ({selectedLeave.reviewed_by_role})
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Delete Leave Request #{deleteModal.leaveId}?</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Are you sure you want to permanently remove this record from MySQL database?
            </p>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={deleteModal.loading}
                onClick={() => setDeleteModal({ isOpen: false, leaveId: null, loading: false })}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteModal.loading}
                onClick={handleDeleteLeave}
                className="px-4 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 flex items-center gap-1.5"
              >
                {deleteModal.loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
