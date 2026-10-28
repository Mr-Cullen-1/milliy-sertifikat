import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { publicEnv } from '../env';
import { AREA_HEADER, cookieOptionsFor } from './area';
import type { Database } from './database.types';

// Sessiya talab qiladigan yo'llar. /admin alohida: kirishsiz /admin/login ga yo'naltiriladi (rol sahifada tekshiriladi).
const PROTECTED = ['/exams', '/attempts', '/history', '/mistakes'];

const isProtected = (pathname: string) => PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
const isAdminArea = (pathname: string) => (pathname === '/admin' || pathname.startsWith('/admin/')) && !pathname.startsWith('/admin/login');

/**
 * Sessiya cookie'sini yangilaydi; sessiyasiz ishtirokchini himoyalangan yo'ldan /start (ro'yxatga olish),
 * admin hududidan /admin/login ga yo'naltiradi. requestHeaders va csp: nonce asosidagi CSP (lib/security/csp.ts).
 * Login yo'q: ishtirokchi sessiyasi /start formasi yuborilganda yaratiladi (docs/auth.md).
 */
export async function updateSession(request: NextRequest, requestHeaders: Headers, csp: string): Promise<NextResponse> {
  const next = () => NextResponse.next({ request: { headers: requestHeaders } });
  let response = next();

  const supabase = createServerClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: cookieOptionsFor(requestHeaders.get(AREA_HEADER)),
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        for (const { name, value } of list) request.cookies.set(name, value);
        // Yangilangan cookie'lar ham keyingi (render) so'rov sarlavhalariga o'tsin.
        requestHeaders.set('cookie', request.headers.get('cookie') ?? '');
        response = next();
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  // getClaims: JWT'ni lokal tekshiradi (har so'rovda Auth serveriga murojaat qilmaydi).
  const { data } = await supabase.auth.getClaims();
  const pathname = request.nextUrl.pathname;
  const admin = isAdminArea(pathname);

  if (!data?.claims && (isProtected(pathname) || admin)) {
    const url = request.nextUrl.clone();
    url.pathname = admin ? '/admin/login' : '/start';
    url.search = '';
    if (!admin) url.searchParams.set('next', pathname);
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    redirect.headers.set('Content-Security-Policy', csp);
    return redirect;
  }

  response.headers.set('Content-Security-Policy', csp);
  return response;
}
