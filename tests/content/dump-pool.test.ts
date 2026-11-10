import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildPool } from '../../content/gen/pool';

const CHUNK = 100;

const tally = (qs: Record<string, unknown>[], key: string): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const q of qs) out[String(q[key])] = (out[String(q[key])] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true })));
};

// Mashq zaxirasini content/pool/pool-NNN.json (100 tadan) va summary.json ga yozadi: `pnpm content:pool` (DUMP_POOL=1 bilan).
// Oddiy `pnpm test` da o'tkazib yuboriladi. Yuklash: `pnpm content:pool:seed`.
describe.runIf(process.env.DUMP_POOL === '1')('mashq zaxirasini JSON ga yozish', () => {
  it('fayllar va summary yoziladi', () => {
    const dir = join(process.cwd(), 'content', 'pool');
    mkdirSync(dir, { recursive: true });
    // eski bo'laklar qolib ketmasin
    for (const f of readdirSync(dir)) if (/^pool-\d+\.json$/.test(f)) rmSync(join(dir, f));

    const pool = buildPool();
    for (let i = 0; i * CHUNK < pool.questions.length; i++) {
      const name = `pool-${String(i + 1).padStart(3, '0')}.json`;
      writeFileSync(join(dir, name), JSON.stringify({ questions: pool.questions.slice(i * CHUNK, (i + 1) * CHUNK) }, null, 1) + '\n');
    }
    const byBlockType: Record<string, number> = {};
    const byBlockDifficulty: Record<string, number> = {};
    for (const q of pool.questions) {
      byBlockType[`${q.block}/${q.type}`] = (byBlockType[`${q.block}/${q.type}`] ?? 0) + 1;
      byBlockDifficulty[`${q.block}/${q.difficulty}`] = (byBlockDifficulty[`${q.block}/${q.difficulty}`] ?? 0) + 1;
    }
    const summary = {
      total: pool.questions.length,
      skipped: pool.skipped,
      duplicates: pool.duplicates,
      byBlock: tally(pool.questions, 'block'),
      byType: tally(pool.questions, 'type'),
      byDifficulty: tally(pool.questions, 'difficulty'),
      byBlockType,
      byBlockDifficulty,
      byTopic: tally(pool.questions, 'topic'),
      topicsCovered: new Set(pool.questions.map((q) => q.topic)).size,
    };
    writeFileSync(join(dir, 'summary.json'), JSON.stringify(summary, null, 1) + '\n');
    expect(pool.questions.length).toBeGreaterThan(0);
  });
});
