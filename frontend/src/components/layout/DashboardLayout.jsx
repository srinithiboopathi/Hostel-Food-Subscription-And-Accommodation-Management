import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-sm text-slate-400 font-medium">Verifying authentication...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md text-center">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-slate-800">Unauthorized Access</h2>
          <p className="text-xs text-slate-500 mt-2">
            Your current role (<strong className="text-slate-800">{user.role}</strong>) does not have permission to view this module.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100/70 overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
