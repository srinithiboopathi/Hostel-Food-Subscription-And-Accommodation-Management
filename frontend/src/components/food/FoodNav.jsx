import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Utensils,
  CreditCard,
  CalendarDays,
  CalendarCheck,
  History,
  Sparkles,
} from 'lucide-react';

export default function FoodNav() {
  const { user } = useAuth();

  const navItems = [
    {
      to: '/food',
      label: 'Food Hub & Plans',
      icon: Sparkles,
      roles: ['ADMIN', 'MESS_MANAGER', 'WARDEN', 'ACCOUNTANT', 'STUDENT'],
    },
    {
      to: '/food/subscriptions',
      label: 'Student Subscriptions',
      icon: CreditCard,
      roles: ['ADMIN', 'MESS_MANAGER', 'WARDEN', 'ACCOUNTANT', 'STUDENT'],
    },
    {
      to: '/menu',
      label: 'Daily Menu & Schedules',
      icon: Utensils,
      roles: ['ADMIN', 'MESS_MANAGER', 'WARDEN', 'ACCOUNTANT', 'STUDENT'],
    },
    {
      to: '/meals',
      label: 'Meal Attendance',
      icon: CalendarCheck,
      roles: ['ADMIN', 'MESS_MANAGER', 'WARDEN', 'ACCOUNTANT'],
    },
    {
      to: '/my-meals',
      label: 'My Meal Consumption',
      icon: History,
      roles: ['STUDENT'],
    },
  ];

  const filteredItems = navItems.filter((item) => !user || item.roles.includes(user.role));

  return (
    <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
      {filteredItems.map((item) => {
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
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
}
