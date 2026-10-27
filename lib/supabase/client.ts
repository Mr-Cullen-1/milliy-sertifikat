import { createBrowserClient } from '@supabase/ssr';
import { publicEnv } from '../env';
import type { Database } from './database.types';

/** Brauzer (Client Component) uchun; faqat publishable key, RLS bilan cheklangan. */
export function createClient() {
  return createBrowserClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
