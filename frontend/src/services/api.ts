import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse, HealthData } from '../types/api';
import {
  AuthResponseData,
  LoginInput,
  RegisterInput,
  SessionInfo,
  UpdateProfileInput,
  User,
} from '../types/auth';
import { useAuthStore } from '../store/authStore';
import { Application, ApplicationStage, CompanySummary, Job, JobInput, PaginationMeta } from '../types/jobs';
import { AdminAnalytics, AdminUsersResult, CandidateAnalytics, MatchResult, Notification, RecruiterAnalytics } from '../types/platform';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach in-memory Access Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

let refreshPromise: Promise<import('axios').AxiosResponse<ApiResponse<AuthResponseData>>> | null = null;
const requestRefresh = () => {
  if (!refreshPromise) {
    const run = () => axios.post<ApiResponse<AuthResponseData>>(`${API_BASE_URL}/auth/refresh-token`, {}, { withCredentials: true, timeout: 15000 });
    refreshPromise = (async () => navigator.locks ? await navigator.locks.request('hireflow-refresh', run) : await run())().finally(() => { refreshPromise = null; });
  }
  return refreshPromise!;
};

// Queue system to prevent thundering-herd refresh races
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Seamless silent token refresh with queued retries
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/refresh-token') ||
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register');

    if (error.response?.status === 401 && !isAuthEndpoint && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            reject: (err: any) => {
              reject(err);
            },
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await requestRefresh();

        const newAuthData = response.data.data;
        if (!newAuthData?.accessToken || !newAuthData?.user) {
          throw new Error('Refresh response missing credentials');
        }

        useAuthStore.getState().setAuth(newAuthData.user, newAuthData.accessToken);
        processQueue(null, newAuthData.accessToken);

        originalRequest.headers.Authorization = `Bearer ${newAuthData.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        useAuthStore.getState().clearAuth();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    const customMessage =
      error.response?.data?.message ||
      error.message ||
      'Network communication error.';
    return Promise.reject(new Error(customMessage));
  }
);

// ----------------------------------------------------------------------------
// Typed API Services
// ----------------------------------------------------------------------------

export const checkApiHealth = async (): Promise<HealthData> => {
  const response = await apiClient.get<ApiResponse<HealthData>>('/health');
  if (!response.data.data) {
    throw new Error('Malformed health check response');
  }
  return response.data.data;
};

export const registerApi = async (input: RegisterInput): Promise<User> => {
  const response = await apiClient.post<ApiResponse<{ user: User }>>(
    '/auth/register',
    input
  );
  if (!response.data.data?.user) {
    throw new Error(response.data.message || 'Registration failed');
  }
  return response.data.data.user;
};

export const loginApi = async (input: LoginInput): Promise<AuthResponseData> => {
  const response = await apiClient.post<ApiResponse<AuthResponseData>>(
    '/auth/login',
    input
  );
  if (!response.data.data?.user || !response.data.data?.accessToken) {
    throw new Error(response.data.message || 'Login failed');
  }
  const authData = response.data.data;
  useAuthStore.getState().setAuth(authData.user, authData.accessToken);
  return authData;
};

export const logoutApi = async (): Promise<void> => {
  try {
    await apiClient.post<ApiResponse<void>>('/auth/logout');
  } finally {
    useAuthStore.getState().clearAuth();
  }
};

export const logoutAllApi = async (): Promise<void> => {
  try {
    await apiClient.post<ApiResponse<void>>('/auth/logout-all');
  } finally {
    useAuthStore.getState().clearAuth();
  }
};

export const getSessionsApi = async (): Promise<SessionInfo[]> => {
  const response = await apiClient.get<ApiResponse<{ sessions: SessionInfo[] }>>(
    '/auth/sessions'
  );
  return response.data.data?.sessions || [];
};

export const getMeApi = async (): Promise<User> => {
  const response = await apiClient.get<ApiResponse<{ user: User }>>('/users/me');
  if (!response.data.data?.user) {
    throw new Error('Failed to retrieve user profile');
  }
  return response.data.data.user;
};

export const updateProfileApi = async (input: UpdateProfileInput): Promise<User> => {
  const response = await apiClient.put<ApiResponse<{ user: User }>>(
    '/users/profile',
    input
  );
  if (!response.data.data?.user) {
    throw new Error(response.data.message || 'Failed to update profile');
  }
  const updatedUser = response.data.data.user;
  useAuthStore.getState().updateUser(updatedUser);
  return updatedUser;
};

export const uploadResumeApi = async (file: File, onProgress?: (percent: number) => void): Promise<User> => {
  const formData = new FormData();
  formData.append('resume', file);
  const response = await apiClient.post<ApiResponse<{ user: User }>>('/users/resume', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => { if (event.total) onProgress?.(Math.round((event.loaded * 100) / event.total)); },
  });
  if (!response.data.data?.user) throw new Error(response.data.message || 'Resume upload failed');
  useAuthStore.getState().updateUser(response.data.data.user);
  return response.data.data.user;
};

export const downloadResumeApi = async (candidateId: string): Promise<void> => {
  const response = await apiClient.get(`/users/${candidateId}/resume`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data as Blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const getPublishedJobsApi = async (params: { search?: string; location?: string; workplaceType?: Job['workplaceType']; employmentType?: Job['employmentType']; experienceLevel?: Job['experienceLevel']; page?: number; limit?: number } = {}): Promise<{ jobs: Job[]; meta?: PaginationMeta }> => {
  const response = await apiClient.get<ApiResponse<{ jobs: Job[] }>>('/jobs', { params });
  return { jobs: response.data.data?.jobs || [], meta: response.data.meta as PaginationMeta | undefined };
};

export const applyToJobApi = async (jobId: string, coverLetter?: string): Promise<Application> => {
  const response = await apiClient.post<ApiResponse<{ application: Application }>>(`/applications/job/${jobId}`, {
    coverLetter: coverLetter?.trim() || undefined,
  });
  if (!response.data.data?.application) throw new Error(response.data.message || 'Application submission failed');
  return response.data.data.application;
};

export const getMyApplicationsApi = async (page = 1): Promise<{ applications: Application[]; meta?: PaginationMeta }> => {
  const response = await apiClient.get<ApiResponse<{ applications: Application[] }>>('/applications/me', { params: { page } });
  return { applications: response.data.data?.applications || [], meta: response.data.meta as PaginationMeta | undefined };
};

export const withdrawApplicationApi = async (id: string): Promise<Application> => {
  const response = await apiClient.patch<ApiResponse<{ application: Application }>>(`/applications/${id}/withdraw`);
  if (!response.data.data?.application) throw new Error(response.data.message || 'Could not withdraw application');
  return response.data.data.application;
};

export const getRecruiterJobsApi = async (params: { status?: Job['status']; page?: number; limit?: number } = {}): Promise<{ jobs: Job[]; meta?: PaginationMeta }> => {
  const response = await apiClient.get<ApiResponse<{ jobs: Job[] }>>('/jobs/recruiter/my-jobs', { params });
  return { jobs: response.data.data?.jobs || [], meta: response.data.meta as PaginationMeta | undefined };
};

export const getJobApi = async (id: string): Promise<Job> => {
  const response = await apiClient.get<ApiResponse<{ job: Job }>>(`/jobs/${id}`);
  if (!response.data.data?.job) throw new Error(response.data.message || 'Job not found');
  return response.data.data.job;
};

export const createJobApi = async (input: JobInput): Promise<Job> => {
  const response = await apiClient.post<ApiResponse<{ job: Job }>>('/jobs', input);
  if (!response.data.data?.job) throw new Error(response.data.message || 'Could not create job');
  return response.data.data.job;
};

export const updateJobApi = async (id: string, input: Partial<JobInput>): Promise<Job> => {
  const response = await apiClient.put<ApiResponse<{ job: Job }>>(`/jobs/${id}`, input);
  if (!response.data.data?.job) throw new Error(response.data.message || 'Could not update job');
  return response.data.data.job;
};

export const updateJobStatusApi = async (id: string, status: Job['status']): Promise<Job> => {
  const response = await apiClient.patch<ApiResponse<{ job: Job }>>(`/jobs/${id}/status`, { status });
  if (!response.data.data?.job) throw new Error(response.data.message || 'Could not update job status');
  return response.data.data.job;
};

export const getJobApplicantsApi = async (jobId: string, params: { stage?: ApplicationStage; search?: string; page?: number; limit?: number } = {}): Promise<{ applications: Application[]; meta?: PaginationMeta }> => {
  const response = await apiClient.get<ApiResponse<{ applications: Application[] }>>(`/applications/job/${jobId}`, { params });
  return { applications: response.data.data?.applications || [], meta: response.data.meta as PaginationMeta | undefined };
};

export const updateApplicationStageApi = async (id: string, stage: ApplicationStage, note?: string): Promise<Application> => {
  const response = await apiClient.patch<ApiResponse<{ application: Application }>>(`/applications/${id}/stage`, { stage, note });
  if (!response.data.data?.application) throw new Error(response.data.message || 'Could not update application stage');
  return response.data.data.application;
};

export const getApplicationMatchApi = async (id: string): Promise<MatchResult> => {
  const response = await apiClient.get<ApiResponse<{ match: MatchResult }>>(`/applications/${id}/match`);
  if (!response.data.data?.match) throw new Error('Could not calculate candidate match');
  return response.data.data.match;
};

export const getNotificationsApi = async (): Promise<{ notifications: Notification[]; unreadCount: number }> => {
  const response = await apiClient.get<ApiResponse<{ notifications: Notification[]; unreadCount: number }>>('/notifications');
  return response.data.data || { notifications: [], unreadCount: 0 };
};
export const markNotificationReadApi = async (id: string): Promise<void> => { await apiClient.patch(`/notifications/${id}/read`); };
export const markAllNotificationsReadApi = async (): Promise<void> => { await apiClient.patch('/notifications/read-all'); };
export const getCandidateAnalyticsApi = async (): Promise<CandidateAnalytics> => { const response = await apiClient.get<ApiResponse<CandidateAnalytics>>('/analytics/candidate'); if (!response.data.data) throw new Error('Could not load candidate dashboard'); return response.data.data; };
export const getRecruiterAnalyticsApi = async (): Promise<RecruiterAnalytics> => { const response = await apiClient.get<ApiResponse<RecruiterAnalytics>>('/analytics/recruiter'); if (!response.data.data) throw new Error('Could not load recruiter dashboard'); return response.data.data; };
export const getAdminAnalyticsApi = async (): Promise<AdminAnalytics> => { const response = await apiClient.get<ApiResponse<AdminAnalytics>>('/analytics/admin'); if (!response.data.data) throw new Error('Could not load admin dashboard'); return response.data.data; };
export const getAdminUsersApi = async (): Promise<AdminUsersResult> => { const response = await apiClient.get<ApiResponse<AdminUsersResult>>('/admin/users'); return response.data.data || { users: [] }; };

// Bootstrap auth state on app boot without page reload!
export interface CompanyInput { name: string; description: string; website?: string; industry: string; companySize: NonNullable<CompanySummary['companySize']>; location: string }
export const getMyCompanyApi = async (): Promise<CompanySummary | null> => { try { const response = await apiClient.get<ApiResponse<{ company: CompanySummary }>>('/companies/recruiter/my-company'); return response.data.data?.company || null; } catch (error) { if (error instanceof Error && /not found|company profile/i.test(error.message)) return null; throw error; } };
export const createCompanyApi = async (input: CompanyInput): Promise<CompanySummary> => { const response = await apiClient.post<ApiResponse<{ company: CompanySummary }>>('/companies', input); if (!response.data.data?.company) throw new Error('Could not create company'); return response.data.data.company; };

export const bootstrapAuth = async (): Promise<void> => {
  useAuthStore.getState().setInitializing(true);
  useAuthStore.getState().setInitializationError(null);
  try {
    const response = await requestRefresh();

    const authData = response.data.data;
    if (authData?.user && authData?.accessToken) {
      useAuthStore.getState().setAuth(authData.user, authData.accessToken);
    } else {
      useAuthStore.getState().clearAuth();
    }
  } catch (error) {
    useAuthStore.getState().clearAuth();
    if (!axios.isAxiosError(error) || error.response?.status !== 401) useAuthStore.getState().setInitializationError('Could not connect to restore your session. Please retry.');
  } finally {
    useAuthStore.getState().setInitializing(false);
  }
};
