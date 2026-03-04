const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (res.status === 204) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Companies ───────────────────────────────────────────────────────────────

export const getCompanies = () => request('/api/companies');

export const createCompany = (data) =>
  request('/api/companies', { method: 'POST', body: JSON.stringify(data) });

export const deleteCompany = (id) =>
  request(`/api/companies/${id}`, { method: 'DELETE' });

// ── Jobs ────────────────────────────────────────────────────────────────────

export const getJobs = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.company_id) params.set('company_id', filters.company_id);
  if (filters.role_type) params.set('role_type', filters.role_type);
  if (filters.location) params.set('location', filters.location);
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  const qs = params.toString();
  return request(`/api/jobs${qs ? `?${qs}` : ''}`);
};

export const createJob = (data) =>
  request('/api/jobs', { method: 'POST', body: JSON.stringify(data) });

export const updateJob = (id, data) =>
  request(`/api/jobs/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const updateJobStatus = (id, status) =>
  request(`/api/jobs/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });

export const deleteJob = (id) =>
  request(`/api/jobs/${id}`, { method: 'DELETE' });

// ── Analytics ───────────────────────────────────────────────────────────────

export const getAnalytics = () => request('/api/analytics');

// ── Contacts ────────────────────────────────────────────────────────────────

export const getContacts = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.company_id) params.set('company_id', filters.company_id);
  if (filters.search) params.set('search', filters.search);
  const qs = params.toString();
  return request(`/api/contacts${qs ? `?${qs}` : ''}`);
};

export const createContact = (data) =>
  request('/api/contacts', { method: 'POST', body: JSON.stringify(data) });

export const updateContact = (id, data) =>
  request(`/api/contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteContact = (id) =>
  request(`/api/contacts/${id}`, { method: 'DELETE' });
