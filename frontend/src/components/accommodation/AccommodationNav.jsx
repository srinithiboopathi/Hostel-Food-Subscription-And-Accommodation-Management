import React from 'react';
import { NavLink } from 'react-router-dom';
import { Building2, BedDouble, KeyRound } from 'lucide-react';

export default function AccommodationNav() {
  const navItems = [
    {
      to: '/hostels',
      label: 'Hostel Blocks',
      icon: Building2,
      description: 'Buildings & Capacity',
    },
    {
      to: '/rooms',
      label: 'Rooms & Beds',
      icon: BedDouble,
      description: 'Room Inventory & Occupancy',
    },
    {
      to: '/allocations',
      label: 'Room Allocations',
      icon: KeyRound,
      description: 'Student Assignments & History',
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-600/20'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/70'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <div className="text-left">
              <div>{item.label}</div>
            </div>
          </NavLink>
        );
      })}
    </div>
  );
}
