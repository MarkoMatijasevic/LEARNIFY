import React from 'react';
import { Link } from 'react-router-dom';
import { User, ArrowLeft, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/dashboard" className="mr-4">
                <ArrowLeft className="w-5 h-5 text-gray-600 hover:text-black" />
              </Link>
              <User className="w-8 h-8 text-red-500 mr-3" />
              <span className="text-2xl font-bold text-black">Profile</span>
            </div>
          </div>
        </div>
      </nav>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-6">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-gray-400" />
            </div>
            <div className="ml-6">
              <h1 className="text-2xl font-bold text-gray-900">{user?.full_name}</h1>
              <p className="text-gray-600">{user?.email}</p>
            </div>
          </div>
          
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">First Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{user?.first_name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{user?.last_name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Learning Goals</dt>
                <dd className="mt-1 text-sm text-gray-900">{user?.learning_goals || 'Not set'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Preferred Study Time</dt>
                <dd className="mt-1 text-sm text-gray-900">{user?.preferred_study_time} minutes</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;