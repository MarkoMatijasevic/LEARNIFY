// frontend/src/pages/documents/DocumentsPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import apiService, { Document, DocumentCategory } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { 
  BookOpen, 
  FileText, 
  Presentation, 
  Upload, 
  Search, 
  Filter,
  MessageSquare,
  Trash2,
  X
} from 'lucide-react';

const DocumentsPage = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State - Initialize documents as empty array to prevent filter errors
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

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiService.getDocuments();
      console.log('📊 Documents API response:', response);
      console.log('📊 Response type:', typeof response);
      console.log('📊 Is array:', Array.isArray(response));
      
      // Handle different response formats
      let docsArray: Document[] = [];
      
      if (Array.isArray(response)) {
        // Direct array response
        docsArray = response;
        console.log('✅ Loaded documents as direct array:', docsArray.length);
      } else if (response && typeof response === 'object') {
        // Type assertion for object with possible properties
        const responseObj = response as Record<string, any>;
        
        // Check for various paginated response formats
        if ('results' in responseObj && Array.isArray(responseObj.results)) {
          docsArray = responseObj.results as Document[];
          console.log('✅ Loaded documents from paginated response:', docsArray.length);
        } else if ('data' in responseObj && Array.isArray(responseObj.data)) {
          docsArray = responseObj.data as Document[];
          console.log('✅ Loaded documents from data property:', docsArray.length);
        } else if ('documents' in responseObj && Array.isArray(responseObj.documents)) {
          docsArray = responseObj.documents as Document[];
          console.log('✅ Loaded documents from documents property:', docsArray.length);
        } else {
          // Response is an object but doesn't match expected formats
          console.warn('⚠️ Unexpected response structure:', Object.keys(responseObj));
          // Check if it's an error response
          if ('error' in responseObj || 'message' in responseObj) {
            setError('Server returned an error while loading documents');
            docsArray = [];
          } else {
            // Unknown structure but not an error - treat as empty
            console.warn('Unknown response format, treating as empty');
            docsArray = [];
          }
        }
      } else {
        // Response is neither array nor object
        console.warn('⚠️ Response is not array or object:', response);
        docsArray = [];
      }
      
      setDocuments(docsArray);
      console.log('✅ Final documents state:', docsArray.length, 'documents');
      
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
      console.log('📁 Categories API response:', categories);
      
      // Defensive programming for categories
      if (Array.isArray(categories)) {
        setCategories(categories);
      } else {
        console.warn('Categories API returned unexpected format:', categories);
        setCategories([]);
      }
    } catch (error: any) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    }
  };

  // Load data on mount - with proper dependency array
  useEffect(() => {
    loadDocuments();
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        return <FileText className="w-6 h-6 text-red-500" />;
      case 'docx':
      case 'doc':
        return <BookOpen className="w-6 h-6 text-blue-500" />;
      case 'pptx':
      case 'ppt':
        return <Presentation className="w-6 h-6 text-orange-500" />;
      default:
        return <FileText className="w-6 h-6 text-gray-500" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    const statusValue = status || 'ready';
    switch (statusValue) {
      case 'processing':
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Processing</span>;
      case 'ready':
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Ready</span>;
      case 'error':
        return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">Error</span>;
      default:
        return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">Unknown</span>;
    }
  };

  // Defensive programming - ensure documents is always an array before filtering
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
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-lg border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
                Learnify AI
              </h1>
              <nav className="hidden md:flex space-x-6">
                <Link to="/documents" className="text-red-400 hover:text-red-300 transition-colors font-medium">
                  Documents
                </Link>
                <Link to="/chat" className="text-gray-400 hover:text-white transition-colors">
                  Chat
                </Link>
              </nav>
            </div>
            
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white transition-colors text-sm md:text-base"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 md:mb-8 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">My Documents</h2>
            <p className="text-gray-400 mt-2 text-sm md:text-base">
              Upload and manage your study materials
            </p>
          </div>
          
          <button
            onClick={() => setUploadModalOpen(true)}
            className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2 shadow-lg shadow-red-500/30"
          >
            <Upload className="w-5 h-5" />
            <span>Upload Document</span>
          </button>
        </div>

        {/* Search and Filter */}
        <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4 md:p-6 mb-6 md:mb-8 shadow-xl">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-white placeholder-gray-400 transition-all"
              />
            </div>
            
            <div className="relative sm:w-48">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-10 pr-8 py-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-white appearance-none cursor-pointer transition-all"
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
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 md:mb-8 animate-fadeIn">
            <p className="text-red-400 text-sm md:text-base">{error}</p>
            <button
              onClick={loadDocuments}
              className="mt-2 text-sm text-red-300 hover:text-red-200 underline"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Documents Grid */}
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12 md:py-16">
            <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              {safeDocuments.length === 0 ? 'No documents yet' : 'No documents match your search'}
            </h3>
            <p className="text-gray-500 mb-6 text-sm md:text-base">
              {safeDocuments.length === 0 
                ? 'Upload your first document to get started'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
            {safeDocuments.length === 0 && (
              <button
                onClick={() => setUploadModalOpen(true)}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg shadow-red-500/30"
              >
                Upload Your First Document
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-5 md:p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-200 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-red-500/10"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    {getFileIcon(doc.file_type)}
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(doc.status)}
                  </div>
                </div>
                
                <h3 className="font-semibold text-base md:text-lg mb-2 text-white line-clamp-2 min-h-[3rem]">
                  {doc.title || 'Untitled Document'}
                </h3>
                
                <div className="text-xs md:text-sm text-gray-400 mb-4 space-y-1">
                  <p className="flex items-center">
                    <span className="inline-block w-16">Size:</span>
                    <span>{formatFileSize(doc.file_size || 0)}</span>
                  </p>
                  <p className="flex items-center">
                    <span className="inline-block w-16">Date:</span>
                    <span>{new Date(doc.created_at || doc.uploaded_at).toLocaleDateString()}</span>
                  </p>
                  {(doc.category_name || doc.category) && (
                    <p className="flex items-center text-red-400">
                      <span className="inline-block w-16">Category:</span>
                      <span>{doc.category_name || doc.category}</span>
                    </p>
                  )}
                  {(doc.page_count && doc.page_count > 0) && (
                    <p className="flex items-center">
                      <span className="inline-block w-16">Pages:</span>
                      <span>{doc.page_count}</span>
                    </p>
                  )}
                </div>

                {doc.text_preview && (
                  <p className="text-xs text-gray-500 mb-4 line-clamp-2 italic">
                    "{doc.text_preview}"
                  </p>
                )}

                <div className="flex items-center justify-between gap-2">
                  {(doc.status || 'ready') === 'ready' ? (
                    <Link
                      to={`/chat?document=${doc.id}`}
                      className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs md:text-sm font-medium py-2 px-3 rounded-lg transition-all flex-1 text-center shadow-md hover:shadow-lg"
                    >
                      <MessageSquare className="w-4 h-4 inline mr-1" />
                      Chat with AI
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="bg-gray-700 text-gray-400 text-xs md:text-sm font-medium py-2 px-3 rounded-lg cursor-not-allowed flex-1"
                    >
                      {(doc.status || 'ready') === 'processing' ? 'Processing...' : 'Not Ready'}
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition-all"
                    aria-label="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-gray-900 rounded-xl border border-white/20 p-6 w-full max-w-md shadow-2xl animate-slideUp">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Document</h3>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">{uploadError}</p>
              </div>
            )}

            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                dragActive 
                  ? 'border-red-500 bg-red-500/10 scale-[1.02]' 
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className={`w-12 h-12 mx-auto mb-4 transition-colors ${
                dragActive ? 'text-red-400' : 'text-gray-400'
              }`} />
              <p className="text-gray-400 mb-4">
                Drag and drop your document here, or click to browse
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Supported formats: PDF, Word (.docx), PowerPoint (.pptx)
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
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {uploading ? 'Uploading...' : 'Choose File'}
              </button>
            </div>

            {uploading && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;