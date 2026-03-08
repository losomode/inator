import apiClient from './client';

export interface Company {
  id: number;
  name: string;
}

/** Companies API endpoints. */
export const companiesApi = {
  list: async (): Promise<Company[]> => {
    const response = await apiClient.get<Company[]>('/users/api/companies/');
    return response.data;
  },

  get: async (id: number): Promise<Company> => {
    const response = await apiClient.get<Company>(`/users/api/companies/${id}/`);
    return response.data;
  },
};
