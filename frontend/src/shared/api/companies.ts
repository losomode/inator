import apiClient from './client';

export interface Company {
  id: number;
  name: string;
}

/** Companies API endpoints. */
export const companiesApi = {
  list: async (): Promise<Company[]> => {
    const response = await apiClient.get<{ results: Company[] }>('/companies/');
    return response.data.results;
  },

  get: async (id: number): Promise<Company> => {
    const response = await apiClient.get<Company>(`/companies/${id}/`);
    return response.data;
  },
};
