import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildVariantFile } from '../../content/gen';
import { VARIANT_CODES, VARIANT_COUNT } from '../../content/gen/layout';

// Generatsiya natijasini content/variants/variant-X.json ga yozadi: `pnpm content:dump` (DUMP_VARIANTS=1 bilan ishga tushadi).
// Oddiy `pnpm test` da o'tkazib yuboriladi. Fayllar admin paneli orqali ham yuklanishi mumkin.
describe.runIf(process.env.DUMP_VARIANTS === '1')('variantlarni JSON ga yozish', () => {
  it('6 ta fayl yoziladi', () => {
    const dir = join(process.cwd(), 'content', 'variants');
    mkdirSync(dir, { recursive: true });
    for (let v = 0; v < VARIANT_COUNT; v++) {
      const file = buildVariantFile(v);
      writeFileSync(join(dir, `variant-${VARIANT_CODES[v]}.json`), JSON.stringify(file, null, 1) + '\n');
    }
    expect(true).toBe(true);
  });
});
