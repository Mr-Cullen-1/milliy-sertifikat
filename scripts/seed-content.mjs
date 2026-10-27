// content/variants/*.json ni bazaga yuklaydi va faqat A variantini ochadi: pnpm content:seed
//   pnpm content:seed                 -> A..F yuklanadi, A nashr etiladi (qolganlari qoralama: admin paneldan ochiladi)
//   pnpm content:seed --publish none  -> hech qaysi nashr etilmaydi
// Idempotent: variant kodi (exams.code) va savol external_id bo'yicha takrorlanmaydi. Nashr etilgan mockni o'zgartirmaydi.
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const publishArg = args.includes('--publish') ? args[args.indexOf('--publish') + 1] : 'A';
const publishCodes = publishArg === 'none' ? [] : publishArg.split(',').map((s) => s.trim().toUpperCase());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL yoki SUPABASE_SECRET_KEY topilmadi');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const CODES = ['A', 'B', 'C', 'D', 'E', 'F'];
const dir = join(process.cwd(), 'content', 'variants');

for (const [i, code] of CODES.entries()) {
  const file = join(dir, `variant-${code}.json`);
  if (!existsSync(file)) {
    console.log(`${code}: fayl yo'q (${file}); "pnpm content:dump" ni ishga tushiring`);
    continue;
  }
  const data = JSON.parse(readFileSync(file, 'utf8'));

  const existing = await db.from('exams').select('id, status').eq('code', code).maybeSingle();
  if (existing.error) throw new Error(`${code}: ${existing.error.message}`);

  let examId = existing.data?.id;
  if (examId) {
    console.log(`${code}: mock allaqachon bor (${existing.data.status}), yuklash o'tkazib yuborildi`);
  } else {
    const { data: r, error } = await db.rpc('import_questions', {
      p_questions: data.questions,
      p_exam: { title: data.exam.title, code, is_free: data.exam.is_free ?? true, sort: i, format: 'math-v1' },
    });
    if (error) throw new Error(`${code}: import xatosi: ${error.message}`);
    examId = r.exam_id;
    console.log(`${code}: yuklandi (${r.created} yangi savol, ${r.existing} mavjud) mock=${examId}`);
    await db.rpc('log_audit', { p_actor: null, p_action: 'seed.variant', p_entity: 'exam', p_entity_id: examId, p_details: { code, created: r.created } });
  }

  if (publishCodes.includes(code)) {
    const st = await db.from('exams').select('status').eq('id', examId).single();
    if (st.data?.status === 'draft') {
      const { error } = await db.rpc('publish_exam', { p_exam_id: examId });
      if (error) throw new Error(`${code}: nashr xatosi: ${error.message}`);
      await db.rpc('log_audit', { p_actor: null, p_action: 'exam.publish', p_entity: 'exam', p_entity_id: examId, p_details: { code, via: 'seed' } });
      console.log(`${code}: nashr etildi (talabalarga ochiq)`);
    } else {
      console.log(`${code}: holati ${st.data?.status}, nashr talab qilinmadi`);
    }
  }
}

const all = await db.from('exams').select('code, status, title').order('sort');
console.table(all.data);
