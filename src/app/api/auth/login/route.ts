import { NextResponse } from 'next/server';
import { TOKEN_COOKIE, cookieOptions } from '@/lib/auth';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

// Browser -> here -> ledger-api. On success we stash the JWT in an httpOnly
// cookie and return only the safe user object to the browser.
export async function POST(req: Request) {
  const body = await req.json();
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { message: data.message ?? 'Login failed' },
      { status: res.status },
    );
  }
  const response = NextResponse.json({ user: data.user });
  response.cookies.set(TOKEN_COOKIE, data.accessToken, cookieOptions);
  return response;
}
