import 'server-only';
import { z } from 'zod';

const schema = z.object({
  SUPABASE_SECRET_KEY: z
    .string()
    .min(20)
    .refine((v) => !v.startsWith('sb_publishable_'), 'Bu publishable key! SUPABASE_SECRET_KEY ga secret key (yoki service_role) qo\'ying'),
});

export const serverEnv = schema.parse({
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
});
