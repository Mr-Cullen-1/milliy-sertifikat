// config/elements.ts -> supabase/migrations/20261110130000_content_elements.sql
// Ishga tushirish: pnpm gen:elements (rasmiy 21 mazmun elementi, yangi mavzular 104+, mavzu-element bog'lanishi)
import { writeFileSync } from 'node:fs';
import { ELEMENTS, NEW_TOPICS, TOPIC_ELEMENTS, elementByCode } from '../config/elements.ts';
import { BLOCK_CODES } from '../config/topics.ts';

const sql = (s: string) => `'${s.replace(/'/g, "''")}'`;
const blockId = (code: string) => BLOCK_CODES.indexOf(code as (typeof BLOCK_CODES)[number]) + 1;

const out = [
  "-- Rasmiy mazmun elementlari (21 ta), yangi mavzular (104+) va mavzu-element bog'lanishi.",
  "-- Avto-generatsiya: pnpm gen:elements (config/elements.ts dan). Qo'lda tahrirlamang.",
  "-- Manba: Matematika fanidan Milliy sertifikat spetsifikatsiyasi (2023), docs/rasmiy-manbalar.md. Moslashtirish taxminiy, mutaxassis tekshiradi.",
  '',
  'create table public.content_elements (',
  '  code text primary key,',
  '  block_id smallint not null references public.blocks (id),',
  '  name_uz text not null,',
  '  sort smallint not null',
  ');',
  '',
  'create table public.topic_elements (',
  '  topic_id smallint not null references public.topics (id),',
  '  element_code text not null references public.content_elements (code),',
  '  is_primary boolean not null default false,',
  '  primary key (topic_id, element_code)',
  ');',
  'create index topic_elements_element_idx on public.topic_elements (element_code);',
  '',
  'alter table public.content_elements enable row level security;',
  'alter table public.topic_elements enable row level security;',
  'revoke all on public.content_elements, public.topic_elements from anon, authenticated;',
  'grant select on public.content_elements, public.topic_elements to authenticated;',
  'grant all on public.content_elements, public.topic_elements to service_role;',
  'create policy content_elements_read on public.content_elements for select to authenticated using (true);',
  'create policy topic_elements_read on public.topic_elements for select to authenticated using (true);',
  '',
  'insert into public.content_elements (code, block_id, name_uz, sort) values',
  ELEMENTS.map((e, i) => `  (${sql(e.code)}, ${blockId(e.block)}, ${sql(e.name)}, ${i + 1})`).join(',\n') + ';',
  '',
  "-- Yangi mavzular: rasmiy spetsifikatsiyada bor, 103 ishchi mavzuda yo'q (blok = asosiy elementning rasmiy bo'limi)",
  'insert into public.topics (id, block_id, name_uz) values',
  NEW_TOPICS.map((t) => `  (${t.id}, ${blockId(elementByCode(t.elements[0]!)!.block)}, ${sql(t.name)})`).join(',\n') + ';',
  '',
  'insert into public.topic_elements (topic_id, element_code, is_primary) values',
  Object.entries(TOPIC_ELEMENTS)
    .sort(([a], [b]) => Number(a) - Number(b))
    .flatMap(([topic, els]) => els.map((c, i) => `  (${topic}, ${sql(c)}, ${i === 0})`))
    .join(',\n') + ';',
  '',
].join('\n');

writeFileSync(new URL('../supabase/migrations/20261110130000_content_elements.sql', import.meta.url), out);
console.log(`yozildi: ${ELEMENTS.length} element, ${NEW_TOPICS.length} yangi mavzu, ${Object.keys(TOPIC_ELEMENTS).length} mavzu bog'lanishi`);
