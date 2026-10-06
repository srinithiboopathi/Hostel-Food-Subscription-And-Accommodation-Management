import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  GraduationCap,
  Building2,
  Mail,
  Lock,
  User,
  Phone,
  BookOpen,
  Calendar,
  Home,
  Shield,
  ArrowRight,
} from 'lucide-react';

export default function RegisterStudentPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: 'Password@123',
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
  });

  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { registerStudent } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage('');

    const res = await registerStudent(formData);
    setSubmitting(false);

    if (res.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setErrorMessage(res.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 mb-3">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white">Student Hostel Registration</h2>
          <p className="text-sm text-slate-400 mt-1">
            Fill in your academic and guardian details to enroll in the Hostel Accommodation system.
          </p>
        </div>

        <div className="glass-card p-6 sm:p-8">
          {errorMessage && (
            <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Academic & Account */}
            <div>
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <User className="w-4 h-4" /> 1. Academic & User Account Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="e.g. Siddharth Verma"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Roll Number (Unique) *</label>
                  <input
                    type="text"
                    name="rollNumber"
                    required
                    value={formData.rollNumber}
                    onChange={handleChange}
                    placeholder="e.g. CS2025099"
                    className="input-field font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">College Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="siddharth@student.edu"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 00000"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                    <option value="Electronics & Communication">Electronics & Communication</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Biotechnology">Biotechnology</option>
                    <option value="Information Technology">Information Technology</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Course & Year</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      name="course"
                      value={formData.course}
                      onChange={handleChange}
                      placeholder="B.Tech CSE"
                      className="input-field"
                    />
                    <select
                      name="yearOfStudy"
                      value={formData.yearOfStudy}
                      onChange={handleChange}
                      className="input-field"
                    >
                      <option value={1}>1st Year</option>
                      <option value={2}>2nd Year</option>
                      <option value={3}>3rd Year</option>
                      <option value={4}>4th Year</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Blood Group</label>
                  <input
                    type="text"
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleChange}
                    placeholder="e.g. O+, A+, B+"
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Guardian Details */}
            <div className="pt-4 border-t border-slate-800">
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4" /> 2. Guardian & Emergency Contact
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Guardian Name *</label>
                  <input
                    type="text"
                    name="guardianName"
                    required
                    value={formData.guardianName}
                    onChange={handleChange}
                    placeholder="e.g. Mr. R.K. Verma"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Guardian Phone *</label>
                  <input
                    type="tel"
                    name="guardianPhone"
                    required
                    value={formData.guardianPhone}
                    onChange={handleChange}
                    placeholder="+91 98111 22233"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Relationship</label>
                  <input
                    type="text"
                    name="guardianRelation"
                    value={formData.guardianRelation}
                    onChange={handleChange}
                    placeholder="Father / Mother"
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Address & Password */}
            <div className="pt-4 border-t border-slate-800">
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Home className="w-4 h-4" /> 3. Residential Address & Security
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Permanent Residential Address *</label>
                  <textarea
                    name="permanentAddress"
                    required
                    rows={2}
                    value={formData.permanentAddress}
                    onChange={handleChange}
                    placeholder="Street, Landmark, City, State, PIN code"
                    className="input-field resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Account Password *</label>
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full py-3 text-base"
              >
                {submitting ? 'Registering...' : 'Complete Registration & Access Student Portal'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Already registered?{' '}
            <Link to="/login" className="text-indigo-400 font-semibold hover:underline">
              Sign In to Your Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
