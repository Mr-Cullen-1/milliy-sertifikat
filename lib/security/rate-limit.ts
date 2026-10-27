import 'server-only';
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { createAdminClient } from '../supabase/admin';

/** Mijozni IP bo'yicha ajratadigan kalit (IP xeshlanadi: xom IP bazaga yozilmaydi). */
export async function clientKey(): Promise<string> {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

/**
 * Postgres asosidagi rate limit (serverless'da bir nechta nusxa o'rtasida umumiy).
 * true = ruxsat. Baza xatosida: failClosed=true bo'lsa rad etadi (login kabi muhim joylar), aks holda ruxsat beradi.
 */
export async function rateLimit(key: string, limit: number, windowSec: number, opts: { failClosed?: boolean } = {}): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient().rpc('rate_limit_hit', { p_key: key, p_limit: limit, p_window_sec: windowSec });
    if (error) throw error;
    return data === true;
  } catch (e) {
    console.error('rateLimit xatosi:', e instanceof Error ? e.message : e);
    return !opts.failClosed;
  }
}
