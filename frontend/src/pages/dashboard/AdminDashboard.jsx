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
import { StatCard, DashboardHeader, DashboardHero, DashboardEmptyState } from '../../components/dashboard/DashboardComponents';

const PIE_COLORS = ['#10b981', '#14b8a6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

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
    { name: 'Accommodation', value: finance.accommodationRevenue || 0, color: '#14b8a6' },
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
    { name: 'Partial', value: hostel.roomStatus?.partial || 0, color: '#14b8a6' },
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

      {/* Visual Hero Banner with Campus Image */}
      <DashboardHero
        title="Hostel Management Dashboard"
        subtitle="Complete operational control of accommodation, student enrollment, daily meal attendance, and financial ledgers in real time."
        badge="Enterprise Administration"
        imageSrc="/images/campus/campus-hero.jpg"
        roleName="ADMIN"
      />

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            onClick={fetchStats}
            className="px-3 py-1 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK ACTIONS TOOLBAR */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Operational Quick Actions</span>
          </span>
          <button
            onClick={() => navigate('/reports')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition"
          >
            Open Reports Center →
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <button
            onClick={() => navigate('/students')}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-slate-700 hover:text-emerald-800 text-xs font-semibold flex flex-col items-center gap-1.5 transition text-center"
          >
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            <span>Add Student</span>
          </button>
          <button
            onClick={() => navigate('/hostels')}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 text-slate-700 hover:text-teal-800 text-xs font-semibold flex flex-col items-center gap-1.5 transition text-center"
          >
            <Building2 className="w-4 h-4 text-teal-600" />
            <span>Add Hostel</span>
          </button>
          <button
            onClick={() => navigate('/rooms')}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 text-slate-700 hover:text-teal-800 text-xs font-semibold flex flex-col items-center gap-1.5 transition text-center"
          >
            <BedDouble className="w-4 h-4 text-teal-600" />
            <span>Add Room</span>
          </button>
          <button
            onClick={() => navigate('/allocations')}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-slate-700 hover:text-emerald-800 text-xs font-semibold flex flex-col items-center gap-1.5 transition text-center"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Allocate Room</span>
          </button>
          <button
            onClick={() => navigate('/food/subscriptions')}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 text-slate-700 hover:text-amber-800 text-xs font-semibold flex flex-col items-center gap-1.5 transition text-center"
          >
            <Utensils className="w-4 h-4 text-amber-600" />
            <span>Subscribe Meal</span>
          </button>
          <button
            onClick={() => navigate('/menu')}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 text-slate-700 hover:text-amber-800 text-xs font-semibold flex flex-col items-center gap-1.5 transition text-center"
          >
            <Coffee className="w-4 h-4 text-amber-600" />
            <span>Daily Menu</span>
          </button>
          <button
            onClick={() => navigate('/fees')}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-slate-700 hover:text-emerald-800 text-xs font-semibold flex flex-col items-center gap-1.5 transition text-center"
          >
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Record Payment</span>
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 text-slate-700 hover:text-teal-800 text-xs font-semibold flex flex-col items-center gap-1.5 transition text-center"
          >
            <FileText className="w-4 h-4 text-teal-600" />
            <span>View Reports</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. FOUR MAIN SUMMARY CARD GROUPS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* GROUP 1: STUDENTS */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-emerald-600" /> Students
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                {students.active || 0} Active
              </span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">
              {loading ? '...' : students.total || 0}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Total Registered Students</p>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-4 mt-4 border-t border-slate-100 text-[11px]">
            <div>
              <span className="text-slate-400 block">Active</span>
              <span className="font-bold text-emerald-600">{students.active || 0}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Suspended</span>
              <span className="font-bold text-amber-600">{students.suspended || 0}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Vacated</span>
              <span className="font-bold text-slate-500">{students.vacated || 0}</span>
            </div>
          </div>
        </div>

        {/* GROUP 2: ACCOMMODATION */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
                <BedDouble className="w-4 h-4 text-teal-600" /> Accommodation
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-semibold">
                {hostel.occupancyPercentage || 0}% Occupied
              </span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">
              {loading ? '...' : `${hostel.occupiedBeds || 0} / ${hostel.totalCapacity || 0}`}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Occupied vs Total Bed Capacity</p>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-4 mt-4 border-t border-slate-100 text-[11px]">
            <div>
              <span className="text-slate-400 block">Hostels</span>
              <span className="font-bold text-slate-800">{hostel.totalHostels || 0}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Rooms</span>
              <span className="font-bold text-slate-800">{hostel.totalRooms || 0}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Available</span>
              <span className="font-bold text-emerald-600">{hostel.availableBeds || 0}</span>
            </div>
          </div>
        </div>

        {/* GROUP 3: FOOD & MESS */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                <Utensils className="w-4 h-4 text-amber-600" /> Food & Dining
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                {food.activeSubscribers || 0} Subscribed
              </span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">
              {loading ? '...' : `₹${(food.monthlyFoodRevenue || 0).toLocaleString()}`}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Monthly Food Plan Revenue</p>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-4 mt-4 border-t border-slate-100 text-[11px]">
            <div>
              <span className="text-slate-400 block">Breakfast</span>
              <span className="font-bold text-amber-600">{meals.todayAttendance?.breakfast || 0}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Lunch</span>
              <span className="font-bold text-emerald-600">{meals.todayAttendance?.lunch || 0}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Dinner</span>
              <span className="font-bold text-teal-600">{meals.todayAttendance?.dinner || 0}</span>
            </div>
          </div>
        </div>

        {/* GROUP 4: FINANCE */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" /> Finance & Revenue
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                {fees.collectionPercentage || 0}% Realized
              </span>
            </div>
            <div className="text-3xl font-extrabold text-emerald-700 mt-1">
              {loading ? '...' : `₹${(finance.totalRevenue || fees.totalCollected || 0).toLocaleString()}`}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Total Collected Revenue</p>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-4 mt-4 border-t border-slate-100 text-[11px]">
            <div>
              <span className="text-slate-400 block">Today</span>
              <span className="font-bold text-emerald-600">₹{(finance.todayCollection || 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Pending</span>
              <span className="font-bold text-amber-600">₹{(finance.totalPending || 0).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Overdue</span>
              <span className="font-bold text-rose-600">{fees.overdueInvoices || 0} Bills</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. THE 6 REQUESTED DASHBOARD VISUAL CHARTS */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <span>Interactive Operational Analytics & Trends</span>
          </h2>
          <span className="text-xs text-slate-500">Real-time database visualizations</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* CHART 1: Monthly Revenue Trend */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">1. Monthly Revenue Trend</h3>
                <p className="text-[11px] text-slate-500">Collections over last 6 months</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                Revenue
              </span>
            </div>
            <div className="h-56 w-full">
              {monthlyRevenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `₹${v / 1000}k`} />
                    <Tooltip
                      formatter={(val) => [`₹${Number(val).toLocaleString()}`, 'Collected']}
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', fontSize: '11px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                    />
                    <Bar dataKey="Collected" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <DashboardEmptyState message="No revenue collections in last 6 months" />
              )}
            </div>
          </div>

          {/* CHART 2: Accommodation Occupancy by Hostel */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">2. Hostel Occupancy %</h3>
                <p className="text-[11px] text-slate-500">Hostel-wise occupancy rate</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-teal-50 text-teal-700 font-semibold border border-teal-200">
                Occupancy
              </span>
            </div>
            <div className="h-56 w-full">
              {hostelOccupancyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hostelOccupancyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      formatter={(val) => [`${val}%`, 'Occupancy']}
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', fontSize: '11px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                    />
                    <Bar dataKey="Occupancy" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <DashboardEmptyState message="No hostel blocks registered" />
              )}
            </div>
          </div>

          {/* CHART 3: Food Subscription Distribution */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">3. Food Plan Subscribers</h3>
                <p className="text-[11px] text-slate-500">Plan-wise student subscribers</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200">
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
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', fontSize: '11px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <DashboardEmptyState message="No active food subscriptions" />
              )}
            </div>
          </div>

          {/* CHART 4: Fee Category Revenue Breakdown */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">4. Fee Category Revenue</h3>
                <p className="text-[11px] text-slate-500">Food vs Accommodation vs Other</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
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
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', fontSize: '11px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <DashboardEmptyState message="No categorized revenue recorded" />
              )}
            </div>
          </div>

          {/* CHART 5: Student Distribution by Department */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">5. Department Distribution</h3>
                <p className="text-[11px] text-slate-500">Student count by department</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                Academics
              </span>
            </div>
            <div className="h-56 w-full">
              {studentsByDeptData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={studentsByDeptData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', fontSize: '11px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                    />
                    <Bar dataKey="Students" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <DashboardEmptyState message="No student records available" />
              )}
            </div>
          </div>

          {/* CHART 6: Room Status Distribution */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">6. Room Status Overview</h3>
                <p className="text-[11px] text-slate-500">Available vs Partial vs Full vs Maint</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold border border-purple-200">
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
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', fontSize: '11px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
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
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-600" />
              <span>Hostel Blocks & Occupancy Roster</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Live building statistics and bed occupancy rates</p>
          </div>
          <button
            onClick={() => navigate('/hostels')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition"
          >
            Manage Hostels →
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search hostel name or code..."
              value={hostelSearch}
              onChange={(e) => setHostelSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <select
            value={hostelTypeFilter}
            onChange={(e) => setHostelTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="">All Types</option>
            <option value="BOYS">Boys Hostel</option>
            <option value="GIRLS">Girls Hostel</option>
            <option value="COED">Co-Ed</option>
          </select>
          <select
            value={hostelStatusFilter}
            onChange={(e) => setHostelStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>

        {/* Hostels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHostels.map((h, i) => (
            <div key={h.id || i} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-emerald-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900">{h.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                    {h.code}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-3">
                  <span>{h.type} Hostel</span>
                  <span>•</span>
                  <span>{h.totalFloors || 0} Floors</span>
                  <span>•</span>
                  <span>{h.totalRooms || 0} Rooms</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500">Occupancy</span>
                  <span className="font-bold text-slate-900">{h.occupiedBeds || 0} / {h.capacity || h.totalCapacity || 0} beds</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.round(((h.occupiedBeds || 0) / (h.capacity || h.totalCapacity || 1)) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
