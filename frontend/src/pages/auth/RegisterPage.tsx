import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { BookOpen, Mail, Lock, User } from 'lucide-react';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
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
    
    if (formData.password !== formData.password_confirm) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Send exactly the same data format as the working curl request
      const registrationData = {
        email: formData.email,
        password: formData.password,
        password_confirm: formData.password_confirm,  // This matches backend expectation
        first_name: formData.first_name,
        last_name: formData.last_name,
      };

      const response = await apiService.register(registrationData);
      
      // Store tokens and user data
      localStorage.setItem('access_token', response.access);
      localStorage.setItem('refresh_token', response.refresh);
      
      // Update auth context
      login(response.user as any, response.access);
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error.response?.data) {
        // Handle specific field errors from backend
        const backendErrors = error.response.data;
        if (typeof backendErrors === 'object') {
          // Extract first error message
          const firstErrorKey = Object.keys(backendErrors)[0];
          const firstError = backendErrors[firstErrorKey];
          if (Array.isArray(firstError)) {
            setError(firstError[0]);
          } else {
            setError(firstError || 'Registration failed');
          }
        } else {
          setError(backendErrors || 'Registration failed');
        }
      } else {
        setError('Registration failed. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Panel */}
      <div style={{
        display: 'none',
        width: '50%',
        backgroundColor: 'var(--color-black)',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem'
      }} className="lg:flex">
        <div className="text-center">
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem'}}>
            <BookOpen style={{width: '3rem', height: '3rem', color: 'var(--color-red)', marginRight: '0.75rem'}} />
            <h1 style={{fontSize: '2.25rem', fontWeight: 'bold', color: 'white'}}>Learnify AI</h1>
          </div>
          <p style={{fontSize: '1.25rem', color: '#d1d5db', maxWidth: '28rem'}}>
            Start your AI-powered learning journey today
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '1.5rem'
      }}>
        <div style={{maxWidth: '24rem', margin: '0 auto', width: '100%'}}>
          {/* Mobile header */}
          <div style={{textAlign: 'center', marginBottom: '1.5rem'}} className="lg:hidden">
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem'}}>
              <BookOpen style={{width: '1.5rem', height: '1.5rem', color: 'var(--color-red)', marginRight: '0.5rem'}} />
              <h1 style={{fontSize: '1.25rem', fontWeight: 'bold'}}>Learnify AI</h1>
            </div>
          </div>

          <div className="text-center mb-6">
            <h2 style={{fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem'}}>Create Account</h2>
            <p className="text-gray-600">Start your learning journey</p>
          </div>

          {error && (
            <div style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '0.5rem',
              color: '#b91c1c',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            {/* Name Fields */}
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem'}}>
              <div>
                <label style={{display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--color-gray-700)', marginBottom: '0.25rem'}}>
                  First Name
                </label>
                <div style={{position: 'relative'}}>
                  <User style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '1rem',
                    height: '1rem',
                    color: '#9ca3af'
                  }} />
                  <input
                    name="first_name"
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      paddingLeft: '2.25rem',
                      paddingRight: '0.75rem',
                      paddingTop: '0.5rem',
                      paddingBottom: '0.5rem',
                      border: '1px solid var(--color-gray-300)',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                    placeholder="John"
                  />
                </div>
              </div>

              <div>
                <label style={{display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--color-gray-700)', marginBottom: '0.25rem'}}>
                  Last Name
                </label>
                <div style={{position: 'relative'}}>
                  <User style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '1rem',
                    height: '1rem',
                    color: '#9ca3af'
                  }} />
                  <input
                    name="last_name"
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      paddingLeft: '2.25rem',
                      paddingRight: '0.75rem',
                      paddingTop: '0.5rem',
                      paddingBottom: '0.5rem',
                      border: '1px solid var(--color-gray-300)',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                    placeholder="Doe"
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={{display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--color-gray-700)', marginBottom: '0.25rem'}}>
                Email
              </label>
              <div style={{position: 'relative'}}>
                <Mail style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '1rem',
                  height: '1rem',
                  color: '#9ca3af'
                }} />
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    paddingLeft: '2.25rem',
                    paddingRight: '0.75rem',
                    paddingTop: '0.5rem',
                    paddingBottom: '0.5rem',
                    border: '1px solid var(--color-gray-300)',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--color-gray-700)', marginBottom: '0.25rem'}}>
                Password
              </label>
              <div style={{position: 'relative'}}>
                <Lock style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '1rem',
                  height: '1rem',
                  color: '#9ca3af'
                }} />
                <input
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    paddingLeft: '2.25rem',
                    paddingRight: '0.75rem',
                    paddingTop: '0.5rem',
                    paddingBottom: '0.5rem',
                    border: '1px solid var(--color-gray-300)',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label style={{display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--color-gray-700)', marginBottom: '0.25rem'}}>
                Confirm Password
              </label>
              <div style={{position: 'relative'}}>
                <Lock style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '1rem',
                  height: '1rem',
                  color: '#9ca3af'
                }} />
                <input
                  name="password_confirm"
                  type="password"
                  required
                  value={formData.password_confirm}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    paddingLeft: '2.25rem',
                    paddingRight: '0.75rem',
                    paddingTop: '0.5rem',
                    paddingBottom: '0.5rem',
                    border: '1px solid var(--color-gray-300)',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: 'var(--color-red)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = 'var(--color-red-dark)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = 'var(--color-red)';
                }
              }}
            >
              {isLoading ? (
                <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <LoadingSpinner size="sm" />
                  <span style={{marginLeft: '0.5rem'}}>Creating Account...</span>
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div style={{marginTop: '1.5rem', textAlign: 'center'}}>
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link 
                to="/login" 
                style={{color: 'var(--color-red)', fontWeight: '500', textDecoration: 'none'}}
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;