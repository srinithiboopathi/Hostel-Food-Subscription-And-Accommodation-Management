import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getAllocations,
  getAvailableRooms,
  createAllocation,
  updateAllocation,
  deleteAllocation,
} from '../../services/allocationService';
import { getStudents } from '../../services/studentService';
import { getHostels } from '../../services/hostelService';
import {
  KeyRound,
  Plus,
  Search,
  Filter,
  Eye,
  ArrowRightLeft,
  LogOut,
  XCircle,
  Building2,
  BedDouble,
  GraduationCap,
  Calendar,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Loader2,
  ShieldAlert,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function AllocationsPage() {
  const { user } = useAuth();

  // Role Permissions
  const canManage = ['ADMIN', 'WARDEN'].includes(user?.role);

  // State
  const [allocations, setAllocations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Filter & Search State
  const [search, setSearch] = useState('');
  const [hostelFilter, setHostelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [academicYearFilter, setAcademicYearFilter] = useState('');

  // Dropdown options
  const [hostelsList, setHostelsList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [availableRoomsList, setAvailableRoomsList] = useState([]);
  const [loadingAvailableRooms, setLoadingAvailableRooms] = useState(false);

  // Allocate Modal State
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [allocateStep, setAllocateStep] = useState(1); // 1: Student, 2: Hostel & Room, 3: Confirmation
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Allocate Form Data
  const initialAllocateForm = {
    studentId: '',
    hostelId: '',
    roomId: '',
    academicYear: '2025-2026',
    allocatedFrom: new Date().toISOString().split('T')[0],
    allocatedTo: '',
    securityDeposit: 5000,
    remarks: '',
  };
  const [formData, setFormData] = useState(initialAllocateForm);

  // Details Modal State
  const [selectedAlloc, setSelectedAlloc] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Transfer Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [allocToTransfer, setAllocToTransfer] = useState(null);
  const [transferHostelId, setTransferHostelId] = useState('');
  const [transferRoomId, setTransferRoomId] = useState('');
  const [transferRoomsList, setTransferRoomsList] = useState([]);
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState(null);

  // Checkout / Vacate Modal State
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [allocToCheckout, setAllocToCheckout] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  // Load Hostels list
  const fetchHostelsDropdown = async () => {
    try {
      const res = await getHostels();
      setHostelsList(res.data || []);
    } catch (e) {
      console.error('Error fetching hostels', e);
    }
  };

  // Load Students list for allocation modal
  const fetchStudentsDropdown = async () => {
    try {
      const res = await getStudents({ limit: 100 });
      setStudentsList(res.data || []);
    } catch (e) {
      console.error('Error fetching students', e);
    }
  };

  // Load Allocations
  const fetchAllocationsList = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAllocations({
        page,
        limit: 10,
        search: search.trim(),
        hostelId: hostelFilter,
        status: statusFilter,
        academicYear: academicYearFilter,
      });
      setAllocations(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch allocations from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostelsDropdown();
    fetchStudentsDropdown();
  }, []);

  useEffect(() => {
    fetchAllocationsList(1);
  }, [hostelFilter, statusFilter, academicYearFilter]);

  // Load available rooms when hostel changes in Allocate modal
  useEffect(() => {
    if (formData.hostelId) {
      const loadRooms = async () => {
        setLoadingAvailableRooms(true);
        try {
          const res = await getAvailableRooms({ hostelId: formData.hostelId });
          setAvailableRoomsList(res.data || []);
        } catch (e) {
          setAvailableRoomsList([]);
        } finally {
          setLoadingAvailableRooms(false);
        }
      };
      loadRooms();
    } else {
      setAvailableRoomsList([]);
    }
  }, [formData.hostelId]);

  // Load available rooms for Transfer modal
  useEffect(() => {
    if (transferHostelId) {
      const loadRooms = async () => {
        try {
          const res = await getAvailableRooms({ hostelId: transferHostelId });
          setTransferRoomsList(res.data || []);
        } catch (e) {
          setTransferRoomsList([]);
        }
      };
      loadRooms();
    } else {
      setTransferRoomsList([]);
    }
  }, [transferHostelId]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAllocationsList(1);
  };

  // Open Allocate Modal
  const handleOpenAllocateModal = () => {
    setFormData(initialAllocateForm);
    setAllocateStep(1);
    setFormError(null);
    setAllocateModalOpen(true);
  };

  // Selected Student Object in modal
  const selectedStudentObj = useMemo(() => {
    return studentsList.find((s) => s.id === parseInt(formData.studentId, 10));
  }, [studentsList, formData.studentId]);

  // Selected Hostel Object in modal
  const selectedHostelObj = useMemo(() => {
    return hostelsList.find((h) => h.id === parseInt(formData.hostelId, 10));
  }, [hostelsList, formData.hostelId]);

  // Selected Room Object in modal
  const selectedRoomObj = useMemo(() => {
    return availableRoomsList.find((r) => r.room_id === parseInt(formData.roomId, 10));
  }, [availableRoomsList, formData.roomId]);

  // Submit Allocation
  const handleConfirmAllocation = async (e) => {
    e?.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await createAllocation({
        studentId: Number(formData.studentId),
        roomId: Number(formData.roomId),
        academicYear: formData.academicYear,
        allocatedFrom: formData.allocatedFrom,
        allocatedTo: formData.allocatedTo || null,
        securityDeposit: Number(formData.securityDeposit) || 0,
        remarks: formData.remarks,
      });

      setActionSuccess(`Room allocated successfully to ${selectedStudentObj?.name || 'student'}!`);
      setAllocateModalOpen(false);
      fetchAllocationsList(pagination.page);
      fetchStudentsDropdown();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setFormError(err.message || 'Failed to allocate room.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Transfer Modal
  const handleOpenTransferModal = (alloc) => {
    setAllocToTransfer(alloc);
    setTransferHostelId(alloc.hostel_id);
    setTransferRoomId('');
    setTransferError(null);
    setTransferModalOpen(true);
  };

  // Submit Transfer
  const handleConfirmTransfer = async (e) => {
    e.preventDefault();
    if (!transferRoomId) {
      setTransferError('Please select a target room for transfer.');
      return;
    }

    setTransferring(true);
    setTransferError(null);

    try {
      await updateAllocation(allocToTransfer.id, {
        roomId: Number(transferRoomId),
        remarks: `Transferred from Room ${allocToTransfer.room_number}`,
      });

      setActionSuccess(`Student ${allocToTransfer.student_name} transferred successfully.`);
      setTransferModalOpen(false);
      setAllocToTransfer(null);
      fetchAllocationsList(pagination.page);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setTransferError(err.message || 'Room transfer failed.');
    } finally {
      setTransferring(false);
    }
  };

  // Open Checkout Modal
  const handleOpenCheckoutModal = (alloc) => {
    setAllocToCheckout(alloc);
    setCheckoutError(null);
    setCheckoutModalOpen(true);
  };

  // Submit Checkout / Vacate
  const handleConfirmCheckout = async () => {
    if (!allocToCheckout) return;
    setCheckingOut(true);
    setCheckoutError(null);

    try {
      await updateAllocation(allocToCheckout.id, {
        status: 'VACATED',
        remarks: 'Checked out / vacated room',
      });

      setActionSuccess(`Student ${allocToCheckout.student_name} checked out. Room is now available.`);
      setCheckoutModalOpen(false);
      setAllocToCheckout(null);
      fetchAllocationsList(pagination.page);
      fetchStudentsDropdown();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setCheckoutError(err.message || 'Checkout failed.');
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <KeyRound className="w-6 h-6" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              Real-Time Room Allocations
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ACID database transactions, instant bed allocation, concurrency safety, transfers & check-out history.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchAllocationsList(pagination.page)}
            disabled={loading}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-all shadow-2xs"
            title="Refresh allocations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {canManage && (
            <button
              onClick={handleOpenAllocateModal}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>+ Allocate Student</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Alerts */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student, roll no, room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Hostel Filter */}
          <select
            value={hostelFilter}
            onChange={(e) => setHostelFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-indigo-500"
          >
            <option value="">All Hostels</option>
            {hostelsList.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.code})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-indigo-500 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Allocations</option>
            <option value="TRANSFERRED">Transferred</option>
            <option value="VACATED">Vacated / Checked Out</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Academic Year Filter */}
          <select
            value={academicYearFilter}
            onChange={(e) => setAcademicYearFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-indigo-500 font-mono"
          >
            <option value="">All Academic Years</option>
            <option value="2025-2026">2025-2026</option>
            <option value="2024-2025">2024-2025</option>
            <option value="2023-2024">2023-2024</option>
          </select>

          {(search || hostelFilter || statusFilter || academicYearFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setHostelFilter('');
                setStatusFilter('');
                setAcademicYearFilter('');
              }}
              className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-medium"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Allocations Data Table */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">Fetching allocation records from MySQL database...</p>
        </div>
      ) : allocations.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8">
          <KeyRound className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No Allocation Records Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search || hostelFilter || statusFilter || academicYearFilter
              ? 'No room allocations match your filter criteria. Try adjusting the search filters.'
              : 'No room allocations have been created yet.'}
          </p>
          {canManage && (
            <button
              onClick={handleOpenAllocateModal}
              className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
            >
              + Allocate Student to Room
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Student</th>
                  <th className="px-4 py-3.5">Roll No</th>
                  <th className="px-4 py-3.5">Hostel Block</th>
                  <th className="px-4 py-3.5">Room & Type</th>
                  <th className="px-4 py-3.5">Academic Year</th>
                  <th className="px-4 py-3.5">Allocation Period</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allocations.map((alloc) => (
                  <tr key={alloc.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Student */}
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">{alloc.student_name}</p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                        {alloc.department} (Yr {alloc.year_of_study})
                      </p>
                    </td>

                    {/* Roll No */}
                    <td className="px-4 py-3 font-mono font-bold text-slate-700">
                      {alloc.roll_number}
                    </td>

                    {/* Hostel Block */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{alloc.hostel_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{alloc.hostel_code}</p>
                    </td>

                    {/* Room & Type */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {alloc.room_number}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          Floor {alloc.floor} • {alloc.room_type}
                        </span>
                      </div>
                    </td>

                    {/* Academic Year */}
                    <td className="px-4 py-3 font-mono font-medium text-slate-600">
                      {alloc.academic_year}
                    </td>

                    {/* Allocation Period */}
                    <td className="px-4 py-3 text-slate-600">
                      <p className="font-medium">
                        {new Date(alloc.allocated_from).toLocaleDateString()}
                      </p>
                      {alloc.vacated_at ? (
                        <p className="text-[10px] text-rose-500 font-medium">
                          Vacated: {new Date(alloc.vacated_at).toLocaleDateString()}
                        </p>
                      ) : alloc.allocated_to ? (
                        <p className="text-[10px] text-slate-400">
                          To: {new Date(alloc.allocated_to).toLocaleDateString()}
                        </p>
                      ) : (
                        <p className="text-[10px] text-emerald-600 font-medium">Ongoing</p>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          alloc.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : alloc.status === 'TRANSFERRED'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : alloc.status === 'VACATED'
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {alloc.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Details */}
                        <button
                          onClick={() => {
                            setSelectedAlloc(alloc);
                            setDetailsModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Transfer Room */}
                        {canManage && alloc.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleOpenTransferModal(alloc)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Transfer Room"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Check-Out / Vacate */}
                        {canManage && alloc.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleOpenCheckoutModal(alloc)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Check-Out / Vacate"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {pagination.totalPages > 1 && (
            <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <p>
                Showing Page <span className="font-bold text-slate-700">{pagination.page}</span> of{' '}
                <span className="font-bold text-slate-700">{pagination.totalPages}</span> ({pagination.total} total records)
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={!pagination.hasPrev}
                  onClick={() => fetchAllocationsList(pagination.page - 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  disabled={!pagination.hasNext}
                  onClick={() => fetchAllocationsList(pagination.page + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. ALLOCATE STUDENT MODAL (STEP-BY-STEP SMART WIZARD) */}
      {/* ========================================================================= */}
      {allocateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-800">
                  Room Allocation Wizard
                </h3>
              </div>
              <button
                onClick={() => setAllocateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="px-6 py-3 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs">
              <div
                className={`flex items-center gap-1.5 font-semibold ${
                  allocateStep === 1 ? 'text-indigo-600' : 'text-slate-500'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>Select Student</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <div
                className={`flex items-center gap-1.5 font-semibold ${
                  allocateStep === 2 ? 'text-indigo-600' : 'text-slate-500'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>Hostel & Room</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <div
                className={`flex items-center gap-1.5 font-semibold ${
                  allocateStep === 3 ? 'text-indigo-600' : 'text-slate-500'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                  3
                </span>
                <span>Confirm</span>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* STEP 1: Select Student */}
              {allocateStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Choose Student <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 bg-white"
                    >
                      <option value="">-- Choose student from MySQL --</option>
                      {studentsList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.roll_number}) — {s.department} {s.room_number ? `[Current: Room ${s.room_number}]` : '[Unallocated]'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedStudentObj && (
                    <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-sm">{selectedStudentObj.name}</span>
                        <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-mono font-bold">
                          {selectedStudentObj.roll_number}
                        </span>
                      </div>
                      <p className="text-slate-600">
                        {selectedStudentObj.course} • {selectedStudentObj.department} (Year {selectedStudentObj.year_of_study})
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        Email: {selectedStudentObj.email} • Gender: {selectedStudentObj.gender}
                      </p>
                      {selectedStudentObj.room_number ? (
                        <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-800 font-medium">
                          ⚠️ Student already assigned to Room {selectedStudentObj.room_number} ({selectedStudentObj.hostel_name}). Allocating again will require transferring or vacating.
                        </div>
                      ) : (
                        <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
                          ✅ Student is currently not allocated to any room.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Select Hostel & Available Room */}
              {allocateStep === 2 && (
                <div className="space-y-4">
                  {/* Hostel Select */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hostel Block <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.hostelId}
                      onChange={(e) => setFormData({ ...formData, hostelId: e.target.value, roomId: '' })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 bg-white"
                    >
                      <option value="">-- Choose Hostel Block --</option>
                      {hostelsList.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} ({h.code}) — {h.type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Available Rooms Select */}
                  {formData.hostelId && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          Available Rooms in {selectedHostelObj?.name} <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[11px] text-slate-400">
                          {availableRoomsList.length} rooms with vacant beds
                        </span>
                      </div>

                      {loadingAvailableRooms ? (
                        <div className="py-6 flex items-center justify-center text-slate-400 text-xs">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading available rooms...
                        </div>
                      ) : availableRoomsList.length === 0 ? (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs text-center">
                          No rooms with vacant beds available in this hostel block.
                        </div>
                      ) : (
                        <select
                          value={formData.roomId}
                          onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 bg-white font-mono"
                        >
                          <option value="">-- Choose Available Room --</option>
                          {availableRoomsList.map((r) => (
                            <option key={r.room_id} value={r.room_id}>
                              Room {r.room_number} ({r.room_type}) — Floor {r.floor} | Capacity: {r.capacity} | Occupied: {r.occupied} | Available: {r.available}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Room Highlight Card */}
                  {selectedRoomObj && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-sm">
                          Room {selectedRoomObj.room_number} ({selectedRoomObj.room_type})
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                          {selectedRoomObj.available} Bed(s) Available
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center pt-2">
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <p className="text-[10px] text-slate-400">Total Capacity</p>
                          <p className="font-bold text-slate-700">{selectedRoomObj.capacity}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <p className="text-[10px] text-slate-400">Occupied</p>
                          <p className="font-bold text-rose-600">{selectedRoomObj.occupied}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <p className="text-[10px] text-slate-400">Base Rent</p>
                          <p className="font-bold text-indigo-600">₹{Number(selectedRoomObj.base_rent).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Academic Year & Dates */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Academic Year <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.academicYear}
                        onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Allocation / Check-in Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.allocatedFrom}
                        onChange={(e) => setFormData({ ...formData, allocatedFrom: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                      />
                    </div>
                  </div>

                  {/* Security Deposit & Remarks */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Security Deposit (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="500"
                        value={formData.securityDeposit}
                        onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Remarks / Bed Assignment
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Bed A allotted"
                        value={formData.remarks}
                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Allocation Confirmation */}
              {allocateStep === 3 && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                    <h4 className="font-bold text-slate-800 text-sm pb-2 border-b border-slate-200">
                      Review & Confirm Allocation
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-400 font-medium">Student:</span>
                        <p className="font-bold text-slate-800 mt-0.5">{selectedStudentObj?.name}</p>
                        <p className="font-mono text-slate-500 text-[11px]">{selectedStudentObj?.roll_number}</p>
                      </div>

                      <div>
                        <span className="text-slate-400 font-medium">Hostel Block:</span>
                        <p className="font-bold text-slate-800 mt-0.5">{selectedHostelObj?.name}</p>
                        <p className="font-mono text-slate-500 text-[11px]">{selectedHostelObj?.code}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 font-medium">Room Assigned:</span>
                        <p className="font-mono font-bold text-indigo-700 text-sm mt-0.5">
                          Room {selectedRoomObj?.room_number} ({selectedRoomObj?.room_type})
                        </p>
                        <p className="text-slate-500 text-[11px]">Floor {selectedRoomObj?.floor}</p>
                      </div>

                      <div>
                        <span className="text-slate-400 font-medium">Capacity / Occupancy:</span>
                        <p className="font-semibold text-slate-700 mt-0.5">
                          Capacity: {selectedRoomObj?.capacity} | Occupied: {selectedRoomObj?.occupied}
                        </p>
                        <p className="text-emerald-600 font-bold text-[11px]">
                          Remaining Available: {selectedRoomObj?.available} bed(s)
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 font-medium">Academic Year:</span>
                        <p className="font-mono font-bold text-slate-700 mt-0.5">{formData.academicYear}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Start Date:</span>
                        <p className="font-medium text-slate-700 mt-0.5">{formData.allocatedFrom}</p>
                      </div>
                    </div>

                    {formData.remarks && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-slate-400 font-medium">Remarks:</span>
                        <p className="text-slate-700 mt-0.5">{formData.remarks}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Wizard Controls */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              {allocateStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setAllocateStep(allocateStep - 1)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100"
                >
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setAllocateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
              )}

              {allocateStep === 1 && (
                <button
                  type="button"
                  disabled={!formData.studentId}
                  onClick={() => {
                    if (!formData.studentId) {
                      setFormError('Please select a student.');
                      return;
                    }
                    setFormError(null);
                    setAllocateStep(2);
                  }}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  Next: Select Room →
                </button>
              )}

              {allocateStep === 2 && (
                <button
                  type="button"
                  disabled={!formData.hostelId || !formData.roomId}
                  onClick={() => {
                    if (!formData.hostelId || !formData.roomId) {
                      setFormError('Please select both a hostel and an available room.');
                      return;
                    }
                    setFormError(null);
                    setAllocateStep(3);
                  }}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  Next: Review & Confirm →
                </button>
              )}

              {allocateStep === 3 && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmAllocation}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Allocation in MySQL</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ALLOCATION DETAILS MODAL */}
      {/* ========================================================================= */}
      {detailsModalOpen && selectedAlloc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-800">
                  Allocation Record #{selectedAlloc.id}
                </h3>
              </div>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm">{selectedAlloc.student_name}</span>
                  <span className="px-2 py-0.5 rounded font-mono font-bold bg-indigo-100 text-indigo-700">
                    {selectedAlloc.roll_number}
                  </span>
                </div>
                <p className="text-slate-600">
                  {selectedAlloc.department} (Year {selectedAlloc.year_of_study}) • {selectedAlloc.gender}
                </p>
                <p className="text-slate-500">Email: {selectedAlloc.student_email}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 font-medium">Hostel:</span>
                  <p className="font-bold text-slate-800 mt-0.5">{selectedAlloc.hostel_name}</p>
                  <p className="text-[11px] font-mono text-slate-500">{selectedAlloc.hostel_code}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Room Assigned:</span>
                  <p className="font-mono font-bold text-indigo-600 text-sm mt-0.5">
                    Room {selectedAlloc.room_number}
                  </p>
                  <p className="text-[11px] text-slate-500">Floor {selectedAlloc.floor} • {selectedAlloc.room_type}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 font-medium">Academic Year:</span>
                  <p className="font-mono font-bold text-slate-700 mt-0.5">{selectedAlloc.academic_year}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Allocation Status:</span>
                  <p className="font-bold text-emerald-600 mt-0.5">{selectedAlloc.status}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Start Date:</span>
                  <p className="font-medium text-slate-700 mt-0.5">
                    {new Date(selectedAlloc.allocated_from).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Security Deposit:</span>
                  <p className="font-medium text-slate-700 mt-0.5">
                    ₹{Number(selectedAlloc.security_deposit).toLocaleString()}
                  </p>
                </div>
              </div>

              {selectedAlloc.allocated_by_name && (
                <div>
                  <span className="text-slate-400 font-medium">Allocated By Staff:</span>
                  <p className="font-semibold text-slate-700 mt-0.5">{selectedAlloc.allocated_by_name}</p>
                </div>
              )}

              {selectedAlloc.remarks && (
                <div>
                  <span className="text-slate-400 font-medium">Remarks:</span>
                  <p className="text-slate-700 mt-0.5">{selectedAlloc.remarks}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ROOM TRANSFER MODAL */}
      {/* ========================================================================= */}
      {transferModalOpen && allocToTransfer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <ArrowRightLeft className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-800">
                Transfer Room
              </h3>
            </div>

            <form onSubmit={handleConfirmTransfer} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800">{allocToTransfer.student_name}</p>
                <p className="text-slate-500 font-mono mt-0.5">
                  Current Room: <strong className="text-slate-700">{allocToTransfer.room_number}</strong> ({allocToTransfer.hostel_name})
                </p>
              </div>

              {transferError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{transferError}</span>
                </div>
              )}

              {/* Target Hostel */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Hostel Block <span className="text-rose-500">*</span>
                </label>
                <select
                  value={transferHostelId}
                  onChange={(e) => setTransferHostelId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                >
                  <option value="">-- Choose Hostel --</option>
                  {hostelsList.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Available Room */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Room (Available Capacity Only) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={transferRoomId}
                  onChange={(e) => setTransferRoomId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono"
                >
                  <option value="">-- Select Target Room --</option>
                  {transferRoomsList
                    .filter((r) => r.room_id !== allocToTransfer.room_id)
                    .map((r) => (
                      <option key={r.room_id} value={r.room_id}>
                        Room {r.room_number} ({r.room_type}) — Available: {r.available} bed(s)
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferring || !transferRoomId}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {transferring && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Transfer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CHECK-OUT / VACATE MODAL */}
      {/* ========================================================================= */}
      {checkoutModalOpen && allocToCheckout && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-800 text-center">
              Check-Out / Vacate Room?
            </h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              Are you sure you want to check out <strong className="text-slate-800">{allocToCheckout.student_name}</strong> ({allocToCheckout.roll_number}) from <strong className="text-slate-800 font-mono">Room {allocToCheckout.room_number}</strong>?
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs mt-4">
              ℹ️ This will free up the bed in Room {allocToCheckout.room_number}, make it available for another student, and archive the allocation record as VACATED.
            </div>

            {checkoutError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setCheckoutModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={checkingOut}
                onClick={handleConfirmCheckout}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 text-white hover:bg-amber-700 flex items-center gap-1.5 shadow-md shadow-amber-600/20"
              >
                {checkingOut && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Check-Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
