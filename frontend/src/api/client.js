import { handle, MockError } from './mock';

const BASE = import.meta.env.VITE_API_URL || '/api';
const DEMO = import.meta.env.VITE_DEMO === 'true';

let token = localStorage.getItem('token');
export const getToken = () => token;
export const setToken = (t) => {
  token = t;
  if (t) localStorage.setItem('token', t);
  else localStorage.removeItem('token');
};

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, params, raw } = {}) {
  if (DEMO) {
    try {
      return await handle({ method, path, params, body, token });
    } catch (e) {
      if (e instanceof MockError) {
        if (e.status === 401 && token) {
          setToken(null);
          window.dispatchEvent(new Event('auth:expired'));
        }
        throw new ApiError(e.status, e.message);
      }
      throw e;
    }
  }
  const url = new URL(BASE + path, window.location.origin);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined) url.searchParams.set(k, v);
  });

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (body instanceof FormData) {
    payload = body; // le navigateur fixe le Content-Type multipart
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(url, { method, headers, body: payload });

  if (res.status === 401 && token) {
    setToken(null);
    window.dispatchEvent(new Event('auth:expired'));
  }
  if (!res.ok) {
    let message = 'Une erreur est survenue. Réessayez.';
    try {
      const data = await res.json();
      const m = data.message || data.detail;
      if (typeof m === 'string') message = m;
    } catch {
      /* corps non JSON */
    }
    throw new ApiError(res.status, message);
  }
  if (raw) return res.blob();
  return res.status === 204 ? null : res.json();
}

export const api = {
  get: (p, params) => request(p, { params }),
  post: (p, body) => request(p, { method: 'POST', body }),
  put: (p, body) => request(p, { method: 'PUT', body }),
  patch: (p, body) => request(p, { method: 'PATCH', body }),
  del: (p) => request(p, { method: 'DELETE' }),
  blob: (p) => request(p, { raw: true }),
};
