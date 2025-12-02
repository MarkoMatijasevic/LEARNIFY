// frontend/src/pages/documents/DocumentsPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import apiService, { Document, DocumentCategory } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import TestModal from '../../components/ui/TestModal';
import { 
  BookOpen, 
  FileText, 
  Presentation, 
  Upload, 
  Search, 
  Filter,
  MessageSquare,
  Trash2,
  X,
  ClipboardList,
  File,
  Moon,
  Sun
} from 'lucide-react';

const DocumentsPage = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dark mode state - check localStorage for saved preference
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  // Save dark mode preference to localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // State
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Test Modal State
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [selectedDocumentForTest, setSelectedDocumentForTest] = useState<Document | null>(null);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiService.getDocuments();
      console.log('📊 Documents API response:', response);
      
      let docsArray: Document[] = [];
      
      if (Array.isArray(response)) {
        docsArray = response;
      } else if (response && typeof response === 'object') {
        const responseObj = response as Record<string, any>;
        
        if ('results' in responseObj && Array.isArray(responseObj.results)) {
          docsArray = responseObj.results as Document[];
        } else if ('data' in responseObj && Array.isArray(responseObj.data)) {
          docsArray = responseObj.data as Document[];
        } else if ('documents' in responseObj && Array.isArray(responseObj.documents)) {
          docsArray = responseObj.documents as Document[];
        }
      }
      
      setDocuments(docsArray);
      
    } catch (error: any) {
      console.error('❌ Failed to load documents:', error);
      setDocuments([]);
      
      if (error.response?.status === 401) {
        setError('Authentication expired. Please log in again.');
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 2000);
      } else if (error.response?.status === 403) {
        setError('Access denied. Please check your permissions.');
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        setError('Cannot connect to server. Please check if the backend is running.');
      } else {
        setError(`Failed to load documents: ${error.response?.data?.message || error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const categories = await apiService.getDocumentCategories();
      if (Array.isArray(categories)) {
        setCategories(categories);
      } else {
        setCategories([]);
      }
    } catch (error: any) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    }
  };

  useEffect(() => {
    loadDocuments();
    loadCategories();
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name.split('.')[0]);

      const result = await apiService.uploadDocument(formData);

      setDocuments(prev => Array.isArray(prev) ? [result, ...prev] : [result]);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setUploadModalOpen(false);
      setDragActive(false);
      
    } catch (error: any) {
      console.error('Upload failed:', error);
      setUploadError(error.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      await apiService.deleteDocument(documentId);
      setDocuments(prev => Array.isArray(prev) ? prev.filter(doc => doc.id !== documentId) : []);
    } catch (error: any) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleUpload(files[0]);
    }
  };

  const handleCreateTest = (document: Document) => {
    console.log('📝 Creating test for document:', document.title);
    setSelectedDocumentForTest(document);
    setTestModalOpen(true);
  };

  const handleCloseTestModal = () => {
    setTestModalOpen(false);
    setSelectedDocumentForTest(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    const safeFileType = fileType || '';
    
    switch (safeFileType.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-8 h-8 text-red-500" />;
      case 'docx':
      case 'doc':
        return <BookOpen className="w-8 h-8 text-blue-500" />;
      case 'pptx':
      case 'ppt':
        return <Presentation className="w-8 h-8 text-orange-500" />;
      default:
        return <File className="w-8 h-8 text-gray-500" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    const statusValue = status || 'ready';
    switch (statusValue) {
      case 'processing':
        return <span className={`px-3 py-1 text-sm font-medium rounded-full ${darkMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'}`}>Processing</span>;
      case 'ready':
        return <span className={`px-3 py-1 text-sm font-medium rounded-full ${darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'}`}>Ready</span>;
      case 'error':
        return <span className={`px-3 py-1 text-sm font-medium rounded-full ${darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'}`}>Error</span>;
      default:
        return <span className={`px-3 py-1 text-sm font-medium rounded-full ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>Unknown</span>;
    }
  };

  const safeDocuments = Array.isArray(documents) ? documents : [];
  const filteredDocuments = safeDocuments.filter(doc => {
    const title = doc.title || '';
    const originalFilename = doc.original_filename || '';
    const categoryName = doc.category_name || doc.category || '';
    
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         originalFilename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || categoryName === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleLogout = async () => {
    try {
      await apiService.logout();
      logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      logout();
      navigate('/');
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 shadow-sm ${darkMode ? 'bg-gray-800 border-b border-gray-700' : 'bg-white border-b border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-blue-600">
                Learnify AI
              </h1>
              <nav className="hidden md:flex space-x-6">
                <Link to="/documents" className={`font-semibold border-b-2 border-blue-600 pb-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  Documents
                </Link>
                <Link to="/chat" className={`font-medium transition-colors ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                  Chat
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Dark Mode Toggle Button */}
              <button
                onClick={toggleDarkMode}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {darkMode ? (
                  <>
                    <Sun className="w-5 h-5" />
                    <span className="hidden sm:inline">Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-5 h-5" />
                    <span className="hidden sm:inline">Dark Mode</span>
                  </>
                )}
              </button>

              <button
                onClick={handleLogout}
                className={`font-medium transition-colors px-4 py-2 rounded-lg ${
                  darkMode 
                    ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>My Documents</h2>
            <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Upload and manage your study materials
            </p>
          </div>
          
          <button
            onClick={() => setUploadModalOpen(true)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg text-lg"
          >
            <Upload className="w-6 h-6" />
            <span>Upload Document</span>
          </button>
        </div>

        {/* Search and Filter */}
        <div className={`rounded-xl border p-6 mb-8 shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-12 pr-4 py-4 border rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-lg ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                }`}
              />
            </div>
            
            <div className="relative sm:w-56">
              <Filter className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 pointer-events-none ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`w-full pl-12 pr-8 py-4 border rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer transition-all text-lg ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-gray-50 border-gray-200 text-gray-900'
                }`}
              >
                <option value="all">All Categories</option>
                {Array.isArray(categories) && categories.map(category => (
                  <option key={category.id} value={category.name}>
                    {category.name} ({category.count})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className={`rounded-xl p-4 mb-8 ${darkMode ? 'bg-red-900/50 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
            <p className={darkMode ? 'text-red-200' : 'text-red-700'}>{error}</p>
            <button
              onClick={loadDocuments}
              className={`mt-2 font-medium underline ${darkMode ? 'text-red-300 hover:text-red-100' : 'text-red-600 hover:text-red-800'}`}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Documents List */}
        {filteredDocuments.length === 0 ? (
          <div className={`text-center py-16 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <BookOpen className={`w-20 h-20 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
            <h3 className={`text-2xl font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {safeDocuments.length === 0 ? 'No documents yet' : 'No documents match your search'}
            </h3>
            <p className={`mb-8 text-lg ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              {safeDocuments.length === 0 
                ? 'Upload your first document to get started'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
            {safeDocuments.length === 0 && (
              <button
                onClick={() => setUploadModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-xl transition-all shadow-lg text-lg"
              >
                Upload Your First Document
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`rounded-xl border p-6 hover:shadow-lg transition-all ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-700 hover:border-gray-600' 
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Left: Icon and Document Info */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      {getFileIcon(doc.file_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className={`font-semibold text-xl truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {doc.title || 'Untitled Document'}
                        </h3>
                        {getStatusBadge(doc.status)}
                      </div>
                      
                      <div className={`flex flex-wrap items-center gap-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <span>{formatFileSize(doc.file_size || 0)}</span>
                        <span>•</span>
                        <span>{new Date(doc.created_at || doc.uploaded_at).toLocaleDateString()}</span>
                        {doc.page_count && doc.page_count > 0 && (
                          <>
                            <span>•</span>
                            <span>{doc.page_count} pages</span>
                          </>
                        )}
                        {(doc.category_name || doc.category) && (
                          <>
                            <span>•</span>
                            <span className="text-blue-500">{doc.category_name || doc.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Action Buttons */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {(doc.status || 'ready') === 'ready' ? (
                      <>
                        <button
                          onClick={() => handleCreateTest(doc)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center gap-2 shadow-md text-lg"
                        >
                          <ClipboardList className="w-5 h-5" />
                          <span>Create Test</span>
                        </button>
                        
                        <Link
                          to={`/chat?document=${doc.id}`}
                          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center gap-2 shadow-md text-lg"
                        >
                          <MessageSquare className="w-5 h-5" />
                          <span>Chat</span>
                        </Link>
                      </>
                    ) : (
                      <span className={`font-medium py-3 px-6 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {(doc.status || 'ready') === 'processing' ? 'Processing...' : 'Not Ready'}
                      </span>
                    )}
                    
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className={`p-3 rounded-xl transition-all ${
                        darkMode 
                          ? 'text-gray-500 hover:text-red-400 hover:bg-red-900/30' 
                          : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                      }`}
                      title="Delete document"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl shadow-2xl p-8 w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Upload Document</h3>
              <button
                onClick={() => setUploadModalOpen(false)}
                className={`transition-colors p-2 rounded-full ${
                  darkMode 
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {uploadError && (
              <div className={`rounded-xl p-4 mb-6 ${darkMode ? 'bg-red-900/50 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
                <p className={darkMode ? 'text-red-200' : 'text-red-700'}>{uploadError}</p>
              </div>
            )}

            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragActive 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : darkMode
                    ? 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                    : 'border-gray-300 hover:border-gray-400 bg-gray-50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className={`w-16 h-16 mx-auto mb-4 ${
                dragActive ? 'text-blue-500' : darkMode ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <p className={`mb-2 text-lg font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Drag and drop your document here
              </p>
              <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                or click to browse
              </p>
              <p className={`text-sm mb-6 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                PDF, Word (.docx), PowerPoint (.pptx)
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.pptx,.ppt"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-lg"
              >
                {uploading ? 'Uploading...' : 'Choose File'}
              </button>
            </div>

            {uploading && (
              <div className="mt-6">
                <div className={`flex justify-between mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <span>Uploading...</span>
                  <span className="font-medium">{uploadProgress}%</span>
                </div>
                <div className={`w-full rounded-full h-3 overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Test Modal */}
      {testModalOpen && selectedDocumentForTest && (
        <TestModal
          document={selectedDocumentForTest}
          onClose={handleCloseTestModal}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};

export default DocumentsPage;