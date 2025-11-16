import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiService, DashboardStats } from '../../services/api';
import { 
  BookOpen, 
  MessageSquare, 
  Upload, 
  Clock, 
  TrendingUp, 
  Target,
  User,
  Settings,
  LogOut,
  Plus
} from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiService.getDashboardStats();
        setStats(data);
      } catch (err: any) {
        setError('Failed to load dashboard data');
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <BookOpen className="w-8 h-8 text-red-500 mr-3" />
              <span className="text-2xl font-bold text-black">Learnify AI</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                to="/documents"
                className="text-gray-700 hover:text-black px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Documents
              </Link>
              <Link
                to="/profile"
                className="text-gray-700 hover:text-black px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-700 hover:text-red-500 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.first_name}!
          </h1>
          <p className="text-gray-600 mt-1">
            Ready to continue your learning journey?
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link
            to="/documents"
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 group"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Upload className="w-8 h-8 text-red-500 group-hover:text-red-600 transition-colors" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Upload Document</h3>
                <p className="text-gray-600">Add new learning materials</p>
              </div>
            </div>
          </Link>

          <Link
            to="/documents"
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 group"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BookOpen className="w-8 h-8 text-red-500 group-hover:text-red-600 transition-colors" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">My Documents</h3>
                <p className="text-gray-600">Browse your materials</p>
              </div>
            </div>
          </Link>

          <Link
            to="/profile"
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 group"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Settings className="w-8 h-8 text-red-500 group-hover:text-red-600 transition-colors" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Settings</h3>
                <p className="text-gray-600">Manage your account</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <BookOpen className="w-8 h-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.total_documents}</p>
                  <p className="text-gray-600">Documents</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                +{stats.documents_this_week} this week
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <MessageSquare className="w-8 h-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.total_conversations}</p>
                  <p className="text-gray-600">Conversations</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                +{stats.conversations_this_week} this week
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.total_study_time_hours}h</p>
                  <p className="text-gray-600">Study Time</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {stats.favorite_study_time} learner
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-orange-500" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.study_streak_days}</p>
                  <p className="text-gray-600">Day Streak</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Keep it up!
              </p>
            </div>
          </div>
        )}

        {/* Learning Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Progress</h3>
            
            {stats?.learning_progress && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Profile Completion</span>
                    <span>{stats.learning_progress.profile_completion}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full" 
                      style={{ width: `${stats.learning_progress.profile_completion}%` }}
                    ></div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Documents Processed</span>
                    <span className="text-sm font-medium">{stats.learning_progress.documents_processed}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Study Hours</span>
                    <span className="text-sm font-medium">{stats.learning_progress.study_hours_completed}h</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Getting Started</h3>
            
            <div className="space-y-3">
              <div className="flex items-center p-3 bg-gray-50 rounded-md">
                <div className="flex-shrink-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  1
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">Upload your first document</p>
                  <p className="text-xs text-gray-600">PDF, Word, or PowerPoint files supported</p>
                </div>
                <Link
                  to="/documents"
                  className="text-red-500 hover:text-red-600 text-sm font-medium"
                >
                  Upload
                </Link>
              </div>

              <div className="flex items-center p-3 bg-gray-50 rounded-md opacity-75">
                <div className="flex-shrink-0 w-6 h-6 bg-gray-400 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">Start chatting with AI</p>
                  <p className="text-xs text-gray-600">Ask questions about your materials</p>
                </div>
                <span className="text-gray-400 text-sm">Soon</span>
              </div>

              <div className="flex items-center p-3 bg-gray-50 rounded-md opacity-75">
                <div className="flex-shrink-0 w-6 h-6 bg-gray-400 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  3
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">Generate study materials</p>
                  <p className="text-xs text-gray-600">Flashcards, quizzes, and summaries</p>
                </div>
                <span className="text-gray-400 text-sm">Soon</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;