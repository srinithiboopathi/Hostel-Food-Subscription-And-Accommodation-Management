import React, { useState, useEffect, useCallback } from 'react';
import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deactivateStudent,
} from '../../services/studentService';
import {
  Search,
  Plus,
  Filter,
  Eye,
  Edit2,
  UserX,
  GraduationCap,
  Building2,
  BedDouble,
  Phone,
  Mail,
  Home,
  Shield,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserCheck,
} from 'lucide-react';

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filters & Search
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [status, setStatus] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);

  // Selected Student & Form State
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Form Fields
  const initialFormData = {
    name: '',
    email: '',
    phone: '',
    rollNumber: '',
    department: 'Computer Science & Engineering',
    course: 'B.Tech CSE',
    yearOfStudy: 1,
    gender: 'MALE',
    dob: '2005-06-15',
    bloodGroup: 'B+',
    guardianName: '',
    guardianPhone: '',
    guardianRelation: 'Father',
    permanentAddress: '',
    status: 'ACTIVE',
  };
  const [formData, setFormData] = useState(initialFormData);

  // Auto-hide success toast after 4 seconds
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // Load students from MySQL API
  const fetchStudents = useCallback(async (page = 1) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await getStudents({
        page,
        limit: pagination.limit,
        search,
        department,
        year,
        status,
      });
      if (res.success) {
        setStudents(res.data || []);
        setPagination(res.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [search, department, year, status, pagination.limit]);

  // Debounced search / filter trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchStudents]);

  // Open Add Student Modal
  const handleOpenAdd = () => {
    setFormData(initialFormData);
    setErrorMessage('');
    setIsAddModalOpen(true);
  };

  // Open Edit Student Modal
  const handleOpenEdit = async (student) => {
    try {
      setSelectedStudent(student);
      const res = await getStudentById(student.id);
      const data = res.data;
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        rollNumber: data.roll_number || '',
        department: data.department || 'Computer Science & Engineering',
        course: data.course || 'B.Tech',
        yearOfStudy: data.year_of_study || 1,
        gender: data.gender || 'MALE',
        dob: data.dob ? data.dob.split('T')[0] : '',
        bloodGroup: data.blood_group || '',
        guardianName: data.guardian_name || '',
        guardianPhone: data.guardian_phone || '',
        guardianRelation: data.guardian_relation || 'Parent',
        permanentAddress: data.permanent_address || '',
        status: data.status || 'ACTIVE',
      });
      setErrorMessage('');
      setIsEditModalOpen(true);
    } catch (err) {
      setErrorMessage('Failed to load student for editing: ' + err.message);
    }
  };

  // Open View Details Modal
  const handleOpenView = async (student) => {
    setSelectedStudent(null);
    setIsViewModalOpen(true);
    setViewLoading(true);
    try {
      const res = await getStudentById(student.id);
      setSelectedStudent(res.data);
    } catch (err) {
      setErrorMessage('Failed to load student details: ' + err.message);
    } finally {
      setViewLoading(false);
    }
  };

  // Open Deactivate Confirmation Modal
  const handleOpenDeactivate = (student) => {
    setSelectedStudent(student);
    setIsDeactivateModalOpen(true);
  };

  // Form input changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Submit Add Student Form
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setErrorMessage('');

    try {
      const res = await createStudent(formData);
      if (res.success) {
        setIsAddModalOpen(false);
        setSuccessToast(`Student "${formData.name}" (Roll: ${formData.rollNumber}) added successfully!`);
        fetchStudents(1);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create student');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Edit Student Form
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setFormSubmitting(true);
    setErrorMessage('');

    try {
      const res = await updateStudent(selectedStudent.id, formData);
      if (res.success) {
        setIsEditModalOpen(false);
        setSuccessToast(`Student "${formData.name}" updated successfully!`);
        fetchStudents(pagination.page);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update student');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Confirm Deactivation
  const handleConfirmDeactivate = async () => {
    if (!selectedStudent) return;
    setFormSubmitting(true);
    try {
      const res = await deactivateStudent(selectedStudent.id, 'VACATED');
      if (res.success) {
        setIsDeactivateModalOpen(false);
        setSuccessToast(`Student ${selectedStudent.name} has been deactivated.`);
        fetchStudents(pagination.page);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to deactivate student');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl border border-emerald-500 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{successToast}</p>
          <button onClick={() => setSuccessToast('')} className="text-white/80 hover:text-white ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 bg-white p-6 rounded-2xl shadow-sm border">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <GraduationCap className="w-7 h-7 text-indigo-600" />
            <span>Student Management</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage student registrations, academic branches, hostel rooms, and resident records.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all duration-150 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Student</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-3 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full lg:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, roll number, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Department Filter */}
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Departments</option>
            <option value="Computer Science & Engineering">Computer Science</option>
            <option value="Electronics & Communication">Electronics & Comm</option>
            <option value="Biotechnology">Biotechnology</option>
            <option value="Mechanical Engineering">Mechanical Eng</option>
            <option value="Information Technology">Information Tech</option>
          </select>

          {/* Year Filter */}
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Years</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="VACATED">Vacated</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          {(search || department || year || status) && (
            <button
              onClick={() => {
                setSearch('');
                setDepartment('');
                setYear('');
                setStatus('');
              }}
              className="text-xs text-indigo-600 font-semibold hover:underline px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Students Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-sm">Loading student records from MySQL...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No student records found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Try adjusting your search criteria or add a new student using the button above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Roll No</th>
                  <th className="py-3.5 px-4">Student Name</th>
                  <th className="py-3.5 px-4">Department & Course</th>
                  <th className="py-3.5 px-4">Year</th>
                  <th className="py-3.5 px-4">Accommodation</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {students.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-indigo-600">
                      {st.roll_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-semibold text-slate-800">{st.name}</p>
                        <p className="text-xs text-slate-400">{st.email}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-slate-700 font-medium">{st.department}</p>
                      <p className="text-xs text-slate-400">{st.course}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-xs font-semibold text-slate-700">
                        Year {st.year_of_study}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {st.room_number ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                          <BedDouble className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{st.hostel_name?.split(' ')[0]} - Rm {st.room_number}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Not Allocated</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {st.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          {st.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleOpenView(st)}
                          title="View Profile"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(st)}
                          title="Edit Student"
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDeactivate(st)}
                          title="Deactivate Student"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <p>
            Showing <span className="font-semibold">{students.length}</span> of{' '}
            <span className="font-semibold">{pagination.total}</span> registered students
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchStudents(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => fetchStudents(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ADD / EDIT STUDENT MODAL */}
      {/* ========================================================================= */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {isAddModalOpen ? 'Add New Student' : 'Edit Student Profile'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isAddModalOpen
                    ? 'Enter student and guardian credentials to create a new record in MySQL.'
                    : `Updating records for Roll No: ${formData.rollNumber}`}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={isAddModalOpen ? handleAddSubmit : handleEditSubmit} className="space-y-5">
              {/* Academic & Identity */}
              <div>
                <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-3">
                  1. Academic & Identity
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleFormChange}
                      placeholder="e.g. Sriram D"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Roll Number *</label>
                    <input
                      type="text"
                      name="rollNumber"
                      required
                      value={formData.rollNumber}
                      onChange={handleFormChange}
                      placeholder="e.g. CS2025088"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">College Email *</label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleFormChange}
                      placeholder="sriram.d@student.edu"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleFormChange}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                      <option value="Electronics & Communication">Electronics & Communication</option>
                      <option value="Biotechnology">Biotechnology</option>
                      <option value="Mechanical Engineering">Mechanical Engineering</option>
                      <option value="Information Technology">Information Technology</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Course</label>
                      <input
                        type="text"
                        name="course"
                        value={formData.course}
                        onChange={handleFormChange}
                        placeholder="B.Tech CSE"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Year</label>
                      <select
                        name="yearOfStudy"
                        value={formData.yearOfStudy}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                      >
                        <option value={1}>1st Year</option>
                        <option value={2}>2nd Year</option>
                        <option value={3}>3rd Year</option>
                        <option value={4}>4th Year</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Guardian & Contact */}
              <div className="pt-3 border-t border-slate-200">
                <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-3">
                  2. Guardian & Residential Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Guardian Name *</label>
                    <input
                      type="text"
                      name="guardianName"
                      required
                      value={formData.guardianName}
                      onChange={handleFormChange}
                      placeholder="e.g. D. Ramamoorthy"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Guardian Phone *</label>
                    <input
                      type="tel"
                      name="guardianPhone"
                      required
                      value={formData.guardianPhone}
                      onChange={handleFormChange}
                      placeholder="+91 98765 11223"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship</label>
                    <input
                      type="text"
                      name="guardianRelation"
                      value={formData.guardianRelation}
                      onChange={handleFormChange}
                      placeholder="Father / Mother"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Permanent Residential Address *</label>
                  <textarea
                    name="permanentAddress"
                    required
                    rows={2}
                    value={formData.permanentAddress}
                    onChange={handleFormChange}
                    placeholder="Door No, Street, City, State, PIN"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  {formSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </span>
                  ) : isAddModalOpen ? (
                    'Save Student to Database'
                  ) : (
                    'Update Student Profile'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW STUDENT DETAILS MODAL */}
      {/* ========================================================================= */}
      {isViewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                  {selectedStudent?.name?.charAt(0) || 'S'}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{selectedStudent?.name}</h2>
                  <p className="text-xs text-indigo-600 font-mono font-semibold">
                    Roll No: {selectedStudent?.roll_number}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {viewLoading ? (
              <div className="py-12 text-center text-slate-500">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
                <p className="text-sm">Fetching complete student profile...</p>
              </div>
            ) : selectedStudent ? (
              <div className="space-y-6 text-sm">
                {/* Academic & Room Allocation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase">Academic Details</p>
                    <p><strong className="text-slate-700">Department:</strong> {selectedStudent.department}</p>
                    <p><strong className="text-slate-700">Course:</strong> {selectedStudent.course}</p>
                    <p><strong className="text-slate-700">Year of Study:</strong> Year {selectedStudent.year_of_study}</p>
                    <p><strong className="text-slate-700">Admission Date:</strong> {selectedStudent.admission_date?.split('T')[0]}</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase">Accommodation Status</p>
                    {selectedStudent.room_number ? (
                      <>
                        <p><strong className="text-slate-700">Hostel:</strong> {selectedStudent.hostel_name}</p>
                        <p><strong className="text-slate-700">Room:</strong> Room {selectedStudent.room_number} ({selectedStudent.room_type})</p>
                        <p><strong className="text-slate-700">Floor:</strong> Floor {selectedStudent.floor}</p>
                        <p><strong className="text-slate-700">Deposit:</strong> ₹{selectedStudent.security_deposit || 0}</p>
                      </>
                    ) : (
                      <p className="text-slate-400 italic mt-2">No active room allocation assigned yet.</p>
                    )}
                  </div>
                </div>

                {/* Guardian & Contact Details */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase">Guardian & Residential Contact</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <p><strong className="text-slate-700">Guardian:</strong> {selectedStudent.guardian_name} ({selectedStudent.guardian_relation})</p>
                    <p><strong className="text-slate-700">Guardian Phone:</strong> {selectedStudent.guardian_phone}</p>
                    <p><strong className="text-slate-700">Student Email:</strong> {selectedStudent.email}</p>
                    <p><strong className="text-slate-700">Student Phone:</strong> {selectedStudent.phone || 'N/A'}</p>
                  </div>
                  <p className="pt-2 text-xs text-slate-600 border-t border-slate-200 mt-2">
                    <strong>Permanent Address:</strong> {selectedStudent.permanent_address}
                  </p>
                </div>

                {/* Recent Invoices & Grievances */}
                {selectedStudent.feesSummary?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Recent Fee Invoices</p>
                    <div className="space-y-1.5">
                      {selectedStudent.feesSummary.map((f) => (
                        <div key={f.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-slate-800">{f.term_name}</span>
                            <span className="text-slate-400 ml-2 font-mono">({f.bill_number})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700">₹{f.amount_due}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${f.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {f.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div className="mt-6 pt-4 border-t border-slate-200 text-right">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DEACTIVATE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {isDeactivateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 p-6">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
              <UserX className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Deactivate Student?</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Are you sure you want to deactivate <strong className="text-slate-800">{selectedStudent?.name}</strong> (Roll: {selectedStudent?.roll_number})? This will mark the resident status as <span className="font-semibold text-rose-600">VACATED</span> and close active room allocations.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsDeactivateModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeactivate}
                disabled={formSubmitting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {formSubmitting ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
