import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiService, { User } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Computed property for authentication status
  const isAuthenticated = Boolean(user && token);

  useEffect(() => {
    // Check for existing authentication on app load
    const checkAuth = async () => {
      // Use consistent key names that match api service
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (accessToken && refreshToken) {
        try {
          // Try to get user profile with existing token
          const userProfile = await apiService.getProfile();
          setUser(userProfile);
          setToken(accessToken);
        } catch (error) {
          console.error('Auth check failed:', error);
          // Clear invalid tokens using consistent key names
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = (userData: User, accessToken: string) => {
    setUser(userData);
    setToken(accessToken);
    // Tokens should already be stored by the calling component
    // But ensure they're stored with consistent names
    localStorage.setItem('accessToken', accessToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    // Use consistent key names
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    console.log('User logged out');
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    loading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};