// content/gen generatorlaridan mashq zaxirasini content/pool/*.json ga yozadi: pnpm content:pool
import { spawnSync } from 'node:child_process';

const r = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'tests/content/dump-pool.test.ts'], {
  stdio: 'inherit',
  env: { ...process.env, DUMP_POOL: '1' },
});
process.exit(r.status ?? 1);
