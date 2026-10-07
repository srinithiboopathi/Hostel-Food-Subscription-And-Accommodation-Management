import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  GraduationCap,
  Building2,
  BedDouble,
  KeyRound,
  Utensils,
  CalendarDays,
  Receipt,
  MessageSquareWarning,
  Users,
  Bell,
  X,
  History,
  CreditCard,
  CalendarCheck,
  FileText,
  Sparkles,
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();

  const navigation = [
    {
      name: 'Dashboard',
      to: '/dashboard',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'],
    },
    {
      name: 'Students',
      to: '/students',
      icon: GraduationCap,
      roles: ['ADMIN', 'WARDEN'],
    },
    {
      name: 'Hostels',
      to: '/hostels',
      icon: Building2,
      roles: ['ADMIN', 'WARDEN'],
    },
    {
      name: 'Rooms & Beds',
      to: '/rooms',
      icon: BedDouble,
      roles: ['ADMIN', 'WARDEN', 'STUDENT'],
    },
    {
      name: 'Room Allocations',
      to: '/allocations',
      icon: KeyRound,
      roles: ['ADMIN', 'WARDEN', 'STUDENT'],
    },
    {
      name: 'Food Management',
      to: '/food',
      icon: Utensils,
      roles: ['ADMIN', 'WARDEN', 'MESS_MANAGER', 'STUDENT'],
    },
    {
      name: 'Food Subscriptions',
      to: '/food/subscriptions',
      icon: Receipt,
      roles: ['ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'],
    },
    {
      name: 'Food & Menu',
      to: '/menu',
      icon: CalendarDays,
      roles: ['ADMIN', 'WARDEN', 'MESS_MANAGER', 'STUDENT'],
    },
    {
      name: 'Meal Attendance',
      to: '/meals',
      icon: CalendarCheck,
      roles: ['ADMIN', 'WARDEN', 'MESS_MANAGER'],
    },
    {
      name: 'My Meal History',
      to: '/my-meals',
      icon: History,
      roles: ['STUDENT'],
    },
    {
      name: 'Fees & Payments',
      to: '/fees',
      icon: CreditCard,
      roles: ['ADMIN', 'ACCOUNTANT', 'WARDEN', 'MESS_MANAGER'],
    },
    {
      name: 'My Fees & Receipts',
      to: '/my-fees',
      icon: Receipt,
      roles: ['STUDENT'],
    },
    {
      name: 'Leave Management',
      to: '/leave-management',
      icon: CalendarCheck,
      roles: ['ADMIN', 'WARDEN'],
    },
    {
      name: 'My Leaves',
      to: '/leaves',
      icon: FileText,
      roles: ['STUDENT'],
    },
    {
      name: 'Visitor Management',
      to: '/visitors',
      icon: Users,
      roles: ['ADMIN', 'WARDEN', 'STUDENT'],
    },
    {
      name: 'Complaints',
      to: '/complaints',
      icon: MessageSquareWarning,
      roles: ['ADMIN', 'WARDEN', 'MESS_MANAGER', 'STUDENT'],
    },
    {
      name: 'Notifications',
      to: '/notifications',
      icon: Bell,
      roles: ['ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'],
    },
    {
      name: 'Reports & Analytics',
      to: '/reports',
      icon: FileText,
      roles: ['ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'],
    },
    {
      name: 'Staff Directory',
      to: '/staff',
      icon: Users,
      roles: ['ADMIN', 'WARDEN'],
    },
    {
      name: 'My Profile',
      to: '/profile',
      icon: GraduationCap,
      roles: ['ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'],
    },
  ];

  const filteredNav = navigation.filter(
    (item) => !user || item.roles.includes(user.role)
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-white text-slate-800 flex flex-col justify-between border-r border-slate-200/80 shadow-xs transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="overflow-y-auto">
          {/* Logo Header */}
          <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-sm tracking-tight text-slate-900 flex items-center gap-1.5">
                  <span>HostelHub</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </h1>
                <p className="text-[10px] text-slate-400 font-medium">Smart Campus SaaS</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="px-3 py-4 space-y-1">
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Management Modules
            </p>
            {filteredNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.to}
                  onClick={() => onClose && onClose()}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-600/30'
                        : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/70'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Database Status Indicator */}
        <div className="p-4 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50/50 border border-emerald-100 text-[11px]">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold mb-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>MySQL 3NF Connected</span>
            </div>
            <p className="text-slate-500 text-[10px]">
              Single Source of Truth
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
