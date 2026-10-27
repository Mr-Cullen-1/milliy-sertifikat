// Jonli (real Supabase) testlarni ishga tushiradi: pnpm test:live  (.env va .env.local o'qiladi)
import { spawnSync } from 'node:child_process';

const r = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'tests/live'], {
  stdio: 'inherit',
  env: { ...process.env, LIVE_E2E: '1' },
});
process.exit(r.status ?? 1);
