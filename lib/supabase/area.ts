/**
 * Sessiya hududlari. Ishtirokchi va admin bitta brauzerda bir vaqtda kira olishi uchun ularning sessiya cookie'lari ajratilgan:
 * - 'admin' (/admin...): Supabase'ning standart cookie nomi;
 * - 'app' (qolgan hamma sahifa): `sb-participant`.
 * Aks holda admin kirganda ishtirokchi sessiyasi almashib ketardi (natija sahifasi 404, qoralama variantlar ko'rinishi).
 */
export type Area = 'admin' | 'app';

export const AREA_HEADER = 'x-area';
export const PARTICIPANT_COOKIE = 'sb-participant';

export const areaOf = (pathname: string): Area => (pathname === '/admin' || pathname.startsWith('/admin/') ? 'admin' : 'app');

/** createServerClient uchun cookieOptions: admin hududi standart nomda qoladi. */
export const cookieOptionsFor = (area: string | null | undefined) => (area === 'admin' ? undefined : { name: PARTICIPANT_COOKIE });
