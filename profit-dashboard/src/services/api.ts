import axios from 'axios';

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? 'https://api.amolbooks.com';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function fetchProfitDashboard(startDate: string, endDate: string) {
  const { data } = await api.get('/dashboard/profit', {
    params: { startDate, endDate },
  });
  return data.data;
}

export async function fetchExpenses(startDate: string, endDate: string) {
  const { data } = await api.get('/dashboard/profit/expense', {
    params: { startDate, endDate },
  });
  return data.data;
}

export async function addExpense(body: { date: string; amount: number; category: string; note?: string }) {
  const { data } = await api.post('/dashboard/profit/expense', body);
  return data.data;
}

export async function deleteExpense(id: string) {
  const { data } = await api.delete(`/dashboard/profit/expense/${id}`);
  return data;
}
