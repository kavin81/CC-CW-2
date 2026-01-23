import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
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
}

export interface Paste {
  id: number;
  shareId: string;
  title: string;
  content: string;
  createdAt: string;
  expiresAt?: string;
  shareUrl?: string;
}

export interface SigninData {
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
}

export const authApi = {
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

  delete: async (shareId: string) => {
    const response = await api.delete(`/pastes/${shareId}`);
    return response.data;
  },
};

export default api;
