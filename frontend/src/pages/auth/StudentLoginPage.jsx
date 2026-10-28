import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  GraduationCap,
  Lock,
  Loader2,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Building2,
  Eye,
  EyeOff,
  BookOpen,
  Utensils,
  Bed,
  FileText,
  UserCheck
} from 'lucide-react';

export default function StudentLoginPage() {
  const navigate = useNavigate();
  const { loginStudent } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginStudent(identifier, password);
      navigate('/dashboard/student', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid Roll Number, Email, or Password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell min-h-screen flex">
      {/* LEFT SIDE: Visual Student Life Banner */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900 flex-col justify-between p-12 text-white">
        <img
          src="/images/campus/campus-hero.jpg"
          alt="Campus residence and student living"
          className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105 transition-transform duration-1000 hover:scale-100"
        />
        {/* Deep emerald-slate gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/95 via-slate-900/85 to-teal-950/70 mix-blend-multiply" />
        <div className="absolute inset-0 bg-radial-at-t from-emerald-500/25 via-transparent to-transparent pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">HostelHub</span>
              <span className="block text-[11px] text-emerald-300 font-semibold tracking-wider uppercase">Student Resident Portal</span>
            </div>
          </div>
          <Link
            to="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs text-slate-200 transition-all backdrop-blur-md"
          >
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Staff Portal</span>
          </Link>
        </div>

        {/* Hero Content for Students */}
        <div className="relative z-10 max-w-lg space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Your Personal Campus Residence Companion</span>
          </div>

          <h1 className="text-4xl font-extrabold text-white tracking-tight leading-tight">
            Welcome to Your Student Portal
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Access your room allocation details, weekly mess dining menu, meal attendance, digital outpass requests, fee payment receipts, and maintenance requests in one place.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-slate-200">
            <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-white/10">
              <Bed className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Your Room Assignment</span>
            </div>
            <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-white/10">
              <Utensils className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Daily Mess Menu & Food Plan</span>
            </div>
            <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-white/10">
              <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Instant Leave & Outpass</span>
            </div>
            <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-white/10">
              <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Fee Invoices & Receipts</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-400 flex items-center justify-between border-t border-white/10 pt-4">
          <span>&copy; {new Date().getFullYear()} HostelHub Student Suite</span>
          <span className="text-emerald-400 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Secure Student Authentication
          </span>
        </div>
      </div>

      {/* RIGHT SIDE: Dedicated Student Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Top Header */}
          <div className="lg:hidden flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/30">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-bold text-slate-900">HostelHub</span>
                <span className="block text-[11px] text-emerald-600 font-semibold">Student Portal</span>
              </div>
            </div>
            <Link
              to="/login"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 px-3 py-1.5 rounded-xl"
            >
              Staff Portal
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Individual Student Access</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Student Sign In
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Enter your student roll number or registered email to log into your account.
            </p>
          </div>

          {/* Form Card */}
          <div className="glass-card rounded-2xl p-8">
            {error && (
              <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Roll Number or College Email
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. CS2023001 or student@hostel.edu"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  You can use your unique Roll Number (e.g. CS2023001) or college email.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Need help? Contact your hostel administrator.
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
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
                    <span>Sign In to Student Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Link to Register Student */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center gap-2">
              <p className="text-xs text-slate-600 text-center">
                New student resident?{' '}
                <Link
                  to="/student-register"
                  className="text-emerald-600 font-semibold hover:text-emerald-700 hover:underline"
                >
                  Register your student account
                </Link>
              </p>

              <Link
                to="/login"
                className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1 mt-1"
              >
                <Building2 className="w-3 h-3" />
                <span>Switch to Warden / Admin Portal</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
