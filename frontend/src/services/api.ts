// frontend/src/services/api.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// Type definitions
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  learning_goals?: string;
  preferred_study_time?: number;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Document {
  id: string;
  title: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  created_at?: string;
  category?: string;
  category_name?: string;
  status?: string;
  page_count?: number;
  text_preview?: string;
  original_filename?: string;
}

export interface DocumentCategory {
  id: string;
  name: string;
  count: number;
}

export interface DashboardStats {
  total_documents: number;
  total_conversations: number;
  total_tokens_used: number;
  recent_activity: any[];
  documents_this_week?: number;
  conversations_this_week?: number;
  total_study_time_hours?: number;
  favorite_study_time?: string;
  study_streak_days?: number;
  learning_progress?: {
    profile_completion: number;
    documents_processed: number;
    study_hours_completed: number;
  };
}

// ============================================================================
// TEST GENERATION TYPES (NEW)
// ============================================================================

export interface TestQuestion {
  id: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
  };
  correct_answer: 'A' | 'B' | 'C';
  explanation: string;
}

export interface DocumentTest {
  id: string;
  document: string;
  document_title?: string;
  created_by: number;
  title: string;
  question_count: number;
  questions: TestQuestion[];
  status: 'generating' | 'ready' | 'error';
  generation_error?: string;
  generation_time_seconds?: number;
  created_at: string;
  updated_at: string;
}

export interface TestAttempt {
  id: string;
  test: string;
  test_title?: string;
  user: number;
  answers: { [questionId: string]: string };
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  passed: boolean;
  correct_count: number;
  incorrect_count: number;
  results_detail: TestResultDetail[];
  time_taken_seconds?: number;
  started_at: string;
  completed_at?: string;
}

export interface TestResultDetail {
  question_id: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
  };
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
}

export interface GenerateTestRequest {
  document_id: string;
}

export interface SubmitTestRequest {
  test_id: string;
  answers: { [questionId: string]: string };
  time_taken_seconds?: number;
}

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config: any) => {
    const token = getAccessToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/users/token/refresh/`, {
            refresh: refreshToken
          });
          
          const { access } = response.data as { access: string };
          setTokens(access, refreshToken);
          
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Token management functions
export const getAccessToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refreshToken');
};

export const setTokens = (accessToken: string, refreshToken: string): void => {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
};

export const clearTokens = (): void => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

// API service object with all methods
export const apiService = {
  // Generic HTTP methods
  get: (url: string) => axiosInstance.get(url),
  post: (url: string, data?: any) => axiosInstance.post(url, data),
  put: (url: string, data?: any) => axiosInstance.put(url, data),
  delete: (url: string) => axiosInstance.delete(url),
  patch: (url: string, data?: any) => axiosInstance.patch(url, data),

  // Health check
  healthCheck: async () => {
    const response = await axiosInstance.get('/api/users/health/');
    return response.data;
  },

  // Authentication
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await axiosInstance.post('/api/users/register/', data);
    return response.data as AuthResponse;
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await axiosInstance.post('/api/users/login/', data);
    return response.data as AuthResponse;
  },

  logout: async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await axiosInstance.post('/api/users/logout/', { refresh: refreshToken });
    }
    clearTokens();
  },

  // Profile management
  getProfile: async (): Promise<User> => {
    const response = await axiosInstance.get('/api/users/profile/');
    return response.data as User;
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await axiosInstance.put('/api/users/profile/update/', data);
    return response.data as User;
  },

  // Documents
  getDocuments: async (): Promise<Document[]> => {
    const response = await axiosInstance.get('/api/documents/');
    return response.data as Document[];
  },

  getDocumentCategories: async (): Promise<DocumentCategory[]> => {
    const response = await axiosInstance.get('/api/documents/categories/');
    return response.data as DocumentCategory[];
  },

  uploadDocument: async (formData: FormData): Promise<Document> => {
    const response = await axiosInstance.post('/api/documents/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data as Document;
  },

  deleteDocument: async (documentId: string): Promise<void> => {
    await axiosInstance.delete(`/api/documents/${documentId}/`);
  },

  // Dashboard
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await axiosInstance.get('/api/users/dashboard-stats/');
    return response.data as DashboardStats;
  },

  // Password management
  changePassword: async (data: { current_password: string; new_password: string; }): Promise<{ message: string }> => {
    const response = await axiosInstance.post('/api/users/change-password/', data);
    return response.data as { message: string };
  },

  // ============================================================================
  // TEST GENERATION ENDPOINTS (NEW)
  // ============================================================================

  /**
   * Generate a new 20-question test from a document
   * @param documentId - UUID of the document to generate test from
   * @returns DocumentTest object with generated questions
   */
  generateTest: async (documentId: string): Promise<DocumentTest> => {
    const response = await axiosInstance.post('/api/documents/tests/generate/', {
      document_id: documentId
    });
    return response.data as DocumentTest;
  },

  /**
   * Get a specific test by ID
   * @param testId - UUID of the test
   * @returns DocumentTest object
   */
  getTest: async (testId: string): Promise<DocumentTest> => {
    const response = await axiosInstance.get(`/api/documents/tests/${testId}/`);
    return response.data as DocumentTest;
  },

  /**
   * Submit test answers and get results
   * @param testId - UUID of the test
   * @param answers - Object mapping question IDs to selected answers
   * @param timeTakenSeconds - Optional time taken to complete test
   * @returns TestAttempt object with results
   */
  submitTest: async (
    testId: string,
    answers: { [questionId: string]: string },
    timeTakenSeconds?: number
  ): Promise<TestAttempt> => {
    const response = await axiosInstance.post(`/api/documents/tests/${testId}/submit/`, {
      answers,
      time_taken_seconds: timeTakenSeconds
    });
    return response.data as TestAttempt;
  },

  /**
   * Get all test attempts for current user
   * @returns Array of TestAttempt objects
   */
  getTestAttempts: async (): Promise<TestAttempt[]> => {
    const response = await axiosInstance.get('/api/documents/tests/attempts/');
    return response.data as TestAttempt[];
  },

  /**
   * Get test attempts for a specific document
   * @param documentId - UUID of the document
   * @returns Array of TestAttempt objects
   */
  getDocumentTestAttempts: async (documentId: string): Promise<TestAttempt[]> => {
    const response = await axiosInstance.get(`/api/documents/${documentId}/test-attempts/`);
    return response.data as TestAttempt[];
  },

  /**
   * Get a specific test attempt by ID
   * @param attemptId - UUID of the test attempt
   * @returns TestAttempt object with full results
   */
  getTestAttempt: async (attemptId: string): Promise<TestAttempt> => {
    const response = await axiosInstance.get(`/api/documents/tests/attempts/${attemptId}/`);
    return response.data as TestAttempt;
  },

  /**
   * Delete a test
   * @param testId - UUID of the test to delete
   */
  deleteTest: async (testId: string): Promise<void> => {
    await axiosInstance.delete(`/api/documents/tests/${testId}/`);
  }
};

// Export apiClient as an alias for compatibility
export const apiClient = apiService;

// Default export
export default apiService;