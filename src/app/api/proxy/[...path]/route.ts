import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { TOKEN_COOKIE } from '@/lib/auth';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

// Generic authenticated proxy: the browser calls /api/proxy/<api-path>, and we
// forward to ledger-api with the httpOnly-cookie JWT attached as a Bearer token.
// Keeps the token unreadable by JS and avoids CORS entirely.
async function forward(req: NextRequest, path: string[]) {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  const url = `${API_URL}/${path.join('/')}${req.nextUrl.search}`;

  const headers: Record<string, string> = {};
  const contentType = req.headers.get('content-type');
  if (contentType) headers['content-type'] = contentType;
  if (token) headers['authorization'] = `Bearer ${token}`;

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const res = await fetch(url, {
    method: req.method,
    headers,
    body: hasBody ? await req.text() : undefined,
    cache: 'no-store',
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: {
      'content-type': res.headers.get('content-type') ?? 'application/json',
    },
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path);
}
export async function POST(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path);
}
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path);
}
export async function PUT(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path);
}
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path);
}
