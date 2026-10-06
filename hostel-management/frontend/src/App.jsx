import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/auth/LoginPage';
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardPage from './pages/dashboard/DashboardPage';
import StudentsPage from './pages/students/StudentsPage';
import HostelsPage from './pages/hostels/HostelsPage';
import RoomsPage from './pages/rooms/RoomsPage';
import AllocationsPage from './pages/allocations/AllocationsPage';
import MenuPage from './pages/menu/MenuPage';
import MealAttendancePage from './pages/meals/MealAttendancePage';
import StudentMealHistoryPage from './pages/meals/StudentMealHistoryPage';
import FeesPage from './pages/fees/FeesPage';
import MyFeesPage from './pages/student/MyFeesPage';
import ComplaintsPage from './pages/complaints/ComplaintsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes accessible by all authorized roles */}
          <Route
            element={
              <DashboardLayout
                allowedRoles={['ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT']}
              />
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/hostels" element={<HostelsPage />} />
            <Route path="/rooms" element={<RoomsPage />} />
            <Route path="/allocations" element={<AllocationsPage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/complaints" element={<ComplaintsPage />} />
          </Route>

          {/* Student-Only / Student Access: Personal Meal History & Personal Fees */}
          <Route
            element={
              <DashboardLayout
                allowedRoles={['STUDENT', 'ADMIN', 'MESS_MANAGER', 'ACCOUNTANT']}
              />
            }
          >
            <Route path="/my-meals" element={<StudentMealHistoryPage />} />
            <Route path="/my-fees" element={<MyFeesPage />} />
          </Route>

          {/* Staff-Only Protected Routes: Student Management, Meal Attendance & Fees Hub */}
          <Route
            element={
              <DashboardLayout
                allowedRoles={['ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT']}
              />
            }
          >
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/meals" element={<MealAttendancePage />} />
            <Route path="/fees" element={<FeesPage />} />
          </Route>

          {/* Catch-all Fallback Route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
