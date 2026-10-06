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
  Shield,
  X,
  History,
  CreditCard,
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
      roles: ['ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT'],
    },
    {
      name: 'Hostels',
      to: '/hostels',
      icon: Building2,
      roles: ['ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'],
    },
    {
      name: 'Rooms & Beds',
      to: '/rooms',
      icon: BedDouble,
      roles: ['ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'],
    },
    {
      name: 'Room Allocations',
      to: '/allocations',
      icon: KeyRound,
      roles: ['ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'],
    },
    {
      name: 'Food Menu',
      to: '/menu',
      icon: Utensils,
      roles: ['ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'],
    },
    {
      name: 'Meal Attendance',
      to: '/meals',
      icon: CalendarDays,
      roles: ['ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT'],
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
      name: 'Complaints & Maintenance',
      to: '/complaints',
      icon: MessageSquareWarning,
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
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-100 flex flex-col justify-between border-r border-slate-800 transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Logo Header */}
          <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-sm tracking-tight text-white">HostelHub</h1>
                <p className="text-[10px] text-slate-400 font-mono">DBMS v1.0</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="px-3 py-4 space-y-1">
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
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
                    `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Database Status Indicator */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800 text-[11px]">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>MySQL 3NF Connected</span>
            </div>
            <p className="text-slate-400 text-[10px]">
              Schema: <code className="text-indigo-300 font-mono">hostel_management</code>
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
