import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getStudentFees,
  getFeeTypes,
  createStudentFee,
  updateStudentFee,
  getStudentFeeById,
} from '../../services/feeService';
import {
  getAllPayments,
  recordPayment,
  getFinancialStatistics,
  getPaymentById,
} from '../../services/paymentService';
import { getStudents } from '../../services/studentService';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  Calendar,
  Building2,
  User,
  DollarSign,
  FileText,
  X,
  RefreshCw,
  Loader2,
  ShieldCheck,
  Printer,
  ChevronRight,
  PieChart as PieChartIcon,
  BarChart3,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const CHART_COLORS = ['#059669', '#10B981', '#34D399', '#6EE7B7', '#F59E0B', '#38BDF8'];

export default function FeesPage() {
  const { user } = useAuth();
  const canManage = ['ADMIN', 'ACCOUNTANT'].includes(user?.role);

  // Main Data States
  const [fees, setFees] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [feeTypeFilter, setFeeTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [academicYearFilter, setAcademicYearFilter] = useState('');
  const [showCharts, setShowCharts] = useState(true);

  // Create Fee Bill Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);
  const initialCreateForm = {
    studentId: '',
    feeTypeId: '',
    academicYear: '2026-2027',
    termName: 'Odd Semester 2026',
    amountDue: '',
    discount: '0',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    billNumber: '',
  };
  const [createForm, setCreateForm] = useState(initialCreateForm);

  // Record Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedFeeForPayment, setSelectedFeeForPayment] = useState(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const initialPaymentForm = {
    studentFeeId: '',
    amount: '',
    paymentMethod: 'UPI',
    transactionId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
  };
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);

  // Receipt Preview Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  // Fee Details Modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedFeeDetails, setSelectedFeeDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Fetch Fee Types & Students for dropdowns
  useEffect(() => {
    async function loadMeta() {
      try {
        const [ftRes, stRes] = await Promise.all([
          getFeeTypes(),
          getStudents({ limit: 100, status: 'ACTIVE' }),
        ]);
        if (ftRes.data?.data) {
          setFeeTypes(ftRes.data.data);
        }
        if (stRes.data?.data) {
          setStudents(stRes.data.data);
        }
      } catch (err) {
        console.error('Failed to load fee meta:', err);
      }
    }
    loadMeta();
  }, []);

  // Fetch Statistics
  const loadStatistics = async () => {
    setStatsLoading(true);
    try {
      const res = await getFinancialStatistics();
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
    loadStatistics();
  }, []);

  // Fetch Student Fees Table
  const fetchFees = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getStudentFees({
        page,
        limit: pagination.limit,
        search,
        feeTypeId: feeTypeFilter,
        status: statusFilter,
        academicYear: academicYearFilter,
      });

      if (res.data?.data) {
        setFees(res.data.data);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch student fees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFees(1);
  }, [search, feeTypeFilter, statusFilter, academicYearFilter]);

  // Handle Create Fee Submit
  const handleCreateFeeSubmit = async (e) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError(null);

    try {
      const res = await createStudentFee(createForm);
      setActionSuccess(`Fee Bill ${res.data?.data?.bill_number || ''} created successfully!`);
      setCreateModalOpen(false);
      setCreateForm(initialCreateForm);
      fetchFees(pagination.page);
      loadStatistics();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create fee bill');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Payment Modal for a fee
  const openPaymentModal = (fee) => {
    setSelectedFeeForPayment(fee);
    const remaining = fee.outstanding_balance || 0;
    setPaymentForm({
      studentFeeId: fee.id,
      amount: remaining > 0 ? remaining.toString() : '',
      paymentMethod: 'UPI',
      transactionId: '',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setPaymentError(null);
    setPaymentModalOpen(true);
  };

  // Handle Record Payment Submit
  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    setPaymentSubmitting(true);
    setPaymentError(null);

    try {
      const res = await recordPayment({
        studentFeeId: paymentForm.studentFeeId,
        amount: parseFloat(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        transactionId: paymentForm.transactionId,
        paymentDate: paymentForm.paymentDate,
        notes: paymentForm.notes,
      });

      const paymentRecord = res.data?.data;
      setPaymentModalOpen(false);
      setActionSuccess(`Payment of ₹${paymentRecord.amount} recorded! Receipt: ${paymentRecord.receipt_number}`);
      
      // Auto open receipt preview
      setReceiptData(paymentRecord);
      setReceiptModalOpen(true);

      fetchFees(pagination.page);
      loadStatistics();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err) {
      setPaymentError(err.response?.data?.message || 'Payment recording failed');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Open Receipt Modal
  const handleViewReceipt = async (paymentId) => {
    setLoadingReceipt(true);
    setReceiptModalOpen(true);
    try {
      const res = await getPaymentById(paymentId);
      if (res.data?.data) {
        setReceiptData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load receipt:', err);
    } finally {
      setLoadingReceipt(false);
    }
  };

  // Open Fee Details Modal
  const handleViewDetails = async (feeId) => {
    setLoadingDetails(true);
    setDetailsModalOpen(true);
    try {
      const res = await getStudentFeeById(feeId);
      if (res.data?.data) {
        setSelectedFeeDetails(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load fee details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Format currency
  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  // Status badge styling
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Paid
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5" /> Partial
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertCircle className="w-3.5 h-3.5" /> Overdue
          </span>
        );
      case 'WAIVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            Waived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner with Finance Context Image and Emerald Glassmorphism */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 md:p-8 text-white shadow-xl shadow-emerald-950/20 border border-emerald-800/40">
        <div className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none">
          <img
            src="/images/finance/finance-banner.jpg"
            alt="Finance Overview"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>Financial & Revenue Management</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Fees & Payments Hub
            </h1>
            <p className="text-emerald-100/80 text-sm max-w-2xl leading-relaxed">
              Real-time billing, instant payment recording with ACID transaction safety, receipt generation, and comprehensive financial reporting.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowCharts(!showCharts)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm backdrop-blur-md transition-all border border-white/15 hover:border-white/30"
            >
              <BarChart3 className="w-4 h-4 text-emerald-300" />
              <span>{showCharts ? 'Hide Analytics' : 'Show Analytics'}</span>
            </button>

            {canManage && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-900/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span>Create Fee Bill</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Billed */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Billed</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {statsLoading ? '...' : formatINR(stats?.overview?.total_amount_due)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
              <span>{stats?.overview?.total_bills || 0} Total Bills Invoiced</span>
            </div>
          </div>
        </div>

        {/* Total Collected */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Collected</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-600">
              {statsLoading ? '...' : formatINR(stats?.overview?.total_amount_collected)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-700">
              <span>Today: {formatINR(stats?.overview?.today_collection)}</span>
            </div>
          </div>
        </div>

        {/* Total Outstanding */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Outstanding Due</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-600">
              {statsLoading ? '...' : formatINR(stats?.overview?.total_outstanding)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
              <span>{stats?.overview?.partial_bills || 0} Partial · {stats?.overview?.pending_bills || 0} Pending</span>
            </div>
          </div>
        </div>

        {/* Overdue Bills */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Overdue Invoices</span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-600">
              {statsLoading ? '...' : stats?.overview?.overdue_bills || 0}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-rose-500">
              <span>Requires Attention</span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Analytics & Charts Section (Collapsible) */}
      {showCharts && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Collections Trend */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  Monthly Fee Collections
                </h3>
                <p className="text-xs text-slate-500">Actual collections aggregate from MySQL database</p>
              </div>
            </div>
            <div className="h-64">
              {stats.monthly_collection && stats.monthly_collection.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.monthly_collection} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                    <Tooltip
                      formatter={(val) => [formatINR(val), 'Collected']}
                      contentStyle={{ backgroundColor: '#064e3b', borderColor: '#047857', color: '#fff', borderRadius: '0.75rem' }}
                    />
                    <Bar dataKey="collected" fill="#059669" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  No payment collections recorded yet in past 6 months.
                </div>
              )}
            </div>
          </div>

          {/* Fee Type Breakdown */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-emerald-600" />
                  Revenue by Fee Category
                </h3>
                <p className="text-xs text-slate-500">Breakdown by Fee Type</p>
              </div>
            </div>
            <div className="h-64">
              {stats.fee_type_breakdown && stats.fee_type_breakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.fee_type_breakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="collected"
                      nameKey="fee_type"
                    >
                      {stats.fee_type_breakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => [formatINR(val), name]}
                      contentStyle={{ backgroundColor: '#064e3b', borderColor: '#047857', color: '#fff', borderRadius: '0.75rem' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  No fee type statistics available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-card flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student, roll no, bill no..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Fee Type Filter */}
          <select
            value={feeTypeFilter}
            onChange={(e) => setFeeTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="">All Fee Types</option>
            {feeTypes.map((ft) => (
              <option key={ft.id} value={ft.id}>
                {ft.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIAL">Partial</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="WAIVED">Waived</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={() => {
              fetchFees(pagination.page);
              loadStatistics();
            }}
            title="Refresh Table"
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-emerald-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Student Fees Data Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Bill No / Term</th>
                <th className="py-3.5 px-4">Fee Category</th>
                <th className="py-3.5 px-4 text-right">Amount Due</th>
                <th className="py-3.5 px-4 text-right">Paid</th>
                <th className="py-3.5 px-4 text-right">Balance</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    <span>Loading real-time fee records from MySQL...</span>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="9" className="py-10 text-center text-rose-500">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                    <span>{error}</span>
                  </td>
                </tr>
              ) : fees.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <CreditCard className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <span>No student fee bills found matching criteria.</span>
                  </td>
                </tr>
              ) : (
                fees.map((fee) => {
                  const isOverdue = fee.status === 'OVERDUE' || (fee.status !== 'PAID' && new Date(fee.due_date) < new Date());
                  return (
                    <tr
                      key={fee.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Student */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {fee.student_name}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{fee.roll_number}</span>
                          {fee.room_number && (
                            <>
                              <span>·</span>
                              <span>Room {fee.room_number}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Bill Number */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-xs font-medium text-slate-700">
                          {fee.bill_number}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {fee.term_name} ({fee.academic_year})
                        </div>
                      </td>

                      {/* Fee Type */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-100">
                          {fee.fee_type_name}
                        </span>
                      </td>

                      {/* Amount Due */}
                      <td className="py-3.5 px-4 text-right font-medium text-slate-900">
                        {formatINR(fee.amount_due - fee.discount)}
                        {fee.discount > 0 && (
                          <div className="text-[10px] text-emerald-600">
                            -₹{fee.discount} discount
                          </div>
                        )}
                      </td>

                      {/* Amount Paid */}
                      <td className="py-3.5 px-4 text-right font-medium text-emerald-600">
                        {formatINR(fee.amount_paid)}
                      </td>

                      {/* Outstanding Balance */}
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`font-bold ${
                            fee.outstanding_balance > 0
                              ? 'text-amber-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {formatINR(fee.outstanding_balance)}
                        </span>
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className={`text-xs ${isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-600'}`}>
                          {new Date(fee.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {renderStatusBadge(fee.status)}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {canManage && fee.outstanding_balance > 0 && (
                            <button
                              onClick={() => openPaymentModal(fee)}
                              title="Record Payment"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm transition active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Pay</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleViewDetails(fee.id)}
                            title="View Details & Payments"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
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
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {fees.length} of {pagination.total} records
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchFees(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-100 transition"
              >
                Previous
              </button>
              <span className="px-2 font-semibold text-slate-700">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchFees(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-100 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. CREATE FEE BILL MODAL */}
      {/* ========================================================================= */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-700">
                <CreditCard className="w-5 h-5" />
                <h2 className="text-lg font-bold text-slate-900">Create Fee Invoice</h2>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateFeeSubmit} className="mt-4 space-y-4 text-sm">
              {/* Select Student */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Select Student Resident *
                </label>
                <select
                  required
                  value={createForm.studentId}
                  onChange={(e) => setCreateForm({ ...createForm, studentId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="">-- Choose Student --</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.student_name} ({st.roll_number}) - {st.department || 'Student'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fee Type */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Fee Category / Type *
                </label>
                <select
                  required
                  value={createForm.feeTypeId}
                  onChange={(e) => setCreateForm({ ...createForm, feeTypeId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="">-- Choose Fee Type --</option>
                  {feeTypes.map((ft) => (
                    <option key={ft.id} value={ft.id}>
                      {ft.name} ({ft.frequency})
                    </option>
                  ))}
                </select>
              </div>

              {/* Academic Year & Term */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Academic Year
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.academicYear}
                    onChange={(e) => setCreateForm({ ...createForm, academicYear: e.target.value })}
                    placeholder="2026-2027"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Term / Semester
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.termName}
                    onChange={(e) => setCreateForm({ ...createForm, termName: e.target.value })}
                    placeholder="Odd Semester 2026"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Amount Due & Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Amount Due (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={createForm.amountDue}
                    onChange={(e) => setCreateForm({ ...createForm, amountDue: e.target.value })}
                    placeholder="e.g. 18000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Discount / Scholarship (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={createForm.discount}
                    onChange={(e) => setCreateForm({ ...createForm, discount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Due Date & Optional Bill Number */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={createForm.dueDate}
                    onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Bill No (Optional)
                  </label>
                  <input
                    type="text"
                    value={createForm.billNumber}
                    onChange={(e) => setCreateForm({ ...createForm, billNumber: e.target.value })}
                    placeholder="Auto-generated if blank"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              {createForm.amountDue && (
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60 flex items-center justify-between text-xs">
                  <span className="text-slate-600">Net Payable Balance:</span>
                  <span className="font-bold text-emerald-800 text-sm">
                    {formatINR(Math.max(0, (parseFloat(createForm.amountDue) || 0) - (parseFloat(createForm.discount) || 0)))}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold shadow-md shadow-emerald-600/20 transition active:scale-95"
                >
                  {createSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Save Fee Bill</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. RECORD PAYMENT MODAL */}
      {/* ========================================================================= */}
      {paymentModalOpen && selectedFeeForPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-700">
                <CreditCard className="w-5 h-5" />
                <h2 className="text-lg font-bold text-slate-900">Record Fee Payment</h2>
              </div>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {paymentError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            {/* Fee Bill Summary Header Box */}
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Student:</span>
                <span className="font-semibold text-slate-900">
                  {selectedFeeForPayment.student_name} ({selectedFeeForPayment.roll_number})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bill Number / Fee Type:</span>
                <span className="font-mono text-slate-800">
                  {selectedFeeForPayment.bill_number} · {selectedFeeForPayment.fee_type_name}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500">Total Net Invoiced:</span>
                <span className="font-medium text-slate-900">
                  {formatINR(selectedFeeForPayment.amount_due - selectedFeeForPayment.discount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Already Paid:</span>
                <span className="font-medium text-emerald-600">
                  {formatINR(selectedFeeForPayment.amount_paid)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-1 text-amber-600">
                <span>Outstanding Balance:</span>
                <span>{formatINR(selectedFeeForPayment.outstanding_balance)}</span>
              </div>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="mt-4 space-y-4 text-sm">
              {/* Payment Amount */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={selectedFeeForPayment.outstanding_balance}
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder={`Max ₹${selectedFeeForPayment.outstanding_balance}`}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                {parseFloat(paymentForm.amount) > selectedFeeForPayment.outstanding_balance && (
                  <p className="text-rose-500 text-xs mt-1">
                    Overpayment rejected: Amount exceeds balance ₹{selectedFeeForPayment.outstanding_balance}.
                  </p>
                )}
              </div>

              {/* Payment Method & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    required
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="UPI">UPI</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="NET_BANKING">Net Banking</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="DEMAND_DRAFT">Demand Draft (DD)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Transaction ID */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Transaction / UTR / Reference ID
                </label>
                <input
                  type="text"
                  value={paymentForm.transactionId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                  placeholder="e.g. UPI-202684920491 or Cheque #10294"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Notes / Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="e.g. Paid in full by father at hostel office"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Live Balance Calculation Preview */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Current Balance:</span>
                  <span>{formatINR(selectedFeeForPayment.outstanding_balance)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>New Payment:</span>
                  <span className="font-semibold text-emerald-600">
                    -{formatINR(parseFloat(paymentForm.amount) || 0)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-emerald-200 pt-1.5">
                  <span>Remaining After Payment:</span>
                  <span className="text-emerald-700">
                    {formatINR(
                      Math.max(
                        0,
                        (selectedFeeForPayment.outstanding_balance || 0) - (parseFloat(paymentForm.amount) || 0)
                      )
                    )}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSubmitting || parseFloat(paymentForm.amount) > selectedFeeForPayment.outstanding_balance}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold shadow-md shadow-emerald-600/20 transition active:scale-95"
                >
                  {paymentSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <span>Confirm & Record Payment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. RECEIPT PREVIEW MODAL */}
      {/* ========================================================================= */}
      {receiptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95">
            {loadingReceipt || !receiptData ? (
              <div className="py-12 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                <span>Generating official receipt...</span>
              </div>
            ) : (
              <div>
                {/* Print Header */}
                <div className="text-center border-b border-slate-200 pb-4">
                  <div className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full mb-2 border border-emerald-200/60">
                    <ShieldCheck className="w-3.5 h-3.5" /> Official Fee Receipt
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    HOSTEL FOOD & ACCOMMODATION
                  </h2>
                  <p className="text-xs text-slate-500">Management Information System</p>
                </div>

                {/* Receipt Metadata */}
                <div className="grid grid-cols-2 gap-3 py-3 border-b border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400">Receipt No:</span>
                    <div className="font-mono font-bold text-slate-900">{receiptData.receipt_number}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">Payment Date:</span>
                    <div className="font-medium text-slate-900">
                      {new Date(receiptData.payment_date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>

                {/* Student & Bill Details */}
                <div className="py-3 border-b border-slate-100 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Student Name:</span>
                    <span className="font-semibold text-slate-900">{receiptData.student_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Roll Number:</span>
                    <span className="font-mono text-slate-800">{receiptData.roll_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Department / Course:</span>
                    <span className="text-slate-800">{receiptData.department} · {receiptData.course}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bill Number:</span>
                    <span className="font-mono text-slate-800">{receiptData.bill_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fee Category:</span>
                    <span className="font-medium text-slate-800">{receiptData.fee_type_name}</span>
                  </div>
                </div>

                {/* Payment Breakdown */}
                <div className="py-4 bg-slate-50 rounded-xl my-4 p-4 space-y-2 text-xs border border-slate-100">
                  <div className="flex justify-between text-slate-600">
                    <span>Payment Method:</span>
                    <span className="font-semibold text-slate-900">{receiptData.payment_method}</span>
                  </div>
                  {receiptData.transaction_id && (
                    <div className="flex justify-between text-slate-600">
                      <span>Ref / Transaction ID:</span>
                      <span className="font-mono text-slate-900">{receiptData.transaction_id}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Previous Balance:</span>
                    <span>{formatINR(receiptData.previous_balance)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-emerald-600 border-t border-slate-200 pt-2">
                    <span>Amount Paid:</span>
                    <span>{formatINR(receiptData.amount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-slate-900 pt-1">
                    <span>Remaining Balance:</span>
                    <span className={receiptData.remaining_balance > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                      {formatINR(receiptData.remaining_balance)}
                    </span>
                  </div>
                </div>

                {/* Footer Notes & Collector */}
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Processed by: {receiptData.collected_by_name || 'Accounts Desk'}</span>
                  <span className="text-emerald-600 font-semibold">Payment Status: SUCCESS</span>
                </div>

                {/* Modal Buttons */}
                <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition text-sm"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Receipt</span>
                  </button>
                  <button
                    onClick={() => setReceiptModalOpen(false)}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition shadow-md shadow-emerald-600/20 active:scale-95"
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
      {/* 4. FEE DETAILS & PAYMENT HISTORY MODAL */}
      {/* ========================================================================= */}
      {detailsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-700">
                <FileText className="w-5 h-5" />
                <h2 className="text-lg font-bold text-slate-900">Fee Invoice & Payment Log</h2>
              </div>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetails || !selectedFeeDetails ? (
              <div className="py-12 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                <span>Loading complete billing & transaction log...</span>
              </div>
            ) : (
              <div className="mt-4 space-y-5 text-sm">
                {/* Header Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-xs text-slate-400 block font-medium">Total Due</span>
                    <span className="font-bold text-slate-900">
                      {formatINR(selectedFeeDetails.amount_due - selectedFeeDetails.discount)}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-xs text-slate-400 block font-medium">Total Paid</span>
                    <span className="font-bold text-emerald-600">
                      {formatINR(selectedFeeDetails.amount_paid)}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-xs text-slate-400 block font-medium">Balance</span>
                    <span className="font-bold text-amber-600">
                      {formatINR(selectedFeeDetails.outstanding_balance)}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-xs text-slate-400 block font-medium">Status</span>
                    <div className="mt-0.5">{renderStatusBadge(selectedFeeDetails.status)}</div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400">Student:</span>{' '}
                    <span className="font-medium text-slate-800">
                      {selectedFeeDetails.student_name} ({selectedFeeDetails.roll_number})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Bill Number:</span>{' '}
                    <span className="font-mono font-medium text-slate-800">
                      {selectedFeeDetails.bill_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Fee Category:</span>{' '}
                    <span className="font-medium text-slate-800">
                      {selectedFeeDetails.fee_type_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Due Date:</span>{' '}
                    <span className="font-medium text-slate-800">
                      {new Date(selectedFeeDetails.due_date).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                </div>

                {/* Payment History List */}
                <div>
                  <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    Payment Transactions ({selectedFeeDetails.payments?.length || 0})
                  </h3>

                  {selectedFeeDetails.payments && selectedFeeDetails.payments.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedFeeDetails.payments.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                        >
                          <div>
                            <div className="font-mono font-bold text-slate-900">
                              {p.receipt_number}
                            </div>
                            <div className="text-slate-400 mt-0.5">
                              {new Date(p.payment_date).toLocaleDateString('en-GB')} via {p.payment_method}
                              {p.transaction_id && ` · Ref: ${p.transaction_id}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-emerald-600 text-sm">
                              {formatINR(p.amount)}
                            </span>
                            <button
                              onClick={() => {
                                setDetailsModalOpen(false);
                                handleViewReceipt(p.id);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 text-xs font-semibold transition"
                            >
                              Receipt
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-3 text-center bg-slate-50 rounded-xl border border-slate-100">
                      No payments made yet against this invoice.
                    </p>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setDetailsModalOpen(false)}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition shadow-md shadow-emerald-600/20 active:scale-95"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
