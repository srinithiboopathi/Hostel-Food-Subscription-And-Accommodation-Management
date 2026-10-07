import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStudentMealHistory } from '../../services/mealService';
import { getTodayMenu } from '../../services/menuService';
import {
  Utensils,
  Calendar,
  Clock,
  Coffee,
  Sun,
  Sunset,
  Moon,
  CheckCircle2,
  XCircle,
  Package,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Loader2,
  Flame,
  Star,
  Info,
} from 'lucide-react';

export default function StudentMealHistoryPage() {
  const { user } = useAuth();

  // State
  const [historyRecords, setHistoryRecords] = useState([]);
  const [groupedDates, setGroupedDates] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0, totalPages: 1 });
  const [todayMenu, setTodayMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Month & Year Filter
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  const loadStudentData = async (pageNumber = 1) => {
    setLoading(true);
    setError(null);
    try {
      const [historyRes, menuRes] = await Promise.all([
        getStudentMealHistory({
          page: pageNumber,
          limit: 30,
          month: selectedMonth,
          year: selectedYear,
        }),
        getTodayMenu(),
      ]);

      const hData = historyRes.data?.data || [];
      const gData = historyRes.data?.grouped_by_date || [];
      const pData = historyRes.data?.pagination || { page: 1, limit: 30, total: 0, totalPages: 1 };

      setHistoryRecords(hData);
      setGroupedDates(gData);
      setPagination(pData);
      setTodayMenu(menuRes.data?.data || menuRes.data);
    } catch (err) {
      console.error('Failed to fetch student meal history:', err);
      setError(err.response?.data?.message || 'Failed to load personal dining records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData(1);
  }, [selectedMonth, selectedYear]);

  // Status Badge Component
  const renderMealStatus = (status) => {
    if (!status) {
      return (
        <span className="text-slate-400 text-xs flex items-center gap-1.5 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          Not Marked
        </span>
      );
    }

    switch (status) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Present
          </span>
        );
      case 'PACKED':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-md border border-cyan-200">
            <Package className="w-3.5 h-3.5 text-cyan-600" />
            Packed
          </span>
        );
      case 'SPECIAL_REQUEST':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Special
          </span>
        );
      case 'ABSENT':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Absent
          </span>
        );
    }
  };

  // Calculate statistics
  const presentCount = historyRecords.filter((r) => r.status === 'PRESENT').length;
  const packedCount = historyRecords.filter((r) => r.status === 'PACKED').length;
  const specialCount = historyRecords.filter((r) => r.status === 'SPECIAL_REQUEST').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Header */}
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
                Student Resident
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                My Dining & Mess History
              </h1>
              <p className="text-slate-300 text-sm mt-1 max-w-xl">
                View your personalized daily meal check-ins and hostel dining attendance records.
              </p>
            </div>
          </div>

          <button
            onClick={() => loadStudentData(pagination.page)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-sm font-semibold transition-all backdrop-blur-sm self-start md:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* TODAY'S ACTIVE MENU CAROUSEL/SUMMARY */}
      {todayMenu?.meals && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Today's Mess Menu ({todayMenu.day_of_week || 'TODAY'})
            </h2>
            <span className="text-xs text-slate-400 font-medium">{todayMenu.date}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {todayMenu.meals.map((m) => (
              <div
                key={m.meal_type_id}
                className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between hover:border-emerald-200 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                      {m.meal_type}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {m.start_time?.slice(0, 5)} - {m.end_time?.slice(0, 5)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed min-h-[48px] font-medium">
                    {m.items_description || 'Menu not configured'}
                  </p>
                </div>
                {m.special_item && (
                  <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 flex items-center gap-1 font-semibold">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    {m.special_item}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-all">
          <span className="text-xs text-slate-500 font-semibold">Total Check-ins</span>
          <div className="text-2xl font-bold text-slate-800 mt-1">{pagination.total}</div>
          <span className="text-[11px] text-slate-400">In this period</span>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-all">
          <span className="text-xs text-emerald-700 font-semibold">Present / Consumed</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{presentCount}</div>
          <span className="text-[11px] text-slate-400">Dining hall check-ins</span>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-all">
          <span className="text-xs text-cyan-700 font-semibold">Packed Meals</span>
          <div className="text-2xl font-bold text-cyan-700 mt-1">{packedCount}</div>
          <span className="text-[11px] text-slate-400">Takeaway requests</span>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-all">
          <span className="text-xs text-amber-700 font-semibold">Special Requests</span>
          <div className="text-2xl font-bold text-amber-700 mt-1">{specialCount}</div>
          <span className="text-[11px] text-slate-400">Dietary accommodations</span>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-card flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600" />
          Monthly Attendance History
        </h3>

        <div className="flex items-center gap-3">
          {/* Month */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-800 px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500 font-medium"
          >
            {[
              'January',
              'February',
              'March',
              'April',
              'May',
              'June',
              'July',
              'August',
              'September',
              'October',
              'November',
              'December',
            ].map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>

          {/* Year */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-800 px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500 font-medium"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* TABLE */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-card">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-2" />
            <p className="text-xs text-slate-500">Loading your meal history from MySQL...</p>
          </div>
        ) : groupedDates.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50 text-slate-400" />
            No meal check-in records found for this month.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Breakfast</th>
                  <th className="py-3 px-4">Lunch</th>
                  <th className="py-3 px-4">Snacks</th>
                  <th className="py-3 px-4">Dinner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupedDates.map((day) => (
                  <tr key={day.date} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      {day.date}
                    </td>
                    <td className="py-3.5 px-4">{renderMealStatus(day.breakfast)}</td>
                    <td className="py-3.5 px-4">{renderMealStatus(day.lunch)}</td>
                    <td className="py-3.5 px-4">{renderMealStatus(day.snacks)}</td>
                    <td className="py-3.5 px-4">{renderMealStatus(day.dinner)}</td>
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
                onClick={() => loadStudentData(pagination.page - 1)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg text-slate-700 font-medium"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadStudentData(pagination.page + 1)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg text-slate-700 font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
