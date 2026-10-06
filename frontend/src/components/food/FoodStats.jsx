import React from 'react';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Coffee,
  Sun,
  Moon,
  Utensils,
  IndianRupee,
} from 'lucide-react';

export default function FoodStats({
  stats,
  loading = false,
}) {
  const s = stats || {};

  const cards = [
    {
      title: 'Total Subscribed',
      value: s.totalStudentsSubscribed ?? s.totalSubscribedStudents ?? 0,
      icon: Users,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      sub: 'Students enrolled in dining',
    },
    {
      title: 'Active Subscriptions',
      value: s.activeSubscriptions ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      sub: 'Currently eligible for mess',
    },
    {
      title: 'Inactive / Paused',
      value: s.inactiveSubscriptions ?? 0,
      icon: AlertCircle,
      color: 'text-slate-400',
      bg: 'bg-slate-500/10',
      border: 'border-slate-500/20',
      sub: 'Paused or expired plans',
    },
    {
      title: "Today's Breakfast",
      value: s.todayBreakfastCount ?? 0,
      icon: Coffee,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      sub: '07:30 AM – 09:30 AM',
    },
    {
      title: "Today's Lunch",
      value: s.todayLunchCount ?? 0,
      icon: Sun,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      sub: '12:30 PM – 02:30 PM',
    },
    {
      title: "Today's Dinner",
      value: s.todayDinnerCount ?? 0,
      icon: Moon,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      sub: '07:30 PM – 09:30 PM',
    },
    {
      title: "Today's Total Meals",
      value: s.todayTotalMeals ?? 0,
      icon: Utensils,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      sub: 'Total served today',
    },
    {
      title: 'Monthly Revenue',
      value: `₹${Number(s.monthlyFoodRevenue || 0).toLocaleString('en-IN')}`,
      icon: IndianRupee,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      sub: 'Active mess billing volume',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className={`relative p-3.5 rounded-2xl bg-slate-900/60 border ${card.border} backdrop-blur-md flex flex-col justify-between shadow-xs transition-all hover:bg-slate-900/90`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-slate-400 truncate">
                {card.title}
              </span>
              <div className={`p-1 rounded-lg ${card.bg} ${card.color}`}>
                <Icon className="w-3 h-3" />
              </div>
            </div>

            <div>
              {loading ? (
                <div className="h-6 w-14 bg-slate-800 animate-pulse rounded-md" />
              ) : (
                <p className={`text-lg font-bold tracking-tight ${card.color}`}>
                  {card.value}
                </p>
              )}
              <p className="text-[9px] text-slate-500 mt-0.5 truncate">{card.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
