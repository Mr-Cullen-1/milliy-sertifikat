import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAX_IMPORT_BYTES, validateImportText } from '../../lib/content/validate';

// content/export/practice (pnpm content:export:practice): har mavzu alohida papkada, fayllar import validatoridan o'tishi shart.
const root = join(process.cwd(), 'content', 'export', 'practice');
const indexPath = join(root, 'index.json');

interface IndexTopic {
  topic: number;
  folder: string;
  questions: number;
  files: string[];
}
interface Index {
  total_questions: number;
  total_files: number;
  topics: IndexTopic[];
}

describe.skipIf(!existsSync(indexPath))('mashq eksporti: mavzular bo\'yicha', () => {
  const index = JSON.parse(readFileSync(indexPath, 'utf8')) as Index;

  it('indeks fayllar va savollar soniga mos', () => {
    expect(index.topics.reduce((s, t) => s + t.questions, 0)).toBe(index.total_questions);
    expect(index.topics.reduce((s, t) => s + t.files.length, 0)).toBe(index.total_files);
    expect(new Set(index.topics.map((t) => t.topic)).size).toBe(index.topics.length);
  });

  const seen = new Set<string>();
  for (const t of index.topics) {
    it(`mavzu ${t.topic}: ${t.files.length} fayl, ${t.questions} savol, faqat shu mavzu, validatordan o'tadi`, () => {
      let total = 0;
      for (const f of t.files) {
        const p = join(root, t.folder, f);
        expect(statSync(p).size, `${f} hajmi`).toBeLessThan(MAX_IMPORT_BYTES);
        const res = validateImportText(readFileSync(p, 'utf8'));
        if (!res.ok) throw new Error(`${f}: ${res.problems.slice(0, 3).map((x) => `${x.path}: ${x.message}`).join('; ')}`);
        expect(res.file.questions.length, `${f}: savollar soni`).toBeLessThanOrEqual(500);
        expect(res.summary.exam).toBeNull();
        for (const q of res.file.questions) {
          expect(q.pool, q.external_id).toBe('practice');
          expect(q.topic, q.external_id).toBe(t.topic);
          expect(q.external_id, 'external_id').toBeTruthy();
          expect(seen.has(q.external_id!), `${q.external_id} takrorlangan`).toBe(false);
          seen.add(q.external_id!);
        }
        total += res.file.questions.length;
      }
      expect(total).toBe(t.questions);
    });
  }
});
