import React from 'react';
import { RefreshCw, Clock, AlertCircle } from 'lucide-react';

/**
 * Reusable Statistic Card with Icon, Badges, and Loading Skeleton
 */
export function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  badge,
  badgeType = 'info', // 'info' | 'success' | 'warning' | 'danger'
  color = 'indigo', // 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'purple' | 'blue'
  loading = false,
  onClick,
}) {
  const colorMap = {
    indigo: {
      bg: 'bg-indigo-50 border-indigo-100 text-indigo-700',
      iconBg: 'bg-indigo-600 text-white',
      accent: 'text-indigo-600',
    },
    emerald: {
      bg: 'bg-emerald-50 border-emerald-100 text-emerald-700',
      iconBg: 'bg-emerald-600 text-white',
      accent: 'text-emerald-600',
    },
    amber: {
      bg: 'bg-amber-50 border-amber-100 text-amber-700',
      iconBg: 'bg-amber-600 text-white',
      accent: 'text-amber-600',
    },
    rose: {
      bg: 'bg-rose-50 border-rose-100 text-rose-700',
      iconBg: 'bg-rose-600 text-white',
      accent: 'text-rose-600',
    },
    sky: {
      bg: 'bg-sky-50 border-sky-100 text-sky-700',
      iconBg: 'bg-sky-600 text-white',
      accent: 'text-sky-600',
    },
    purple: {
      bg: 'bg-purple-50 border-purple-100 text-purple-700',
      iconBg: 'bg-purple-600 text-white',
      accent: 'text-purple-600',
    },
    blue: {
      bg: 'bg-blue-50 border-blue-100 text-blue-700',
      iconBg: 'bg-blue-600 text-white',
      accent: 'text-blue-600',
    },
  };

  const badgeColorMap = {
    info: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    danger: 'bg-rose-100 text-rose-800 border-rose-200',
  };

  const c = colorMap[color] || colorMap.indigo;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-indigo-300' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-slate-200 animate-pulse rounded-lg mt-1" />
          ) : (
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                {typeof value === 'number' ? value.toLocaleString() : value ?? '0'}
              </h3>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl shadow-xs ${c.iconBg}`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
      </div>

      {(subtitle || badge) && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium truncate">{subtitle}</span>
          {badge && (
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                badgeColorMap[badgeType] || badgeColorMap.info
              }`}
            >
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Standard Dashboard Header with Refresh and Live Indicators
 */
export function DashboardHeader({
  title,
  subtitle,
  roleName,
  lastUpdated,
  onRefresh,
  loading,
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {roleName && (
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {roleName}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {lastUpdated && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span>Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        )}

        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
          <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Clean Empty State Box
 */
export function DashboardEmptyState({ message = 'No data records found', icon: Icon = AlertCircle }) {
  return (
    <div className="py-12 flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
      <div className="w-10 h-10 rounded-full bg-slate-200/80 flex items-center justify-center text-slate-500 mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xs font-semibold text-slate-600">{message}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">Records in MySQL will appear here in real-time.</p>
    </div>
  );
}
