/**
 * API utility for communicating with the Express backend
 */

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  console.log(`fetching: ${endpoint}`);
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      throw new Error(`Server Error (${response.status}): ${response.statusText}`);
    }
    throw new Error(errorData.error || `HTTP Error ${response.status}: ${response.statusText}`);
  }

  return response.json().catch(() => ({}));
}

export const api = {
  auth: {
    login: (credentials: any) => apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    logout: () => apiFetch('/api/auth/logout', { method: 'POST' }),
    me: () => apiFetch('/api/auth/me'),
    getProfile: () => apiFetch('/api/auth/profile'),
    updateProfile: (data: any) => apiFetch('/api/auth/profile', { method: 'PATCH', body: JSON.stringify(data) }),
    health: () => apiFetch('/api/health'),
  },
  dashboard: {
    getStats: () => apiFetch('/api/dashboard/stats'),
    lookup: (code: string) => apiFetch(`/api/lookup/${code}`),
  },
  students: {
    list: () => apiFetch('/api/students'),
    search: (q: string) => apiFetch(`/api/students/search?q=${encodeURIComponent(q)}`),
    getDetail: (id: string) => apiFetch(`/api/students/${id}`),
    create: (data: any) => apiFetch('/api/students', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => apiFetch(`/api/students/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    bulkCreate: (students: any[]) => apiFetch('/api/students/bulk', { method: 'POST', body: JSON.stringify({ students }) }),
  },
  teachers: {
    list: () => apiFetch('/api/teachers'),
    create: (data: any) => apiFetch('/api/teachers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => apiFetch(`/api/teachers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch(`/api/teachers/${id}`, { method: 'DELETE' }),
  },
  books: {
    list: () => apiFetch('/api/books'),
    search: (q: string) => apiFetch(`/api/books/search?q=${encodeURIComponent(q)}`),
    create: (data: any) => apiFetch('/api/books', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => apiFetch(`/api/books/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    getDetail: (id: string) => apiFetch(`/api/books/${id}`),
    lookup: (code: string) => apiFetch(`/api/books/lookup/${code}`),
  },
  transactions: {
    issue: (data: { barcode: string; studentQR: string }) => apiFetch('/api/transactions/issue', { method: 'POST', body: JSON.stringify(data) }),
    return: (data: { barcode: string; studentQR: string }) => apiFetch('/api/transactions/return', { method: 'POST', body: JSON.stringify(data) }),
    list: () => apiFetch('/api/transactions'),
    syncOverdue: () => apiFetch('/api/transactions/sync-overdue', { method: 'POST' }),
  }
};
