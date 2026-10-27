import Link from 'next/link';
import { Card, PageTitle } from '@/components/admin/ui';
import { ImportForm } from './import-form';

const FIELDS: [string, string][] = [
  ['type', '"y1" (yopiq A–D), "y2" (moslashtirish), "o" (ochiq a/b)'],
  ['block', '"sonlar" | "algebra" | "tenglama" | "funksiyalar" | "analiz" | "geometriya" | "toplam"'],
  ['topic', "asosiy mavzu raqami 1–103 (docs/mavzular.md); blokka tegishli bo'lishi shart"],
  ['difficulty', '"L1" | "L2" | "L3" (Y-1: L1/L2 → 1,3 ball, L3 → 2,2 ball; weight bilan o\'zgartirish mumkin)'],
  ['stem_md', 'savol matni: Markdown + KaTeX ($...$, $$...$$)'],
  ['payload', 'y1: {options:{A,B,C,D}} · y2: {options:{A..F}, items:[{id,text_md}]} · o: {parts:{a?:{prompt_md,hint?}, b?:{...}}} · ixtiyoriy figure:{svg,alt}'],
  ['key', 'y1: {correct:"B"} · y2: {pairs:{"1":"C",...}} (hamma band) · o: {a:["3/4","0.75"], b:["-2"]} (qabul qilinadigan shakllar)'],
  ['solution_md, mistake_note_md', 'yechim va tipik xato izohi (ixtiyoriy, tavsiya etiladi)'],
  ['external_id', 'takrorlanmas ID (ixtiyoriy): qayta yuklashda dublikat yaratilmaydi'],
  ['i18n', '{ru?, kaa?, en?}: har birida {stem_md, payload, solution_md?, mistake_note_md?}; payload tuzilishi asosiy matnnikiday bo\'lishi shart'],
];

export default function AdminImportPage() {
  return (
    <>
      <PageTitle title="Savollarni JSON orqali yuklash" />
      <p className="max-w-[820px] text-[15px] leading-6 font-semibold text-muted">
        Fayl ikki shaklda bo&apos;lishi mumkin: <b>savollar massivi</b> (faqat bankka qo&apos;shiladi) yoki{' '}
        <code className="rounded bg-white px-1">{'{ "exam": {...}, "questions": [45 ta] }'}</code> (savollar va mock qoralamasi yaratiladi: 1–32 Y-1, 33–35 Y-2,
        36–45 O, bo&apos;limlar bo&apos;yicha sonlar rasmiy blueprintga mos). Avval <b>Tekshirish</b>: xatolar savol raqami va maydon yo&apos;li bilan ko&apos;rsatiladi.
        Yuklash hammasi yoki hech narsa (bitta tranzaksiya). Mock yaratilgach <Link href="/admin/exams" className="text-accent underline underline-offset-4">Imtihonlar</Link> bo&apos;limida
        ochiladi (faqat admin).
      </p>
      <Card>
        <ImportForm />
      </Card>
      <Card title="Maydonlar">
        <dl className="grid gap-x-4 gap-y-2 text-[14px] sm:grid-cols-[220px_1fr]">
          {FIELDS.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-mono font-bold text-brand-ink">{k}</dt>
              <dd className="font-semibold text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <a href="/admin/import/sample" download="namuna.json" className="w-fit text-[15px] font-extrabold text-accent underline underline-offset-4">
          Namunaviy JSON ni yuklab olish
        </a>
      </Card>
    </>
  );
}
