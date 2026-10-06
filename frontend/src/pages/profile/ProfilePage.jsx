import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';
import {
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  Clock,
  CheckCircle2,
  GraduationCap,
  Building2,
  Lock,
  RefreshCw,
} from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(user || null);
  const [loading, setLoading] = useState(!user);
  const [error, setError] = useState(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axiosClient.get('/auth/me');
      if (res.success && res.data) {
        setProfile(res.data.user || res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'WARDEN':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'MESS_MANAGER':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'ACCOUNTANT':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'STUDENT':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
          <span>Loading profile details...</span>
        </div>
      </div>
    );
  }

  const p = profile || user || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">User Profile</h1>
          <p className="text-sm text-slate-400">View and manage your account identity and system role</p>
        </div>
        <button
          onClick={fetchProfile}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Profile
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Main Profile Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Role */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center text-center shadow-lg">
          <div className="relative mb-4">
            {p.avatarUrl ? (
              <img
                src={p.avatarUrl}
                alt={p.name || 'User Avatar'}
                className="w-24 h-24 rounded-full object-cover border-2 border-indigo-500 shadow-lg shadow-indigo-500/20"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-indigo-600/20 border-2 border-indigo-500/40 flex items-center justify-center text-indigo-400 text-3xl font-bold">
                {(p.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 border-2 border-slate-900 rounded-full" title="Active Account" />
          </div>

          <h2 className="text-xl font-bold text-white">{p.name || 'Hostel User'}</h2>
          <p className="text-sm text-slate-400 mb-4">{p.email || 'user@hostel.edu'}</p>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${getRoleBadge(
              p.role
            )}`}
          >
            <Shield className="w-3.5 h-3.5" />
            {p.role || 'USER'}
          </span>

          <div className="w-full mt-6 pt-6 border-t border-slate-800/80 space-y-3 text-left">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Account Status
              </span>
              <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {p.status || 'ACTIVE'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Last Login
              </span>
              <span className="text-slate-300 font-mono">
                {p.lastLoginAt ? new Date(p.lastLoginAt).toLocaleString() : 'Just now'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Information Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Account Details Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" />
              Account Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800">
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  Full Name
                </p>
                <p className="text-sm font-medium text-white">{p.name || 'N/A'}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800">
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  Email Address
                </p>
                <p className="text-sm font-medium text-white font-mono">{p.email || 'N/A'}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800">
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  Phone Number
                </p>
                <p className="text-sm font-medium text-white">{p.phone || '+91 Not Provided'}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800">
                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-500" />
                  System Role
                </p>
                <p className="text-sm font-medium text-white">{p.role || 'USER'}</p>
              </div>
            </div>
          </div>

          {/* Student Profile Specifics */}
          {p.role === 'STUDENT' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-400" />
                Academic & Student Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800">
                  <p className="text-xs text-slate-400 mb-1">Roll Number</p>
                  <p className="text-sm font-semibold text-indigo-300 font-mono">
                    {p.studentDetails?.rollNumber || p.rollNumber || 'CS2023001'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800">
                  <p className="text-xs text-slate-400 mb-1">Department</p>
                  <p className="text-sm font-medium text-white">
                    {p.studentDetails?.department || p.department || 'Computer Science & Engineering'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800">
                  <p className="text-xs text-slate-400 mb-1">Course</p>
                  <p className="text-sm font-medium text-white">
                    {p.studentDetails?.course || p.course || 'B.Tech'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800">
                  <p className="text-xs text-slate-400 mb-1">Year of Study</p>
                  <p className="text-sm font-medium text-white">
                    Year {p.studentDetails?.yearOfStudy || p.yearOfStudy || '3'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Security & Access Info */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              Security & Session
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Your session is authenticated via cryptographic JWT with role-based access control policies strictly enforced by the backend API and MySQL database.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-300 font-mono bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Authorization Header: Bearer JWT (Securely attached per request)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
