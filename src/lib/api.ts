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
  },
  dashboard: {
    getStats: () => apiFetch('/api/dashboard/stats'),
  },
  students: {
    list: () => apiFetch('/api/students'),
    create: (data: any) => apiFetch('/api/students', { method: 'POST', body: JSON.stringify(data) }),
    bulkCreate: (students: any[]) => apiFetch('/api/students/bulk', { method: 'POST', body: JSON.stringify({ students }) }),
  },
  books: {
    list: () => apiFetch('/api/books'),
    create: (data: any) => apiFetch('/api/books', { method: 'POST', body: JSON.stringify(data) }),
    lookup: (code: string) => apiFetch(`/api/books/lookup/${code}`),
  },
  transactions: {
    issue: (data: { barcode: string; studentQR: string }) => apiFetch('/api/issue-book', { method: 'POST', body: JSON.stringify(data) }),
    return: (data: { barcode: string; studentQR: string }) => apiFetch('/api/return-book', { method: 'POST', body: JSON.stringify(data) }),
  }
};
