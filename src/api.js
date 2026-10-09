const BASE = import.meta.env.VITE_API_BASE_URL || '';

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error?.message || `Request failed (${status})`);
    this.status = status;
    this.code = body?.error?.code;
    this.details = body?.error?.details;
  }
}

async function handle(res) {
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body);
  return body;
}

export async function apiFetch(path, { method = 'GET', body, query } = {}) {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  Object.entries(query ?? {}).forEach(([k, v]) => v !== '' && v != null && url.searchParams.set(k, v));
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  return handle(res);
}

/** Uploads a file with progress reporting (fetch does not expose upload progress). */
export function uploadCsv(file, { force = false, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/api/uploads${force ? '?force=true' : ''}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let body = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON response */
      }
      xhr.status >= 200 && xhr.status < 300 ? resolve(body) : reject(new ApiError(xhr.status, body));
    };
    xhr.onerror = () => reject(new ApiError(0, { error: { message: 'Network error. Check your connection.' } }));
    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
}
