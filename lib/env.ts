import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(20)
    .refine((v) => !v.startsWith('sb_secret_'), 'Bu secret key! Brauzerga chiqadigan o\'zgaruvchiga publishable key qo\'ying'),
  // Hozir ishlatilmaydi (login yo'q); keyinchalik auth/SSO redirect uchun kerak bo'ladi.
  NEXT_PUBLIC_SITE_URL: z.url().optional(),
});

// NEXT_PUBLIC_* qiymatlari brauzer bundle'iga faqat to'g'ridan-to'g'ri `process.env.NAME` ko'rinishida kiradi,
// shuning uchun ularni bitta-bitta yozamiz (process.env ni butunlay uzatib bo'lmaydi).
export const publicEnv = schema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});
