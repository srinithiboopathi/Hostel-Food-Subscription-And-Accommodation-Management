import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getVisitors,
  getTodayVisitors,
  getVisitorById,
  registerVisitor,
  checkoutVisitor,
  updateVisitor,
  deleteVisitor,
  getVisitorStatistics,
} from '../../services/visitorService';
import { getStudents } from '../../services/studentService';
import { getHostels } from '../../services/hostelService';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Clock,
  Phone,
  Calendar,
  Building2,
  BedDouble,
  Shield,
  Trash2,
  LogOut,
  LogIn,
  Loader2,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  AlertTriangle,
  FileCheck,
  UserCheck,
  CreditCard,
  Hash,
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

const ID_PROOF_TYPES = [
  { value: 'AADHAAR', label: 'Aadhaar Card' },
  { value: 'PAN', label: 'PAN Card' },
  { value: 'DRIVING_LICENSE', label: "Driver's License" },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'VOTER_ID', label: 'Voter ID' },
  { value: 'OTHER', label: 'Other Official ID' },
];

const RELATIONSHIPS = [
  'Parent / Guardian',
  'Father',
  'Mother',
  'Brother',
  'Sister',
  'Relative',
  'Friend',
  'Courier / Delivery',
  'Official / Contractor',
  'Other',
];

export default function VisitorsPage() {
  const { user } = useAuth();
  const isStudent = user?.role === 'STUDENT';
  const canManage = ['ADMIN', 'WARDEN'].includes(user?.role);
  const isAdmin = user?.role === 'ADMIN';

  // Data States
  const [visitors, setVisitors] = useState([]);
  const [students, setStudents] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [hostelFilter, setHostelFilter] = useState('');
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const [showCharts, setShowCharts] = useState(false);

  // Register Visitor Modal
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [registerSubmitting, setRegisterSubmitting] = useState(false);
  const [registerError, setRegisterError] = useState(null);
  const [registerForm, setRegisterForm] = useState({
    studentId: '',
    visitorName: '',
    relationship: 'Parent / Guardian',
    phoneNumber: '',
    idProofType: 'AADHAAR',
    idProofNumber: '',
    purpose: '',
    remarks: '',
  });

  // Details Modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Checkout Modal
  const [checkoutModal, setCheckoutModal] = useState({
    isOpen: false,
    visitorId: null,
    visitorName: '',
    studentName: '',
    remarks: '',
    loading: false,
  });

  // Delete Modal
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    visitorId: null,
    loading: false,
  });

  // 1. Fetch Statistics from MySQL
  const fetchStats = async () => {
    if (isStudent) return;
    try {
      setStatsLoading(true);
      const res = await getVisitorStatistics();
      setStats(res.data);
    } catch (err) {
      console.warn('Could not load visitor statistics:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // 2. Fetch Reference Data (Students & Hostels)
  const fetchReferenceData = async () => {
    if (canManage) {
      try {
        const [studRes, hostelRes] = await Promise.all([
          getStudents({ limit: 100 }),
          getHostels(),
        ]);
        setStudents(studRes.data || []);
        setHostels(hostelRes.data || []);
      } catch (err) {
        console.warn('Could not load student/hostel reference data:', err);
      }
    }
  };

  // 3. Fetch Visitors Table
  const fetchVisitors = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      if (showTodayOnly) {
        const res = await getTodayVisitors();
        setVisitors(res.data?.visitors || []);
        setPagination({ page: 1, limit: res.data?.visitors?.length || 10, total: res.data?.visitors?.length || 0, totalPages: 1 });
      } else {
        const params = {
          page,
          limit: 10,
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          date: dateFilter || undefined,
          hostelId: hostelFilter || undefined,
        };

        const res = await getVisitors(params);
        setVisitors(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.error('Error fetching visitors:', err);
      setError(err.response?.data?.message || 'Failed to fetch visitor records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchReferenceData();
  }, [canManage, isStudent]);

  useEffect(() => {
    fetchVisitors(1);
  }, [statusFilter, dateFilter, hostelFilter, showTodayOnly]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchVisitors(1);
  };

  // Open Register Modal
  const openRegisterModal = () => {
    setRegisterError(null);
    setRegisterForm({
      studentId: students[0]?.id || '',
      visitorName: '',
      relationship: 'Parent / Guardian',
      phoneNumber: '',
      idProofType: 'AADHAAR',
      idProofNumber: '',
      purpose: '',
      remarks: '',
    });
    setRegisterModalOpen(true);
  };

  // Submit Register Visitor
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterError(null);

    if (!registerForm.studentId) {
      setRegisterError('Please select the resident student being visited.');
      return;
    }
    if (!registerForm.visitorName.trim()) {
      setRegisterError('Visitor name is required.');
      return;
    }
    if (!registerForm.phoneNumber.trim()) {
      setRegisterError('Visitor phone number is required.');
      return;
    }
    if (!registerForm.idProofNumber.trim()) {
      setRegisterError('ID proof number is required.');
      return;
    }
    if (!registerForm.purpose.trim()) {
      setRegisterError('Purpose of visit is required.');
      return;
    }

    try {
      setRegisterSubmitting(true);
      await registerVisitor(registerForm);
      setRegisterModalOpen(false);
      setActionSuccess(`Visitor "${registerForm.visitorName}" registered & checked in.`);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchVisitors(1);
      fetchStats();
    } catch (err) {
      console.error('Error registering visitor:', err);
      setRegisterError(err.response?.data?.message || 'Failed to register visitor.');
    } finally {
      setRegisterSubmitting(false);
    }
  };

  // Open Details Modal
  const handleViewDetails = async (id) => {
    try {
      setDetailsLoading(true);
      setDetailsModalOpen(true);
      const res = await getVisitorById(id);
      setSelectedVisitor(res.data);
    } catch (err) {
      console.error('Error loading visitor details:', err);
      setError(err.response?.data?.message || 'Failed to load details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  // Open Checkout Modal
  const openCheckoutModal = (visitor) => {
    setCheckoutModal({
      isOpen: true,
      visitorId: visitor.id,
      visitorName: visitor.visitor_name,
      studentName: visitor.student_name,
      remarks: '',
      loading: false,
    });
  };

  // Confirm Visitor Checkout
  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    const { visitorId, remarks } = checkoutModal;

    try {
      setCheckoutModal((prev) => ({ ...prev, loading: true }));
      await checkoutVisitor(visitorId, { remarks: remarks.trim() || undefined });

      setCheckoutModal({ isOpen: false, visitorId: null, visitorName: '', studentName: '', remarks: '', loading: false });
      setActionSuccess('Visitor checked out successfully. Departure timestamp recorded.');
      setTimeout(() => setActionSuccess(null), 4000);

      fetchVisitors(pagination.page);
      fetchStats();
    } catch (err) {
      console.error('Error checking out visitor:', err);
      setError(err.response?.data?.message || 'Failed to check out visitor.');
      setCheckoutModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Delete Action (Admin)
  const handleDeleteVisitor = async () => {
    const { visitorId } = deleteModal;
    if (!visitorId) return;

    try {
      setDeleteModal((prev) => ({ ...prev, loading: true }));
      await deleteVisitor(visitorId);
      setDeleteModal({ isOpen: false, visitorId: null, loading: false });
      setActionSuccess('Visitor record removed permanently.');
      setTimeout(() => setActionSuccess(null), 4000);
      fetchVisitors(pagination.page);
      fetchStats();
    } catch (err) {
      console.error('Error deleting visitor log:', err);
      setError(err.response?.data?.message || 'Failed to delete record.');
      setDeleteModal({ isOpen: false, visitorId: null, loading: false });
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'INSIDE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Inside Hostel
          </span>
        );
      case 'CHECKED_OUT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <LogOut className="w-3 h-3 text-slate-500" />
            Checked Out
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Blocked
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

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleTimeString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-xs font-semibold">
              Hostel Security & Gate Pass
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Real-Time Security Log
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-2 text-white">
            Visitor Management
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Register visiting parents & guardians, verify identity documents, and track live hostel gate check-in / check-out times.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {canManage && (
            <>
              <button
                onClick={() => setShowCharts(!showCharts)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
              >
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <span>{showCharts ? 'Hide Stats' : 'Analytics'}</span>
              </button>

              <button
                onClick={openRegisterModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02]"
              >
                <UserPlus className="w-4 h-4" />
                <span>Register Visitor</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Success Banner */}
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

      {/* Real-time KPI Statistics Cards */}
      {canManage && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Today's Visitors */}
          <div
            onClick={() => {
              setShowTodayOnly(true);
              setStatusFilter('');
            }}
            className={`p-4 bg-white rounded-2xl border shadow-2xs cursor-pointer transition-all ${
              showTodayOnly ? 'border-indigo-500 ring-2 ring-indigo-200 bg-indigo-50/20' : 'border-slate-200 hover:border-indigo-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-slate-500">Today's Total</p>
              <Calendar className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-xl font-bold text-slate-800 mt-1">
              {statsLoading ? '...' : stats?.overview?.today_total || 0}
            </p>
          </div>

          {/* Currently Inside */}
          <div
            onClick={() => {
              setShowTodayOnly(false);
              setStatusFilter('INSIDE');
            }}
            className={`p-4 bg-white rounded-2xl border shadow-2xs cursor-pointer transition-all ${
              statusFilter === 'INSIDE' ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50/20' : 'border-slate-200 hover:border-emerald-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-emerald-700">Currently Inside</p>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <p className="text-xl font-bold text-emerald-600 mt-1">
              {statsLoading ? '...' : stats?.overview?.currently_inside || 0}
            </p>
          </div>

          {/* Checked Out */}
          <div
            onClick={() => {
              setShowTodayOnly(false);
              setStatusFilter('CHECKED_OUT');
            }}
            className={`p-4 bg-white rounded-2xl border shadow-2xs cursor-pointer transition-all ${
              statusFilter === 'CHECKED_OUT' ? 'border-slate-500 ring-2 ring-slate-200 bg-slate-50' : 'border-slate-200 hover:border-slate-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-slate-500">Checked Out</p>
              <LogOut className="w-4 h-4 text-slate-500" />
            </div>
            <p className="text-xl font-bold text-slate-700 mt-1">
              {statsLoading ? '...' : stats?.overview?.checked_out || 0}
            </p>
          </div>

          {/* Total All-Time Visits */}
          <div
            onClick={() => {
              setShowTodayOnly(false);
              setStatusFilter('');
            }}
            className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs cursor-pointer hover:border-indigo-400 transition-all"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-slate-500">All-Time Visitors</p>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-xl font-bold text-slate-800 mt-1">
              {statsLoading ? '...' : stats?.overview?.total_visitors || 0}
            </p>
          </div>

          {/* Blocked Visitors */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-rose-700">Blocked / Flagged</p>
              <Shield className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-xl font-bold text-rose-600 mt-1">
              {statsLoading ? '...' : stats?.overview?.blocked || 0}
            </p>
          </div>
        </div>
      )}

      {/* Analytics Charts */}
      {showCharts && stats && canManage && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-indigo-600" />
                Identity Proof Types Registered
              </h3>
            </div>
            {stats.id_proof_distribution?.length === 0 ? (
              <p className="text-xs text-slate-400 py-10 text-center">No identity distribution data.</p>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.id_proof_distribution}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      innerRadius={42}
                      paddingAngle={3}
                    >
                      {stats.id_proof_distribution.map((entry, index) => (
                        <Cell key={`proof-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val, name) => [`${val} visitors`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Monthly Visitor Footfall (Past 6 Months)
              </h3>
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
                    <Bar dataKey="total" name="Total Visitors" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search visitor, phone, student, purpose..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
          />
        </form>

        {/* Filters */}
        <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto">
          {canManage && (
            <button
              onClick={() => setShowTodayOnly(!showTodayOnly)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                showTodayOnly
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Today's Only
            </button>
          )}

          <select
            value={statusFilter}
            onChange={(e) => {
              setShowTodayOnly(false);
              setStatusFilter(e.target.value);
            }}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-700 font-medium focus:outline-hidden focus:border-indigo-500 transition-all"
          >
            <option value="">All Statuses</option>
            <option value="INSIDE">Currently Inside</option>
            <option value="CHECKED_OUT">Checked Out</option>
            <option value="BLOCKED">Blocked</option>
          </select>

          {canManage && (
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
          )}

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setShowTodayOnly(false);
              setDateFilter(e.target.value);
            }}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-700 font-medium focus:outline-hidden focus:border-indigo-500 transition-all"
          />

          {(statusFilter || dateFilter || hostelFilter || search || showTodayOnly) && (
            <button
              onClick={() => {
                setStatusFilter('');
                setDateFilter('');
                setHostelFilter('');
                setSearch('');
                setShowTodayOnly(false);
              }}
              className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Visitors Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
            <p className="text-xs font-medium">Fetching visitor log from MySQL database...</p>
          </div>
        ) : visitors.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Visitor Logs Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {isStudent
                ? 'No visitor records have been logged for your room or student profile.'
                : 'No visitor entries match your current search and filter settings.'}
            </p>
            {canManage && (
              <button
                onClick={openRegisterModal}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-500 transition-all"
              >
                Register a Visitor
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Visitor Name</th>
                  <th className="py-3 px-4">Visiting Student</th>
                  <th className="py-3 px-4">Purpose & ID</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Check-Out</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Gate Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {visitors.map((visitor) => {
                  const isInside = visitor.status === 'INSIDE';

                  return (
                    <tr key={visitor.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Visitor Name & Relation */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{visitor.visitor_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-medium text-slate-700">{visitor.relationship}</span>
                          <span>•</span>
                          <span className="font-mono">{visitor.phone_number}</span>
                        </div>
                      </td>

                      {/* Visiting Student */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {visitor.student_name}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-mono text-slate-700">{visitor.roll_number}</span>
                          <span>•</span>
                          <span>{visitor.hostel_name || 'Hostel'} {visitor.room_number ? `(${visitor.room_number})` : ''}</span>
                        </div>
                      </td>

                      {/* Purpose & ID Proof */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-medium text-slate-800 truncate" title={visitor.purpose}>
                          {visitor.purpose}
                        </p>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                          {visitor.id_proof_type}
                        </span>
                      </td>

                      {/* Check-In */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{formatDateTime(visitor.check_in_time)}</span>
                        </div>
                      </td>

                      {/* Check-Out */}
                      <td className="py-3.5 px-4">
                        {visitor.check_out_time ? (
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <LogOut className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatDateTime(visitor.check_out_time)}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-semibold italic">Still Inside</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(visitor.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View details */}
                          <button
                            onClick={() => handleViewDetails(visitor.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                            title="View Full Visitor Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Quick Check-out button */}
                          {canManage && isInside && (
                            <button
                              onClick={() => openCheckoutModal(visitor)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] shadow-xs flex items-center gap-1 transition-all"
                              title="Record Visitor Exit"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Check Out</span>
                            </button>
                          )}

                          {/* Admin Delete */}
                          {isAdmin && (
                            <button
                              onClick={() => setDeleteModal({ isOpen: true, visitorId: visitor.id, loading: false })}
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
        {!loading && visitors.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {visitors.length} of {pagination.total} visitor logs
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchVisitors(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-700 transition-all"
              >
                Previous
              </button>
              <span className="px-2 font-mono text-[11px] text-slate-600">
                Page {pagination.page} / {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchVisitors(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-700 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Register Visitor Modal */}
      {registerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Register New Visitor</h3>
                  <p className="text-[11px] text-slate-400">Log entry gate check-in</p>
                </div>
              </div>
              <button
                onClick={() => setRegisterModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {registerError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{registerError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4 mt-4 text-xs">
              {/* Resident Student Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Visiting Resident Student <span className="text-rose-500">*</span>
                </label>
                <select
                  value={registerForm.studentId}
                  onChange={(e) => setRegisterForm({ ...registerForm, studentId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:outline-hidden focus:border-indigo-500"
                  required
                >
                  <option value="">-- Select Student --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.student_name} ({s.roll_number}) • {s.department}
                    </option>
                  ))}
                </select>
              </div>

              {/* Visitor Name & Relation Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Visitor Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Patel"
                    value={registerForm.visitorName}
                    onChange={(e) => setRegisterForm({ ...registerForm, visitorName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-hidden focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Relationship <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={registerForm.relationship}
                    onChange={(e) => setRegisterForm({ ...registerForm, relationship: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-hidden focus:border-indigo-500"
                    required
                  >
                    {RELATIONSHIPS.map((rel) => (
                      <option key={rel} value={rel}>
                        {rel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Phone Number & ID Proof Type Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 9876543210"
                    value={registerForm.phoneNumber}
                    onChange={(e) => setRegisterForm({ ...registerForm, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-hidden focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ID Proof Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={registerForm.idProofType}
                    onChange={(e) => setRegisterForm({ ...registerForm, idProofType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-hidden focus:border-indigo-500"
                    required
                  >
                    {ID_PROOF_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ID Proof Number */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ID Proof Document Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1234 5678 9012 or ABCDE1234F"
                  value={registerForm.idProofNumber}
                  onChange={(e) => setRegisterForm({ ...registerForm, idProofNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono focus:outline-hidden focus:border-indigo-500"
                  required
                />
              </div>

              {/* Purpose */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Purpose of Visit <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Family visit, document delivery, fee payment..."
                  value={registerForm.purpose}
                  onChange={(e) => setRegisterForm({ ...registerForm, purpose: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-hidden focus:border-indigo-500"
                  required
                />
              </div>

              {/* Gate Remarks */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Security / Gate Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Allowed to visit room 204"
                  value={registerForm.remarks}
                  onChange={(e) => setRegisterForm({ ...registerForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRegisterModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registerSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-2 shadow-md shadow-indigo-600/20"
                >
                  {registerSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Logging Entry...</span>
                    </>
                  ) : (
                    <span>Register & Check In</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checkout Confirmation Modal */}
      {checkoutModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <LogOut className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Record Visitor Exit?</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Check out <strong className="text-slate-800">{checkoutModal.visitorName}</strong> (Visiting{' '}
              {checkoutModal.studentName})? The current exit time will be saved to MySQL.
            </p>

            <form onSubmit={handleCheckoutSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Exit Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Left premises safely"
                  value={checkoutModal.remarks}
                  onChange={(e) => setCheckoutModal({ ...checkoutModal, remarks: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={checkoutModal.loading}
                  onClick={() => setCheckoutModal({ isOpen: false, visitorId: null, visitorName: '', studentName: '', remarks: '', loading: false })}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={checkoutModal.loading}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                >
                  {checkoutModal.loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <span>Confirm Exit</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {detailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Visitor Pass Details</h3>
                  <p className="text-[11px] text-slate-400">Entry Log #{selectedVisitor?.id}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailsLoading || !selectedVisitor ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
                <p className="text-xs">Loading visitor pass from database...</p>
              </div>
            ) : (
              <div className="space-y-4 mt-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-slate-600">Visitor Status:</span>
                  {getStatusBadge(selectedVisitor.status)}
                </div>

                {/* Visitor Info */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Visitor Information
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Name</span>
                      <span className="font-semibold text-slate-900">{selectedVisitor.visitor_name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Relation</span>
                      <span>{selectedVisitor.relationship}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Phone</span>
                      <span className="font-mono">{selectedVisitor.phone_number}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">ID Proof ({selectedVisitor.id_proof_type})</span>
                      <span className="font-mono font-medium">{selectedVisitor.id_proof_number}</span>
                    </div>
                  </div>
                </div>

                {/* Student Info */}
                <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-2.5">
                  <h4 className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider">
                    Visiting Student
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Student Name</span>
                      <span className="font-semibold text-slate-900">{selectedVisitor.student_name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Roll Number</span>
                      <span className="font-mono font-semibold text-slate-900">{selectedVisitor.roll_number}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Hostel & Room</span>
                      <span>
                        {selectedVisitor.hostel_name || 'N/A'} {selectedVisitor.room_number ? `(Rm ${selectedVisitor.room_number})` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Department</span>
                      <span>{selectedVisitor.department} • {selectedVisitor.course}</span>
                    </div>
                  </div>
                </div>

                {/* Entry / Exit Timestamps */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Check-In Timestamp</span>
                    <span className="font-semibold text-emerald-700">{formatDateTime(selectedVisitor.check_in_time)}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Check-Out Timestamp</span>
                    <span className="font-semibold text-slate-700">{formatDateTime(selectedVisitor.check_out_time)}</span>
                  </div>
                </div>

                {/* Purpose & Remarks */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Purpose of Visit</span>
                  <p className="text-slate-800 leading-relaxed">{selectedVisitor.purpose}</p>
                </div>

                {selectedVisitor.remarks && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Remarks / Gate Log</span>
                    <p className="text-slate-800">{selectedVisitor.remarks}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Delete Visitor Log #{deleteModal.visitorId}?</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Are you sure you want to permanently remove this entry from the database?
            </p>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={deleteModal.loading}
                onClick={() => setDeleteModal({ isOpen: false, visitorId: null, loading: false })}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteModal.loading}
                onClick={handleDeleteVisitor}
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
