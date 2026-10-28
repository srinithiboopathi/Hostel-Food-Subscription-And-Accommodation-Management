import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('hostel_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize and verify authentication
  useEffect(() => {
    async function verifyAuth() {
      const storedToken = localStorage.getItem('hostel_token');
      if (!storedToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await axiosClient.get('/auth/me');
        if (res.success && res.data) {
          setUser(res.data.user || res.data);
        } else {
          logout();
        }
      } catch (err) {
        console.error('Auth verification failed:', err.message);
        logout();
      } finally {
        setLoading(false);
      }
    }

    verifyAuth();
  }, [token]);

  const login = async (identifier, password) => {
    const res = await axiosClient.post('/auth/login', {
      email: identifier,
      identifier: identifier,
      password,
    });
    if (res.success && res.data?.token) {
      localStorage.setItem('hostel_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user || res.data);
      return res.data;
    }
    throw new Error(res.message || 'Login failed');
  };

  const loginStaff = async (email, password) => {
    const res = await axiosClient.post('/auth/staff-login', {
      email,
      password,
    });
    const staffRoles = ['ADMIN', 'WARDEN', 'MESS_MANAGER', 'ACCOUNTANT'];
    if (res.success && res.data?.token && staffRoles.includes(res.data.user?.role)) {
      localStorage.setItem('hostel_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data;
    }
    throw new Error(res.message || 'Staff sign in failed');
  };

  const loginStudent = async (identifier, password) => {
    const res = await axiosClient.post('/auth/student-login', {
      identifier,
      password,
    });
    if (res.success && res.data?.token && res.data.user?.role === 'STUDENT') {
      localStorage.setItem('hostel_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data;
    }
    throw new Error(res.message || 'Student sign in failed');
  };

  const registerStudent = async (studentData) => {
    try {
      const res = await axiosClient.post('/auth/register-student', studentData);
      if (res.success && res.data?.token) {
        localStorage.setItem('hostel_token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user || res.data);
        return { success: true, data: res.data };
      }
      return { success: false, error: res.message || 'Registration failed' };
    } catch (err) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('hostel_token');
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role,
        token,
        loading,
        isLoading: loading,
        isAuthenticated: !!user,
        login,
        loginStaff,
        loginStudent,
        registerStudent,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
