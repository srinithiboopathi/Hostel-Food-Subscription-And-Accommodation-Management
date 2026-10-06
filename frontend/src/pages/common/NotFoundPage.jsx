import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-6 text-center">
      <div className="glass-card p-8 max-w-md w-full">
        <h1 className="text-6xl font-extrabold text-indigo-500 mb-2">404</h1>
        <h2 className="text-xl font-bold text-white mb-2">Page Not Found</h2>
        <p className="text-slate-400 text-sm mb-6">
          The requested section or resource does not exist in the hostel portal.
        </p>
        <Link to="/dashboard" className="btn-primary w-full">
          <Home className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
