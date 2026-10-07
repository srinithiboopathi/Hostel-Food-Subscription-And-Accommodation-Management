import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Building2, ShieldCheck, Mail, Lock, Loader2, AlertCircle, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('admin@hostel.com');
  const [password, setPassword] = useState('Password@123');
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
    <div className="min-h-screen bg-[#f8faf9] flex">
      {/* LEFT SIDE: Visual Campus Banner */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900 flex-col justify-between p-12 text-white">
        <img
          src="/images/campus/campus-hero.jpg"
          alt="Campus residence"
          className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105 transition-transform duration-1000 hover:scale-100"
        />
        {/* Emerald/Teal gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/90 via-slate-900/80 to-teal-900/60 mix-blend-multiply" />
        <div className="absolute inset-0 bg-radial-at-t from-emerald-500/20 via-transparent to-transparent pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white">HostelHub</span>
            <span className="block text-[11px] text-emerald-300 font-medium tracking-wide uppercase">Enterprise Campus Suite</span>
          </div>
        </div>

        {/* Hero Text */}
        <div className="relative z-10 max-w-lg space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Smart Living & Dining Platform</span>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight leading-tight">
            Smart Hostel Management
          </h1>
          <p className="text-slate-300 text-base leading-relaxed">
            Manage accommodation, dining, payments, outpass approvals, and student welfare seamlessly in one unified platform.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-slate-200">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Real-Time Room Allocation</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Automated Meal Subscriptions</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Instant Fee Reconciliation</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Digital Attendance & Outpass</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-400 flex items-center justify-between border-t border-white/10 pt-4">
          <span>&copy; {new Date().getFullYear()} HostelHub SaaS Inc.</span>
          <span className="text-emerald-400 font-medium">3NF Enterprise Architecture</span>
        </div>
      </div>

      {/* RIGHT SIDE: Clean White Glass Card Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900">HostelHub</span>
              <span className="block text-[11px] text-emerald-600 font-medium">Management Suite</span>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Please enter your credentials to access your portal.
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm shadow-slate-200/50">
            {error && (
              <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@hostel.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition-all duration-150 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Persona Logins */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center">
                One-Click Demo Personas
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPersona('admin@hostel.com', 'Password@123')}
                  className="px-3 py-2 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 text-xs font-semibold text-slate-700 hover:text-emerald-700 rounded-xl text-left transition-all duration-150 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPersona('warden@hostel.com', 'Password@123')}
                  className="px-3 py-2 bg-slate-50 hover:bg-teal-50 hover:border-teal-200 border border-slate-200 text-xs font-semibold text-slate-700 hover:text-teal-700 rounded-xl text-left transition-all duration-150 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-teal-500" />
                  <span>Warden</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPersona('mess@hostel.com', 'Password@123')}
                  className="px-3 py-2 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 border border-slate-200 text-xs font-semibold text-slate-700 hover:text-amber-700 rounded-xl text-left transition-all duration-150 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Mess Mgr</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPersona('student@hostel.com', 'Password@123')}
                  className="px-3 py-2 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 text-xs font-semibold text-slate-700 hover:text-emerald-700 rounded-xl text-left transition-all duration-150 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Student</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
