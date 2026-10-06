import React from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import WardenDashboard from './WardenDashboard';
import MessDashboard from './MessDashboard';
import AccountantDashboard from './AccountantDashboard';
import StudentDashboard from './StudentDashboard';
import { ShieldAlert } from 'lucide-react';

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Authenticating & loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <h2 className="text-lg font-bold text-slate-800">Authentication Required</h2>
        <p className="text-xs text-slate-500 mt-1">Please log in to view your dashboard.</p>
      </div>
    );
  }

  switch (user.role) {
    case 'ADMIN':
      return <AdminDashboard />;
    case 'WARDEN':
      return <WardenDashboard />;
    case 'MESS_MANAGER':
      return <MessDashboard />;
    case 'ACCOUNTANT':
      return <AccountantDashboard />;
    case 'STUDENT':
      return <StudentDashboard />;
    default:
      return (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
          <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto mb-2" />
          <h2 className="text-lg font-bold text-slate-800">Unrecognized Role: {user.role}</h2>
          <p className="text-xs text-slate-500 mt-1">Please contact your administrator for proper role assignment.</p>
        </div>
      );
  }
}
