import { cache } from 'react';
import { cookies } from 'next/headers';
import { TOKEN_COOKIE, type AuthUser } from './auth';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

/**
 * Server-side fetch to the ledger-api. Reads the JWT from the httpOnly cookie
 * and attaches it as a Bearer token. Use only in Server Components / Route
 * Handlers (it depends on the request's cookies).
 */
export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${API_URL}${path}`, { ...init, headers, cache: 'no-store' });
}

/**
 * Returns the logged-in user with their CURRENT access (roles, isOwner,
 * permissions), or null if the token is missing/invalid.
 *
 * Wrapped in React `cache` so the protected layout and every nested access
 * gate share ONE /auth/me call per request. The cache lives for a single
 * server request only, so permission changes still show on the next request.
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const res = await apiFetch('/auth/me');
  if (!res.ok) return null;
  return (await res.json()) as AuthUser;
});
