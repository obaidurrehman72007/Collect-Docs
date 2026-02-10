// src/context/AuthContext.jsx - ✅ PERFECTLY FIXED!
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState([]);

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const fetchWorkspaces = async () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    try {
      const res = await fetch(`${API_URL}/auth/workspaces`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data.workspaces || []);
      }
    } catch (error) {
      console.log('No workspaces yet or no token');
      setWorkspaces([]);
    }
  };

  const login = async (newToken, newUser) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_user', JSON.stringify(newUser));
    await fetchWorkspaces();
  };

  const register = async (newToken, newUser) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_user', JSON.stringify(newUser));
    await fetchWorkspaces();
    return newUser;
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    setWorkspaces([]);
    
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_roles');
    localStorage.removeItem('user_preferences');
    
    sessionStorage.clear();
    
    console.log('✅ COMPLETE logout!');
  };

  const refreshWorkspaces = async () => {
    if (token) await fetchWorkspaces();
  };

  const value = { 
    user, 
    token, 
    loading, 
    workspaces,
    login, 
    register, 
    logout,
    refreshWorkspaces
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
