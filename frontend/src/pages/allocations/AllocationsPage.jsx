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
import { getRooms } from '../../services/roomService';
import AccommodationNav from '../../components/accommodation/AccommodationNav';
import AccommodationStats from '../../components/accommodation/AccommodationStats';
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
  User,
  Phone,
  Mail,
  Receipt,
  Clock,
} from 'lucide-react';

export default function AllocationsPage() {
  const { user } = useAuth();

  // Role Permissions
  const canManage = ['ADMIN', 'WARDEN'].includes(user?.role);
  const isStudent = user?.role === 'STUDENT';

  // State
  const [allocations, setAllocations] = useState([]);
  const [rooms, setRooms] = useState([]);
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
  const [allocateStep, setAllocateStep] = useState(1); // 1: Student, 2: Hostel & Room, 3: Dates & Deposit, 4: Confirmation
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Student Search query inside Allocate modal
  const [modalStudentSearch, setModalStudentSearch] = useState('');

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
  const [checkoutRemarks, setCheckoutRemarks] = useState('');
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

  // Load Rooms list for summary stats
  const fetchRoomsForStats = async () => {
    try {
      const res = await getRooms();
      setRooms(res.data || []);
    } catch (e) {
      console.error('Error fetching rooms', e);
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
        status: statusFilter === 'ALL' ? '' : statusFilter,
        academicYear: academicYearFilter,
      });
      setAllocations(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch room allocations from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostelsDropdown();
    fetchStudentsDropdown();
    fetchRoomsForStats();
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

  // Accommodation Summary Stats
  const accommodationStats = useMemo(() => {
    const totalHostels = hostelsList.length;
    const totalRooms = rooms.length;
    let totalBeds = 0;
    let occupiedBeds = 0;
    let maintenanceBeds = 0;

    rooms.forEach((r) => {
      const cap = Number(r.capacity) || 0;
      const occ = Number(r.occupied_beds) || 0;
      totalBeds += cap;
      occupiedBeds += occ;
      if (r.configured_status === 'MAINTENANCE' || r.status === 'MAINTENANCE') {
        maintenanceBeds += cap;
      }
    });

    const availableBeds = Math.max(0, totalBeds - occupiedBeds - maintenanceBeds);
    const occupancyPercentage =
      totalBeds > 0 ? Number(((occupiedBeds / totalBeds) * 100).toFixed(1)) : 0;

    return {
      totalHostels,
      totalRooms,
      totalBeds,
      occupiedBeds,
      availableBeds,
      maintenanceBeds,
      occupancyPercentage,
    };
  }, [hostelsList, rooms]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAllocationsList(1);
  };

  // Open Allocate Modal
  const handleOpenAllocateModal = () => {
    setFormData(initialAllocateForm);
    setAllocateStep(1);
    setModalStudentSearch('');
    setFormError(null);
    setAllocateModalOpen(true);
  };

  // Filtered Students for Modal search
  const filteredModalStudents = useMemo(() => {
    if (!modalStudentSearch.trim()) return studentsList;
    const q = modalStudentSearch.trim().toLowerCase();
    return studentsList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.roll_number.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q)
    );
  }, [studentsList, modalStudentSearch]);

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
      fetchRoomsForStats();
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
      setTransferError('Please select a destination room.');
      return;
    }

    setTransferring(true);
    setTransferError(null);

    try {
      await updateAllocation(allocToTransfer.id, {
        roomId: Number(transferRoomId),
        status: 'ACTIVE',
      });

      setActionSuccess(`Student ${allocToTransfer.student_name} transferred successfully.`);
      setTransferModalOpen(false);
      setAllocToTransfer(null);
      fetchAllocationsList(pagination.page);
      fetchRoomsForStats();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setTransferError(err.message || 'Failed to transfer room.');
    } finally {
      setTransferring(false);
    }
  };

  // Open Checkout / Vacate Modal
  const handleOpenCheckoutModal = (alloc) => {
    setAllocToCheckout(alloc);
    setCheckoutRemarks('');
    setCheckoutError(null);
    setCheckoutModalOpen(true);
  };

  // Submit Checkout
  const handleConfirmCheckout = async (e) => {
    e.preventDefault();
    setCheckingOut(true);
    setCheckoutError(null);

    try {
      await updateAllocation(allocToCheckout.id, {
        status: 'VACATED',
        remarks: checkoutRemarks ? `Vacated: ${checkoutRemarks}` : 'Student checked out and vacated room.',
      });

      setActionSuccess(`Room checkout completed for ${allocToCheckout.student_name}. Bed released.`);
      setCheckoutModalOpen(false);
      setAllocToCheckout(null);
      fetchAllocationsList(pagination.page);
      fetchRoomsForStats();
      fetchStudentsDropdown();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setCheckoutError(err.message || 'Failed to vacate room allocation.');
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation tabs */}
      <AccommodationNav />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <KeyRound className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Room Allocations & Assignments
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Manage student-room assignments, transfer workflows, clearance checkouts, and complete allocation logs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchAllocationsList(pagination.page)}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-1.5 transition-all shadow-xs"
            title="Refresh allocations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh</span>
          </button>

          {canManage && (
            <button
              onClick={handleOpenAllocateModal}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>+ Allocate Student</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Alerts */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Accommodation Overview Summary Cards */}
      <AccommodationStats stats={accommodationStats} loading={loading} />

      {/* Search and Filters Bar */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-md space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search Input */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student, roll number, room..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {/* Hostel Filter */}
          <div>
            <select
              value={hostelFilter}
              onChange={(e) => setHostelFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="">All Hostels</option>
              {hostelsList.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.code})
                </option>
              ))}
            </select>
          </div>

          {/* Status & History Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="ACTIVE">Active Allocations Only</option>
              <option value="TRANSFERRED">Transferred History</option>
              <option value="VACATED">Vacated / Checked Out</option>
              <option value="CANCELLED">Cancelled Records</option>
              <option value="ALL">All Allocation History</option>
            </select>
          </div>

          {/* Academic Year Filter */}
          <div>
            <select
              value={academicYearFilter}
              onChange={(e) => setAcademicYearFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="">All Academic Years</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2024-2025">2024-2025</option>
              <option value="2023-2024">2023-2024</option>
            </select>
          </div>
        </div>

        {(search || hostelFilter || statusFilter !== 'ACTIVE' || academicYearFilter) && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setSearch('');
                setHostelFilter('');
                setStatusFilter('ACTIVE');
                setAcademicYearFilter('');
              }}
              className="px-3 py-1 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors font-medium border border-rose-500/20"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Allocations Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md shadow-xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
            <p className="text-xs text-slate-400 font-medium">Fetching allocation records from MySQL...</p>
          </div>
        ) : allocations.length === 0 ? (
          <div className="py-16 text-center p-8">
            <KeyRound className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-300">No Allocations Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No allocation records match the current filter selection.
            </p>
            {canManage && (
              <button
                onClick={handleOpenAllocateModal}
                className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Allocate Student Now</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="px-5 py-3.5">Student Resident</th>
                  <th className="px-5 py-3.5">Allocated Room</th>
                  <th className="px-5 py-3.5">Academic Year</th>
                  <th className="px-5 py-3.5">Allocation Period</th>
                  <th className="px-5 py-3.5">Security Deposit</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {allocations.map((alloc) => {
                  const isActive = alloc.status === 'ACTIVE';
                  const isTransferred = alloc.status === 'TRANSFERRED';
                  const isVacated = alloc.status === 'VACATED';

                  return (
                    <tr key={alloc.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Student */}
                      <td className="px-5 py-4 font-medium text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
                            {alloc.student_name ? alloc.student_name.charAt(0) : 'S'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{alloc.student_name}</span>
                              <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300">
                                {alloc.roll_number}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {alloc.department} • Year {alloc.year_of_study}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Allocated Room & Hostel */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 text-xs font-bold rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                              Room {alloc.room_number}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              (Floor {alloc.floor})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-500" />
                            <span>{alloc.hostel_name}</span>
                          </p>
                        </div>
                      </td>

                      {/* Academic Year */}
                      <td className="px-5 py-4 font-mono text-slate-300">
                        {alloc.academic_year}
                      </td>

                      {/* Period */}
                      <td className="px-5 py-4 text-slate-300">
                        <div className="space-y-0.5 text-[11px]">
                          <div className="flex items-center gap-1 text-slate-300">
                            <Calendar className="w-3 h-3 text-emerald-400" />
                            <span>From: {new Date(alloc.allocated_from).toLocaleDateString()}</span>
                          </div>
                          {alloc.vacated_at ? (
                            <div className="flex items-center gap-1 text-rose-400">
                              <Clock className="w-3 h-3" />
                              <span>Vacated: {new Date(alloc.vacated_at).toLocaleDateString()}</span>
                            </div>
                          ) : alloc.allocated_to ? (
                            <div className="flex items-center gap-1 text-slate-500">
                              <span>To: {new Date(alloc.allocated_to).toLocaleDateString()}</span>
                            </div>
                          ) : (
                            <span className="text-emerald-400 font-medium text-[10px]">Ongoing Residency</span>
                          )}
                        </div>
                      </td>

                      {/* Deposit */}
                      <td className="px-5 py-4 font-semibold text-slate-200">
                        ₹{Number(alloc.security_deposit).toLocaleString('en-IN')}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : isTransferred
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : isVacated
                              ? 'bg-slate-800 text-slate-400 border-slate-700'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {alloc.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedAlloc(alloc);
                              setDetailsModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                            title="View Allocation Details"
                          >
                            <Eye className="w-4 h-4 text-indigo-400" />
                          </button>

                          {canManage && isActive && (
                            <>
                              <button
                                onClick={() => handleOpenTransferModal(alloc)}
                                className="p-2 text-blue-400 hover:text-blue-300 rounded-lg hover:bg-blue-500/10 transition-colors"
                                title="Transfer Room"
                              >
                                <ArrowRightLeft className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleOpenCheckoutModal(alloc)}
                                className="p-2 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10 transition-colors"
                                title="Vacate / Check Out"
                              >
                                <LogOut className="w-4 h-4" />
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
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 bg-slate-950/40">
            <span>
              Showing {allocations.length} of {pagination.total} records (Page {pagination.page} of {pagination.totalPages})
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchAllocationsList(pagination.page - 1)}
                disabled={!pagination.hasPrev}
                className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-all"
              >
                Previous
              </button>
              <button
                onClick={() => fetchAllocationsList(pagination.page + 1)}
                disabled={!pagination.hasNext}
                className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ALLOCATION DETAILS MODAL                                                  */}
      {/* ========================================================================= */}
      {detailsModalOpen && selectedAlloc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-white space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <KeyRound className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="text-lg font-bold">Allocation Record #{selectedAlloc.id}</h3>
                  <p className="text-xs text-slate-400">
                    Status: <span className="text-emerald-400 font-semibold">{selectedAlloc.status}</span> | Academic Year: {selectedAlloc.academic_year}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Student Profile Box */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Resident Student</span>
                </h4>
                <div className="grid grid-cols-2 gap-3 text-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Full Name</span>
                    <span className="font-bold text-white text-sm">{selectedAlloc.student_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Register / Roll Number</span>
                    <span className="font-mono text-slate-200 font-bold">{selectedAlloc.roll_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Department & Year</span>
                    <span>{selectedAlloc.department} (Year {selectedAlloc.year_of_study})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Contact</span>
                    <span>{selectedAlloc.student_phone || selectedAlloc.student_email}</span>
                  </div>
                </div>
              </div>

              {/* Room & Hostel Box */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Hostel & Room Assigned</span>
                </h4>
                <div className="grid grid-cols-2 gap-3 text-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Hostel Block</span>
                    <span className="font-bold text-white">{selectedAlloc.hostel_name} ({selectedAlloc.hostel_code})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Room Number</span>
                    <span className="font-bold text-indigo-400 font-mono text-sm">Room {selectedAlloc.room_number} (Floor {selectedAlloc.floor})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Room Type & Capacity</span>
                    <span>{selectedAlloc.room_type} ({selectedAlloc.room_capacity} Beds)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Base Monthly Rent</span>
                    <span className="font-semibold text-slate-200">₹{Number(selectedAlloc.base_rent).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Timeline & Deposit */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Allocation Timeline & Deposit</span>
                </h4>
                <div className="grid grid-cols-2 gap-3 text-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Allocated Date</span>
                    <span className="font-medium text-white">{new Date(selectedAlloc.allocated_from).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Security Deposit</span>
                    <span className="font-bold text-emerald-400">₹{Number(selectedAlloc.security_deposit).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Allocated By</span>
                    <span>{selectedAlloc.allocated_by_name || 'System / Admin'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Vacated Date</span>
                    <span>{selectedAlloc.vacated_at ? new Date(selectedAlloc.vacated_at).toLocaleDateString() : 'N/A (Active)'}</span>
                  </div>
                </div>

                {selectedAlloc.remarks && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80">
                    <span className="text-slate-500 block text-[11px]">Remarks & Notes</span>
                    <p className="text-slate-300 italic">{selectedAlloc.remarks}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STUDENT ROOM ALLOCATION WIZARD MODAL                                      */}
      {/* ========================================================================= */}
      {allocateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-white space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <KeyRound className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="text-lg font-bold">New Room Allocation Wizard</h3>
                  <p className="text-xs text-slate-400">
                    Step {allocateStep} of 4: {allocateStep === 1 ? 'Select Student' : allocateStep === 2 ? 'Select Hostel & Room' : allocateStep === 3 ? 'Dates & Deposit' : 'Confirm Assignment'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAllocateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Wizard Progress Bar */}
            <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-semibold">
              {['1. Student', '2. Room', '3. Dates', '4. Confirm'].map((stepName, idx) => (
                <div
                  key={idx}
                  className={`py-1.5 rounded-lg border transition-all ${
                    allocateStep === idx + 1
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs'
                      : allocateStep > idx + 1
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  {stepName}
                </div>
              ))}
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* STEP 1: SELECT STUDENT */}
            {allocateStep === 1 && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search candidate student by name, roll number, department..."
                    value={modalStudentSearch}
                    onChange={(e) => setModalStudentSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {filteredModalStudents.length === 0 ? (
                    <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800">
                      <p className="text-xs text-slate-500">No matching students found.</p>
                    </div>
                  ) : (
                    filteredModalStudents.map((student) => {
                      const isSelected = formData.studentId === student.id.toString();
                      const hasRoom = !!student.room_number;

                      return (
                        <div
                          key={student.id}
                          onClick={() => setFormData({ ...formData, studentId: student.id.toString() })}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-indigo-600/10 border-indigo-500 text-white'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-xs">{student.name}</span>
                                <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300">
                                  {student.roll_number}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400">
                                {student.department} • Year {student.year_of_study} • {student.gender}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            {hasRoom ? (
                              <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                In Room {student.room_number}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                No Room Assigned
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setAllocateModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!formData.studentId}
                    onClick={() => {
                      if (!formData.studentId) return;
                      setAllocateStep(2);
                    }}
                    className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-all flex items-center gap-1.5"
                  >
                    <span>Continue to Room Selection</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: SELECT HOSTEL & AVAILABLE ROOM */}
            {allocateStep === 2 && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Select Hostel Block *</label>
                  <select
                    value={formData.hostelId}
                    onChange={(e) => setFormData({ ...formData, hostelId: e.target.value, roomId: '' })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="">-- Choose Hostel Block --</option>
                    {hostelsList.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.code}) - {h.type} Hostel
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-2">Available Rooms with Vacant Beds *</label>

                  {loadingAvailableRooms ? (
                    <div className="py-12 flex flex-col items-center justify-center">
                      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mb-1" />
                      <p className="text-[11px] text-slate-400">Loading vacant rooms in block...</p>
                    </div>
                  ) : !formData.hostelId ? (
                    <p className="text-slate-500 italic p-4 text-center bg-slate-950/40 rounded-xl border border-slate-800">
                      Please select a hostel block first to view vacant rooms.
                    </p>
                  ) : availableRoomsList.length === 0 ? (
                    <div className="p-6 text-center bg-slate-950/40 rounded-xl border border-slate-800 text-slate-400">
                      No vacant rooms available in this block currently.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                      {availableRoomsList.map((room) => {
                        const isSelected = formData.roomId === room.room_id.toString();
                        return (
                          <div
                            key={room.room_id}
                            onClick={() => setFormData({ ...formData, roomId: room.room_id.toString() })}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'bg-indigo-600/20 border-indigo-500 text-white'
                                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-xs">Room {room.room_number}</span>
                              <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {room.available} Free
                              </span>
                            </div>
                            <div className="mt-2 text-[10px] text-slate-400 space-y-0.5">
                              <p>Floor {room.floor} • {room.room_type}</p>
                              <p className="font-medium text-slate-300">₹{Number(room.base_rent).toLocaleString('en-IN')}/mo</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setAllocateStep(1)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-300"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!formData.hostelId || !formData.roomId}
                    onClick={() => setAllocateStep(3)}
                    className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-all flex items-center gap-1.5"
                  >
                    <span>Continue to Dates & Deposit</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: DATES & DEPOSIT */}
            {allocateStep === 3 && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Academic Year *</label>
                    <input
                      type="text"
                      required
                      placeholder="2025-2026"
                      value={formData.academicYear}
                      onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Security Deposit (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={formData.securityDeposit}
                      onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Allocation Start Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.allocatedFrom}
                      onChange={(e) => setFormData({ ...formData, allocatedFrom: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Allocation End Date (Optional)</label>
                    <input
                      type="date"
                      value={formData.allocatedTo}
                      onChange={(e) => setFormData({ ...formData, allocatedTo: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Special Remarks / Allocation Notes</label>
                  <textarea
                    rows="2"
                    placeholder="Medical preferences, special accommodations, key issuance..."
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-between pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setAllocateStep(2)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-300"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!formData.allocatedFrom || !formData.academicYear}
                    onClick={() => setAllocateStep(4)}
                    className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-all flex items-center gap-1.5"
                  >
                    <span>Review & Confirm</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: REVIEW & CONFIRM */}
            {allocateStep === 4 && (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Assignment Confirmation</h4>

                  <div className="grid grid-cols-2 gap-3 text-slate-300">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Resident Student</span>
                      <span className="font-bold text-white text-sm">{selectedStudentObj?.name}</span>
                      <span className="text-xs text-slate-400 block font-mono">{selectedStudentObj?.roll_number}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Assigned Room</span>
                      <span className="font-bold text-indigo-400 text-sm">Room {selectedRoomObj?.room_number}</span>
                      <span className="text-xs text-slate-400 block">{selectedHostelObj?.name} (Floor {selectedRoomObj?.floor})</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Academic Year & Start Date</span>
                      <span className="font-medium text-slate-200">{formData.academicYear} • {formData.allocatedFrom}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Security Deposit</span>
                      <span className="font-bold text-emerald-400 text-sm">₹{Number(formData.securityDeposit).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setAllocateStep(3)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-300"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAllocation}
                    disabled={submitting}
                    className="px-6 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/30"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirm & Execute Allocation</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ROOM TRANSFER MODAL                                                       */}
      {/* ========================================================================= */}
      {transferModalOpen && allocToTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 text-white space-y-4">
            <div className="flex items-center gap-3 text-blue-400 border-b border-slate-800 pb-3">
              <span className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                <ArrowRightLeft className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-white">Transfer Resident Student</h3>
                <p className="text-xs text-slate-400">
                  {allocToTransfer.student_name} ({allocToTransfer.roll_number})
                </p>
              </div>
            </div>

            {transferError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{transferError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmTransfer} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <p className="text-slate-400 text-[11px]">Current Allocation:</p>
                <p className="font-bold text-white text-sm">
                  {allocToTransfer.hostel_name} • Room {allocToTransfer.room_number} (Floor {allocToTransfer.floor})
                </p>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Destination Hostel Block *</label>
                <select
                  value={transferHostelId}
                  onChange={(e) => setTransferHostelId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white focus:outline-hidden focus:border-indigo-500"
                >
                  {hostelsList.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Destination Vacant Room *</label>
                <select
                  required
                  value={transferRoomId}
                  onChange={(e) => setTransferRoomId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="">-- Choose New Room --</option>
                  {transferRoomsList.map((r) => (
                    <option key={r.room_id} value={r.room_id}>
                      Room {r.room_number} (Floor {r.floor}, {r.available} Vacant Beds)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferring || !transferRoomId}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/30"
                >
                  {transferring && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Execute Transfer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VACATE / CHECKOUT MODAL                                                   */}
      {/* ========================================================================= */}
      {checkoutModalOpen && allocToCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 text-white space-y-4">
            <div className="flex items-center gap-3 text-rose-400 border-b border-slate-800 pb-3">
              <span className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <LogOut className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-white">Vacate Room & Check Out</h3>
                <p className="text-xs text-slate-400">
                  {allocToCheckout.student_name} ({allocToCheckout.roll_number})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Confirm check-out for <span className="font-bold text-white">Room {allocToCheckout.room_number}</span> in <span className="font-bold text-white">{allocToCheckout.hostel_name}</span>.
              This will release the bed capacity and update student accommodation status to vacated.
            </p>

            {checkoutError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmCheckout} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Clearance Remarks / Notes</label>
                <textarea
                  rows="2"
                  placeholder="Key returned, room inspection passed, dues cleared..."
                  value={checkoutRemarks}
                  onChange={(e) => setCheckoutRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCheckoutModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={checkingOut}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-rose-600/30"
                >
                  {checkingOut && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Check Out</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
