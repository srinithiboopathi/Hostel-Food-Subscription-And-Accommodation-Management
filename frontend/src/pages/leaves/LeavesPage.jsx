import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getMyLeaves,
  getLeaves,
  getLeaveById,
  createLeave,
  updateLeaveStatus,
  deleteLeave,
} from '../../services/leaveService';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Plus,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  FileText,
  RotateCcw,
  Trash2,
  Shield,
  Loader2,
  User,
  GraduationCap,
  Building2,
  BedDouble,
  ArrowRight,
  AlertTriangle,
  Info,
} from 'lucide-react';

const LEAVE_TYPES = [
  { value: 'HOME_VISIT', label: 'Home Visit' },
  { value: 'MEDICAL', label: 'Medical Emergency / Treatment' },
  { value: 'ACADEMIC_EVENT', label: 'Academic Event / Workshop' },
  { value: 'EMERGENCY', label: 'Family Emergency' },
  { value: 'OTHER', label: 'Other' },
];

export default function LeavesPage() {
  const { user } = useAuth();
  const isStudent = user?.role === 'STUDENT';

  // Data States
  const [leaves, setLeaves] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Filter States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Apply Leave Modal
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [applyError, setApplyError] = useState(null);
  const [applyForm, setApplyForm] = useState({
    leaveType: 'HOME_VISIT',
    startDate: '',
    endDate: '',
    reason: '',
    destinationAddress: '',
    emergencyContact: '',
  });

  // Details Modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Cancel / Delete Confirmations
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null, // 'cancel' or 'delete'
    leaveId: null,
    loading: false,
  });

  // Fetch Leaves
  const fetchLeaves = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        leaveType: typeFilter || undefined,
      };

      const res = isStudent ? await getMyLeaves(params) : await getLeaves(params);

      setLeaves(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Error loading leaves:', err);
      setError(err.response?.data?.message || 'Failed to load leave requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves(1);
  }, [statusFilter, typeFilter, isStudent]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLeaves(1);
  };

  // Open Apply Modal
  const openApplyModal = () => {
    setApplyError(null);
    setApplyForm({
      leaveType: 'HOME_VISIT',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      reason: '',
      destinationAddress: '',
      emergencyContact: '',
    });
    setApplyModalOpen(true);
  };

  // Submit Apply Leave
  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setApplyError(null);

    if (!applyForm.startDate || !applyForm.endDate) {
      setApplyError('Please specify both departure (start) and return (end) dates.');
      return;
    }

    if (new Date(applyForm.endDate) < new Date(applyForm.startDate)) {
      setApplyError('Return date cannot be earlier than departure date.');
      return;
    }

    if (!applyForm.destinationAddress.trim()) {
      setApplyError('Destination address is required.');
      return;
    }

    if (!applyForm.emergencyContact.trim()) {
      setApplyError('Emergency contact number is required.');
      return;
    }

    if (!applyForm.reason.trim()) {
      setApplyError('Reason for leave is required.');
      return;
    }

    try {
      setSubmitting(true);
      await createLeave(applyForm);
      setApplyModalOpen(false);
      setActionSuccess('Leave request submitted successfully.');
      setTimeout(() => setActionSuccess(null), 4000);
      fetchLeaves(1);
    } catch (err) {
      console.error('Failed to submit leave:', err);
      setApplyError(err.response?.data?.message || 'Failed to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  // View Leave Details
  const handleViewDetails = async (id) => {
    try {
      setDetailsLoading(true);
      setDetailsModalOpen(true);
      const res = await getLeaveById(id);
      setSelectedLeave(res.data);
    } catch (err) {
      console.error('Error fetching leave details:', err);
      setError(err.response?.data?.message || 'Failed to load details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  // Open Cancel/Delete Confirmation
  const openConfirmModal = (type, leaveId) => {
    setConfirmModal({
      isOpen: true,
      type,
      leaveId,
      loading: false,
    });
  };

  // Execute Cancel/Delete
  const handleExecuteAction = async () => {
    const { type, leaveId } = confirmModal;
    if (!leaveId) return;

    try {
      setConfirmModal((prev) => ({ ...prev, loading: true }));

      if (type === 'cancel') {
        await updateLeaveStatus(leaveId, { status: 'CANCELLED' });
        setActionSuccess('Leave request has been cancelled.');
      } else if (type === 'delete') {
        await deleteLeave(leaveId);
        setActionSuccess('Leave request removed permanently.');
      }

      setConfirmModal({ isOpen: false, type: null, leaveId: null, loading: false });
      setTimeout(() => setActionSuccess(null), 4000);
      fetchLeaves(pagination.page);
    } catch (err) {
      console.error(`Error performing ${type}:`, err);
      setError(err.response?.data?.message || `Failed to ${type} leave request.`);
      setConfirmModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Approved
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            Pending
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Rejected
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <X className="w-3.5 h-3.5 text-slate-500" />
            Cancelled
          </span>
        );
      case 'RETURNED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
            Returned
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  // Format Date Helper
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-xs font-semibold">
              Hostel Leave Portal
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              MySQL Verified
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-2 text-white">
            {isStudent ? 'My Leave Requests' : 'Student Leave Requests'}
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Apply for hostel out-passes, track approval status, and manage departure & return dates.
          </p>
        </div>

        {isStudent && (
          <button
            onClick={openApplyModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Apply for Leave</span>
          </button>
        )}
      </div>

      {/* Action Success Banner */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search destination, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
          />
        </form>

        {/* Filters */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-700 font-medium focus:outline-hidden focus:border-indigo-500 transition-all w-full md:w-auto"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="RETURNED">Returned</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-700 font-medium focus:outline-hidden focus:border-indigo-500 transition-all w-full md:w-auto"
          >
            <option value="">All Leave Types</option>
            {LEAVE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {(statusFilter || typeFilter || search) && (
            <button
              onClick={() => {
                setStatusFilter('');
                setTypeFilter('');
                setSearch('');
              }}
              className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Leaves Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
            <p className="text-xs font-medium">Loading leave requests from MySQL...</p>
          </div>
        ) : leaves.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Leave Requests Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {isStudent
                ? 'You have not submitted any leave requests matching this filter criteria.'
                : 'No student leave requests match the current filters.'}
            </p>
            {isStudent && (
              <button
                onClick={openApplyModal}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-500 transition-all"
              >
                Apply for Leave
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Leave Duration</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Destination & Reason</th>
                  <th className="py-3 px-4">Emergency Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {leaves.map((leave) => {
                  const isPending = leave.status === 'PENDING';
                  return (
                    <tr key={leave.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Leave Duration */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{formatDate(leave.start_date)}</span>
                          <span className="text-slate-400">→</span>
                          <span>{formatDate(leave.end_date)}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {leave.duration_days} {leave.duration_days === 1 ? 'day' : 'days'}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800">
                          {leave.leave_type.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Destination & Reason */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-center gap-1 text-slate-800 font-medium truncate">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{leave.destination_address}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5" title={leave.reason}>
                          {leave.reason}
                        </p>
                      </td>

                      {/* Emergency Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700 font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{leave.emergency_contact}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(leave.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewDetails(leave.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {isStudent && isPending && (
                            <>
                              <button
                                onClick={() => openConfirmModal('cancel', leave.id)}
                                className="px-2 py-1 rounded-lg text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all"
                                title="Cancel Request"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => openConfirmModal('delete', leave.id)}
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-all"
                                title="Delete Pending Request"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && leaves.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {leaves.length} of {pagination.total} leave requests
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchLeaves(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-700 transition-all"
              >
                Previous
              </button>
              <span className="px-2 font-mono text-[11px] text-slate-600">
                Page {pagination.page} / {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchLeaves(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-700 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      {applyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Apply for Hostel Leave</h3>
                  <p className="text-[11px] text-slate-400">Fill out out-pass request details</p>
                </div>
              </div>
              <button
                onClick={() => setApplyModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {applyError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{applyError}</span>
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-4 mt-4 text-xs">
              {/* Leave Type */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Leave Purpose / Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={applyForm.leaveType}
                  onChange={(e) => setApplyForm({ ...applyForm, leaveType: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:outline-hidden focus:border-indigo-500"
                  required
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Departure (Start) Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={applyForm.startDate}
                    onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-hidden focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Return (End) Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={applyForm.endDate}
                    min={applyForm.startDate}
                    onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-hidden focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Emergency Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +91 9876543210 (Guardian/Parent)"
                  value={applyForm.emergencyContact}
                  onChange={(e) => setApplyForm({ ...applyForm, emergencyContact: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-hidden focus:border-indigo-500"
                  required
                />
              </div>

              {/* Destination Address */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Destination Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Home address or event location..."
                  value={applyForm.destinationAddress}
                  onChange={(e) => setApplyForm({ ...applyForm, destinationAddress: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-hidden focus:border-indigo-500"
                  required
                />
              </div>

              {/* Detailed Reason */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Detailed Reason for Leave <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain the specific reason for requesting leave..."
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-hidden focus:border-indigo-500"
                  required
                />
              </div>

              {/* Form Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setApplyModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-2 shadow-md shadow-indigo-600/20"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Request</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Details Modal */}
      {detailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Leave Request Details</h3>
                  <p className="text-[11px] text-slate-400">Request #{selectedLeave?.id}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailsLoading || !selectedLeave ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
                <p className="text-xs">Loading leave record...</p>
              </div>
            ) : (
              <div className="space-y-4 mt-4 text-xs">
                {/* Status Bar */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-slate-600">Current Status:</span>
                  {getStatusBadge(selectedLeave.status)}
                </div>

                {/* Student Info */}
                <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-2">
                  <h4 className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider">
                    Student Details
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Name</span>
                      <span className="font-semibold text-slate-900">{selectedLeave.student_name}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Roll Number</span>
                      <span className="font-mono font-semibold text-slate-900">{selectedLeave.roll_number}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Department</span>
                      <span>{selectedLeave.department || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Hostel / Room</span>
                      <span>
                        {selectedLeave.hostel_name || 'N/A'}{' '}
                        {selectedLeave.room_number ? `• Rm ${selectedLeave.room_number}` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Leave Info */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] text-slate-400 block">Departure Date</span>
                      <span className="font-semibold text-slate-800">{formatDate(selectedLeave.start_date)}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] text-slate-400 block">Expected Return</span>
                      <span className="font-semibold text-slate-800">{formatDate(selectedLeave.end_date)}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] text-slate-400 block mb-0.5">Destination Address</span>
                    <span className="text-slate-800 font-medium">{selectedLeave.destination_address}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] text-slate-400 block mb-0.5">Emergency Contact</span>
                    <span className="font-mono text-slate-800 font-medium">{selectedLeave.emergency_contact}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] text-slate-400 block mb-0.5">Reason for Leave</span>
                    <p className="text-slate-800 leading-relaxed">{selectedLeave.reason}</p>
                  </div>
                </div>

                {/* Reviewer / Warden Info */}
                {selectedLeave.reviewed_by && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Warden Review Notes
                    </h4>
                    <p className="text-slate-700 italic">
                      "{selectedLeave.review_remarks || 'No remarks provided.'}"
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Reviewed by: {selectedLeave.reviewed_by_name} ({selectedLeave.reviewed_by_role})
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {confirmModal.type === 'cancel' ? 'Cancel Leave Request?' : 'Delete Leave Record?'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {confirmModal.type === 'cancel'
                ? 'Are you sure you want to cancel this pending leave request? This action cannot be undone.'
                : 'Are you sure you want to permanently delete this leave request from the database?'}
            </p>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={confirmModal.loading}
                onClick={() => setConfirmModal({ isOpen: false, type: null, leaveId: null, loading: false })}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="button"
                disabled={confirmModal.loading}
                onClick={handleExecuteAction}
                className="px-4 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 flex items-center gap-1.5"
              >
                {confirmModal.loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Confirm</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
