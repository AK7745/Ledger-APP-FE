// Shared auth constants for the BFF (backend-for-frontend) layer.
// The JWT lives in an httpOnly cookie that JS cannot read — the Next server
// attaches it to API calls on the browser's behalf.

export const TOKEN_COOKIE = 'access_token';

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days — matches the API's JWT_EXPIRES_IN
};

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'MEMBER';
  tenantId: string;
}
