import React from 'react';
import { RefreshCw, Clock, AlertCircle, Sparkles, Building2 } from 'lucide-react';

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
  color = 'emerald', // 'emerald' | 'teal' | 'amber' | 'rose' | 'purple' | 'sky'
  loading = false,
  onClick,
}) {
  const colorMap = {
    emerald: {
      bg: 'bg-emerald-50 border-emerald-100 text-emerald-800',
      iconBg: 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-emerald-600/20 shadow-md',
      accent: 'text-emerald-600',
    },
    teal: {
      bg: 'bg-teal-50 border-teal-100 text-teal-800',
      iconBg: 'bg-gradient-to-tr from-teal-600 to-cyan-600 text-white shadow-teal-600/20 shadow-md',
      accent: 'text-teal-600',
    },
    amber: {
      bg: 'bg-amber-50 border-amber-100 text-amber-800',
      iconBg: 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-amber-500/20 shadow-md',
      accent: 'text-amber-600',
    },
    rose: {
      bg: 'bg-rose-50 border-rose-100 text-rose-800',
      iconBg: 'bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-rose-500/20 shadow-md',
      accent: 'text-rose-600',
    },
    purple: {
      bg: 'bg-purple-50 border-purple-100 text-purple-800',
      iconBg: 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-purple-600/20 shadow-md',
      accent: 'text-purple-600',
    },
    sky: {
      bg: 'bg-sky-50 border-sky-100 text-sky-800',
      iconBg: 'bg-gradient-to-tr from-sky-500 to-teal-500 text-white shadow-sky-500/20 shadow-md',
      accent: 'text-sky-600',
    },
  };

  const badgeColorMap = {
    info: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const c = colorMap[color] || colorMap.emerald;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 group ${
        onClick ? 'cursor-pointer hover:border-emerald-300' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-lg mt-1" />
          ) : (
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                {typeof value === 'number' ? value.toLocaleString() : value ?? '0'}
              </h3>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl transition-transform duration-200 group-hover:scale-105 ${c.iconBg}`}>
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
 * Modern Hero Banner for Dashboards & Feature Sections
 */
export function DashboardHero({
  title = 'Hostel Management Dashboard',
  subtitle = 'Everything you need to manage your campus residence, accommodation and dining operations.',
  badge = 'Smart Campus Operations',
  imageSrc = '/images/campus/campus-hero.jpg',
  roleName,
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900 mb-8 border border-slate-200/80 shadow-xs">
      {/* Background Image with optimized fit */}
      <img
        src={imageSrc}
        alt={title}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover opacity-35 transition-transform duration-700 hover:scale-102"
      />
      {/* Gradient Overlays for Emerald Theme */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-slate-900/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

      {/* Content */}
      <div className="relative z-10 p-6 sm:p-8 lg:p-10 max-w-2xl text-white">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{badge}</span>
          </span>
          {roleName && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-white backdrop-blur-md border border-white/10">
              {roleName}
            </span>
          )}
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
          {title}
        </h2>
        <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed max-w-xl">
          {subtitle}
        </p>
      </div>
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
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200/80">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {roleName && (
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {roleName}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {lastUpdated && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        )}

        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-800 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
          <span>{loading ? 'Refreshing...' : 'Refresh Data'}</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Clean Empty State Box with SVG illustration
 */
export function DashboardEmptyState({ message = 'No data records found', icon: Icon = AlertCircle, illustration }) {
  return (
    <div className="py-12 flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-dashed border-slate-200">
      {illustration ? (
        <img src={illustration} alt="Empty state" className="w-24 h-20 mb-3 opacity-80" />
      ) : (
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-3">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <p className="text-sm font-semibold text-slate-700">{message}</p>
      <p className="text-xs text-slate-400 mt-0.5">Records in MySQL will appear here in real-time.</p>
    </div>
  );
}
