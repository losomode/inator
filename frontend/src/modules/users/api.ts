import apiClient from '../../shared/api/client';
import type { UserProfile, Company, Invitation, UserPreferences } from './types';

/** User profile endpoints. */
export const usersApi = {
  list: async (params?: Record<string, string>): Promise<UserProfile[]> => {
    const response = await apiClient.get<UserProfile[]>('/users/', { params });
    return response.data;
  },

  get: async (userId: number): Promise<UserProfile> => {
    const response = await apiClient.get<UserProfile>(`/users/${String(userId)}/`);
    return response.data;
  },

  me: async (): Promise<UserProfile> => {
    const response = await apiClient.get<UserProfile>('/users/me/');
    return response.data;
  },

  updateMe: async (data: Partial<UserProfile>): Promise<UserProfile> => {
    const response = await apiClient.patch<UserProfile>('/users/me/', data);
    return response.data;
  },

  update: async (userId: number, data: Partial<UserProfile>): Promise<UserProfile> => {
    const response = await apiClient.patch<UserProfile>(`/users/${String(userId)}/`, data);
    return response.data;
  },

  getPreferences: async (): Promise<UserPreferences> => {
    const response = await apiClient.get<UserPreferences>('/users/preferences/me/');
    return response.data;
  },

  updatePreferences: async (data: Partial<UserPreferences>): Promise<UserPreferences> => {
    const response = await apiClient.patch<UserPreferences>('/users/preferences/me/', data);
    return response.data;
  },
};

/** Company endpoints. */
export const companiesApi = {
  list: async (): Promise<Company[]> => {
    const response = await apiClient.get<Company[]>('/companies/');
    return response.data;
  },

  get: async (id: number): Promise<Company> => {
    const response = await apiClient.get<Company>(`/companies/${String(id)}/`);
    return response.data;
  },
};

/** Invitation endpoints. */
export const invitationsApi = {
  list: async (params?: Record<string, string>): Promise<Invitation[]> => {
    const response = await apiClient.get<Invitation[]>('/invitations/', { params });
    return response.data;
  },

  create: async (data: Partial<Invitation>): Promise<Invitation> => {
    const response = await apiClient.post<Invitation>('/invitations/', data);
    return response.data;
  },

  approve: async (id: number): Promise<Invitation> => {
    const response = await apiClient.post<Invitation>(`/invitations/${String(id)}/approve/`);
    return response.data;
  },

  reject: async (id: number, reason: string): Promise<Invitation> => {
    const response = await apiClient.post<Invitation>(`/invitations/${String(id)}/reject/`, {
      reason,
    });
    return response.data;
  },
};
