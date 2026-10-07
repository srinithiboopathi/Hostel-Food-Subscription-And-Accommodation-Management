import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Building2,
  BedDouble,
  Receipt,
  Utensils,
  AlertTriangle,
  CalendarCheck,
  Users,
  Bell,
  CheckCircle2,
  Clock,
  ArrowRight,
  Flame,
  Sparkles,
  DollarSign,
  FileText,
  UserCheck,
  Phone,
  Mail,
  Shield,
  Home,
} from 'lucide-react';
import { getStudentDashboard } from '../../services/dashboardService';
import foodSubscriptionService from '../../services/foodSubscriptionService';
import { StatCard, DashboardHeader, DashboardHero, DashboardEmptyState } from '../../components/dashboard/DashboardComponents';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [foodSub, setFoodSub] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [res, subRes] = await Promise.allSettled([
        getStudentDashboard(),
        foodSubscriptionService.getMySubscription()
      ]);
      
      if (res.status === 'fulfilled' && res.value.success && res.value.data) {
        setData(res.value.data);
        setLastUpdated(new Date());
      } else if (res.status === 'fulfilled') {
        setError(res.value.message || 'Failed to fetch student dashboard');
      }

      if (subRes.status === 'fulfilled' && subRes.value.success && subRes.value.data) {
        setFoodSub(subRes.value.data);
      }
    } catch (err) {
      console.error('Failed to load student dashboard data:', err);
      setError(err.message || 'Failed to load your personal records from database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 45000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const profile = data?.studentProfile || {};
  const accommodation = data?.accommodation || {};
  const hostel = accommodation.hostel;
  const room = accommodation.room;
  const allocation = accommodation.allocation;
  const roommates = accommodation.roommates || [];

  const fees = data?.fees || {};
  const meals = data?.meals || {};
  const complaints = data?.complaints || {};
  const leaves = data?.leaves || {};
  const visitors = data?.visitors || {};
  const notifications = data?.notifications || {};

  return (
    <div className="space-y-8 pb-12">
      <DashboardHeader
        title={`Welcome, ${profile.fullName || 'Student'}!`}
        subtitle="Your personalized resident portal for accommodation, dining, fees, and campus life"
        roleName="STUDENT"
        lastUpdated={lastUpdated}
        onRefresh={fetchStats}
        loading={loading}
      />

      {/* Visual Student Life Hero Banner */}
      <DashboardHero
        title="Welcome back to your Campus Portal"
        subtitle="Everything you need for your hostel life — check dining menus, monitor fee bills, file maintenance requests, and track outpass approvals."
        badge="Resident Living Hub"
        imageSrc="/images/students/student-life.jpg"
        roleName="STUDENT"
      />

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

      {/* Student Profile & Room Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 text-slate-800 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center font-bold text-2xl text-white shadow-md shadow-emerald-600/20 shrink-0">
              {profile.fullName?.charAt(0) || 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">{profile.fullName}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {profile.status || 'ACTIVE RESIDENT'}
                </span>
              </div>
              <p className="text-xs text-emerald-700 font-semibold mt-1 font-mono">
                Roll No: <span className="font-bold text-slate-900">{profile.rollNumber}</span> • {profile.department} (Year {profile.yearOfStudy})
              </p>
              <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                  {profile.course}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {profile.email}
                </span>
                {profile.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {profile.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Room Allocation Info Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs shrink-0 min-w-[240px]">
            <p className="text-slate-500 text-[10px] uppercase tracking-wider font-bold flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              Assigned Room & Board
            </p>
            {room ? (
              <div className="mt-2">
                <p className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <span>{hostel?.name || 'Hostel'}</span>
                </p>
                <p className="text-slate-600 mt-0.5 font-medium">
                  Room <span className="font-bold text-emerald-700 font-mono">{room.room_number}</span> (Floor {room.floor} • {room.room_type})
                </p>
                {allocation && (
                  <p className="text-[10px] text-slate-400 font-mono mt-1">
                    Academic Year: {allocation.academic_year}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-sm font-semibold text-amber-600">No Room Allocated</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Please contact the hostel warden for room allotment.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Outstanding Fees"
          value={`₹${(fees.pendingAmount || 0).toLocaleString()}`}
          icon={Receipt}
          color={fees.pendingAmount > 0 ? 'amber' : 'emerald'}
          loading={loading}
          subtitle={`Paid: ₹${(fees.totalPaid || 0).toLocaleString()} of ₹${(fees.totalPayable || 0).toLocaleString()}`}
          badge={fees.pendingAmount > 0 ? 'Due' : 'Cleared'}
          badgeType={fees.pendingAmount > 0 ? 'warning' : 'success'}
          onClick={() => navigate('/my-fees')}
        />

        <StatCard
          title="My Leave Requests"
          value={leaves.total || 0}
          icon={CalendarCheck}
          color="teal"
          loading={loading}
          subtitle={`${leaves.approved || 0} Approved, ${leaves.pending || 0} Pending`}
          badge={leaves.currentlyOnLeave > 0 ? 'On Leave' : 'On Campus'}
          badgeType={leaves.currentlyOnLeave > 0 ? 'info' : 'success'}
          onClick={() => navigate('/leaves')}
        />

        <StatCard
          title="My Complaints"
          value={complaints.total || 0}
          icon={AlertTriangle}
          color="purple"
          loading={loading}
          subtitle={`${complaints.resolved || 0} Resolved, ${complaints.pending || 0} Open`}
          badge={complaints.pending > 0 ? 'In Review' : 'All Clear'}
          badgeType={complaints.pending > 0 ? 'warning' : 'success'}
          onClick={() => navigate('/complaints')}
        />

        <StatCard
          title="Campus Visitors"
          value={visitors.total || 0}
          icon={Users}
          color="sky"
          loading={loading}
          subtitle={`${visitors.currentlyInside || 0} Currently Inside`}
          badge="Visitor Logs"
          badgeType="info"
          onClick={() => navigate('/visitors')}
        />
      </div>

      {/* Roommates & Living Details */}
      {roommates.length > 0 && (
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <BedDouble className="w-4 h-4 text-emerald-600" />
            <span>My Roommates (Room {room?.room_number})</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {roommates.map((rm) => (
              <div key={rm.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-xs">
                  {rm.full_name?.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900">{rm.full_name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{rm.roll_number} • {rm.department}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Food Subscription & Dining Status */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Utensils className="w-5 h-5 text-amber-600" />
              <span>Food Subscription & Mess Plan</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Your active dining plan and mess attendance status</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/my-meals')}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors cursor-pointer"
            >
              My Meal History →
            </button>
            <button
              onClick={() => navigate('/menu')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
            >
              Weekly Menu →
            </button>
          </div>
        </div>

        {/* Plan Summary Card */}
        {foodSub ? (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Subscribed Plan</span>
                <span className="text-sm font-bold text-slate-900 mt-1 block">{foodSub.plan_name}</span>
                <div className="flex items-center gap-1 mt-1 text-[10px]">
                  {foodSub.has_breakfast ? <span className="bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-bold">Breakfast</span> : null}
                  {foodSub.has_lunch ? <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">Lunch</span> : null}
                  {foodSub.has_snacks ? <span className="bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded font-bold">Snacks</span> : null}
                  {foodSub.has_dinner ? <span className="bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded font-bold">Dinner</span> : null}
                </div>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Status</span>
                <span className={`inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-xs font-semibold border ${
                  foodSub.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  foodSub.status === 'PAUSED' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {foodSub.status}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Validity</span>
                <span className="text-xs text-slate-700 mt-1 block font-mono">
                  {new Date(foodSub.start_date).toLocaleDateString()} – {new Date(foodSub.end_date).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Monthly Charge</span>
                <span className="text-sm font-bold text-emerald-700 mt-1 block">
                  ₹{parseFloat(foodSub.monthly_price).toLocaleString()}
                  <span className="text-[10px] text-slate-400 font-normal"> / month</span>
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 flex items-center justify-end">
              <button
                onClick={() => navigate('/food/subscriptions')}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold transition-colors cursor-pointer"
              >
                Manage / Change Subscription →
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Utensils className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-900 block">No active food plan subscription</span>
                <span className="text-[11px] text-slate-500">Subscribe to an institutional dining package for daily meals and dining access.</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/food/subscriptions')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <Utensils className="h-3.5 w-3.5" />
              <span>Subscribe Now</span>
            </button>
          </div>
        )}

        {/* Today's Dining Menu */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Today's Meal Schedule</h4>
          {meals.todayMenu && meals.todayMenu.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {meals.todayMenu.map((meal, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between hover:border-emerald-300 transition-colors">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {meal.meal_type}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {meal.start_time?.slice(0, 5)} - {meal.end_time?.slice(0, 5)}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-800 leading-relaxed mb-2">
                      {meal.menu_items}
                    </p>
                  </div>
                  {meal.special_item && (
                    <div className="pt-2 border-t border-slate-200 text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>{meal.special_item}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <DashboardEmptyState message="No mess menu published for today" />
          )}
        </div>
      </div>

      {/* Recent Activity Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Fee Invoices & Receipts */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Fee Invoices & Dues</span>
            </h3>
            <button
              onClick={() => navigate('/my-fees')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {fees.dues && fees.dues.length > 0 ? (
              fees.dues.map((d) => (
                <div key={d.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">{d.term_name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">Bill: {d.bill_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">₹{Number(d.amount_due).toLocaleString()}</p>
                    <span
                      className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded-full ${
                        d.status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-3 italic">No fee records found</p>
            )}
          </div>
        </div>

        {/* Recent Complaints */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-purple-600" />
              <span>My Grievances & Tickets</span>
            </h3>
            <button
              onClick={() => navigate('/complaints')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {complaints.recent && complaints.recent.length > 0 ? (
              complaints.recent.map((c) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-900 truncate max-w-[180px]">{c.title}</p>
                    <p className="text-[11px] text-slate-400 font-mono">Ticket: {c.ticket_number}</p>
                  </div>
                  <span
                    className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded-full ${
                      c.status === 'RESOLVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : c.status === 'IN_PROGRESS'
                        ? 'bg-teal-50 text-teal-700 border border-teal-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-3 italic">No tickets raised</p>
            )}
          </div>
        </div>

        {/* Recent Outpass / Leaves */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-teal-600" />
              <span>Leave & Outpass Logs</span>
            </h3>
            <button
              onClick={() => navigate('/leaves')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {leaves.recent && leaves.recent.length > 0 ? (
              leaves.recent.map((l) => (
                <div key={l.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">{l.leave_type || 'Leave'}</p>
                    <p className="text-[11px] text-slate-400">{new Date(l.start_date).toLocaleDateString()}</p>
                  </div>
                  <span
                    className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded-full ${
                      l.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : l.status === 'REJECTED'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {l.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-3 italic">No leave requests found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
