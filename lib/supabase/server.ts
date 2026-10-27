import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { publicEnv } from '../env';
import type { Database } from './database.types';

/** Server Component / Server Function / Route Handler uchun; foydalanuvchi sessiyasi (cookie) bilan ishlaydi. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // Server Component'dan cookie yozib bo'lmaydi; sessiyani proxy.ts yangilaydi.
        }
      },
    },
  });
}
