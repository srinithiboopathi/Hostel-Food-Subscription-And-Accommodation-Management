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

  const navSections = [
    {
      title: 'Main',
      items: [
        {
          name: 'Dashboard',
          to: '/dashboard',
          icon: LayoutDashboard,
          roles: ['ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'],
        },
        {
          name: 'Notifications',
          to: '/notifications',
          icon: Bell,
          roles: ['ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'],
        },
      ],
    },
    {
      title: 'Residents & Housing',
      items: [
        {
          name: 'Residents & Guests',
          to: '/students',
          icon: Users,
          roles: ['ADMIN', 'WARDEN'],
        },
        {
          name: 'Hostels & PG Properties',
          to: '/hostels',
          icon: Building2,
          roles: ['ADMIN', 'WARDEN'],
        },
        {
          name: 'Rooms & Beds',
          to: '/rooms',
          icon: BedDouble,
          roles: ['ADMIN', 'WARDEN'],
        },
        {
          name: 'Room Allocations',
          to: '/allocations',
          icon: KeyRound,
          roles: ['ADMIN', 'WARDEN', 'STUDENT'],
        },
      ],
    },
    {
      title: 'Dining & Mess',
      items: [
        {
          name: 'Food & Dining Plans',
          to: '/food',
          icon: Utensils,
          roles: ['ADMIN', 'WARDEN', 'MESS_MANAGER', 'STUDENT'],
        },
        {
          name: 'Daily Menu',
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
      ],
    },
    {
      title: 'Billing & Payments',
      items: [
        {
          name: 'Rent & Fee Invoices',
          to: '/fees',
          icon: CreditCard,
          roles: ['ADMIN', 'ACCOUNTANT', 'WARDEN', 'MESS_MANAGER'],
        },
        {
          name: 'My Invoices & Dues',
          to: '/my-fees',
          icon: Receipt,
          roles: ['STUDENT'],
        },
        {
          name: 'Financial Reports',
          to: '/reports',
          icon: FileText,
          roles: ['ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT'],
        },
      ],
    },
    {
      title: 'Helpdesk & Services',
      items: [
        {
          name: 'Complaints Desk',
          to: '/complaints',
          icon: MessageSquareWarning,
          roles: ['ADMIN', 'WARDEN', 'MESS_MANAGER', 'STUDENT'],
        },
        {
          name: 'Leaves & Out-pass',
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
          name: 'Visitor Log',
          to: '/visitors',
          icon: Users,
          roles: ['ADMIN', 'WARDEN', 'STUDENT'],
        },
        {
          name: 'Staff Directory',
          to: '/staff',
          icon: GraduationCap,
          roles: ['ADMIN', 'WARDEN'],
        },
      ],
    },
  ];

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
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-white/70 backdrop-blur-xl text-slate-800 flex flex-col justify-between border-r border-white/70 shadow-lg shadow-slate-900/5 transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="overflow-y-auto">
          {/* Logo Header */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-sm tracking-tight text-slate-900 flex items-center gap-1.5">
                  <span>Hostel & PG Hub</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </h1>
                <p className="text-[10px] text-slate-400 font-medium">Co-Living & Accommodation</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Grouped Navigation */}
          <div className="px-3 py-3 space-y-4">
            {navSections.map((section) => {
              const visibleItems = section.items.filter(
                (item) => !user || item.roles.includes(user.role)
              );
              if (visibleItems.length === 0) return null;

              return (
                <div key={section.title} className="space-y-1">
                  <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {section.title}
                  </p>
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.name}
                        to={item.to}
                        onClick={() => onClose && onClose()}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                            isActive
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs shadow-emerald-600/30'
                              : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/70'
                          }`
                        }
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{item.name}</span>
                        </div>
                      </NavLink>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Database Status Indicator */}
        <div className="p-3 border-t border-slate-100">
          <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50/50 border border-emerald-100 text-[11px]">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold mb-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Hostel & PG System Live</span>
            </div>
            <p className="text-slate-500 text-[10px]">
              Multi-Tenant Architecture Connected
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
