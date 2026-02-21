import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ApiResponse,
  PaginatedResponse,
  LoginRequest,
  LoginResponse,
  Package,
  Customer,
  DashboardStats,
  Notification,
  PackageCheckInRequest,
  PackageCheckOutRequest,
} from './types';

// ── Configuration ──────────────────────────────────────────────────

const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'https://app.yourdomain.com/api';

// ── HTTP Client ────────────────────────────────────────────────────

const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach auth token to every request
client.interceptors.request.use(async (config: AxiosRequestConfig) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses (expired token)
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('auth_token');
      // The App component will detect this and show login
    }
    return Promise.reject(error);
  }
);

// ── API Methods ────────────────────────────────────────────────────

export const api = {
  // Auth
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const { data } = await client.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
    return data.data;
  },

  logout: async (): Promise<void> => {
    await client.post('/auth/logout');
    await AsyncStorage.removeItem('auth_token');
  },

  // Dashboard
  getDashboardStats: async (): Promise<DashboardStats> => {
    const { data } = await client.get<ApiResponse<DashboardStats>>('/dashboard/stats');
    return data.data;
  },

  // Packages
  getPackages: async (params?: {
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<Package>> => {
    const { data } = await client.get<PaginatedResponse<Package>>('/packages', { params });
    return data;
  },

  getPackage: async (id: string): Promise<Package> => {
    const { data } = await client.get<ApiResponse<Package>>(`/packages/${id}`);
    return data.data;
  },

  checkInPackage: async (payload: PackageCheckInRequest): Promise<Package> => {
    const { data } = await client.post<ApiResponse<Package>>('/packages/check-in', payload);
    return data.data;
  },

  checkOutPackage: async (payload: PackageCheckOutRequest): Promise<Package> => {
    const { data } = await client.post<ApiResponse<Package>>('/packages/check-out', payload);
    return data.data;
  },

  lookupByTracking: async (trackingNumber: string): Promise<{ carrier: string; customer?: Customer }> => {
    const { data } = await client.get<ApiResponse<{ carrier: string; customer?: Customer }>>(
      `/packages/lookup/${encodeURIComponent(trackingNumber)}`
    );
    return data.data;
  },

  // Customers
  getCustomers: async (params?: {
    search?: string;
    source?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<Customer>> => {
    const { data } = await client.get<PaginatedResponse<Customer>>('/customers', { params });
    return data;
  },

  getCustomer: async (id: string): Promise<Customer> => {
    const { data } = await client.get<ApiResponse<Customer>>(`/customers/${id}`);
    return data.data;
  },

  searchCustomersByPMB: async (pmb: string): Promise<Customer[]> => {
    const { data } = await client.get<ApiResponse<Customer[]>>('/customers/search', {
      params: { pmb },
    });
    return data.data;
  },

  // Notifications
  getNotifications: async (params?: {
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<Notification>> => {
    const { data } = await client.get<PaginatedResponse<Notification>>('/notifications', { params });
    return data;
  },

  // Settings
  getApiBaseUrl: () => API_BASE_URL,
};

export default api;
