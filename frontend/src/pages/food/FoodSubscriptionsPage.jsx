import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Search, Filter, RefreshCw, Calendar, 
  Utensils, AlertCircle, CheckCircle2, PauseCircle, PlayCircle, XCircle, 
  ChevronRight, ArrowRightLeft, History, DollarSign, Building, BookOpen, Sparkles
} from 'lucide-react';
import FoodNav from '../../components/food/FoodNav';
import FoodStats from '../../components/food/FoodStats';
import foodSubscriptionService from '../../services/foodSubscriptionService';
import studentService from '../../services/studentService';
import { useAuth } from '../../context/AuthContext';

const STATUS_BADGES = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PAUSED: 'bg-amber-50 text-amber-700 border-amber-200',
  EXPIRED: 'bg-slate-100 text-slate-600 border-slate-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200'
};

export default function FoodSubscriptionsPage() {
  const { user } = useAuth();
  const isStudent = user?.role === 'STUDENT';
  const canManage = user?.role === 'ADMIN' || user?.role === 'WARDEN' || user?.role === 'MESS_MANAGER';
  const myStudentId = user?.studentDetails?.studentId || user?.studentId;

  // State
  const [stats, setStats] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [hostelFilter, setHostelFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 10 });

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isChangePlanModalOpen, setIsChangePlanModalOpen] = useState(false);
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Selected Subscription for Actions
  const [selectedSub, setSelectedSub] = useState(null);
  const [studentHistory, setStudentHistory] = useState(null);

  // Form State for New Subscription
  const [studentsList, setStudentsList] = useState([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [createForm, setCreateForm] = useState({
    student_id: '',
    plan_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    monthly_price: ''
  });

  // Form State for Change Plan
  const [changePlanForm, setChangePlanForm] = useState({
    new_plan_id: '',
    effective_date: new Date().toISOString().split('T')[0]
  });

  // Form State for Pause
  const [pauseForm, setPauseForm] = useState({
    pause_date: new Date().toISOString().split('T')[0],
    reason: ''
  });

  // Form State for Cancel
  const [cancelForm, setCancelForm] = useState({
    cancellation_date: new Date().toISOString().split('T')[0],
    reason: ''
  });

  // Form State for Renew
  const [renewForm, setRenewForm] = useState({
    plan_id: '',
    duration_months: 1,
    start_date: ''
  });

  // Load initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, plansRes, subsRes] = await Promise.all([
        foodSubscriptionService.getFoodStats(),
        foodSubscriptionService.getFoodPlans(),
        foodSubscriptionService.getSubscriptions({
          page,
          limit: 10,
          search,
          status: statusFilter,
          plan_id: planFilter,
          hostel_name: hostelFilter,
          department: departmentFilter
        })
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (plansRes.success) setPlans(plansRes.data || []);
      if (subsRes.success) {
        setSubscriptions(subsRes.data || []);
        if (subsRes.pagination) setPagination(subsRes.pagination);
      }
    } catch (err) {
      console.error('Error fetching subscription data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, statusFilter, planFilter, hostelFilter, departmentFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchData();
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch candidate students for modal
  const fetchStudents = async () => {
    try {
      const res = await studentService.getAll({ limit: 100, search: studentSearchTerm });
      if (res.success) {
        setStudentsList(res.data || []);
      }
    } catch (err) {
      console.error('Error loading students:', err);
    }
  };

  useEffect(() => {
    if (isCreateModalOpen && !isStudent) {
      fetchStudents();
    }
  }, [isCreateModalOpen, studentSearchTerm]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const defaultPlan = plans.find((p) => p.status === 'ACTIVE') || plans[0];
    setCreateForm({
      student_id: isStudent ? (myStudentId || user?.id) : '',
      plan_id: defaultPlan ? defaultPlan.id : '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      monthly_price: defaultPlan ? defaultPlan.monthly_price : ''
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setError(null);
      const effectiveStudentId = isStudent ? (myStudentId || user?.id) : createForm.student_id;

      // Check if student already has an active subscription
      const existingActive = subscriptions.find(
        (s) => (s.student_id === effectiveStudentId || s.studentId === effectiveStudentId) && s.status === 'ACTIVE'
      );

      let res;
      if (existingActive) {
        // Upgrade/change current plan seamlessly
        res = await foodSubscriptionService.changePlan(existingActive.id, {
          new_plan_id: createForm.plan_id,
          effective_date: createForm.start_date || new Date().toISOString().split('T')[0],
        });
        if (res.success) {
          setSuccessMessage('Food subscription plan upgraded successfully!');
        }
      } else {
        res = await foodSubscriptionService.createSubscription({
          ...createForm,
          student_id: effectiveStudentId,
          studentId: effectiveStudentId,
        });
        if (res.success) {
          setSuccessMessage('Food subscription created successfully!');
        }
      }

      if (res.success) {
        setIsCreateModalOpen(false);
        fetchData();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to process subscription');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Change Plan Modal
  const handleOpenChangePlan = (sub) => {
    setSelectedSub(sub);
    setChangePlanForm({
      new_plan_id: plans.find(p => p.id !== sub.plan_id)?.id || '',
      effective_date: new Date().toISOString().split('T')[0]
    });
    setIsChangePlanModalOpen(true);
  };

  const handleChangePlanSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setError(null);
      const res = await foodSubscriptionService.changePlan(selectedSub.id, changePlanForm);
      if (res.success) {
        setSuccessMessage('Food plan changed successfully!');
        setIsChangePlanModalOpen(false);
        fetchData();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to change plan');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Pause
  const handleOpenPause = (sub) => {
    setSelectedSub(sub);
    setPauseForm({
      pause_date: new Date().toISOString().split('T')[0],
      reason: ''
    });
    setIsPauseModalOpen(true);
  };

  const handlePauseSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setError(null);
      const res = await foodSubscriptionService.pauseSubscription(selectedSub.id, pauseForm);
      if (res.success) {
        setSuccessMessage('Food subscription paused');
        setIsPauseModalOpen(false);
        fetchData();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to pause subscription');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Resume
  const handleResume = async (sub) => {
    try {
      setActionLoading(true);
      setError(null);
      const res = await foodSubscriptionService.resumeSubscription(sub.id);
      if (res.success) {
        setSuccessMessage('Food subscription resumed actively');
        fetchData();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to resume subscription');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Cancel
  const handleOpenCancel = (sub) => {
    setSelectedSub(sub);
    setCancelForm({
      cancellation_date: new Date().toISOString().split('T')[0],
      reason: ''
    });
    setIsCancelModalOpen(true);
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setError(null);
      const res = await foodSubscriptionService.cancelSubscription(selectedSub.id, cancelForm);
      if (res.success) {
        setSuccessMessage('Food subscription cancelled');
        setIsCancelModalOpen(false);
        fetchData();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to cancel subscription');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Renew
  const handleOpenRenew = (sub) => {
    setSelectedSub(sub);
    const defaultStart = new Date(sub.end_date) > new Date()
      ? new Date(new Date(sub.end_date).getTime() + 86400000).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    setRenewForm({
      plan_id: sub.plan_id,
      duration_months: 1,
      start_date: defaultStart
    });
    setIsRenewModalOpen(true);
  };

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setError(null);
      const res = await foodSubscriptionService.renewSubscription(selectedSub.id, renewForm);
      if (res.success) {
        setSuccessMessage('Subscription renewed successfully!');
        setIsRenewModalOpen(false);
        fetchData();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to renew subscription');
    } finally {
      setActionLoading(false);
    }
  };

  // View Student History
  const handleViewHistory = async (sub) => {
    try {
      setSelectedSub(sub);
      setIsHistoryModalOpen(true);
      const res = await foodSubscriptionService.getStudentFoodHistory(sub.student_id);
      if (res.success) {
        setStudentHistory(res.data);
      }
    } catch (err) {
      console.error('Error fetching student food history:', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Visual Hero Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-200/80 shadow-xs">
        <img
          src="/images/food/dining-banner.jpg"
          alt="Dining Hall"
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover opacity-35 transition-transform duration-700 hover:scale-102"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-slate-900/80 to-transparent" />
        <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-white">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold backdrop-blur-md mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Campus Dining Operations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <Utensils className="h-7 w-7 text-emerald-400" />
              Food Subscription Management
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
              Monitor resident meal subscriptions, assign packages, manage paused periods and dining eligibility.
            </p>
          </div>

          {(canManage || isStudent) && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                {isStudent ? 'Subscribe to Plan' : 'New Subscription'}
              </button>
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white transition-colors cursor-pointer"
                title="Refresh Data"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Food Sub-Navigation */}
      <FoodNav />

      {/* Live Stats */}
      <FoodStats stats={stats} loading={loading} />

      {/* Feedback Alerts */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search student, roll..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAUSED">PAUSED</option>
              <option value="EXPIRED">EXPIRED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          {/* Plan Filter */}
          <div>
            <select
              value={planFilter}
              onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="">All Food Plans</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name} (₹{p.monthly_price})</option>
              ))}
            </select>
          </div>

          {/* Hostel Filter */}
          <div>
            <input
              type="text"
              placeholder="Filter by Hostel..."
              value={hostelFilter}
              onChange={(e) => { setHostelFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Department Filter */}
          <div>
            <input
              type="text"
              placeholder="Filter Department..."
              value={departmentFilter}
              onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-5 py-3.5">Student / Resident</th>
                <th className="px-4 py-3.5">Hostel & Room</th>
                <th className="px-4 py-3.5">Food Plan</th>
                <th className="px-4 py-3.5">Validity Period</th>
                <th className="px-4 py-3.5">Monthly Fee</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    Loading food subscriptions...
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <Utensils className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    No food subscriptions found matching the filters.
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-emerald-50/40 transition-colors">
                    {/* Student Info */}
                    <td className="px-5 py-4">
                      <div>
                        <span className="font-semibold text-slate-900 block">
                          {sub.student_name || 'Unknown Student'}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {sub.roll_number || 'N/A'} • {sub.department || 'General'}
                        </span>
                      </div>
                    </td>

                    {/* Accommodation Info */}
                    <td className="px-4 py-4 text-xs">
                      {sub.hostel_name ? (
                        <div>
                          <span className="text-slate-800 block font-medium">{sub.hostel_name}</span>
                          <span className="text-slate-500">Room {sub.room_number || '-'}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Day Scholar / Unallocated</span>
                      )}
                    </td>

                    {/* Food Plan */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800">{sub.plan_name}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[10px]">
                        {sub.has_breakfast ? <span className="bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-bold">B</span> : null}
                        {sub.has_lunch ? <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">L</span> : null}
                        {sub.has_snacks ? <span className="bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded font-bold">S</span> : null}
                        {sub.has_dinner ? <span className="bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded font-bold">D</span> : null}
                      </div>
                    </td>

                    {/* Validity */}
                    <td className="px-4 py-4 text-xs">
                      <div className="text-slate-800 font-medium">
                        {new Date(sub.start_date).toLocaleDateString()}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        to {new Date(sub.end_date).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-4 font-semibold text-slate-900">
                      ₹{parseFloat(sub.monthly_price).toLocaleString()}
                      <span className="text-[10px] text-slate-400 block font-normal">/ month</span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_BADGES[sub.status] || 'bg-slate-100 text-slate-600'}`}>
                        {sub.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewHistory(sub)}
                          className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="View Food History"
                        >
                          <History className="h-4 w-4" />
                        </button>

                        {(canManage || (isStudent && sub.student_id === myStudentId)) && (
                          <>
                            {sub.status === 'ACTIVE' && (
                              <>
                                <button
                                  onClick={() => handleOpenChangePlan(sub)}
                                  className="p-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                                  title="Change Food Plan"
                                >
                                  <ArrowRightLeft className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleOpenPause(sub)}
                                  className="p-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                                  title="Pause Subscription"
                                >
                                  <PauseCircle className="h-4 w-4" />
                                </button>
                              </>
                            )}

                            {sub.status === 'PAUSED' && (
                              <button
                                onClick={() => handleResume(sub)}
                                className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                                title="Resume Subscription"
                              >
                                <PlayCircle className="h-4 w-4" />
                              </button>
                            )}

                            {(sub.status === 'EXPIRED' || sub.status === 'CANCELLED') && (
                              <button
                                onClick={() => handleOpenRenew(sub)}
                                className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                                title="Renew Subscription"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </button>
                            )}

                            {(sub.status === 'ACTIVE' || sub.status === 'PAUSED') && (
                              <button
                                onClick={() => handleOpenCancel(sub)}
                                className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                                title="Cancel Subscription"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.pages > 1 && (
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing Page <span className="text-slate-900 font-semibold">{pagination.page}</span> of{' '}
              <span className="text-slate-900 font-semibold">{pagination.pages}</span> ({pagination.total} total subscriptions)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE SUBSCRIPTION MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="h-5 w-5 text-emerald-600" />
                Assign Food Subscription
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {/* Student Picker */}
              {isStudent ? (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-emerald-700 block font-semibold">Subscribing Resident</span>
                    <span className="text-slate-900 font-bold">{user?.name}</span>
                    <span className="text-slate-500 font-mono ml-2">({user?.email})</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200 text-[10px]">
                    STUDENT
                  </span>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Student <span className="text-rose-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Search candidate student..."
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <select
                      value={createForm.student_id}
                      onChange={(e) => setCreateForm({ ...createForm, student_id: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="">-- Choose Candidate Student --</option>
                      {studentsList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.roll_number || s.register_number || 'No Roll'}) - {s.hostel_name || 'No Hostel'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Plan Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Food Plan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={createForm.plan_id}
                  onChange={(e) => {
                    const selPlan = plans.find(p => p.id === parseInt(e.target.value));
                    setCreateForm({
                      ...createForm,
                      plan_id: e.target.value,
                      monthly_price: selPlan ? selPlan.monthly_price : createForm.monthly_price
                    });
                  }}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="">-- Select Food Plan --</option>
                  {plans.filter(p => p.status === 'ACTIVE').map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ₹{p.monthly_price}/mo ({[
                        p.has_breakfast ? 'Breakfast' : null,
                        p.has_lunch ? 'Lunch' : null,
                        p.has_snacks ? 'Snacks' : null,
                        p.has_dinner ? 'Dinner' : null
                      ].filter(Boolean).join(', ')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={createForm.start_date}
                    onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={createForm.end_date}
                    onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={createForm.monthly_price}
                  onChange={(e) => setCreateForm({ ...createForm, monthly_price: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  * Automatically integrates billing with student fee ledger (Mess Charges).
                </p>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold shadow-md shadow-emerald-600/20 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Assigning...' : 'Assign Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE PLAN MODAL */}
      {isChangePlanModalOpen && selectedSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-amber-600" />
                Change Food Plan
              </h2>
              <button onClick={() => setIsChangePlanModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleChangePlanSubmit} className="p-6 space-y-4">
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100 text-xs space-y-1">
                <div className="text-slate-600">Student: <span className="text-slate-900 font-bold">{selectedSub.student_name}</span></div>
                <div className="text-slate-600">Current Plan: <span className="text-amber-800 font-bold">{selectedSub.plan_name}</span> (₹{selectedSub.monthly_price}/mo)</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select New Plan</label>
                <select
                  value={changePlanForm.new_plan_id}
                  onChange={(e) => setChangePlanForm({ ...changePlanForm, new_plan_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="">-- Choose New Food Plan --</option>
                  {plans.filter(p => p.id !== selectedSub.plan_id && p.status === 'ACTIVE').map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (₹{p.monthly_price}/month)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Effective Date</label>
                <input
                  type="date"
                  value={changePlanForm.effective_date}
                  onChange={(e) => setChangePlanForm({ ...changePlanForm, effective_date: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsChangePlanModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {actionLoading ? 'Updating...' : 'Update Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {isPauseModalOpen && selectedSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <PauseCircle className="h-5 w-5 text-amber-600" />
                Pause Subscription
              </h2>
              <button onClick={() => setIsPauseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePauseSubmit} className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Are you sure you want to pause the food subscription for{' '}
                <span className="text-slate-900 font-bold">{selectedSub.student_name}</span>?
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pause Date</label>
                <input
                  type="date"
                  value={pauseForm.pause_date}
                  onChange={(e) => setPauseForm({ ...pauseForm, pause_date: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason (Optional)</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Temporary leave, medical reasons..."
                  value={pauseForm.reason}
                  onChange={(e) => setPauseForm({ ...pauseForm, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPauseModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-semibold"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {actionLoading ? 'Pausing...' : 'Confirm Pause'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {isCancelModalOpen && selectedSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-rose-600" />
                Cancel Food Subscription
              </h2>
              <button onClick={() => setIsCancelModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCancelSubmit} className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Cancel active subscription for{' '}
                <span className="text-slate-900 font-bold">{selectedSub.student_name}</span>.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cancellation Date</label>
                <input
                  type="date"
                  value={cancelForm.cancellation_date}
                  onChange={(e) => setCancelForm({ ...cancelForm, cancellation_date: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Cancellation</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Student vacated hostel / Opted out..."
                  value={cancelForm.reason}
                  onChange={(e) => setCancelForm({ ...cancelForm, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-semibold"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENEW MODAL */}
      {isRenewModalOpen && selectedSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-emerald-600" />
                Renew Subscription
              </h2>
              <button onClick={() => setIsRenewModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRenewSubmit} className="p-6 space-y-4">
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-xs space-y-1">
                <div className="text-slate-600">Student: <span className="text-slate-900 font-bold">{selectedSub.student_name}</span></div>
                <div className="text-slate-600">Previous End Date: <span className="text-slate-800 font-semibold">{new Date(selectedSub.end_date).toLocaleDateString()}</span></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Food Plan</label>
                <select
                  value={renewForm.plan_id}
                  onChange={(e) => setRenewForm({ ...renewForm, plan_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {plans.filter(p => p.status === 'ACTIVE').map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (₹{p.monthly_price}/mo)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={renewForm.start_date}
                    onChange={(e) => setRenewForm({ ...renewForm, start_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Months)</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={renewForm.duration_months}
                    onChange={(e) => setRenewForm({ ...renewForm, duration_months: parseInt(e.target.value) || 1 })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRenewModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Renewing...' : 'Confirm Renewal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT HISTORY MODAL */}
      {isHistoryModalOpen && selectedSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <History className="h-5 w-5 text-emerald-600" />
                Food & Meal History — {selectedSub.student_name}
              </h2>
              <button onClick={() => { setIsHistoryModalOpen(false); setStudentHistory(null); }} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {!studentHistory ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
                  Loading history...
                </div>
              ) : (
                <>
                  {/* Subscription History */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <Utensils className="h-4 w-4 text-emerald-600" />
                      Subscription Timeline
                    </h3>
                    <div className="space-y-2">
                      {studentHistory.subscriptions?.map((s) => (
                        <div key={s.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-900">{s.plan_name}</span>
                            <span className="text-slate-500 ml-2">₹{s.monthly_price}/mo</span>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {new Date(s.start_date).toLocaleDateString()} to {new Date(s.end_date).toLocaleDateString()}
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${STATUS_BADGES[s.status] || 'bg-slate-100 text-slate-600'}`}>
                            {s.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Attendance Logs */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-amber-600" />
                      Recent Meal Attendance
                    </h3>
                    {studentHistory.attendance?.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No meal attendance records found.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {studentHistory.attendance?.slice(0, 10).map((a, i) => (
                          <div key={i} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800">{a.meal_type}</span>
                            <span className="text-slate-500 font-mono">{new Date(a.date).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Billing Records */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      Linked Mess Invoices & Bills
                    </h3>
                    {studentHistory.bills?.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No linked fee bills generated yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {studentHistory.bills?.map((b) => (
                          <div key={b.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-slate-900">₹{parseFloat(b.amount).toLocaleString()}</span>
                              <span className="text-slate-500 ml-2 font-mono">Invoice #{b.id}</span>
                              <div className="text-[11px] text-slate-400 mt-0.5">Due: {new Date(b.due_date).toLocaleDateString()}</div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                              b.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              b.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {b.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
