import type { NextRequest } from 'next/server';
import { buildCsp, parseFrameAncestors } from './lib/security/csp';
import { updateSession } from './lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp({
    nonce,
    isDev: process.env.NODE_ENV === 'development',
    frameAncestors: parseFrameAncestors(process.env.ALLOWED_FRAME_ANCESTORS),
  });

  // Next.js nonce'ni so'rovdagi CSP sarlavhasidan oladi va o'z skriptlariga qo'yadi.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  return updateSession(request, requestHeaders, csp);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
