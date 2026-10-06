import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getHostels,
  getHostelById,
  createHostel,
  updateHostel,
  deleteHostel,
} from '../../services/hostelService';
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
  ArrowUpDown,
  RefreshCw,
  Loader2,
  Home,
  ShieldAlert,
} from 'lucide-react';

export default function HostelsPage() {
  const { user } = useAuth();

  // Permissions
  const canManage = ['ADMIN', 'WARDEN'].includes(user?.role);
  const canDelete = user?.role === 'ADMIN';

  // State
  const [hostels, setHostels] = useState([]);
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

  // Load Hostels from API
  const fetchHostelsList = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getHostels({
        search: search.trim(),
        type: typeFilter,
        status: statusFilter,
      });
      setHostels(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load hostels from database.');
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

  // Aggregated Overall Stats
  const stats = useMemo(() => {
    const totalHostels = hostels.length;
    let totalRooms = 0;
    let totalCapacity = 0;
    let occupiedBeds = 0;
    let availableBeds = 0;

    hostels.forEach((h) => {
      totalRooms += Number(h.total_rooms) || 0;
      totalCapacity += Number(h.total_capacity) || 0;
      occupiedBeds += Number(h.occupied_beds) || 0;
      availableBeds += Number(h.available_beds) || 0;
    });

    const overallOccupancy =
      totalCapacity > 0 ? Math.round((occupiedBeds / totalCapacity) * 100) : 0;

    return {
      totalHostels,
      totalRooms,
      totalCapacity,
      occupiedBeds,
      availableBeds,
      overallOccupancy,
    };
  }, [hostels]);

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
        setActionSuccess(`Hostel "${formData.name}" updated successfully.`);
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
        setActionSuccess(`Hostel "${formData.name}" created successfully.`);
      }

      setFormModalOpen(false);
      fetchHostelsList();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setFormError(err.message || 'Error saving hostel details.');
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
      setHostelToDelete(null);
      fetchHostelsList();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete hostel.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Building2 className="w-6 h-6" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              Hostel Blocks Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time MySQL records for residential buildings, real calculated occupancy, and room allocations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchHostelsList}
            disabled={loading}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-all shadow-2xs"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {canManage && (
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Hostel</span>
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

      {/* Quick Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500">Hostel Blocks</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{stats.totalHostels}</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500">Total Rooms</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{stats.totalRooms}</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500">Total Bed Capacity</p>
          <p className="text-xl font-bold text-indigo-600 mt-1">{stats.totalCapacity}</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500">Occupied Beds</p>
          <p className="text-xl font-bold text-rose-600 mt-1">{stats.occupiedBeds}</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500">Available Beds</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{stats.availableBeds}</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500">Overall Occupancy</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-bold text-slate-800">
              {stats.overallOccupancy}%
            </span>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, code or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500">Filters:</span>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-indigo-500"
          >
            <option value="">All Types (Boys/Girls/Coed)</option>
            <option value="BOYS">Boys Hostel</option>
            <option value="GIRLS">Girls Hostel</option>
            <option value="COED">Co-Ed Hostel</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-indigo-500"
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
              className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-medium"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Hostels List View */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">Fetching hostels from MySQL database...</p>
        </div>
      ) : hostels.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No Hostels Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search || typeFilter || statusFilter
              ? 'No hostel blocks match your filter criteria. Try adjusting the search filters.'
              : 'No hostel blocks have been registered in the database yet.'}
          </p>
          {canManage && !search && (
            <button
              onClick={handleOpenAddModal}
              className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
            >
              + Add First Hostel Block
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {hostels.map((hostel) => {
            const occPercent = Number(hostel.occupancy_percentage) || 0;
            const isFull = occPercent >= 100;

            return (
              <div
                key={hostel.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5">
                  {/* Top Badges */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono text-[11px] font-bold border border-slate-200">
                      {hostel.code}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          hostel.type === 'BOYS'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : hostel.type === 'GIRLS'
                            ? 'bg-pink-50 text-pink-700 border border-pink-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {hostel.type}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          hostel.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : hostel.status === 'MAINTENANCE'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {hostel.status}
                      </span>
                    </div>
                  </div>

                  {/* Hostel Name */}
                  <h3 className="text-base font-bold text-slate-800 leading-snug">
                    {hostel.name}
                  </h3>

                  {/* Address & Floors */}
                  <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{hostel.total_floors} Floors</span>
                    </div>

                    {hostel.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="truncate">{hostel.address}</span>
                      </div>
                    )}

                    {hostel.contact_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{hostel.contact_phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Occupancy Stats Section */}
                  <div className="mt-5 p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-semibold text-slate-600">Occupancy Rate</span>
                      <span
                        className={`font-bold ${
                          isFull
                            ? 'text-rose-600'
                            : occPercent > 50
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {occPercent}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isFull
                            ? 'bg-rose-500'
                            : occPercent > 50
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(occPercent, 100)}%` }}
                      />
                    </div>

                    {/* Bed counters */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-slate-200/60 text-center">
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">Rooms</p>
                        <p className="text-xs font-bold text-slate-700">
                          {hostel.total_rooms || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">Occupied</p>
                        <p className="text-xs font-bold text-rose-600">
                          {hostel.occupied_beds || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">Available</p>
                        <p className="text-xs font-bold text-emerald-600">
                          {hostel.available_beds || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => handleOpenDetails(hostel)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Rooms & Details</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {canManage && (
                      <button
                        onClick={() => handleOpenEditModal(hostel)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit Hostel"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {canDelete && (
                      <button
                        onClick={() => handleOpenDeleteModal(hostel)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Hostel"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. HOSTEL DETAILS & ROOMS MODAL */}
      {/* ========================================================================= */}
      {detailsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-600 text-white">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-800">
                      {selectedHostel?.name}
                    </h2>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-200 text-slate-700 font-mono">
                      {selectedHostel?.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Hostel overview and live room occupancy breakdown
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDetailsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {loadingDetails ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                  <p className="text-xs font-medium">Loading hostel details & rooms...</p>
                </div>
              ) : hostelDetails ? (
                <>
                  {/* Summary Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <p className="text-[11px] text-slate-500 font-medium">Total Floors</p>
                      <p className="text-lg font-bold text-slate-800 mt-0.5">
                        {hostelDetails.total_floors}
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <p className="text-[11px] text-slate-500 font-medium">Total Rooms</p>
                      <p className="text-lg font-bold text-slate-800 mt-0.5">
                        {hostelDetails.total_rooms}
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <p className="text-[11px] text-slate-500 font-medium">Bed Capacity</p>
                      <p className="text-lg font-bold text-indigo-600 mt-0.5">
                        {hostelDetails.total_capacity}
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <p className="text-[11px] text-slate-500 font-medium">Occupancy Rate</p>
                      <p className="text-lg font-bold text-emerald-600 mt-0.5">
                        {hostelDetails.occupancy_percentage}%
                      </p>
                    </div>
                  </div>

                  {/* Information Details */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium">Address:</span>
                      <p className="font-semibold text-slate-700 mt-0.5">
                        {hostelDetails.address || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Contact Phone:</span>
                      <p className="font-semibold text-slate-700 mt-0.5">
                        {hostelDetails.contact_phone || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Assigned Warden:</span>
                      <p className="font-semibold text-slate-700 mt-0.5">
                        {hostelDetails.warden_name
                          ? `${hostelDetails.warden_name} (${hostelDetails.warden_email || ''})`
                          : 'None assigned'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Type & Status:</span>
                      <p className="font-semibold text-slate-700 mt-0.5">
                        {hostelDetails.type} • {hostelDetails.status}
                      </p>
                    </div>
                  </div>

                  {/* Rooms List in this Hostel */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                      Rooms in {hostelDetails.name} ({hostelDetails.rooms?.length || 0})
                    </h4>

                    {(!hostelDetails.rooms || hostelDetails.rooms.length === 0) ? (
                      <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                        No rooms configured in this hostel block yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <tr>
                              <th className="px-3.5 py-2.5">Room No</th>
                              <th className="px-3.5 py-2.5">Floor</th>
                              <th className="px-3.5 py-2.5">Type</th>
                              <th className="px-3.5 py-2.5">Capacity</th>
                              <th className="px-3.5 py-2.5">Occupied</th>
                              <th className="px-3.5 py-2.5">Available</th>
                              <th className="px-3.5 py-2.5">Rent (₹)</th>
                              <th className="px-3.5 py-2.5">Calculated Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {hostelDetails.rooms.map((rm) => (
                              <tr key={rm.id} className="hover:bg-slate-50/60">
                                <td className="px-3.5 py-2.5 font-bold text-slate-800 font-mono">
                                  {rm.room_number}
                                </td>
                                <td className="px-3.5 py-2.5 text-slate-600">Floor {rm.floor}</td>
                                <td className="px-3.5 py-2.5 text-slate-600">{rm.room_type}</td>
                                <td className="px-3.5 py-2.5 font-semibold text-slate-700">
                                  {rm.capacity}
                                </td>
                                <td className="px-3.5 py-2.5 font-bold text-rose-600">
                                  {rm.occupied_beds}
                                </td>
                                <td className="px-3.5 py-2.5 font-bold text-emerald-600">
                                  {rm.available_beds}
                                </td>
                                <td className="px-3.5 py-2.5 text-slate-700">
                                  ₹{Number(rm.base_rent).toLocaleString()}
                                </td>
                                <td className="px-3.5 py-2.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      rm.calculated_status === 'FULL'
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                        : rm.calculated_status === 'PARTIAL'
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : rm.calculated_status === 'AVAILABLE'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}
                                  >
                                    {rm.calculated_status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-6 text-center text-rose-500 text-xs">
                  Could not load hostel details.
                </div>
              )}
            </div>

            {/* Modal Footer */}
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
      {/* 2. ADD / EDIT HOSTEL MODAL */}
      {/* ========================================================================= */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-800">
                  {isEditing ? 'Edit Hostel Block' : 'Register New Hostel Block'}
                </h3>
              </div>
              <button
                onClick={() => setFormModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hostel Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aryabhatta Boys Residence"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Code & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hostel Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ABR-01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hostel Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 bg-white"
                  >
                    <option value="BOYS">Boys Hostel</option>
                    <option value="GIRLS">Girls Hostel</option>
                    <option value="COED">Co-Ed Hostel</option>
                  </select>
                </div>
              </div>

              {/* Total Floors & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Floors <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={formData.totalFloors}
                    onChange={(e) => setFormData({ ...formData, totalFloors: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 bg-white"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="MAINTENANCE">Under Maintenance</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hostel Address / Campus Location
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. North Campus, Sector 4, Engineering Block"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isEditing ? 'Save Changes' : 'Create Hostel'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-800 text-center">
              Delete Hostel Block?
            </h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              Are you sure you want to delete <strong className="text-slate-800">"{hostelToDelete?.name}"</strong>?
            </p>

            {deleteError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 flex items-center gap-1.5 shadow-md shadow-rose-600/20"
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
