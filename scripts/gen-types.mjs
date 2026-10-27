// Supabase sxemasidan TypeScript tiplarini generatsiya qiladi: pnpm gen:types
// SUPABASE_DB_URL .env.local dan olinadi (Session pooler).
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const url = process.env.SUPABASE_DB_URL;
if (!url) throw new Error('SUPABASE_DB_URL topilmadi (.env.local ni tekshiring)');

try {
  const out = execSync(`npx -y supabase@latest gen types typescript --db-url "${url}" --schema public`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 32 * 1024 * 1024,
  });
  writeFileSync(new URL('../lib/supabase/database.types.ts', import.meta.url), out);
  console.log(`lib/supabase/database.types.ts yozildi (${out.split('\n').length} qator)`);
} catch (e) {
  // buyruq satrida parol bor: xabarda ko'rsatmaymiz
  console.error('Tip generatsiyasi xato bilan tugadi:', String(e.stderr ?? e.message).split(url).join('***'));
  process.exit(1);
}
