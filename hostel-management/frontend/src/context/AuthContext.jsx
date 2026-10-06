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
        if (res.success && res.data?.user) {
          setUser(res.data.user);
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

  const login = async (email, password) => {
    const res = await axiosClient.post('/auth/login', { email, password });
    if (res.success && res.data?.token) {
      localStorage.setItem('hostel_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data;
    }
    throw new Error(res.message || 'Login failed');
  };

  const logout = () => {
    localStorage.removeItem('hostel_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
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
