import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, Bell, Shield, Menu } from 'lucide-react';

export default function Navbar({ toggleSidebar }) {
  const { user, logout } = useAuth();

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'WARDEN':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'MESS_MANAGER':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ACCOUNTANT':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'STUDENT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline-block">
          DBMS Project • Live MySQL Connected
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* User Info & Role Badge */}
        {user && (
          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-xl">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
              {user.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight">{user.name}</p>
              <p className="text-[10px] text-slate-400 font-mono">{user.email}</p>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getRoleBadge(
                user.role
              )}`}
            >
              {user.role}
            </span>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={logout}
          title="Sign Out"
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
