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
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      sub: 'Active residential blocks',
    },
    {
      title: 'Total Rooms',
      value: stats.totalRooms,
      icon: Layers,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      sub: 'Across all floors',
    },
    {
      title: 'Total Beds',
      value: stats.totalBeds,
      icon: BedDouble,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
      sub: 'Total bed capacity',
    },
    {
      title: 'Occupied Beds',
      value: stats.occupiedBeds,
      icon: Users,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      sub: 'Active residents',
    },
    {
      title: 'Available Beds',
      value: stats.availableBeds,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      sub: 'Ready for allocation',
    },
    {
      title: 'Maintenance Beds',
      value: stats.maintenanceBeds,
      icon: Wrench,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      sub: 'Under maintenance',
    },
    {
      title: 'Occupancy Rate',
      value: `${stats.occupancyPercentage}%`,
      icon: TrendingUp,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      sub: 'Live capacity utilization',
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
            className={`relative p-4 rounded-2xl bg-slate-900/60 border ${card.border} backdrop-blur-md flex flex-col justify-between shadow-xs transition-all hover:bg-slate-900/90`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-400 truncate">
                {card.title}
              </span>
              <div className={`p-1.5 rounded-lg ${card.bg} ${card.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              {loading ? (
                <div className="h-7 w-16 bg-slate-800 animate-pulse rounded-md" />
              ) : (
                <p className={`text-xl font-bold tracking-tight ${card.color}`}>
                  {card.value}
                </p>
              )}
              <p className="text-[10px] text-slate-500 mt-1 truncate">{card.sub}</p>

              {card.isRate && !loading && (
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-1.5 rounded-full transition-all duration-500"
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
