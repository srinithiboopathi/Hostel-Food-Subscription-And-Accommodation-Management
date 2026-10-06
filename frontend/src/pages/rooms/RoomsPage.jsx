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
import AccommodationNav from '../../components/accommodation/AccommodationNav';
import AccommodationStats from '../../components/accommodation/AccommodationStats';
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
  Sparkles,
  Info,
  Calendar,
  Phone,
  Mail,
  GraduationCap,
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
  const [statusFilter, setStatusFilter] = useState('');
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
      console.error('Error fetching hostels', e);
    }
  };

  // Load Rooms list
  const fetchRoomsList = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getRooms({
        search: search.trim(),
        hostelId: hostelFilter,
        floor: floorFilter,
        roomType: typeFilter,
        status: statusFilter,
        occupancy: occupancyFilter,
      });
      setRooms(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch rooms from MySQL database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostelsDropdown();
  }, []);

  useEffect(() => {
    fetchRoomsList();
  }, [hostelFilter, floorFilter, typeFilter, statusFilter, occupancyFilter]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRoomsList();
  };

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

  // Open Details Modal
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

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormData({
      ...initialFormState,
      hostelId: hostelsList.length > 0 ? hostelsList[0].id : '',
    });
    setIsEditing(false);
    setFormError(null);
    setFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (room) => {
    setFormData({
      id: room.id,
      hostelId: room.hostel_id,
      roomNumber: room.room_number,
      floor: room.floor,
      roomType: room.room_type,
      capacity: room.capacity,
      baseRent: room.base_rent,
      amenities: Array.isArray(room.amenities) ? room.amenities : [],
      status: room.configured_status || 'AVAILABLE',
      occupiedBeds: room.occupied_beds || 0,
    });
    setIsEditing(true);
    setFormError(null);
    setFormModalOpen(true);
  };

  // Toggle Amenity Checkbox
  const toggleAmenity = (amenity) => {
    setFormData((prev) => {
      const exists = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((a) => a !== amenity)
          : [...prev.amenities, amenity],
      };
    });
  };

  // Submit Add / Edit Form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      if (isEditing) {
        if (Number(formData.capacity) < Number(formData.occupiedBeds)) {
          throw new Error(
            `Capacity cannot be reduced below current active occupants (${formData.occupiedBeds}). Transfer residents first.`
          );
        }

        await updateRoom(formData.id, {
          hostelId: Number(formData.hostelId),
          roomNumber: formData.roomNumber,
          floor: Number(formData.floor),
          roomType: formData.roomType,
          capacity: Number(formData.capacity),
          baseRent: parseFloat(formData.baseRent),
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
          baseRent: parseFloat(formData.baseRent),
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
      {/* Sub-navigation tabs */}
      <AccommodationNav />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <BedDouble className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Rooms & Bed Inventory
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Manage room capacities, bed vacancies, maintenance locks, base rental fees, and resident rosters.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchRoomsList}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-1.5 transition-all shadow-xs"
            title="Refresh room roster"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            <span>Refresh</span>
          </button>

          {canManage && (
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Room</span>
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

      {/* Search and Multi-Filters Bar */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-md space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Search Input */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search room number, hostel name..."
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

          {/* Floor Filter */}
          <div>
            <select
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="">All Floors</option>
              <option value="0">Ground Floor (0)</option>
              <option value="1">1st Floor</option>
              <option value="2">2nd Floor</option>
              <option value="3">3rd Floor</option>
              <option value="4">4th Floor</option>
            </select>
          </div>

          {/* Room Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="">All Room Types</option>
              <option value="SINGLE">Single Room</option>
              <option value="DOUBLE">Double Sharing</option>
              <option value="TRIPLE">Triple Sharing</option>
              <option value="FOUR_BED">4-Bed Suite</option>
              <option value="DORM">Dormitory</option>
            </select>
          </div>

          {/* Status & Availability Filter */}
          <div>
            <select
              value={occupancyFilter}
              onChange={(e) => setOccupancyFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="">All Availability</option>
              <option value="AVAILABLE">Available (Vacant)</option>
              <option value="PARTIAL">Partially Occupied</option>
              <option value="FULL">Full (No Vacancy)</option>
              <option value="MAINTENANCE">Under Maintenance</option>
            </select>
          </div>
        </div>

        {(search || hostelFilter || floorFilter || typeFilter || statusFilter || occupancyFilter) && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setSearch('');
                setHostelFilter('');
                setFloorFilter('');
                setTypeFilter('');
                setStatusFilter('');
                setOccupancyFilter('');
              }}
              className="px-3 py-1 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors font-medium border border-rose-500/20"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Rooms Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md shadow-xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
            <p className="text-xs text-slate-400 font-medium">Fetching rooms from database...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="py-16 text-center p-8">
            <BedDouble className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-300">No Rooms Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No rooms match your filter criteria or no rooms have been added to this hostel yet.
            </p>
            {canManage && (
              <button
                onClick={handleOpenAddModal}
                className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Room</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="px-5 py-3.5">Room No.</th>
                  <th className="px-5 py-3.5">Hostel Block</th>
                  <th className="px-5 py-3.5">Floor & Type</th>
                  <th className="px-5 py-3.5">Bed Occupancy</th>
                  <th className="px-5 py-3.5">Monthly Rent</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {rooms.map((room) => {
                  const isMaintenance = room.configured_status === 'MAINTENANCE';
                  const isFull = (room.occupied_beds || 0) >= room.capacity;
                  const occPercentage = Number(room.occupancy_percentage) || 0;

                  return (
                    <tr key={room.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Room Number */}
                      <td className="px-5 py-4 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono text-xs">
                            Room {room.room_number}
                          </span>
                        </div>
                      </td>

                      {/* Hostel */}
                      <td className="px-5 py-4 font-medium text-slate-200">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{room.hostel_name}</span>
                          <span className="text-[10px] text-slate-500 uppercase font-mono">({room.hostel_code})</span>
                        </div>
                      </td>

                      {/* Floor & Type */}
                      <td className="px-5 py-4 text-slate-400">
                        <div className="space-y-0.5">
                          <span className="text-slate-200 font-medium">Floor {room.floor}</span>
                          <span className="block text-[11px] text-slate-500">{room.room_type}</span>
                        </div>
                      </td>

                      {/* Capacity & Occupancy Bar */}
                      <td className="px-5 py-4">
                        <div className="space-y-1.5 w-36">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-200">
                              {room.occupied_beds || 0} / {room.capacity} Beds
                            </span>
                            <span className="text-slate-400">{occPercentage}%</span>
                          </div>
                          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isMaintenance
                                  ? 'bg-amber-500'
                                  : isFull
                                  ? 'bg-rose-500'
                                  : room.occupied_beds > 0
                                  ? 'bg-blue-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, occPercentage))}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-emerald-400 font-semibold block">
                            {room.available_beds} Vacant
                          </span>
                        </div>
                      </td>

                      {/* Rent */}
                      <td className="px-5 py-4 font-semibold text-slate-200">
                        ₹{Number(room.base_rent).toLocaleString('en-IN')}
                        <span className="text-[10px] text-slate-500 block font-normal">/ month</span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                            isMaintenance
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : isFull
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : room.occupied_beds > 0
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}
                        >
                          {isMaintenance ? 'MAINTENANCE' : isFull ? 'FULL' : room.occupied_beds > 0 ? 'PARTIAL' : 'AVAILABLE'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetails(room)}
                            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                            title="View Room & Resident Roster"
                          >
                            <Eye className="w-4 h-4 text-indigo-400" />
                          </button>

                          {canManage && (
                            <button
                              onClick={() => handleOpenEditModal(room)}
                              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                              title="Edit Room"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => handleOpenDeleteModal(room)}
                              className="p-2 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10 transition-colors"
                              title="Delete Room"
                            >
                              <Trash2 className="w-4 h-4" />
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
        )}
      </div>

      {/* ========================================================================= */}
      {/* 360° ROOM DETAILS & RESIDENT ROSTER MODAL                                 */}
      {/* ========================================================================= */}
      {detailsModalOpen && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-white space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <BedDouble className="w-6 h-6" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">Room {selectedRoom.room_number}</h2>
                    <span className="px-2 py-0.5 text-xs font-bold rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {selectedRoom.hostel_name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Floor: <span className="text-slate-200 font-semibold">{selectedRoom.floor}</span> | Type: <span className="text-slate-200 font-semibold">{selectedRoom.room_type}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetails ? (
              <div className="py-16 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
                <p className="text-xs text-slate-400">Loading room details & resident allocations...</p>
              </div>
            ) : roomDetails ? (
              <div className="space-y-5">
                {/* Stats cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <p className="text-[11px] font-semibold text-slate-400">Total Capacity</p>
                    <p className="text-lg font-bold text-white mt-1">{roomDetails.capacity} Beds</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <p className="text-[11px] font-semibold text-slate-400">Occupied Beds</p>
                    <p className="text-lg font-bold text-rose-400 mt-1">{roomDetails.occupied_beds || 0}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <p className="text-[11px] font-semibold text-slate-400">Available Beds</p>
                    <p className="text-lg font-bold text-emerald-400 mt-1">{roomDetails.available_beds}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <p className="text-[11px] font-semibold text-slate-400">Base Rent</p>
                    <p className="text-lg font-bold text-indigo-400 mt-1">₹{Number(roomDetails.base_rent).toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {/* Amenities */}
                {roomDetails.amenities && roomDetails.amenities.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Room Amenities</h4>
                    <div className="flex flex-wrap gap-2">
                      {roomDetails.amenities.map((amenity, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-400" />
                          <span>{amenity}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Residents Table */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Assigned Resident Students ({roomDetails.residents?.length || 0})</span>
                  </h4>

                  {(!roomDetails.residents || roomDetails.residents.length === 0) ? (
                    <div className="p-6 text-center bg-slate-950/40 rounded-2xl border border-slate-800">
                      <p className="text-xs text-slate-500">No active students currently allocated to this room.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {roomDetails.residents.map((resident) => (
                        <div
                          key={resident.allocation_id}
                          className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
                              {resident.student_name ? resident.student_name.charAt(0) : 'S'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">{resident.student_name}</span>
                                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300">
                                  {resident.roll_number}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {resident.department} • Year {resident.year_of_study}
                              </p>
                            </div>
                          </div>

                          <div className="text-right text-[11px] text-slate-400 space-y-0.5">
                            {resident.student_phone && (
                              <div className="flex items-center gap-1 sm:justify-end">
                                <Phone className="w-3 h-3 text-slate-500" />
                                <span>{resident.student_phone}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 sm:justify-end text-emerald-400 font-medium">
                              <Calendar className="w-3 h-3" />
                              <span>Allocated: {new Date(resident.allocated_from).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-rose-400">Failed to load room details.</p>
            )}

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
      {/* ADD / EDIT ROOM MODAL                                                     */}
      {/* ========================================================================= */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-white space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                  <BedDouble className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-bold">
                  {isEditing ? `Edit Room ${formData.roomNumber}` : 'Add New Room'}
                </h3>
              </div>
              <button
                onClick={() => setFormModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Hostel Block *</label>
                  <select
                    required
                    value={formData.hostelId}
                    onChange={(e) => setFormData({ ...formData, hostelId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="">Select Hostel Block</option>
                    {hostelsList.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Room Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 101, A-202"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Floor Level</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    required
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Room Type</label>
                  <select
                    value={formData.roomType}
                    onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="SINGLE">Single Room</option>
                    <option value="DOUBLE">Double Sharing</option>
                    <option value="TRIPLE">Triple Sharing</option>
                    <option value="FOUR_BED">4-Bed Suite</option>
                    <option value="DORM">Dormitory</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Bed Capacity *</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Monthly Base Rent (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={formData.baseRent}
                    onChange={(e) => setFormData({ ...formData, baseRent: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Room Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="AVAILABLE">Available / Active</option>
                    <option value="MAINTENANCE">Under Maintenance</option>
                    <option value="RESERVED">Reserved / Locked</option>
                  </select>
                </div>
              </div>

              {/* Amenities Checkboxes */}
              <div>
                <label className="block text-slate-400 font-semibold mb-2">Amenities Included</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {COMMON_AMENITIES.map((amenity) => {
                    const checked = formData.amenities.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleAmenity(amenity)}
                        className={`p-2 text-left rounded-xl border text-[11px] transition-all flex items-center gap-1.5 ${
                          checked
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-semibold'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                            checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-700'
                          }`}
                        >
                          {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <span className="truncate">{amenity}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30"
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
      {/* DELETE ROOM MODAL                                                         */}
      {/* ========================================================================= */}
      {deleteModalOpen && roomToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 text-white space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <span className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <ShieldAlert className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-white">Delete Room</h3>
                <p className="text-xs text-slate-400">Permanent MySQL Operation</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-white font-mono">Room {roomToDelete.room_number} ({roomToDelete.hostel_name})</span>?
              Rooms with active student residents cannot be deleted.
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-rose-600/30"
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
