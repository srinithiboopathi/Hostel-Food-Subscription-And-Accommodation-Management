import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Building2,
  BedDouble,
  DollarSign,
  AlertTriangle,
  CalendarCheck,
  Users,
  Bell,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Receipt,
  Utensils,
  ChevronRight,
  Activity,
  Layers,
  Sparkles,
  Plus,
  Search,
  Filter,
  FileText,
  ShieldCheck,
  Eye,
  Coffee,
  PieChart as PieChartIcon,
  BarChart3,
  Flame,
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
import { getAdminDashboard } from '../../services/dashboardService';
import { StatCard, DashboardHeader, DashboardEmptyState } from '../../components/dashboard/DashboardComponents';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Hostel overview filter/search states
  const [hostelSearch, setHostelSearch] = useState('');
  const [hostelTypeFilter, setHostelTypeFilter] = useState('');
  const [hostelStatusFilter, setHostelStatusFilter] = useState('');

  // Active section tab state if wanted
  const [activeView, setActiveView] = useState('ALL');

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminDashboard();
      if (res.success && res.data) {
        setData(res.data);
        setLastUpdated(new Date());
      } else {
        setError(res.message || 'Failed to fetch admin dashboard');
      }
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data from MySQL database.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and periodic refresh (every 45s)
  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => {
      fetchStats();
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const students = data?.students || {};
  const hostel = data?.hostel || {};
  const fees = data?.fees || {};
  const finance = data?.finance || fees || {};
  const food = data?.food || {};
  const meals = data?.meals || food || {};
  const complaints = data?.complaints || {};
  const leaves = data?.leaves || {};
  const visitors = data?.visitors || {};
  const notifications = data?.notifications || {};
  const recent = data?.recentActivity || {};

  // 1. Chart Data: Monthly Revenue Trend
  const monthlyRevenueData = (finance.monthlyRevenueTrend || []).map((m) => ({
    name: m.month,
    Collected: Number(m.collected) || 0,
    Payments: Number(m.count) || 0,
  }));

  // 2. Chart Data: Hostel Occupancy Percentage
  const hostelOccupancyData = (hostel.hostelOccupancy || []).map((h) => ({
    name: h.code || h.name,
    Occupancy: Number(h.occupancyRate) || 0,
    Occupied: h.occupiedBeds || 0,
    Available: h.availableBeds || 0,
  }));

  // 3. Chart Data: Food Plan Subscriber Distribution
  const foodPlanData = (food.planDistribution || []).map((p, idx) => ({
    name: p.name,
    Subscribers: Number(p.count) || 0,
    color: PIE_COLORS[idx % PIE_COLORS.length],
  }));

  // 4. Chart Data: Fee Category Revenue
  const feeCategoryData = (finance.feeCategoryRevenue || [
    { name: 'Food / Mess', value: finance.foodRevenue || 0, color: '#10b981' },
    { name: 'Accommodation', value: finance.accommodationRevenue || 0, color: '#3b82f6' },
    { name: 'Other Fees', value: finance.otherRevenue || 0, color: '#8b5cf6' },
  ]).filter((d) => d.value > 0);

  // 5. Chart Data: Student Distribution by Department
  const studentsByDeptData = (students.byDepartment || []).map((d) => ({
    name: d.department || 'Other',
    Students: Number(d.count) || 0,
  }));

  // 6. Chart Data: Room Status Distribution
  const roomStatusData = [
    { name: 'Available', value: hostel.roomStatus?.available || hostel.availableRooms || 0, color: '#10b981' },
    { name: 'Partial', value: hostel.roomStatus?.partial || 0, color: '#3b82f6' },
    { name: 'Full', value: hostel.roomStatus?.full || 0, color: '#f59e0b' },
    { name: 'Maintenance', value: hostel.roomStatus?.maintenance || hostel.maintenanceRooms || 0, color: '#ef4444' },
  ].filter((r) => r.value > 0);

  // Filtered Hostels for Overview
  const filteredHostels = (hostel.hostelsList || hostel.hostelOccupancy || []).filter((h) => {
    const matchesSearch = !hostelSearch || 
      h.name?.toLowerCase().includes(hostelSearch.toLowerCase()) || 
      h.code?.toLowerCase().includes(hostelSearch.toLowerCase());
    const matchesType = !hostelTypeFilter || h.type === hostelTypeFilter;
    const matchesStatus = !hostelStatusFilter || h.status === hostelStatusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <DashboardHeader
        title="Admin Command & Telemetry Center"
        subtitle="Live multi-module operations oversight, occupancy monitoring, real-time dining statistics, and revenue intelligence"
        roleName="ADMIN"
        lastUpdated={lastUpdated}
        onRefresh={fetchStats}
        loading={loading}
      />

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchStats}
            className="px-3 py-1 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK ACTIONS TOOLBAR */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Operational Quick Actions</span>
          </span>
          <button
            onClick={() => navigate('/reports')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
          >
            Open Reports Center →
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <button
            onClick={() => navigate('/students')}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 hover:text-white text-xs font-medium flex flex-col items-center gap-1.5 transition text-center hover:border-indigo-500/50"
          >
            <GraduationCap className="w-4 h-4 text-indigo-400" />
            <span>Add Student</span>
          </button>
          <button
            onClick={() => navigate('/hostels')}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 hover:text-white text-xs font-medium flex flex-col items-center gap-1.5 transition text-center hover:border-blue-500/50"
          >
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>Add Hostel</span>
          </button>
          <button
            onClick={() => navigate('/rooms')}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 hover:text-white text-xs font-medium flex flex-col items-center gap-1.5 transition text-center hover:border-cyan-500/50"
          >
            <BedDouble className="w-4 h-4 text-cyan-400" />
            <span>Add Room</span>
          </button>
          <button
            onClick={() => navigate('/allocations')}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 hover:text-white text-xs font-medium flex flex-col items-center gap-1.5 transition text-center hover:border-emerald-500/50"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Allocate Room</span>
          </button>
          <button
            onClick={() => navigate('/food/subscriptions')}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 hover:text-white text-xs font-medium flex flex-col items-center gap-1.5 transition text-center hover:border-amber-500/50"
          >
            <Utensils className="w-4 h-4 text-amber-400" />
            <span>Subscribe Meal</span>
          </button>
          <button
            onClick={() => navigate('/menu')}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 hover:text-white text-xs font-medium flex flex-col items-center gap-1.5 transition text-center hover:border-orange-500/50"
          >
            <Coffee className="w-4 h-4 text-orange-400" />
            <span>Daily Menu</span>
          </button>
          <button
            onClick={() => navigate('/fees')}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 hover:text-white text-xs font-medium flex flex-col items-center gap-1.5 transition text-center hover:border-green-500/50"
          >
            <DollarSign className="w-4 h-4 text-green-400" />
            <span>Record Payment</span>
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 hover:text-white text-xs font-medium flex flex-col items-center gap-1.5 transition text-center hover:border-purple-500/50"
          >
            <FileText className="w-4 h-4 text-purple-400" />
            <span>View Reports</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. FOUR MAIN SUMMARY CARD GROUPS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* GROUP 1: STUDENTS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4" /> Students
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                {students.active || 0} Active
              </span>
            </div>
            <div className="text-3xl font-extrabold text-white mt-1">
              {loading ? '...' : students.total || 0}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Total Registered Students</p>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-4 mt-4 border-t border-slate-800/80 text-[11px]">
            <div>
              <span className="text-slate-500 block">Active</span>
              <span className="font-bold text-emerald-400">{students.active || 0}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Suspended</span>
              <span className="font-bold text-amber-400">{students.suspended || 0}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Vacated</span>
              <span className="font-bold text-slate-400">{students.vacated || 0}</span>
            </div>
          </div>
        </div>

        {/* GROUP 2: ACCOMMODATION */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <BedDouble className="w-4 h-4" /> Accommodation
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold">
                {hostel.occupancyPercentage || 0}% Occupied
              </span>
            </div>
            <div className="text-3xl font-extrabold text-white mt-1">
              {loading ? '...' : `${hostel.occupiedBeds || 0} / ${hostel.totalCapacity || 0}`}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Occupied vs Total Bed Capacity</p>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-4 mt-4 border-t border-slate-800/80 text-[11px]">
            <div>
              <span className="text-slate-500 block">Hostels</span>
              <span className="font-bold text-white">{hostel.totalHostels || 0}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Rooms</span>
              <span className="font-bold text-white">{hostel.totalRooms || 0}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Available</span>
              <span className="font-bold text-emerald-400">{hostel.availableBeds || 0}</span>
            </div>
          </div>
        </div>

        {/* GROUP 3: FOOD & MESS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Utensils className="w-4 h-4" /> Food & Dining
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                {food.activeSubscribers || 0} Subscribed
              </span>
            </div>
            <div className="text-3xl font-extrabold text-white mt-1">
              {loading ? '...' : `₹${(food.monthlyFoodRevenue || 0).toLocaleString()}`}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Monthly Food Plan Revenue</p>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-4 mt-4 border-t border-slate-800/80 text-[11px]">
            <div>
              <span className="text-slate-500 block">Breakfast</span>
              <span className="font-bold text-amber-400">{meals.todayAttendance?.breakfast || 0}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Lunch</span>
              <span className="font-bold text-emerald-400">{meals.todayAttendance?.lunch || 0}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Dinner</span>
              <span className="font-bold text-indigo-400">{meals.todayAttendance?.dinner || 0}</span>
            </div>
          </div>
        </div>

        {/* GROUP 4: FINANCE */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" /> Finance & Revenue
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                {fees.collectionPercentage || 0}% Realized
              </span>
            </div>
            <div className="text-3xl font-extrabold text-emerald-400 mt-1">
              {loading ? '...' : `₹${(finance.totalRevenue || fees.totalCollected || 0).toLocaleString()}`}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Total Collected Revenue</p>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-4 mt-4 border-t border-slate-800/80 text-[11px]">
            <div>
              <span className="text-slate-500 block">Today</span>
              <span className="font-bold text-emerald-400">₹{(finance.todayCollection || 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Pending</span>
              <span className="font-bold text-amber-400">₹{(finance.totalPending || 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Overdue</span>
              <span className="font-bold text-rose-400">{fees.overdueInvoices || 0} Bills</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. THE 6 REQUESTED DASHBOARD VISUAL CHARTS */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <span>Interactive Operational Analytics & Trends</span>
          </h2>
          <span className="text-xs text-slate-400">Real-time database visualizations</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* CHART 1: Monthly Revenue Trend */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">1. Monthly Revenue Trend</h3>
                <p className="text-[11px] text-slate-400">Collections over last 6 months</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-semibold">
                Revenue
              </span>
            </div>
            <div className="h-56 w-full">
              {monthlyRevenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `₹${v / 1000}k`} />
                    <Tooltip
                      formatter={(val) => [`₹${Number(val).toLocaleString()}`, 'Collected']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px', borderRadius: '8px' }}
                    />
                    <Bar dataKey="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <DashboardEmptyState message="No revenue collections in last 6 months" />
              )}
            </div>
          </div>

          {/* CHART 2: Accommodation Occupancy by Hostel */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">2. Hostel Occupancy %</h3>
                <p className="text-[11px] text-slate-400">Hostel-wise occupancy rate</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-semibold">
                Occupancy
              </span>
            </div>
            <div className="h-56 w-full">
              {hostelOccupancyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hostelOccupancyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      formatter={(val) => [`${val}%`, 'Occupancy']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px', borderRadius: '8px' }}
                    />
                    <Bar dataKey="Occupancy" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <DashboardEmptyState message="No hostel blocks registered" />
              )}
            </div>
          </div>

          {/* CHART 3: Food Subscription Distribution */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">3. Food Plan Subscribers</h3>
                <p className="text-[11px] text-slate-400">Plan-wise student subscribers</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-semibold">
                Dining
              </span>
            </div>
            <div className="h-56 w-full flex items-center justify-center">
              {foodPlanData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={foodPlanData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="Subscribers"
                      label={({ name, percent }) => `${name.slice(0, 10)} ${(percent * 100).toFixed(0)}%`}
                    >
                      {foodPlanData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => [`${val} Students`, name]}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <DashboardEmptyState message="No active food subscriptions" />
              )}
            </div>
          </div>

          {/* CHART 4: Fee Category Revenue Breakdown */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">4. Fee Category Revenue</h3>
                <p className="text-[11px] text-slate-400">Food vs Accommodation vs Other</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-semibold">
                Realization
              </span>
            </div>
            <div className="h-56 w-full flex items-center justify-center">
              {feeCategoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={feeCategoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {feeCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => [`₹${Number(val).toLocaleString()}`, name]}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <DashboardEmptyState message="No categorized revenue recorded" />
              )}
            </div>
          </div>

          {/* CHART 5: Student Distribution by Department */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">5. Department Distribution</h3>
                <p className="text-[11px] text-slate-400">Student count by department</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-semibold">
                Academics
              </span>
            </div>
            <div className="h-56 w-full">
              {studentsByDeptData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={studentsByDeptData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px', borderRadius: '8px' }}
                    />
                    <Bar dataKey="Students" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <DashboardEmptyState message="No student records available" />
              )}
            </div>
          </div>

          {/* CHART 6: Room Status Distribution */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">6. Room Status Overview</h3>
                <p className="text-[11px] text-slate-400">Available vs Partial vs Full vs Maint</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-semibold">
                Inventory
              </span>
            </div>
            <div className="h-56 w-full flex items-center justify-center">
              {roomStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roomStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {roomStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => [`${val} Rooms`, name]}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <DashboardEmptyState message="No rooms in database" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. HOSTEL OVERVIEW SECTION */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              <span>Hostel Blocks & Occupancy Roster</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Live building statistics and bed occupancy rates</p>
          </div>
          <button
            onClick={() => navigate('/hostels')}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition"
          >
            Manage Hostels →
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search hostel name or code..."
              value={hostelSearch}
              onChange={(e) => setHostelSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select
            value={hostelTypeFilter}
            onChange={(e) => setHostelTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="BOYS">Boys</option>
            <option value="GIRLS">Girls</option>
            <option value="COED">Co-Ed</option>
          </select>
          <select
            value={hostelStatusFilter}
            onChange={(e) => setHostelStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {/* Hostels Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Hostel Name</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Warden</th>
                <th className="py-3 px-3 text-right">Rooms</th>
                <th className="py-3 px-3 text-right">Total Beds</th>
                <th className="py-3 px-3 text-right">Occupied</th>
                <th className="py-3 px-3 text-right">Available</th>
                <th className="py-3 px-4 text-right">Occupancy %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredHostels.length > 0 ? (
                filteredHostels.map((h) => (
                  <tr
                    key={h.id}
                    onClick={() => navigate('/hostels')}
                    className="hover:bg-slate-800/60 cursor-pointer transition"
                  >
                    <td className="py-3 px-4 font-semibold text-white">
                      {h.name} <span className="text-[10px] font-mono text-slate-500">({h.code})</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-medium text-slate-300">
                        {h.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">{h.warden_name || 'Unassigned'}</td>
                    <td className="py-3 px-3 text-right font-mono">{h.totalRooms || 0}</td>
                    <td className="py-3 px-3 text-right font-mono">{h.totalCapacity || 0}</td>
                    <td className="py-3 px-3 text-right font-mono text-indigo-400">{h.occupiedBeds || 0}</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-400">{h.availableBeds || 0}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-white">{h.occupancyRate || 0}%</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">
                    No hostels found matching criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. STUDENT & RECENT STUDENTS OVERVIEW */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-400" />
              <span>Student Population & Recent Registrations</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Demographics and latest resident admissions</p>
          </div>
          <button
            onClick={() => navigate('/students')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
          >
            Manage Students Directory →
          </button>
        </div>

        {/* Recent Students Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-3">Roll Number</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Year</th>
                <th className="py-3 px-3">Hostel</th>
                <th className="py-3 px-3">Room</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {students.recent && students.recent.length > 0 ? (
                students.recent.map((st) => (
                  <tr
                    key={st.id}
                    onClick={() => navigate('/students')}
                    className="hover:bg-slate-800/60 cursor-pointer transition"
                  >
                    <td className="py-3 px-4 font-semibold text-white">{st.student_name}</td>
                    <td className="py-3 px-3 font-mono text-slate-400">{st.roll_number}</td>
                    <td className="py-3 px-3">{st.department || 'N/A'}</td>
                    <td className="py-3 px-3 font-mono">{st.year_of_study ? `Year ${st.year_of_study}` : 'N/A'}</td>
                    <td className="py-3 px-3 text-slate-400">{st.hostel_name || 'Unassigned'}</td>
                    <td className="py-3 px-3 font-mono text-slate-400">{st.room_number ? `Room ${st.room_number}` : 'N/A'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded ${
                        st.status === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : st.status === 'SUSPENDED'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {st.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    No student records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. FINANCE OVERVIEW & 6. FOOD OVERVIEW (2-COLUMN GRID) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FINANCE OVERVIEW */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>Financial Realization & Overdues</span>
              </h3>
              <button
                onClick={() => navigate('/fees')}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
              >
                Fees Hub →
              </button>
            </div>

            {/* Financial Numbers Matrix */}
            <div className="grid grid-cols-3 gap-3 my-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Food Rev</span>
                <span className="text-sm font-bold text-emerald-400 block mt-0.5">
                  ₹{(finance.foodRevenue || 0).toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Accom Rev</span>
                <span className="text-sm font-bold text-blue-400 block mt-0.5">
                  ₹{(finance.accommodationRevenue || 0).toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Other Fees</span>
                <span className="text-sm font-bold text-purple-400 block mt-0.5">
                  ₹{(finance.otherRevenue || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Recent Payments List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Transactions</span>
              <div className="divide-y divide-slate-800">
                {finance.recentPayments && finance.recentPayments.length > 0 ? (
                  finance.recentPayments.slice(0, 4).map((p) => (
                    <div key={p.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-white">{p.student_name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{p.receipt_number} • {p.payment_method}</p>
                      </div>
                      <span className="font-bold text-emerald-400">₹{Number(p.amount).toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-2 italic">No payment transactions recorded</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FOOD & DINING OVERVIEW */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Utensils className="w-4 h-4 text-amber-400" />
                <span>Today's Meal Schedule & Consumption</span>
              </h3>
              <button
                onClick={() => navigate('/menu')}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition"
              >
                Food Management →
              </button>
            </div>

            {/* Meal Consumption Counters */}
            <div className="grid grid-cols-4 gap-2 my-3">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] font-semibold text-amber-300 uppercase block">Breakfast</span>
                <span className="text-base font-extrabold text-white mt-0.5 block">{meals.todayAttendance?.breakfast || 0}</span>
                <span className="text-[9px] text-slate-500">Served</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] font-semibold text-emerald-300 uppercase block">Lunch</span>
                <span className="text-base font-extrabold text-white mt-0.5 block">{meals.todayAttendance?.lunch || 0}</span>
                <span className="text-[9px] text-slate-500">Served</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] font-semibold text-orange-300 uppercase block">Snacks</span>
                <span className="text-base font-extrabold text-white mt-0.5 block">{meals.todayAttendance?.snacks || 0}</span>
                <span className="text-[9px] text-slate-500">Served</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] font-semibold text-indigo-300 uppercase block">Dinner</span>
                <span className="text-base font-extrabold text-white mt-0.5 block">{meals.todayAttendance?.dinner || 0}</span>
                <span className="text-[9px] text-slate-500">Served</span>
              </div>
            </div>

            {/* Today's Menu Snippets */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Published Menu</span>
              <div className="divide-y divide-slate-800">
                {meals.todayMenu && meals.todayMenu.length > 0 ? (
                  meals.todayMenu.slice(0, 3).map((m, idx) => (
                    <div key={idx} className="py-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{m.meal_type}</span>
                        <span className="text-[10px] font-mono text-slate-400">{m.start_time?.slice(0, 5)} - {m.end_time?.slice(0, 5)}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 truncate mt-0.5">{m.menu_items}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-2 italic">No menu published for today</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. RECENT ACTIVITY PANEL (MULTI-CATEGORY TIMELINE) */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            <span>Campus Operational Activity Logs</span>
          </h3>
          <span className="text-xs text-slate-400">Real-time system events</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Allocations Activity */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <BedDouble className="w-3.5 h-3.5 text-blue-400" /> Room Allocations
            </h4>
            <div className="divide-y divide-slate-800">
              {recent.allocations && recent.allocations.length > 0 ? (
                recent.allocations.map((a) => (
                  <div key={a.id} className="py-2 text-xs">
                    <p className="font-semibold text-white">{a.student_name}</p>
                    <p className="text-[11px] text-slate-400">Room {a.room_number} • {a.hostel_name}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 py-2 italic">No recent allocations</p>
              )}
            </div>
          </div>

          {/* Grievances & Complaints Activity */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Complaints Filed
            </h4>
            <div className="divide-y divide-slate-800">
              {recent.complaints && recent.complaints.length > 0 ? (
                recent.complaints.map((c) => (
                  <div key={c.id} className="py-2 text-xs">
                    <div className="flex justify-between items-start">
                      <p className="font-semibold text-white truncate max-w-[180px]">{c.title}</p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                        {c.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{c.student_name}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 py-2 italic">No recent complaints</p>
              )}
            </div>
          </div>

          {/* Leaves Activity */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CalendarCheck className="w-3.5 h-3.5 text-indigo-400" /> Leaves Requested
            </h4>
            <div className="divide-y divide-slate-800">
              {recent.leaves && recent.leaves.length > 0 ? (
                recent.leaves.map((l) => (
                  <div key={l.id} className="py-2 text-xs">
                    <div className="flex justify-between items-start">
                      <p className="font-semibold text-white">{l.student_name}</p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                        {l.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{l.leave_type} • {l.reason}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 py-2 italic">No recent leaves</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

