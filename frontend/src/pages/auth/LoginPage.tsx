import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { BookOpen, Mail, Lock } from 'lucide-react';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await apiService.login(formData);
      
      // Store tokens using the service methods
      localStorage.setItem('accessToken', response.access);
      localStorage.setItem('refreshToken', response.refresh);
      
      // Update auth context
      login(response.user as any, response.access);
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.response?.data) {
        const backendErrors = error.response.data;
        if (typeof backendErrors === 'object') {
          const firstErrorKey = Object.keys(backendErrors)[0];
          const firstError = backendErrors[firstErrorKey];
          if (Array.isArray(firstError)) {
            setError(firstError[0]);
          } else {
            setError(firstError || 'Login failed');
          }
        } else {
          setError(backendErrors || 'Login failed');
        }
      } else if (error.code === 'NETWORK_ERROR') {
        setError('Cannot connect to server. Please check if the backend is running on port 8000.');
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Panel - Hidden on mobile, visible on large screens */}
      <div className="hidden lg:flex lg:w-1/2 bg-black flex-col justify-center items-center p-8">
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <BookOpen className="w-12 h-12 text-red-500 mr-3" />
            <h1 className="text-4xl font-bold text-white">Learnify AI</h1>
          </div>
          <p className="text-xl text-gray-300 mb-8 max-w-md">
            Transform your study materials into interactive AI conversations
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-8">
        <div className="max-w-md mx-auto w-full">
          {/* Mobile header */}
          <div className="text-center mb-8 lg:hidden">
            <div className="flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-red-500 mr-2" />
              <h1 className="text-2xl font-bold">Learnify AI</h1>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Welcome Back</h2>
            <p className="text-gray-600">Sign in to continue your learning journey</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input pl-10"
                  placeholder="you@example.com"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#1f2937',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                    fontSize: '0.875rem',
                    width: '100%'
                  }}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input pl-10"
                  placeholder="••••••••"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#1f2937',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                    fontSize: '0.875rem',
                    width: '100%'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full py-3 text-base"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Signing in...</span>
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link 
                to="/register" 
                className="text-red-500 font-medium hover:text-red-600 transition-colors"
              >
                Create one here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;