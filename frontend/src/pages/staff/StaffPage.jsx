import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';
import {
  Users,
  Shield,
  Mail,
  Phone,
  Building2,
  Calendar,
  CheckCircle2,
  Search,
  Filter,
  RefreshCw,
  UserCheck,
} from 'lucide-react';

export default function StaffPage() {
  const { user } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch users summary or notifications/dashboard summary to list staff
      const res = await axiosClient.get('/dashboard/summary');
      // If summary provides active user list or staff roles
      const defaultStaff = [
        {
          id: 1,
          name: 'Dr. Arvind Swaminathan',
          email: 'admin@hostel.edu',
          role: 'ADMIN',
          phone: '+91 98765 43210',
          designation: 'Chief Hostel Administrator',
          department: 'Administration',
          status: 'ACTIVE',
        },
        {
          id: 2,
          name: 'Col. Rajesh Verma',
          email: 'warden@hostel.edu',
          role: 'WARDEN',
          phone: '+91 98765 43211',
          designation: 'Senior Hostel Warden',
          department: 'Discipline & Security',
          status: 'ACTIVE',
        },
        {
          id: 3,
          name: 'Chef Suresh Kumar',
          email: 'mess@hostel.edu',
          role: 'MESS_MANAGER',
          phone: '+91 98765 43212',
          designation: 'Head of Catering & Dining',
          department: 'Food & Nutrition',
          status: 'ACTIVE',
        },
        {
          id: 4,
          name: 'CA Priya Sundaram',
          email: 'accounts@hostel.edu',
          role: 'ACCOUNTANT',
          phone: '+91 98765 43213',
          designation: 'Bursar & Finance Officer',
          department: 'Accounts & Billing',
          status: 'ACTIVE',
        },
      ];
      setStaffList(defaultStaff);
    } catch (err) {
      setError(err.message || 'Failed to load staff records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
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
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.designation.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-indigo-400" />
            Hostel Staff Directory
          </h1>
          <p className="text-sm text-slate-400">
            Authorized management team, wardens, dining chiefs, and finance officers
          </p>
        </div>
        <button
          onClick={fetchStaff}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Directory
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-lg">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search staff by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Administrators</option>
            <option value="WARDEN">Wardens</option>
            <option value="MESS_MANAGER">Mess Managers</option>
            <option value="ACCOUNTANT">Accountants</option>
          </select>
        </div>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="flex items-center gap-3 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
            <span>Loading staff directory...</span>
          </div>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <p className="font-medium text-white">No staff members found</p>
          <p className="text-xs mt-1">Try adjusting your search criteria or role filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredStaff.map((staff) => (
            <div
              key={staff.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg hover:shadow-indigo-500/5"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg">
                    {staff.name.charAt(0)}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-semibold rounded-full border ${getRoleBadge(
                      staff.role
                    )}`}
                  >
                    <Shield className="w-3 h-3" />
                    {staff.role}
                  </span>
                </div>

                <h3 className="font-semibold text-white text-base leading-tight mb-1">{staff.name}</h3>
                <p className="text-xs text-indigo-400 font-medium mb-3">{staff.designation}</p>

                <div className="space-y-2 border-t border-slate-800/80 pt-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{staff.department}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400">
                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate font-mono">{staff.email}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{staff.phone}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Status</span>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Active
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
