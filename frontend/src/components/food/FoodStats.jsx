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
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50 border border-emerald-100',
      sub: 'Enrolled students',
    },
    {
      title: 'Active Subscriptions',
      value: s.activeSubscriptions ?? 0,
      icon: CheckCircle2,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-50 border border-teal-100',
      sub: 'Eligible for mess',
    },
    {
      title: 'Inactive / Paused',
      value: s.inactiveSubscriptions ?? 0,
      icon: AlertCircle,
      iconColor: 'text-slate-500',
      iconBg: 'bg-slate-100 border border-slate-200',
      sub: 'Paused / expired',
    },
    {
      title: "Today's Breakfast",
      value: s.todayBreakfastCount ?? 0,
      icon: Coffee,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50 border border-amber-100',
      sub: '07:30 – 09:30 AM',
    },
    {
      title: "Today's Lunch",
      value: s.todayLunchCount ?? 0,
      icon: Sun,
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-50 border border-orange-100',
      sub: '12:30 – 02:30 PM',
    },
    {
      title: "Today's Dinner",
      value: s.todayDinnerCount ?? 0,
      icon: Moon,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50 border border-indigo-100',
      sub: '07:30 – 09:30 PM',
    },
    {
      title: "Today's Total Meals",
      value: s.todayTotalMeals ?? 0,
      icon: Utensils,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-50 border border-teal-100',
      sub: 'Served today',
    },
    {
      title: 'Monthly Volume',
      value: `₹${Number(s.monthlyFoodRevenue || 0).toLocaleString('en-IN')}`,
      icon: IndianRupee,
      iconColor: 'text-emerald-700',
      iconBg: 'bg-emerald-50 border border-emerald-100',
      sub: 'Active mess revenue',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-slate-500 truncate">
                {card.title}
              </span>
              <div className={`p-1.5 rounded-xl ${card.iconBg} ${card.iconColor}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              {loading ? (
                <div className="h-6 w-14 bg-slate-100 animate-pulse rounded-md" />
              ) : (
                <p className="text-lg font-bold tracking-tight text-slate-900">
                  {card.value}
                </p>
              )}
              <p className="text-[9px] text-slate-400 mt-0.5 truncate">{card.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
