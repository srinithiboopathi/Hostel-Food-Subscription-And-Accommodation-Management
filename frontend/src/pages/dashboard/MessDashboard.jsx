import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Utensils,
  CalendarDays,
  Users,
  AlertTriangle,
  Clock,
  Sparkles,
  Flame,
  CheckCircle2,
  Bell,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { getMessDashboard } from '../../services/dashboardService';
import { StatCard, DashboardHeader, DashboardEmptyState } from '../../components/dashboard/DashboardComponents';

export default function MessDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getMessDashboard();
      if (res.success && res.data) {
        setData(res.data);
        setLastUpdated(new Date());
      } else {
        setError(res.message || 'Failed to fetch mess dashboard');
      }
    } catch (err) {
      console.error('Failed to load mess dashboard data:', err);
      setError(err.message || 'Failed to load mess statistics from MySQL.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 45000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const todayAttendance = data?.todayAttendance || {};
  const todayMenu = data?.todayMenu || [];
  const attendanceTrends = data?.attendanceTrends || [];
  const menuOverview = data?.menuOverview || {};
  const complaints = data?.complaints || {};
  const notifications = data?.notifications || {};

  // Chart data
  const mealDistributionData = [
    { name: 'Breakfast', count: todayAttendance.breakfast || 0, fill: '#f59e0b' },
    { name: 'Lunch', count: todayAttendance.lunch || 0, fill: '#10b981' },
    { name: 'Snacks', count: todayAttendance.snacks || 0, fill: '#8b5cf6' },
    { name: 'Dinner', count: todayAttendance.dinner || 0, fill: '#6366f1' },
  ];

  const weeklyTrendData = (attendanceTrends || []).map((t) => ({
    date: new Date(t.meal_date).toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' }),
    Breakfast: t.breakfast || 0,
    Lunch: t.lunch || 0,
    Dinner: t.dinner || 0,
    Total: t.totalPresent || 0,
  }));

  return (
    <div className="space-y-8 pb-12">
      <DashboardHeader
        title="Mess & Dining Operations"
        subtitle="Live meal attendance, nutrition menu management, and dining feedback"
        roleName="MESS_MANAGER"
        lastUpdated={lastUpdated}
        onRefresh={fetchStats}
        loading={loading}
      />

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
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

      {/* KPI Statistic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Today's Meal Attendance"
          value={todayAttendance.total || 0}
          icon={Utensils}
          color="indigo"
          loading={loading}
          subtitle={`Eligible Boarders: ${menuOverview.totalBoarders || 0}`}
          badge="Live Marked"
          badgeType="info"
          onClick={() => navigate('/meals')}
        />

        <StatCard
          title="Active Menu Items"
          value={menuOverview.activeItems || 0}
          icon={CalendarDays}
          color="emerald"
          loading={loading}
          subtitle={`${menuOverview.totalItems || 0} Total Weekly Slots`}
          badge="7-Day Cycle"
          badgeType="success"
          onClick={() => navigate('/menu')}
        />

        <StatCard
          title="Mess Complaints"
          value={complaints.pending || 0}
          icon={AlertTriangle}
          color={complaints.pending > 0 ? 'amber' : 'emerald'}
          loading={loading}
          subtitle={`${complaints.total || 0} Total Food Inquiries`}
          badge={complaints.pending > 0 ? 'Pending Action' : 'All Clear'}
          badgeType={complaints.pending > 0 ? 'warning' : 'success'}
          onClick={() => navigate('/complaints')}
        />

        <StatCard
          title="Special Diet Requests"
          value={todayAttendance.specialDiet || 0}
          icon={Sparkles}
          color="purple"
          loading={loading}
          subtitle={`${todayAttendance.packed || 0} Packed Box Requests`}
          badge="Dietary Care"
          badgeType="info"
        />
      </div>

      {/* Today's Live Menu Board */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Utensils className="w-5 h-5 text-indigo-600" />
              <span>Today's Official Menu Schedule</span>
            </h3>
            <p className="text-xs text-slate-500">Live items for today from MySQL mess_menu</p>
          </div>
          <button
            onClick={() => navigate('/menu')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
          >
            Edit Weekly Menu
          </button>
        </div>

        {todayMenu.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {todayMenu.map((meal) => (
              <div
                key={meal.id || meal.meal_type}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                      {meal.meal_type}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {meal.start_time?.slice(0, 5)} - {meal.end_time?.slice(0, 5)}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-800 leading-relaxed mb-3">
                    {meal.menu_items}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  {meal.special_item ? (
                    <span className="text-amber-700 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {meal.special_item}
                    </span>
                  ) : (
                    <span className="text-slate-400">Regular Diet</span>
                  )}
                  {meal.calories_est && (
                    <span className="text-slate-500 flex items-center gap-0.5">
                      <Flame className="w-3 h-3 text-rose-500" />
                      {meal.calories_est} kcal
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <DashboardEmptyState message="No menu scheduled for today. Please update mess_menu." />
        )}
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meal Breakdown BarChart */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Today's Meal Attendance Count</h3>
              <p className="text-xs text-slate-500">Breakfast, Lunch, Snacks, Dinner</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mealDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Trend AreaChart */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">7-Day Attendance Trend</h3>
              <p className="text-xs text-slate-500">Historical dining turn-out</p>
            </div>
          </div>
          {weeklyTrendData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Area type="monotone" dataKey="Total" stroke="#6366f1" fill="#e0e7ff" />
                  <Area type="monotone" dataKey="Lunch" stroke="#10b981" fill="#d1fae5" />
                  <Area type="monotone" dataKey="Dinner" stroke="#8b5cf6" fill="#ede9fe" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <DashboardEmptyState message="No attendance records recorded for this week" />
          )}
        </div>
      </div>
    </div>
  );
}
