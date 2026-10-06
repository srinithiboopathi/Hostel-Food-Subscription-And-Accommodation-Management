import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  Download,
  Printer,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  GraduationCap,
  BedDouble,
  KeyRound,
  Utensils,
  Receipt,
  CreditCard,
  MessageSquareWarning,
  CalendarCheck,
  Users,
  Bell,
  LayoutDashboard,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import {
  getStudentReport,
  getRoomReport,
  getAllocationReport,
  getMealReport,
  getMenuReport,
  getFeeReport,
  getPaymentReport,
  getComplaintReport,
  getLeaveReport,
  getVisitorReport,
  getNotificationReport,
  getReportSummary,
  downloadReportCsv,
} from '../../services/reportService';

export default function ReportsPage() {
  const { user } = useAuth();
  const role = user?.role || 'STUDENT';

  // Available tabs definition per role
  const allTabs = [
    { id: 'summary', name: 'Executive Summary', icon: LayoutDashboard, roles: ['ADMIN', 'WARDEN', 'ACCOUNTANT'] },
    { id: 'students', name: 'Students Directory', icon: GraduationCap, roles: ['ADMIN', 'WARDEN', 'STUDENT'] },
    { id: 'rooms', name: 'Rooms & Occupancy', icon: BedDouble, roles: ['ADMIN', 'WARDEN', 'STUDENT'] },
    { id: 'allocations', name: 'Room Allocations', icon: KeyRound, roles: ['ADMIN', 'WARDEN', 'STUDENT'] },
    { id: 'meals', name: 'Meal Attendance', icon: Utensils, roles: ['ADMIN', 'MESS_MANAGER', 'STUDENT'] },
    { id: 'menu', name: 'Food Menu', icon: Utensils, roles: ['ADMIN', 'MESS_MANAGER', 'STUDENT', 'WARDEN', 'ACCOUNTANT'] },
    { id: 'fees', name: 'Fees & Dues', icon: Receipt, roles: ['ADMIN', 'ACCOUNTANT', 'STUDENT'] },
    { id: 'payments', name: 'Payment Transactions', icon: CreditCard, roles: ['ADMIN', 'ACCOUNTANT', 'STUDENT'] },
    { id: 'complaints', name: 'Complaints', icon: MessageSquareWarning, roles: ['ADMIN', 'WARDEN', 'MESS_MANAGER', 'STUDENT'] },
    { id: 'leaves', name: 'Leave Requests', icon: CalendarCheck, roles: ['ADMIN', 'WARDEN', 'STUDENT'] },
    { id: 'visitors', name: 'Visitor Logs', icon: Users, roles: ['ADMIN', 'WARDEN', 'STUDENT'] },
    { id: 'notifications', name: 'Notifications Activity', icon: Bell, roles: ['ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT'] },
  ];

  const permittedTabs = allTabs.filter((t) => t.roles.includes(role));
  const [activeTab, setActiveTab] = useState(permittedTabs[0]?.id || 'students');

  // Filter States
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  // Data States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Fetch Report Data
  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        search: search.trim() || undefined,
        status: status || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit,
      };

      let res;
      switch (activeTab) {
        case 'summary':
          res = await getReportSummary();
          break;
        case 'students':
          res = await getStudentReport(params);
          break;
        case 'rooms':
          res = await getRoomReport(params);
          break;
        case 'allocations':
          res = await getAllocationReport(params);
          break;
        case 'meals':
          res = await getMealReport(params);
          break;
        case 'menu':
          res = await getMenuReport(params);
          break;
        case 'fees':
          res = await getFeeReport(params);
          break;
        case 'payments':
          res = await getPaymentReport(params);
          break;
        case 'complaints':
          res = await getComplaintReport(params);
          break;
        case 'leaves':
          res = await getLeaveReport(params);
          break;
        case 'visitors':
          res = await getVisitorReport(params);
          break;
        case 'notifications':
          res = await getNotificationReport(params);
          break;
        default:
          res = await getStudentReport(params);
      }

      if (res.success && res.data) {
        setReportData(res.data);
        if (res.data.summary) {
          setSummaryData(res.data.summary);
        }
        setLastRefreshed(new Date());
      } else {
        setError(res.message || 'Failed to generate report');
      }
    } catch (err) {
      console.error('Report fetch error:', err);
      setError(err.message || 'Failed to fetch report from MySQL database.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, status, startDate, endDate, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, search, status, startDate, endDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // CSV Export Handler
  const handleExportCsv = async () => {
    try {
      const endpointMap = {
        students: '/reports/students',
        rooms: '/reports/rooms',
        allocations: '/reports/allocations',
        meals: '/reports/meals',
        menu: '/reports/menu',
        fees: '/reports/fees',
        payments: '/reports/payments',
        complaints: '/reports/complaints',
        leaves: '/reports/leaves',
        visitors: '/reports/visitors',
        notifications: '/reports/notifications',
      };

      const endpoint = endpointMap[activeTab];
      if (!endpoint) return;

      const params = {
        search: search.trim() || undefined,
        status: status || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      await downloadReportCsv(endpoint, params, `${activeTab}-report`);
    } catch (err) {
      alert('Failed to export CSV: ' + err.message);
    }
  };

  // Print / PDF Export Handler
  const handlePrint = () => {
    window.print();
  };

  const records = reportData?.records || [];
  const pagination = reportData?.pagination || { total: records.length, page: 1, totalPages: 1 };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:border-none print:shadow-none print:p-0">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4" />
            <span>Real-time Analytics & Audit Reports</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Hostel Management System Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time MySQL data extraction, custom filtering, and compliant exports.
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Refresh</span>
          </button>

          {activeTab !== 'summary' && (
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Report Module Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-slate-200 print:hidden">
        {permittedTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar (Hidden on Executive Summary) */}
      {activeTab !== 'summary' && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 print:hidden">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search keyword (name, roll, ticket, receipt)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
              title="From Date"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
              title="To Date"
            />
          </div>

          {(search || status || startDate || endDate) && (
            <button
              onClick={() => {
                setSearch('');
                setStatus('');
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Summary KPI Cards for Active Report */}
      {summaryData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(summaryData).map(([key, val]) => {
            if (typeof val !== 'number' && typeof val !== 'string') return null;
            const label = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
            const isCurrency = key.toLowerCase().includes('amount') || key.toLowerCase().includes('billed') || key.toLowerCase().includes('collected') || key.toLowerCase().includes('pending');
            return (
              <div key={key} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">{label}</p>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  {isCurrency ? `₹${Number(val).toLocaleString()}` : Number(val).toLocaleString()}
                </h3>
              </div>
            );
          })}
        </div>
      )}

      {/* EXECUTIVE SUMMARY VIEW */}
      {activeTab === 'summary' && reportData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xs font-bold text-slate-500 uppercase">Total Students</p>
              <h2 className="text-2xl font-black text-slate-900 mt-1">{reportData.students?.total || 0}</h2>
              <p className="text-[11px] text-slate-400 mt-2">Active hostel residents</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xs font-bold text-slate-500 uppercase">Room Occupancy</p>
              <h2 className="text-2xl font-black text-indigo-600 mt-1">{reportData.rooms?.occupancyPercentage || 0}%</h2>
              <p className="text-[11px] text-slate-400 mt-2">
                {reportData.rooms?.occupiedBeds || 0} / {reportData.rooms?.totalCapacity || 0} beds filled
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xs font-bold text-slate-500 uppercase">Total Revenue Collected</p>
              <h2 className="text-2xl font-black text-emerald-600 mt-1">₹{(reportData.fees?.totalCollected || 0).toLocaleString()}</h2>
              <p className="text-[11px] text-slate-400 mt-2">
                Pending: ₹{(reportData.fees?.totalPending || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xs font-bold text-slate-500 uppercase">Pending Complaints</p>
              <h2 className="text-2xl font-black text-amber-600 mt-1">{reportData.complaints?.pending || 0}</h2>
              <p className="text-[11px] text-slate-400 mt-2">
                Resolved: {reportData.complaints?.resolved || 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* REPORT DATA TABLE VIEW */}
      {activeTab !== 'summary' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Showing {records.length} records (Page {pagination.page} of {pagination.totalPages})
            </span>
            <span className="text-[11px] text-slate-400">
              Generated: {lastRefreshed.toLocaleTimeString()}
            </span>
          </div>

          {loading ? (
            <div className="p-16 text-center text-xs text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
              Loading real-time records from MySQL...
            </div>
          ) : records.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-400">
              No matching records found for the applied filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    {Object.keys(records[0] || {}).map((col) => {
                      if (col === 'id' || col === 'user_id' || col === 'created_at' || col === 'updated_at') return null;
                      return (
                        <th key={col} className="py-3 px-3.5 capitalize">
                          {col.replace(/_/g, ' ')}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {records.map((row, idx) => (
                    <tr key={row.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      {Object.entries(row).map(([col, val]) => {
                        if (col === 'id' || col === 'user_id' || col === 'created_at' || col === 'updated_at') return null;

                        const isStatus = col.includes('status');
                        const isMoney = col.includes('amount') || col.includes('rent') || col.includes('deposit') || col.includes('balance');

                        return (
                          <td key={col} className="py-2.5 px-3.5">
                            {isStatus ? (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  val === 'ACTIVE' || val === 'APPROVED' || val === 'RESOLVED' || val === 'SUCCESS' || val === 'PAID' || val === 'PRESENT'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : val === 'PENDING' || val === 'PARTIAL' || val === 'IN_PROGRESS' || val === 'INSIDE'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {val || 'N/A'}
                              </span>
                            ) : isMoney ? (
                              <span className="font-semibold text-slate-900">
                                ₹{Number(val || 0).toLocaleString()}
                              </span>
                            ) : (
                              <span className="truncate max-w-xs block">{val !== null && val !== undefined ? String(val) : '-'}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs print:hidden">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 font-semibold"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
              <span className="text-slate-500 font-medium">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 font-semibold"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
