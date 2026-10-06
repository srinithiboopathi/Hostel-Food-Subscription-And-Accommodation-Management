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
        <span className="text-slate-600 text-xs flex items-center gap-1 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
          Not Marked
        </span>
      );
    }

    switch (status) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Present
          </span>
        );
      case 'PACKED':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/30">
            <Package className="w-3 h-3" />
            Packed
          </span>
        );
      case 'SPECIAL_REQUEST':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
            <Sparkles className="w-3 h-3" />
            Special
          </span>
        );
      case 'ABSENT':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/30">
            <XCircle className="w-3 h-3" />
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl border border-amber-500/30 shadow-inner">
            <Utensils className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              My Dining & Mess History
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium">
                Student Resident
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              View your personalized daily meal check-ins and hostel dining attendance records.
            </p>
          </div>
        </div>

        <button
          onClick={() => loadStudentData(pagination.page)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700 text-sm font-medium transition-all shadow-sm self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* TODAY'S ACTIVE MENU CAROUSEL/SUMMARY */}
      {todayMenu?.meals && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              Today's Mess Menu ({todayMenu.day_of_week || 'TODAY'})
            </h2>
            <span className="text-xs text-slate-400">{todayMenu.date}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {todayMenu.meals.map((m) => (
              <div
                key={m.meal_type_id}
                className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                      {m.meal_type}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {m.start_time?.slice(0, 5)} - {m.end_time?.slice(0, 5)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed min-h-[48px]">
                    {m.items_description || 'Menu not configured'}
                  </p>
                </div>
                {m.special_item && (
                  <div className="mt-2 text-[11px] text-amber-300 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
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
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 font-medium">Total Check-ins</span>
          <div className="text-2xl font-bold text-white mt-1">{pagination.total}</div>
          <span className="text-[11px] text-slate-500">In this period</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-emerald-400 font-medium">Present / Consumed</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{presentCount}</div>
          <span className="text-[11px] text-slate-500">Dining hall check-ins</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-cyan-400 font-medium">Packed Meals</span>
          <div className="text-2xl font-bold text-cyan-400 mt-1">{packedCount}</div>
          <span className="text-[11px] text-slate-500">Takeaway requests</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-amber-400 font-medium">Special Requests</span>
          <div className="text-2xl font-bold text-amber-400 mt-1">{specialCount}</div>
          <span className="text-[11px] text-slate-500">Dietary accommodations</span>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-400" />
          Monthly Attendance History
        </h3>

        <div className="flex items-center gap-3">
          {/* Month */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            className="bg-slate-950 border border-slate-700 text-xs text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500"
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
            className="bg-slate-950 border border-slate-700 text-xs text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500"
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
        <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* TABLE */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-2" />
            <p className="text-xs text-slate-400">Loading your meal history from MySQL...</p>
          </div>
        ) : groupedDates.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No meal check-in records found for this month.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Breakfast</th>
                  <th className="py-3 px-4">Lunch</th>
                  <th className="py-3 px-4">Snacks</th>
                  <th className="py-3 px-4">Dinner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {groupedDates.map((day) => (
                  <tr key={day.date} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-white flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
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
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadStudentData(pagination.page - 1)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-slate-200"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadStudentData(pagination.page + 1)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-slate-200"
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
