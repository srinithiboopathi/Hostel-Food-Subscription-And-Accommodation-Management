import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
} from '../../services/roomService';
import { getHostels } from '../../services/hostelService';
import {
  BedDouble,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Building2,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  RefreshCw,
  Loader2,
  ShieldAlert,
  Wifi,
  Sparkles,
  Info,
} from 'lucide-react';

const COMMON_AMENITIES = [
  'Air Conditioner',
  'Attached Washroom',
  'Study Desks',
  'High-speed Wi-Fi',
  'Balcony',
  'Mini Fridge',
  'Ceiling Fan',
  'Wardrobe',
];

export default function RoomsPage() {
  const { user } = useAuth();

  // Permissions
  const canManage = ['ADMIN', 'WARDEN'].includes(user?.role);
  const canDelete = user?.role === 'ADMIN';

  // State
  const [rooms, setRooms] = useState([]);
  const [hostelsList, setHostelsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [hostelFilter, setHostelFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [occupancyFilter, setOccupancyFilter] = useState('');

  // Modals state
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomDetails, setRoomDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Form State
  const initialFormState = {
    id: null,
    hostelId: '',
    roomNumber: '',
    floor: 1,
    roomType: 'DOUBLE',
    capacity: 2,
    baseRent: 4500,
    amenities: ['High-speed Wi-Fi', 'Study Desks'],
    status: 'AVAILABLE',
    occupiedBeds: 0,
  };
  const [formData, setFormData] = useState(initialFormState);

  // Load Hostels list for filter & form dropdowns
  const fetchHostelsDropdown = async () => {
    try {
      const res = await getHostels();
      setHostelsList(res.data || []);
    } catch (e) {
      console.error('Failed to load hostels dropdown', e);
    }
  };

  // Load Rooms with filters
  const fetchRoomsList = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getRooms({
        search: search.trim(),
        hostelId: hostelFilter,
        floor: floorFilter,
        roomType: typeFilter,
        occupancy: occupancyFilter,
      });
      setRooms(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch rooms from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostelsDropdown();
  }, []);

  useEffect(() => {
    fetchRoomsList();
  }, [hostelFilter, floorFilter, typeFilter, occupancyFilter]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRoomsList();
  };

  // Aggregated Overall Stats
  const stats = useMemo(() => {
    const totalRooms = rooms.length;
    let totalCapacity = 0;
    let occupiedBeds = 0;
    let availableBeds = 0;

    rooms.forEach((r) => {
      totalCapacity += Number(r.capacity) || 0;
      occupiedBeds += Number(r.occupied_beds) || 0;
      availableBeds += Number(r.available_beds) || 0;
    });

    const avgOccupancy =
      totalCapacity > 0 ? Math.round((occupiedBeds / totalCapacity) * 100) : 0;

    return {
      totalRooms,
      totalCapacity,
      occupiedBeds,
      availableBeds,
      avgOccupancy,
    };
  }, [rooms]);

  // Open Room Details & Resident Students Modal
  const handleOpenDetails = async (room) => {
    setSelectedRoom(room);
    setDetailsModalOpen(true);
    setLoadingDetails(true);
    try {
      const res = await getRoomById(room.id);
      setRoomDetails(res.data);
    } catch (err) {
      setRoomDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Open Add Room Modal
  const handleOpenAddModal = () => {
    const defaultHostelId = hostelsList.length > 0 ? hostelsList[0].id : '';
    setFormData({
      ...initialFormState,
      hostelId: defaultHostelId,
    });
    setIsEditing(false);
    setFormError(null);
    setFormModalOpen(true);
  };

  // Open Edit Room Modal
  const handleOpenEditModal = (room) => {
    setFormData({
      id: room.id,
      hostelId: room.hostel_id,
      roomNumber: room.room_number || '',
      floor: room.floor || 1,
      roomType: room.room_type || 'DOUBLE',
      capacity: room.capacity || 2,
      baseRent: room.base_rent || 0,
      amenities: Array.isArray(room.amenities) ? room.amenities : [],
      status: room.configured_status || 'AVAILABLE',
      occupiedBeds: Number(room.occupied_beds) || 0,
    });
    setIsEditing(true);
    setFormError(null);
    setFormModalOpen(true);
  };

  // Toggle Amenity Checkbox
  const handleToggleAmenity = (amenity) => {
    const current = formData.amenities || [];
    if (current.includes(amenity)) {
      setFormData({
        ...formData,
        amenities: current.filter((a) => a !== amenity),
      });
    } else {
      setFormData({
        ...formData,
        amenities: [...current, amenity],
      });
    }
  };

  // Submit Add / Edit Form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Client-side capacity reduction check
    if (isEditing) {
      const newCap = Number(formData.capacity);
      if (newCap < formData.occupiedBeds) {
        setFormError(
          `Cannot reduce capacity to ${newCap} beds because this room currently has ${formData.occupiedBeds} active resident(s).`
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        await updateRoom(formData.id, {
          hostelId: Number(formData.hostelId),
          roomNumber: formData.roomNumber,
          floor: Number(formData.floor),
          roomType: formData.roomType,
          capacity: Number(formData.capacity),
          baseRent: Number(formData.baseRent),
          amenities: formData.amenities,
          status: formData.status,
        });
        setActionSuccess(`Room ${formData.roomNumber} updated successfully.`);
      } else {
        await createRoom({
          hostelId: Number(formData.hostelId),
          roomNumber: formData.roomNumber,
          floor: Number(formData.floor),
          roomType: formData.roomType,
          capacity: Number(formData.capacity),
          baseRent: Number(formData.baseRent),
          amenities: formData.amenities,
          status: formData.status,
        });
        setActionSuccess(`Room ${formData.roomNumber} created successfully.`);
      }

      setFormModalOpen(false);
      fetchRoomsList();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setFormError(err.message || 'Error saving room details.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (room) => {
    setRoomToDelete(room);
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!roomToDelete) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await deleteRoom(roomToDelete.id);
      setActionSuccess(res.message || `Room ${roomToDelete.room_number} deleted.`);
      setDeleteModalOpen(false);
      setRoomToDelete(null);
      fetchRoomsList();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete room.');
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
              <BedDouble className="w-6 h-6" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              Room & Bed Inventory Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time room occupancy, bed availability tracking, floor distribution, and resident allocation view.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchRoomsList}
            disabled={loading}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-all shadow-2xs"
            title="Refresh room list"
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
              <span>+ Add Room</span>
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500">Total Rooms</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{stats.totalRooms}</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500">Total Capacity (Beds)</p>
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
          <p className="text-[11px] font-medium text-slate-500">Average Occupancy</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{stats.avgOccupancy}%</p>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search room number..."
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

          {/* Floor Filter */}
          <select
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-indigo-500"
          >
            <option value="">All Floors</option>
            <option value="0">Ground Floor (0)</option>
            <option value="1">Floor 1</option>
            <option value="2">Floor 2</option>
            <option value="3">Floor 3</option>
            <option value="4">Floor 4</option>
          </select>

          {/* Room Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-indigo-500"
          >
            <option value="">All Room Types</option>
            <option value="SINGLE">Single Bed</option>
            <option value="DOUBLE">Double Sharing</option>
            <option value="TRIPLE">Triple Sharing</option>
            <option value="FOUR_BED">4-Bed Sharing</option>
            <option value="DORM">Dormitory</option>
          </select>

          {/* Occupancy Status Filter */}
          <select
            value={occupancyFilter}
            onChange={(e) => setOccupancyFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-indigo-500"
          >
            <option value="">All Occupancy Status</option>
            <option value="AVAILABLE">Available (Vacant/Empty)</option>
            <option value="PARTIAL">Partial (Partially Occupied)</option>
            <option value="FULL">Full (Fully Occupied)</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="RESERVED">Reserved</option>
          </select>

          {(search || hostelFilter || floorFilter || typeFilter || occupancyFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setHostelFilter('');
                setFloorFilter('');
                setTypeFilter('');
                setOccupancyFilter('');
              }}
              className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-medium"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Rooms Table */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">Fetching room records from MySQL database...</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8">
          <BedDouble className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No Rooms Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search || hostelFilter || floorFilter || typeFilter || occupancyFilter
              ? 'No rooms match your filter criteria. Try adjusting the search filters.'
              : 'No rooms have been added to the database yet.'}
          </p>
          {canManage && (
            <button
              onClick={handleOpenAddModal}
              className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
            >
              + Add Room
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Room No</th>
                  <th className="px-4 py-3.5">Hostel & Floor</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5 text-center">Capacity</th>
                  <th className="px-4 py-3.5 text-center">Occupied</th>
                  <th className="px-4 py-3.5 text-center">Available</th>
                  <th className="px-4 py-3.5">Base Rent</th>
                  <th className="px-4 py-3.5">Occupancy Rate</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rooms.map((room) => {
                  const occPercent = Number(room.occupancy_percentage) || 0;
                  const calcStatus = room.calculated_status;

                  return (
                    <tr
                      key={room.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Room No */}
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 text-sm">
                        {room.room_number}
                      </td>

                      {/* Hostel & Floor */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{room.hostel_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Floor {room.floor} • {room.hostel_code}
                        </p>
                      </td>

                      {/* Room Type */}
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                          {room.room_type}
                        </span>
                      </td>

                      {/* Capacity */}
                      <td className="px-4 py-3 text-center font-bold text-slate-700">
                        {room.capacity}
                      </td>

                      {/* Occupied */}
                      <td className="px-4 py-3 text-center font-bold text-rose-600">
                        {room.occupied_beds}
                      </td>

                      {/* Available */}
                      <td className="px-4 py-3 text-center font-bold text-emerald-600">
                        {room.available_beds}
                      </td>

                      {/* Base Rent */}
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        ₹{Number(room.base_rent).toLocaleString()}
                        <span className="text-[10px] text-slate-400 font-normal">/mo</span>
                      </td>

                      {/* Occupancy Rate Bar */}
                      <td className="px-4 py-3 min-w-[120px]">
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="text-slate-500 font-medium">
                            {room.occupied_beds}/{room.capacity} Beds
                          </span>
                          <span className="font-bold text-slate-700">{occPercent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              calcStatus === 'FULL'
                                ? 'bg-rose-500'
                                : calcStatus === 'PARTIAL'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(occPercent, 100)}%` }}
                          />
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            calcStatus === 'AVAILABLE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : calcStatus === 'PARTIAL'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : calcStatus === 'FULL'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : calcStatus === 'MAINTENANCE'
                              ? 'bg-slate-100 text-slate-700 border border-slate-300'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {calcStatus}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenDetails(room)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Residents & Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {canManage && (
                            <button
                              onClick={() => handleOpenEditModal(room)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit Room"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => handleOpenDeleteModal(room)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Room"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. ROOM DETAILS & RESIDENTS MODAL */}
      {/* ========================================================================= */}
      {detailsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-600 text-white">
                  <BedDouble className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Room {selectedRoom?.room_number} — {selectedRoom?.hostel_name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Floor {selectedRoom?.floor} • {selectedRoom?.room_type} Sharing
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
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {loadingDetails ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                  <p className="text-xs font-medium">Loading room details & resident allocations...</p>
                </div>
              ) : roomDetails ? (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-[10px] text-slate-400 font-medium">Bed Capacity</p>
                      <p className="text-base font-bold text-slate-800 mt-0.5">{roomDetails.capacity}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-[10px] text-slate-400 font-medium">Occupied Beds</p>
                      <p className="text-base font-bold text-rose-600 mt-0.5">{roomDetails.occupied_beds}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-[10px] text-slate-400 font-medium">Available Beds</p>
                      <p className="text-base font-bold text-emerald-600 mt-0.5">{roomDetails.available_beds}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-[10px] text-slate-400 font-medium">Monthly Rent</p>
                      <p className="text-base font-bold text-indigo-600 mt-0.5">
                        ₹{Number(roomDetails.base_rent).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Amenities List */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Room Amenities
                    </h4>
                    {Array.isArray(roomDetails.amenities) && roomDetails.amenities.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {roomDetails.amenities.map((item, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-medium flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">No specific amenities configured.</p>
                    )}
                  </div>

                  {/* Allocated Residents List */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Active Resident Allocations ({roomDetails.residents?.length || 0})
                    </h4>

                    {(!roomDetails.residents || roomDetails.residents.length === 0) ? (
                      <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                        This room currently has no active student residents allocated.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <tr>
                              <th className="px-3.5 py-2">Roll No</th>
                              <th className="px-3.5 py-2">Student Name</th>
                              <th className="px-3.5 py-2">Department</th>
                              <th className="px-3.5 py-2">Academic Year</th>
                              <th className="px-3.5 py-2">Allocated Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {roomDetails.residents.map((res) => (
                              <tr key={res.allocation_id} className="hover:bg-slate-50/60">
                                <td className="px-3.5 py-2 font-mono font-bold text-slate-800">
                                  {res.roll_number}
                                </td>
                                <td className="px-3.5 py-2 font-semibold text-slate-800">
                                  {res.student_name}
                                </td>
                                <td className="px-3.5 py-2 text-slate-600">
                                  {res.department} (Yr {res.year_of_study})
                                </td>
                                <td className="px-3.5 py-2 font-mono text-slate-600">
                                  {res.academic_year}
                                </td>
                                <td className="px-3.5 py-2 text-slate-500">
                                  {new Date(res.allocated_from).toLocaleDateString()}
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
                  Could not load room details.
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
      {/* 2. ADD / EDIT ROOM MODAL */}
      {/* ========================================================================= */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <BedDouble className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-800">
                  {isEditing ? `Edit Room ${formData.roomNumber}` : 'Add New Room'}
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

              {/* Hostel Block Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hostel Block <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.hostelId}
                  onChange={(e) => setFormData({ ...formData, hostelId: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 bg-white"
                >
                  <option value="" disabled>Select Hostel Block</option>
                  {hostelsList.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.code}) — {h.total_floors} Floors
                    </option>
                  ))}
                </select>
              </div>

              {/* Room Number & Floor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Room Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 101, 204, G-01"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Floor Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    required
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Room Type & Bed Capacity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Room Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.roomType}
                    onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 bg-white"
                  >
                    <option value="SINGLE">Single Bed</option>
                    <option value="DOUBLE">Double Sharing</option>
                    <option value="TRIPLE">Triple Sharing</option>
                    <option value="FOUR_BED">4-Bed Sharing</option>
                    <option value="DORM">Dormitory</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bed Capacity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={isEditing ? formData.occupiedBeds || 1 : 1}
                    max="20"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500"
                  />
                  {isEditing && formData.occupiedBeds > 0 && (
                    <p className="text-[10px] text-amber-600 mt-1 font-medium">
                      Min capacity is {formData.occupiedBeds} (currently active residents).
                    </p>
                  )}
                </div>
              </div>

              {/* Base Rent & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly Base Rent (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formData.baseRent}
                    onChange={(e) => setFormData({ ...formData, baseRent: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Configured Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 bg-white"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="MAINTENANCE">Under Maintenance</option>
                    <option value="RESERVED">Reserved</option>
                  </select>
                </div>
              </div>

              {/* Amenities Checkboxes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Room Amenities
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {COMMON_AMENITIES.map((amenity) => {
                    const isChecked = (formData.amenities || []).includes(amenity);
                    return (
                      <label
                        key={amenity}
                        className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleAmenity(amenity)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{amenity}</span>
                      </label>
                    );
                  })}
                </div>
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
                  <span>{isEditing ? 'Save Changes' : 'Create Room'}</span>
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
              Delete Room?
            </h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              Are you sure you want to delete Room <strong className="text-slate-800 font-mono">"{roomToDelete?.room_number}"</strong> from <strong className="text-slate-800">{roomToDelete?.hostel_name}</strong>?
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
