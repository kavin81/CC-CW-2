import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface User {
  id: number;
  username: string;
  createdAt: string;
  role?: 'admin' | 'user';
}

export interface Paste {
  id: number;
  shareId: string;
  title: string;
  content: string;
  createdAt: string;
  expiresAt?: string;
  shareUrl?: string;
  canEdit?: boolean;
  isOwner?: boolean;
}

export interface SharedUser {
  userId: number;
  username: string;
  canEdit: boolean;
}

export interface SigninData {
  username: string;
  password: string;
}

export interface SignupData {
  username: string;
  password: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface CreatePasteData {
  title?: string;
  content: string;
  expiresIn?: number;
  sharedWith?: Array<{
    username: string;
    canEdit: boolean;
  }>;
}

export interface UpdatePasteData {
  content?: string;
  title?: string;
}

export const authApi = {
  signup: async (data: SignupData) => {
    const response = await api.post('/auth/signup', data);
    return response.data;
  },

  signin: async (data: SigninData) => {
    const response = await api.post('/auth/signin', data);
    return response.data;
  },

  changePassword: async (data: ChangePasswordData) => {
    const response = await api.post('/auth/change-password', data);
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Admin endpoints
  getAllUsers: async () => {
    const response = await api.get('/auth/users');
    return response.data;
  },

  updateUserRole: async (userId: number, role: 'admin' | 'user') => {
    const response = await api.patch(`/auth/users/${userId}/role`, { role });
    return response.data;
  },
};

export const pasteApi = {
  create: async (data: CreatePasteData) => {
    const response = await api.post('/pastes', data);
    return response.data;
  },

  getMyPastes: async () => {
    const response = await api.get('/pastes/my-pastes');
    return response.data;
  },

  getByShareId: async (shareId: string) => {
    const response = await api.get(`/pastes/${shareId}`);
    return response.data;
  },

  update: async (shareId: string, data: UpdatePasteData) => {
    const response = await api.patch(`/pastes/${shareId}`, data);
    return response.data;
  },

  getSharedUsers: async (shareId: string) => {
    const response = await api.get(`/pastes/${shareId}/shared-users`);
    return response.data;
  },

  delete: async (shareId: string) => {
    const response = await api.delete(`/pastes/${shareId}`);
    return response.data;
  },
};

export default api;
