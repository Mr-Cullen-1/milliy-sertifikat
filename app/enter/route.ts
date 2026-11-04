import { NextResponse, type NextRequest } from 'next/server';
import { clientKey, rateLimit } from '@/lib/security/rate-limit';
import { createClient } from '@/lib/supabase/server';

/**
 * Test akkauntga kirish: admin panelda yaratilgan bir martalik havola (token_hash) ishtirokchi sessiyasini beradi.
 * Token bir marta ishlaydi va tez eskiradi; faqat `@tester.invalid` akkauntlar uchun havola yaratiladi (app/admin/actions.ts).
 * Xato bo'lsa sababi aytilmaydi: oddiy ro'yxatga olish sahifasiga yo'naltiriladi.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('t') ?? '';
  if (/^[A-Za-z0-9_-]{16,200}$/.test(token) && (await rateLimit(`enter:${await clientKey()}`, 20, 900, { failClosed: true }))) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: token, type: 'email' });
    if (!error) return NextResponse.redirect(new URL('/exams', request.url));
  }
  return NextResponse.redirect(new URL('/start', request.url));
}
