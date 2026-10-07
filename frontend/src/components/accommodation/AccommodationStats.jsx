import React from 'react';
import {
  Building2,
  BedDouble,
  Users,
  CheckCircle2,
  Wrench,
  TrendingUp,
  Layers,
} from 'lucide-react';

export default function AccommodationStats({
  stats = {
    totalHostels: 0,
    totalRooms: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    maintenanceBeds: 0,
    occupancyPercentage: 0,
  },
  loading = false,
}) {
  const cards = [
    {
      title: 'Total Hostels',
      value: stats.totalHostels,
      icon: Building2,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-100',
      sub: 'Active residential blocks',
    },
    {
      title: 'Total Rooms',
      value: stats.totalRooms,
      icon: Layers,
      color: 'text-teal-700',
      bg: 'bg-teal-50 border-teal-100',
      sub: 'Across all floors',
    },
    {
      title: 'Total Beds',
      value: stats.totalBeds,
      icon: BedDouble,
      color: 'text-slate-800',
      bg: 'bg-slate-100 border-slate-200',
      sub: 'Total bed capacity',
    },
    {
      title: 'Occupied Beds',
      value: stats.occupiedBeds,
      icon: Users,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-100',
      sub: 'Active residents',
    },
    {
      title: 'Available Beds',
      value: stats.availableBeds,
      icon: CheckCircle2,
      color: 'text-teal-600',
      bg: 'bg-teal-50 border-teal-100',
      sub: 'Ready for allocation',
    },
    {
      title: 'Maintenance',
      value: stats.maintenanceBeds,
      icon: Wrench,
      color: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-100',
      sub: 'Under maintenance',
    },
    {
      title: 'Occupancy Rate',
      value: `${stats.occupancyPercentage}%`,
      icon: TrendingUp,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-100',
      sub: 'Capacity utilization',
      isRate: true,
      rateVal: Number(stats.occupancyPercentage) || 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 truncate">
                {card.title}
              </span>
              <div className={`p-1.5 rounded-xl border ${card.bg} ${card.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              {loading ? (
                <div className="h-7 w-16 bg-slate-100 animate-pulse rounded-md" />
              ) : (
                <p className="text-xl font-bold tracking-tight text-slate-900">
                  {card.value}
                </p>
              )}
              <p className="text-[10px] text-slate-400 mt-1 truncate">{card.sub}</p>

              {card.isRate && !loading && (
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, card.rateVal))}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
