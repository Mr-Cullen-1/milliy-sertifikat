// content/gen generatorlaridan 6 ta variantni content/variants/*.json ga yozadi: pnpm content:dump
import { spawnSync } from 'node:child_process';

const r = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'tests/content/dump-variants.test.ts'], {
  stdio: 'inherit',
  env: { ...process.env, DUMP_VARIANTS: '1' },
});
process.exit(r.status ?? 1);
