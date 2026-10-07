import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getHostels,
  getHostelById,
  createHostel,
  updateHostel,
  deleteHostel,
} from '../../services/hostelService';
import { getRooms } from '../../services/roomService';
import AccommodationNav from '../../components/accommodation/AccommodationNav';
import AccommodationStats from '../../components/accommodation/AccommodationStats';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  BedDouble,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  MapPin,
  Layers,
  RefreshCw,
  Loader2,
  ShieldAlert,
  Sparkles,
  Info,
} from 'lucide-react';

export default function HostelsPage() {
  const { user } = useAuth();

  // Permissions
  const canManage = ['ADMIN', 'WARDEN'].includes(user?.role);
  const canDelete = user?.role === 'ADMIN';

  // State
  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [selectedHostel, setSelectedHostel] = useState(null);
  const [hostelDetails, setHostelDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [hostelToDelete, setHostelToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Form State
  const initialFormState = {
    name: '',
    code: '',
    type: 'BOYS',
    totalFloors: 1,
    wardenId: '',
    address: '',
    contactPhone: '',
    status: 'ACTIVE',
  };
  const [formData, setFormData] = useState(initialFormState);

  // Load Hostels & Rooms from API
  const fetchHostelsList = async () => {
    try {
      setLoading(true);
      setError(null);
      const [hostelsRes, roomsRes] = await Promise.all([
        getHostels({
          search: search.trim(),
          type: typeFilter,
          status: statusFilter,
        }),
        getRooms(),
      ]);
      setHostels(hostelsRes.data || []);
      setRooms(roomsRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load hostels from MySQL database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostelsList();
  }, [typeFilter, statusFilter]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchHostelsList();
  };

  // Accommodation Summary Stats
  const accommodationStats = useMemo(() => {
    const totalHostels = hostels.length;
    let totalRooms = 0;
    let totalBeds = 0;
    let occupiedBeds = 0;
    let maintenanceBeds = 0;

    rooms.forEach((r) => {
      totalRooms += 1;
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
  }, [hostels, rooms]);

  // Open Details Modal
  const handleOpenDetails = async (hostel) => {
    setSelectedHostel(hostel);
    setDetailsModalOpen(true);
    setLoadingDetails(true);
    try {
      const res = await getHostelById(hostel.id);
      setHostelDetails(res.data);
    } catch (err) {
      setHostelDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormData(initialFormState);
    setIsEditing(false);
    setFormError(null);
    setFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (hostel) => {
    setFormData({
      id: hostel.id,
      name: hostel.name || '',
      code: hostel.code || '',
      type: hostel.type || 'BOYS',
      totalFloors: hostel.total_floors || 1,
      wardenId: hostel.warden_id || '',
      address: hostel.address || '',
      contactPhone: hostel.contact_phone || '',
      status: hostel.status || 'ACTIVE',
    });
    setIsEditing(true);
    setFormError(null);
    setFormModalOpen(true);
  };

  // Submit Add / Edit Form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      if (isEditing) {
        await updateHostel(formData.id, {
          name: formData.name,
          code: formData.code,
          type: formData.type,
          totalFloors: Number(formData.totalFloors),
          wardenId: formData.wardenId ? Number(formData.wardenId) : null,
          address: formData.address,
          contactPhone: formData.contactPhone,
          status: formData.status,
        });
        setActionSuccess(`Hostel block "${formData.name}" updated successfully.`);
      } else {
        await createHostel({
          name: formData.name,
          code: formData.code,
          type: formData.type,
          totalFloors: Number(formData.totalFloors),
          wardenId: formData.wardenId ? Number(formData.wardenId) : null,
          address: formData.address,
          contactPhone: formData.contactPhone,
          status: formData.status,
        });
        setActionSuccess(`Hostel block "${formData.name}" created successfully.`);
      }

      setFormModalOpen(false);
      fetchHostelsList();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setFormError(err.message || 'Error saving hostel block details.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (hostel) => {
    setHostelToDelete(hostel);
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!hostelToDelete) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await deleteHostel(hostelToDelete.id);
      setActionSuccess(res.message || `Hostel "${hostelToDelete.name}" deleted.`);
      setDeleteModalOpen(false);
      fetchHostelsList();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete hostel block.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Sub-navigation tabs */}
      <AccommodationNav />

      {/* Visual Accommodation Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-200/80 shadow-xs">
        <img
          src="/images/hostel/hostel-room.jpg"
          alt="Modern hostel residence"
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover opacity-35 transition-transform duration-700 hover:scale-102"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-slate-900/80 to-transparent" />
        <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-white">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold backdrop-blur-md mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Campus Residence Operations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <Building2 className="h-7 w-7 text-teal-400" />
              Hostel Blocks & Facilities
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
              Manage hostels, rooms, occupancy, floor distributions, and resident student allocations in real time.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchHostelsList}
              disabled={loading}
              className="px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white flex items-center gap-1.5 transition-all cursor-pointer"
              title="Refresh list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Refresh</span>
            </button>

            {canDelete && (
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Hostel Block</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Accommodation Overview Summary Cards */}
      <AccommodationStats stats={accommodationStats} loading={loading} />

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search block name, code, address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-semibold text-slate-600">Filters:</span>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="">All Types (Boys / Girls / Coed)</option>
            <option value="BOYS">Boys Hostel</option>
            <option value="GIRLS">Girls Hostel</option>
            <option value="COED">Co-Ed Hostel</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          {(search || typeFilter || statusFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setTypeFilter('');
                setStatusFilter('');
              }}
              className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl transition-colors font-medium border border-rose-200 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Hostels List View */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">Fetching hostel blocks from MySQL database...</p>
        </div>
      ) : hostels.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">No Hostel Blocks Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            No hostel records match your filter criteria or no blocks have been registered in the database yet.
          </p>
          {canDelete && (
            <button
              onClick={handleOpenAddModal}
              className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition-all inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Hostel Block</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hostels.map((hostel) => {
            const occPercentage = Number(hostel.occupancy_percentage) || 0;
            const isFull = occPercentage >= 100;
            const isMaintenance = hostel.status === 'MAINTENANCE';

            return (
              <div
                key={hostel.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:shadow-md transition-all flex flex-col justify-between relative group shadow-xs"
              >
                <div>
                  {/* Top Bar: Code & Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                        {hostel.code}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                          hostel.type === 'BOYS'
                            ? 'bg-teal-50 text-teal-700 border-teal-200'
                            : hostel.type === 'GIRLS'
                            ? 'bg-pink-50 text-pink-700 border-pink-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}
                      >
                        {hostel.type}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                        hostel.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : hostel.status === 'MAINTENANCE'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {hostel.status}
                    </span>
                  </div>

                  {/* Title & Floors */}
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    {hostel.name}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      {hostel.total_floors} {hostel.total_floors === 1 ? 'Floor' : 'Floors'}
                    </span>
                    <span className="flex items-center gap-1">
                      <BedDouble className="w-3.5 h-3.5 text-slate-400" />
                      {hostel.total_rooms} Rooms
                    </span>
                  </div>

                  {/* Address & Phone */}
                  {(hostel.address || hostel.contact_phone) && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                      {hostel.address && (
                        <div className="flex items-start gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="truncate">{hostel.address}</span>
                        </div>
                      )}
                      {hostel.contact_phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{hostel.contact_phone}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Warden Info */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
                        {hostel.warden_name ? hostel.warden_name.charAt(0) : 'W'}
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">Assigned Warden</p>
                        <p className="text-xs font-semibold text-slate-800">
                          {hostel.warden_name || 'Not Assigned'}
                        </p>
                      </div>
                    </div>
                    {hostel.warden_phone && (
                      <span className="text-[11px] text-slate-500 font-mono">{hostel.warden_phone}</span>
                    )}
                  </div>

                  {/* Occupancy Progress Bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Occupancy</span>
                      <span className="font-bold text-slate-900">
                        {hostel.occupied_beds} / {hostel.total_capacity} Beds ({occPercentage}%)
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isMaintenance
                            ? 'bg-amber-500'
                            : isFull
                            ? 'bg-rose-500'
                            : occPercentage > 75
                            ? 'bg-teal-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, occPercentage))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span className="text-emerald-700 font-semibold">{hostel.available_beds} Beds Available</span>
                      <span>{hostel.occupied_beds} Occupied</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenDetails(hostel)}
                    className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 border border-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                    <span>View Rooms</span>
                  </button>

                  {canManage && (
                    <button
                      onClick={() => handleOpenEditModal(hostel)}
                      className="p-2 text-xs font-semibold rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all cursor-pointer"
                      title="Edit hostel details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {canDelete && (
                    <button
                      onClick={() => handleOpenDeleteModal(hostel)}
                      className="p-2 text-xs font-semibold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all border border-rose-200 cursor-pointer"
                      title="Delete hostel block"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 360° HOSTEL DETAILS MODAL                                                 */}
      {/* ========================================================================= */}
      {detailsModalOpen && selectedHostel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-slate-900 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Building2 className="w-6 h-6" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">{selectedHostel.name}</h2>
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {selectedHostel.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Type: <span className="text-slate-800 font-semibold">{selectedHostel.type}</span> | Floors: <span className="text-slate-800 font-semibold">{selectedHostel.total_floors}</span> | Status: <span className="text-emerald-700 font-semibold">{selectedHostel.status}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetails ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-2" />
                <p className="text-xs text-slate-500">Loading room distribution & resident occupancy...</p>
              </div>
            ) : hostelDetails ? (
              <div className="space-y-6">
                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <p className="text-[11px] font-semibold text-slate-500">Total Rooms</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">{hostelDetails.total_rooms}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <p className="text-[11px] font-semibold text-slate-500">Bed Capacity</p>
                    <p className="text-xl font-bold text-teal-700 mt-1">{hostelDetails.total_capacity}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <p className="text-[11px] font-semibold text-slate-500">Occupied Beds</p>
                    <p className="text-xl font-bold text-rose-600 mt-1">{hostelDetails.occupied_beds}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <p className="text-[11px] font-semibold text-slate-500">Available Beds</p>
                    <p className="text-xl font-bold text-emerald-700 mt-1">{hostelDetails.available_beds}</p>
                  </div>
                </div>

                {/* Rooms Grid */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <BedDouble className="w-4 h-4 text-emerald-600" />
                      <span>Rooms in this Block ({hostelDetails.rooms?.length || 0})</span>
                    </h3>
                  </div>

                  {(!hostelDetails.rooms || hostelDetails.rooms.length === 0) ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                      <p className="text-xs text-slate-400">No rooms configured in this hostel block yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-1">
                      {hostelDetails.rooms.map((room) => {
                        const isFull = (room.occupied_beds || 0) >= room.capacity;
                        const isMaint = room.configured_status === 'MAINTENANCE';

                        return (
                          <div
                            key={room.id}
                            className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900">Room {room.room_number}</span>
                              <span
                                className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md ${
                                  isMaint
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : isFull
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : room.occupied_beds > 0
                                    ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {isMaint ? 'MAINT' : isFull ? 'FULL' : `${room.available_beds} FREE`}
                              </span>
                            </div>

                            <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                              <p>Floor: {room.floor} | {room.room_type}</p>
                              <p className="font-semibold text-slate-800">
                                {room.occupied_beds || 0} / {room.capacity} Beds
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-rose-600">Failed to load hostel details.</p>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT HOSTEL BLOCK MODAL                                             */}
      {/* ========================================================================= */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl p-6 text-slate-900 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <Building2 className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  {isEditing ? 'Edit Hostel Block' : 'Add New Hostel Block'}
                </h3>
              </div>
              <button
                onClick={() => setFormModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Hostel Block Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Himalaya Block"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Block Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., H-BLK"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 uppercase focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Hostel Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="BOYS">Boys Hostel</option>
                    <option value="GIRLS">Girls Hostel</option>
                    <option value="COED">Co-Ed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Total Floors</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    required
                    value={formData.totalFloors}
                    onChange={(e) => setFormData({ ...formData, totalFloors: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Operational Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Physical Campus Address</label>
                <textarea
                  rows="2"
                  placeholder="Block location, street, landmark..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isEditing ? 'Save Changes' : 'Create Block'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE HOSTEL BLOCK MODAL                                                 */}
      {/* ========================================================================= */}
      {deleteModalOpen && hostelToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl p-6 text-slate-900 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="p-3 rounded-2xl bg-rose-50 border border-rose-100">
                <ShieldAlert className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete Hostel Block</h3>
                <p className="text-xs text-slate-500">Permanent MySQL Operation</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-900 font-mono">{hostelToDelete.name} ({hostelToDelete.code})</span>?
              This operation is guarded: blocks with rooms containing active student allocations cannot be removed.
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-rose-600/20 cursor-pointer"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
