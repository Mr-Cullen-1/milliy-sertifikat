import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { publicEnv } from '../env';
import { serverEnv } from '../env.server';
import type { Database } from './database.types';

/**
 * service_role: RLS'ni chetlab o'tadi. FAQAT serverda va faqat kalit/ball kabi
 * talabaga ochilmaydigan amallar uchun (close_attempt, store_attempt_score, kalitlarni o'qish).
 * Chaqirishdan oldin foydalanuvchi huquqini o'zingiz tekshiring.
 */
export function createAdminClient() {
  return createClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
