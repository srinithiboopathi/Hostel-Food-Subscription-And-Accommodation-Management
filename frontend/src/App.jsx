import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/auth/LoginPage';
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardPage from './pages/dashboard/DashboardPage';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import WardenDashboard from './pages/dashboard/WardenDashboard';
import MessDashboard from './pages/dashboard/MessDashboard';
import AccountantDashboard from './pages/dashboard/AccountantDashboard';
import StudentDashboard from './pages/dashboard/StudentDashboard';
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
import LeavesPage from './pages/leaves/LeavesPage';
import LeaveManagementPage from './pages/leaves/LeaveManagementPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import FoodManagementPage from './pages/food/FoodManagementPage';
import FoodSubscriptionsPage from './pages/food/FoodSubscriptionsPage';
import ReportsPage from './pages/reports/ReportsPage';
import ProfilePage from './pages/profile/ProfilePage';
import StaffPage from './pages/staff/StaffPage';
import VisitorsPage from './pages/visitors/VisitorsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Core Master Dashboard Route (Dynamic Role Resolution) */}
          <Route
            element={
              <DashboardLayout
                allowedRoles={['ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT']}
              />
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/food" element={<FoodManagementPage />} />
            <Route path="/food/subscriptions" element={<FoodSubscriptionsPage />} />
          </Route>

          {/* Explicit Role-Specific Dashboard Routes */}
          <Route element={<DashboardLayout allowedRoles={['ADMIN']} />}>
            <Route path="/dashboard/admin" element={<AdminDashboard />} />
          </Route>

          <Route element={<DashboardLayout allowedRoles={['ADMIN', 'WARDEN']} />}>
            <Route path="/dashboard/warden" element={<WardenDashboard />} />
          </Route>

          <Route element={<DashboardLayout allowedRoles={['ADMIN', 'MESS_MANAGER']} />}>
            <Route path="/dashboard/mess" element={<MessDashboard />} />
          </Route>

          <Route element={<DashboardLayout allowedRoles={['ADMIN', 'ACCOUNTANT']} />}>
            <Route path="/dashboard/accountant" element={<AccountantDashboard />} />
          </Route>

          <Route element={<DashboardLayout allowedRoles={['STUDENT']} />}>
            <Route path="/dashboard/student" element={<StudentDashboard />} />
          </Route>

          {/* Module Routes */}
          <Route
            element={
              <DashboardLayout
                allowedRoles={['ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT', 'STUDENT']}
              />
            }
          >
            <Route path="/accommodation" element={<Navigate to="/hostels" replace />} />
            <Route path="/hostels" element={<HostelsPage />} />
            <Route path="/rooms" element={<RoomsPage />} />
            <Route path="/allocations" element={<AllocationsPage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/complaints" element={<ComplaintsPage />} />
            <Route path="/visitors" element={<VisitorsPage />} />
          </Route>

          {/* Student Access: Personal Leaves, Meal History & Personal Fees */}
          <Route
            element={
              <DashboardLayout
                allowedRoles={['STUDENT', 'ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT']}
              />
            }
          >
            <Route path="/leaves" element={<LeavesPage />} />
            <Route path="/my-meals" element={<StudentMealHistoryPage />} />
            <Route path="/my-fees" element={<MyFeesPage />} />
          </Route>

          {/* Staff-Only Protected Routes: Student Management, Staff Directory, Leave Management, Meal Attendance & Fees Hub */}
          <Route
            element={
              <DashboardLayout
                allowedRoles={['ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT']}
              />
            }
          >
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/staff" element={<StaffPage />} />
            <Route path="/meals" element={<MealAttendancePage />} />
            <Route path="/fees" element={<FeesPage />} />
            <Route path="/payments" element={<FeesPage />} />
            <Route path="/leave-management" element={<LeaveManagementPage />} />
          </Route>

          {/* Catch-all Fallback Route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
