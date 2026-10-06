import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Building2,
  BedDouble,
  KeyRound,
  CalendarCheck,
  AlertTriangle,
  Users,
  Bell,
  Clock,
  CheckCircle2,
  ArrowRight,
  Shield,
  Layers,
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
import { getWardenDashboard } from '../../services/dashboardService';
import { StatCard, DashboardHeader, DashboardEmptyState } from '../../components/dashboard/DashboardComponents';

const PIE_COLORS = ['#f59e0b', '#10b981', '#ef4444', '#6366f1'];

export default function WardenDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getWardenDashboard();
      if (res.success && res.data) {
        setData(res.data);
        setLastUpdated(new Date());
      } else {
        setError(res.message || 'Failed to fetch warden dashboard');
      }
    } catch (err) {
      console.error('Failed to load warden dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data from MySQL database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 45000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const students = data?.students || {};
  const occupancy = data?.occupancy || {};
  const allocations = data?.allocations || {};
  const leaves = data?.leaves || {};
  const visitors = data?.visitors || {};
  const complaints = data?.complaints || {};
  const notifications = data?.notifications || {};
  const recent = data?.recentActivity || {};

  // Chart data
  const occupancyChartData = (occupancy.hostelBreakdown || []).map((h) => ({
    name: h.code || h.name,
    Capacity: h.totalCapacity || 0,
    Occupied: h.occupiedBeds || 0,
    Available: h.availableBeds || 0,
  }));

  const leavePieData = [
    { name: 'Pending', value: leaves.pending || 0, color: '#f59e0b' },
    { name: 'Approved', value: leaves.approved || 0, color: '#10b981' },
    { name: 'Rejected', value: leaves.rejected || 0, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  const complaintPieData = [
    { name: 'Pending', value: complaints.pending || 0, color: '#f59e0b' },
    { name: 'In Progress', value: complaints.inProgress || 0, color: '#3b82f6' },
    { name: 'Resolved', value: complaints.resolved || 0, color: '#10b981' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-8 pb-12">
      <DashboardHeader
        title="Warden Oversight Dashboard"
        subtitle="Hostel discipline, room allocations, student leave and visitor management"
        roleName="WARDEN"
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

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Resident Students"
          value={students.total || 0}
          icon={GraduationCap}
          color="indigo"
          loading={loading}
          subtitle={`${students.active || 0} Active Residents`}
          badge="Hostel Residents"
          badgeType="info"
          onClick={() => navigate('/students')}
        />

        <StatCard
          title="Bed Occupancy"
          value={`${occupancy.occupancyPercentage || 0}%`}
          icon={BedDouble}
          color="emerald"
          loading={loading}
          subtitle={`${occupancy.occupiedBeds || 0} Occupied / ${occupancy.totalCapacity || 0} Beds`}
          badge={`${occupancy.availableBeds || 0} Available`}
          badgeType="success"
          onClick={() => navigate('/rooms')}
        />

        <StatCard
          title="Pending Leaves"
          value={leaves.pending || 0}
          icon={CalendarCheck}
          color={leaves.pending > 0 ? 'amber' : 'emerald'}
          loading={loading}
          subtitle={`${leaves.activeOnLeave || 0} Currently on Leave`}
          badge={leaves.pending > 0 ? 'Requires Review' : 'Up to Date'}
          badgeType={leaves.pending > 0 ? 'warning' : 'success'}
          onClick={() => navigate('/leave-management')}
        />

        <StatCard
          title="Visitors Inside"
          value={visitors.currentlyInside || 0}
          icon={Users}
          color="sky"
          loading={loading}
          subtitle={`${visitors.todayVisitors || 0} Total Today`}
          badge="Active Visitors"
          badgeType="info"
          onClick={() => navigate('/visitors')}
        />
      </div>

      {/* Secondary Row Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Available Rooms</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{occupancy.availableRooms || 0}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Out of {occupancy.totalRooms || 0} Rooms</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Allocations</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{allocations.active || 0}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Total: {allocations.total || 0}</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pending Complaints</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{complaints.pending || 0}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{complaints.resolved || 0} Resolved</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Warden Alerts</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{notifications.unreadCount || 0} Unread</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Disciplinary & Notices</p>
        </div>
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hostel Bed Occupancy BarChart */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Hostel Bed Capacity & Utilization</h3>
              <p className="text-xs text-slate-500">Live bed distribution across blocks</p>
            </div>
          </div>
          {occupancyChartData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={occupancyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="Capacity" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Occupied" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Available" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <DashboardEmptyState message="No hostel blocks found" />
          )}
        </div>

        {/* Leave Requests Breakdown Donut Chart */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Leave Requests Status</h3>
              <p className="text-xs text-slate-500">Pending vs Approved</p>
            </div>
          </div>
          {leavePieData.length > 0 ? (
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leavePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {leavePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <DashboardEmptyState message="No leave applications filed" />
          )}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Leave Requests */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-indigo-600" />
              <span>Leave Applications</span>
            </h3>
            <button
              onClick={() => navigate('/leave-management')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Manage
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {recent.leaves && recent.leaves.length > 0 ? (
              recent.leaves.map((l) => (
                <div key={l.id} className="py-2.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-800">{l.student_name}</p>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded shrink-0 ${
                        l.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : l.status === 'REJECTED'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {l.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {l.leave_type} • {l.reason}
                  </p>
                </div>
              ))
            ) : (
              <DashboardEmptyState message="No recent leaves" />
            )}
          </div>
        </div>

        {/* Recent Complaints */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Complaints</span>
            </h3>
            <button
              onClick={() => navigate('/complaints')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {recent.complaints && recent.complaints.length > 0 ? (
              recent.complaints.map((c) => (
                <div key={c.id} className="py-2.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-800 truncate">{c.title}</p>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded shrink-0 ${
                        c.status === 'RESOLVED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : c.status === 'IN_PROGRESS'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {c.student_name} ({c.room_number ? `Room ${c.room_number}` : c.category})
                  </p>
                </div>
              ))
            ) : (
              <DashboardEmptyState message="No complaints filed" />
            )}
          </div>
        </div>

        {/* Recent Visitors */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-600" />
              <span>Recent Visitors</span>
            </h3>
            <button
              onClick={() => navigate('/visitors')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {recent.visitors && recent.visitors.length > 0 ? (
              recent.visitors.map((v) => (
                <div key={v.id} className="py-2.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-800">{v.visitor_name}</p>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded shrink-0 ${
                        v.status === 'INSIDE'
                          ? 'bg-sky-50 text-sky-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {v.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    Visiting: {v.student_name} ({v.relationship})
                  </p>
                </div>
              ))
            ) : (
              <DashboardEmptyState message="No recent visitors" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
