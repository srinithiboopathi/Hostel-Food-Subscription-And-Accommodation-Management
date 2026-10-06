import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Building2, ShieldCheck, Mail, Lock, Loader2, AlertCircle, ArrowRight, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('admin@hostel.local');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const setPersona = (userEmail, userPass) => {
    setEmail(userEmail);
    setPassword(userPass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glowing gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30">
            <Building2 className="w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          Hostel Management System
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Sign in to access student management, rooms & dining services
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@hostel.local"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all duration-150 active:scale-98 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Persona Logins */}
          <div className="mt-6 pt-5 border-t border-slate-700/80">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
              Quick Test Personas
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPersona('admin@hostel.local', 'Admin@123')}
                className="px-2.5 py-1.5 bg-slate-900/70 hover:bg-slate-700 text-xs text-indigo-400 font-medium rounded-lg border border-slate-700 text-left transition-colors"
              >
                👑 Admin
              </button>
              <button
                type="button"
                onClick={() => setPersona('warden@hostel.local', 'Admin@123')}
                className="px-2.5 py-1.5 bg-slate-900/70 hover:bg-slate-700 text-xs text-purple-400 font-medium rounded-lg border border-slate-700 text-left transition-colors"
              >
                🛡️ Warden
              </button>
              <button
                type="button"
                onClick={() => setPersona('mess@hostel.local', 'Admin@123')}
                className="px-2.5 py-1.5 bg-slate-900/70 hover:bg-slate-700 text-xs text-amber-400 font-medium rounded-lg border border-slate-700 text-left transition-colors"
              >
                🍲 Mess Mgr
              </button>
              <button
                type="button"
                onClick={() => setPersona('aarav.patel@student.edu', 'Student@123')}
                className="px-2.5 py-1.5 bg-slate-900/70 hover:bg-slate-700 text-xs text-emerald-400 font-medium rounded-lg border border-slate-700 text-left transition-colors"
              >
                🎓 Student
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
