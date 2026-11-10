'use client';

// Client-side API helper. Talks to the BFF proxy (/api/proxy/*), which attaches
// the auth token server-side. Use from client components.

export class ApiError extends Error {
  status: number;
  /** On a 403: the permission that was missing (or `anyOf` candidates). */
  permission?: string;
  anyOf?: string[];
  constructor(
    message: string,
    status: number,
    extra: { permission?: string; anyOf?: string[] } = {},
  ) {
    super(message);
    this.status = status;
    this.permission = extra.permission;
    this.anyOf = extra.anyOf;
  }
}

/**
 * The API's 403 says *which* permission was missing (docs/RBAC.md §7); turn it
 * into a sentence a user can act on instead of a bare "Missing permission".
 */
function forbiddenMessage(data: { permission?: string; anyOf?: string[]; missing?: string[]; message?: string }) {
  if (data.permission) return `You don't have permission to do this (needs ${data.permission}).`;
  if (data.anyOf?.length) return `You don't have permission to do this (needs one of: ${data.anyOf.join(', ')}).`;
  // Admin guardrails explain themselves (e.g. "You can't assign … you don't hold").
  if (data.message && data.message !== 'Missing permission') return data.message;
  return "You don't have permission to do this.";
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`/api/proxy/${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    if (res.status === 403 && data && typeof data === 'object') {
      throw new ApiError(forbiddenMessage(data), 403, {
        permission: data.permission,
        anyOf: data.anyOf,
      });
    }
    const msg = data?.message;
    throw new ApiError(
      Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Request failed'),
      res.status,
    );
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
};
