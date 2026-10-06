import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f19]">
        <LoadingSpinner size="lg" message="Authenticating session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f19] p-6 text-center">
        <div className="glass-card p-8 max-w-md w-full border-rose-500/30">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
            🔒
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
          <p className="text-slate-400 text-sm mb-6">
            Your current role (<span className="text-indigo-400 font-semibold">{role}</span>) does not have permission to access this portal section.
          </p>
          <a href="/dashboard" className="btn-primary w-full">
            Return to My Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
}
