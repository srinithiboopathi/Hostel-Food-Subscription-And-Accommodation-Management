import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getMealAttendance,
  recordAttendance,
  updateAttendance,
  getMealStatistics,
} from '../../services/mealService';
import { getMealTypes } from '../../services/menuService';
import { getStudents } from '../../services/studentService';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Filter,
  Search,
  Plus,
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
  RefreshCw,
  Loader2,
  AlertCircle,
  X,
  Package,
  Sparkles,
  Coffee,
  Sun,
  Sunset,
  Moon,
  Check,
  Utensils,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function MealAttendancePage() {
  const { user } = useAuth();
  const canManage = ['ADMIN', 'MESS_MANAGER'].includes(user?.role);

  // Filters & State
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [mealTypeFilter, setMealTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Data State
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [stats, setStats] = useState(null);
  const [mealTypes, setMealTypes] = useState([]);
  const [students, setStudents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Modal State for Check-in
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    studentId: '',
    mealTypeId: '',
    mealDate: new Date().toISOString().split('T')[0],
    status: 'PRESENT',
    remarks: '',
  });

  // Load Initial Metadata (Meal Types & Students)
  useEffect(() => {
    async function loadMeta() {
      try {
        const [typesRes, studentsRes] = await Promise.all([
          getMealTypes(),
          getStudents({ limit: 100, status: 'ACTIVE' }),
        ]);
        const types = typesRes.data?.data || typesRes.data || [];
        const studentList = studentsRes.data?.data || studentsRes.data?.students || [];
        setMealTypes(types);
        setStudents(studentList);

        if (types.length > 0) {
          setFormData((prev) => ({ ...prev, mealTypeId: types[0].id }));
        }
        if (studentList.length > 0) {
          setFormData((prev) => ({ ...prev, studentId: studentList[0].id }));
        }
      } catch (err) {
        console.error('Failed to load metadata:', err);
      }
    }
    loadMeta();
  }, []);

  // Fetch Attendance & Statistics from MySQL
  const fetchData = async (pageNumber = 1) => {
    setLoading(true);
    setError(null);
    try {
      const [attRes, statsRes] = await Promise.all([
        getMealAttendance({
          page: pageNumber,
          limit: 15,
          date: selectedDate,
          mealTypeId: mealTypeFilter,
          status: statusFilter,
          search: search.trim(),
        }),
        getMealStatistics({ date: selectedDate }),
      ]);

      const attData = attRes.data?.data || [];
      const attPaging = attRes.data?.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 };
      setAttendanceLogs(attData);
      setPagination(attPaging);

      setStats(statsRes.data?.data || statsRes.data);
    } catch (err) {
      console.error('Failed to load meal attendance:', err);
      setError(err.response?.data?.message || 'Failed to fetch meal attendance from database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
  }, [selectedDate, mealTypeFilter, statusFilter]);

  // Toast timer
  useEffect(() => {
    if (actionSuccess) {
      const timer = setTimeout(() => setActionSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccess]);

  // Handle Mark Attendance Modal Submit
  const handleMarkSubmit = async (e) => {
    e.preventDefault();
    if (!formData.studentId) {
      setFormError('Please select a student resident');
      return;
    }
    if (!formData.mealTypeId) {
      setFormError('Please select a meal type');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await recordAttendance({
        studentId: parseInt(formData.studentId, 10),
        mealTypeId: parseInt(formData.mealTypeId, 10),
        mealDate: formData.mealDate || selectedDate,
        status: formData.status,
        remarks: formData.remarks.trim() || null,
      });

      setActionSuccess('Meal attendance marked successfully in MySQL');
      setModalOpen(false);
      setFormData((prev) => ({ ...prev, remarks: '' }));
      await fetchData(pagination.page);
    } catch (err) {
      console.error('Mark attendance error:', err);
      setFormError(err.response?.data?.message || 'Failed to record attendance');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Status Toggle (e.g. mark Present / Absent)
  const handleQuickStatus = async (id, newStatus) => {
    try {
      await updateAttendance(id, { status: newStatus });
      setActionSuccess(`Status updated to ${newStatus}`);
      await fetchData(pagination.page);
    } catch (err) {
      console.error('Quick status update error:', err);
      setError(err.response?.data?.message || 'Failed to update attendance status');
    }
  };

  // Helper for Status Badges
  const getStatusBadge = (status) => {
    switch (status) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Present
          </span>
        );
      case 'PACKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
            <Package className="w-3.5 h-3.5 text-cyan-600" />
            Packed
          </span>
        );
      case 'SPECIAL_REQUEST':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Special
          </span>
        );
      case 'ABSENT':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Absent
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Alert */}
      {actionSuccess && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-emerald-900/95 border border-emerald-400/40 text-emerald-100 rounded-2xl shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="ml-2 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-8 text-white shadow-xl">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15 mix-blend-overlay"
          style={{ backgroundImage: `url('/images/food/dining-banner.jpg')` }}
        />
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 shadow-inner">
              <Utensils className="w-8 h-8 text-emerald-300" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold mb-1">
                <Sparkles className="w-3 h-3" />
                Live Mess Sync
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                Meal Attendance & Mess Operations
              </h1>
              <p className="text-slate-300 text-sm mt-1 max-w-xl">
                Real-time resident dining check-ins, consumption analytics, and attendance telemetry.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchData(pagination.page)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-sm font-semibold transition-all backdrop-blur-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            {canManage && (
              <button
                onClick={() => {
                  setFormError(null);
                  setFormData((prev) => ({
                    ...prev,
                    mealDate: selectedDate,
                    status: 'PRESENT',
                    remarks: '',
                  }));
                  setModalOpen(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                Mark Attendance
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Residents */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-all">
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-teal-600" />
            Total Residents
          </span>
          <div className="text-2xl font-bold text-slate-800 mt-2">
            {stats?.total_residents || 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Active in hostel</span>
        </div>

        {/* Breakfast */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-all">
          <span className="text-xs text-amber-600 font-semibold flex items-center gap-1.5">
            <Coffee className="w-3.5 h-3.5" />
            Breakfast
          </span>
          <div className="text-2xl font-bold text-slate-800 mt-2">
            {stats?.breakfast_count || 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Checked in</span>
        </div>

        {/* Lunch */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-all">
          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5" />
            Lunch
          </span>
          <div className="text-2xl font-bold text-slate-800 mt-2">
            {stats?.lunch_count || 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Checked in</span>
        </div>

        {/* Snacks */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-all">
          <span className="text-xs text-orange-600 font-semibold flex items-center gap-1.5">
            <Sunset className="w-3.5 h-3.5" />
            Snacks
          </span>
          <div className="text-2xl font-bold text-slate-800 mt-2">
            {stats?.snacks_count || 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Checked in</span>
        </div>

        {/* Dinner */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-all">
          <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1.5">
            <Moon className="w-3.5 h-3.5" />
            Dinner
          </span>
          <div className="text-2xl font-bold text-slate-800 mt-2">
            {stats?.dinner_count || 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Checked in</span>
        </div>

        {/* Total Consumed & % */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-200/80 rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-all">
          <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            Consumption Rate
          </span>
          <div className="text-2xl font-bold text-emerald-700 mt-2">
            {stats?.consumption_percentage || 0}%
          </div>
          <span className="text-[11px] text-emerald-600/80 mt-0.5 block">
            {stats?.total_consumed || 0} meals consumed
          </span>
        </div>
      </div>

      {/* RECHARTS SECTION */}
      {stats?.daily_trends && stats.daily_trends.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                Recent 7-Day Meal Consumption Trend
              </h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Aggregated student dining check-in history from MySQL
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.daily_trends}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="meal_date"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(val) => {
                    if (!val) return '';
                    const d = new Date(val);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '0.75rem',
                    color: '#0f172a',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="breakfast" name="Breakfast" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lunch" name="Lunch" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="snacks" name="Snacks" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="dinner" name="Dinner" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-card flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm text-slate-800 focus:outline-none font-medium"
            />
          </div>

          {/* Meal Type Filter */}
          <select
            value={mealTypeFilter}
            onChange={(e) => setMealTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-sm text-slate-800 px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500 font-medium"
          >
            <option value="">All Meal Types</option>
            {mealTypes.map((mt) => (
              <option key={mt.id} value={mt.id}>
                {mt.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-sm text-slate-800 px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="PACKED">Packed</option>
            <option value="SPECIAL_REQUEST">Special Request</option>
            <option value="ABSENT">Absent</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search student or roll no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchData(1)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* ATTENDANCE LOGS TABLE */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-card">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">
            Resident Meal Attendance Records
            <span className="ml-2 text-xs font-normal text-slate-500">
              ({pagination.total} total logs for {selectedDate})
            </span>
          </h3>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-2" />
            <p className="text-xs text-slate-500">Fetching attendance logs from MySQL...</p>
          </div>
        ) : attendanceLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50 text-slate-400" />
            No attendance records found for this date/filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Hostel / Room</th>
                  <th className="py-3 px-4">Meal Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Remarks</th>
                  <th className="py-3 px-4">Marked By</th>
                  {canManage && <th className="py-3 px-4 text-right">Quick Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {log.student_name}
                      <span className="block text-[11px] text-slate-400 font-normal">
                        {log.department}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-emerald-700">
                      {log.roll_number}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {log.hostel_name ? (
                        <>
                          <span className="text-slate-700 font-medium">{log.hostel_name}</span>
                          <span className="block text-slate-400">Room {log.room_number || 'N/A'}</span>
                        </>
                      ) : (
                        <span className="text-slate-400">Unallocated</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-xs text-slate-800 capitalize">
                      {log.meal_type}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(log.status)}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                      {log.remarks || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {log.marked_by_name || 'System / Admin'}
                    </td>
                    {canManage && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {log.status !== 'PRESENT' && (
                            <button
                              onClick={() => handleQuickStatus(log.id, 'PRESENT')}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors"
                              title="Mark Present"
                            >
                              Present
                            </button>
                          )}
                          {log.status !== 'ABSENT' && (
                            <button
                              onClick={() => handleQuickStatus(log.id, 'ABSENT')}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
                              title="Mark Absent"
                            >
                              Absent
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchData(pagination.page - 1)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg text-slate-700 font-medium"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchData(pagination.page + 1)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg text-slate-700 font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MARK ATTENDANCE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Record Student Meal Attendance</h3>
                  <p className="text-xs text-slate-400">
                    Saved to MySQL <code className="text-emerald-700 font-semibold">meal_attendance</code> table
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleMarkSubmit} className="mt-4 space-y-4">
              {/* Select Student */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Student Resident <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} ({s.roll_number}) — {s.department}
                    </option>
                  ))}
                </select>
              </div>

              {/* Meal Type & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Meal Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.mealTypeId}
                    onChange={(e) => setFormData({ ...formData, mealTypeId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    {mealTypes.map((mt) => (
                      <option key={mt.id} value={mt.id}>
                        {mt.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.mealDate}
                    onChange={(e) => setFormData({ ...formData, mealDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Attendance Status <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['PRESENT', 'PACKED', 'SPECIAL_REQUEST', 'ABSENT'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFormData({ ...formData, status: st })}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-bold uppercase transition-all ${
                        formData.status === st
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {st === 'SPECIAL_REQUEST' ? 'Special' : st.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Remarks / Special Note
                </label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="e.g. Packed breakfast for early exam"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-900/20 transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving to MySQL...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Record Check-in
                    </>
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
