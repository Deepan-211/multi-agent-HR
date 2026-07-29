const API_BASE = '/api';

export const getToken = () => localStorage.getItem('token');
export const setToken = (token: string) => localStorage.setItem('token', token);
export const clearToken = () => localStorage.removeItem('token');

// Utility for storing the mock audit ID so it persists across page navigations
export const getActiveAuditId = () => localStorage.getItem('active_audit_id');
export const setActiveAuditId = (id: string) => localStorage.setItem('active_audit_id', id);

export const getHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  // Legacy mock login to keep the AuthPage working seamlessly
  login: async (_username: string, _password: string) => {
    // Just fake a login response for the presentation
    return { access_token: "mock-jwt-token-123" };
  },

  // Dashboard metrics from the real backend
  getDashboardMetrics: async () => {
    try {
      const response = await fetch(`${API_BASE}/dashboard/metrics`, {
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json();
    } catch {
      // Fallback for when backend hasn't run an audit yet
      return {
        active_audits: 1,
        total_bias_flags: 412,
        avg_epsilon_consumed: 1.25,
        org_epsilon_budget: 10,
        hitl_pending_count: 2
      };
    }
  },

  // 1. POST /api/audits/start
  startHackathonAudit: async () => {
    const response = await fetch(`${API_BASE}/audits/start`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to start mock audit');
    return response.json();
  },

  // 2. GET /api/audits/{id}/status
  getHackathonStatus: async (auditId: string) => {
    const response = await fetch(`${API_BASE}/audits/${auditId}/status`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch audit status');
    return response.json();
  },

  // 3. GET /api/audits/{id}/results
  getHackathonResults: async (auditId: string) => {
    const response = await fetch(`${API_BASE}/audits/${auditId}/results`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch audit results');
    return response.json();
  },

  // 4. GET /api/audits/{id}/equity
  getHackathonEquity: async (auditId: string) => {
    const response = await fetch(`${API_BASE}/audits/${auditId}/equity`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch equity recommendations');
    return response.json();
  },

  // 5. POST /api/hitl/{id}/decision
  submitHitlDecision: async (auditId: string, decision: string) => {
    const response = await fetch(`${API_BASE}/hitl/${auditId}/decision`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ decision }),
    });
    if (!response.ok) throw new Error('Failed to submit decision');
    return response.json();
  }
};
