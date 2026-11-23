// content/variants/variant-*.json (ichki format) -> content/export/variant-*.v2.json (docs/import-format.md, v2 formati): pnpm content:export
// Savollar o'zgarmaydi; qo'shiladi: schema_version, exam.slug/format/duration_seconds/status, savolda position (1 dan).
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const src = join(process.cwd(), 'content', 'variants');
const out = join(process.cwd(), 'content', 'export');
mkdirSync(out, { recursive: true });

const files = readdirSync(src).filter((f) => /^variant-[A-Z]\.json$/.test(f)).sort();
if (files.length === 0) throw new Error('content/variants/variant-*.json topilmadi; avval "pnpm content:dump" ni ishga tushiring');

for (const f of files) {
  const data = JSON.parse(readFileSync(join(src, f), 'utf8'));
  const { title, code, is_free: isFree } = data.exam;
  const file = {
    schema_version: 2,
    exam: {
      title,
      code,
      slug: `variant-${String(code).toLowerCase()}`,
      format: 'math-v1',
      duration_seconds: 9000,
      is_free: isFree ?? false,
      status: 'draft',
    },
    questions: data.questions.map((q, i) => {
      const { external_id: externalId, ...rest } = q;
      return { external_id: externalId, position: i + 1, ...rest };
    }),
  };
  const name = `variant-${code}.v2.json`;
  writeFileSync(join(out, name), `${JSON.stringify(file, null, 2)}\n`);
  console.log(`${name}: ${file.questions.length} savol`);
}
