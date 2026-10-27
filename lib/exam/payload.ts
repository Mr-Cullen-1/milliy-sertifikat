import { z } from 'zod';
import type { QuestionType } from './format';

// questions.payload shakllari (savolni ko'rsatish uchun). To'g'ri javoblar bu yerda YO'Q: ular question_keys da.
// Matnlar Markdown + KaTeX ($...$).

const md = z.string().min(1);

/**
 * Chizma: SVG matni. <img src="data:image/svg+xml,..."> orqali ko'rsatiladi (skript ishlamaydi),
 * shunga qaramay xavfli konstruktsiyalar baribir rad etiladi.
 */
export function isSafeSvg(svg: string): boolean {
  const s = svg.trim();
  if (!/^<svg[\s>]/i.test(s) || !/<\/svg>\s*$/i.test(s)) return false;
  // <img> ichida ko'rsatish uchun xmlns shart; faqat aynan SVG nomlar fazosiga ruxsat, boshqa har qanday havola rad etiladi.
  const withoutNs = s.replace(/\sxmlns="http:\/\/www\.w3\.org\/2000\/svg"/, '');
  // Raqamli entity'lar (&#176; kabi, matnda daraja belgisi uchun) ochib tekshiriladi: "http&#58;" kabi yashirish ushlanadi.
  // Nomli entity'lardan faqat &amp; &lt; &gt; &quot; &apos; ruxsat.
  let decoded: string;
  try {
    decoded = withoutNs
      .replace(/&#x([0-9a-f]{1,6});/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d{1,7});/g, (_, d: string) => String.fromCodePoint(Number(d)));
  } catch {
    return false;
  }
  if (/&(?!(amp|lt|gt|quot|apos);)/i.test(decoded)) return false;
  return !/<\s*(script|foreignObject|image|iframe|object|embed|use|style)\b|\son[a-z]+\s*=|javascript:|data:|https?:|xlink:href|\shref\s*=/i.test(decoded);
}

export const figureSchema = z.object({
  svg: z.string().min(20).max(30_000).refine(isSafeSvg, 'SVG xavfsiz emas yoki noto\'g\'ri'),
  alt: z.string().min(1).max(300),
});

export const y1PayloadSchema = z.object({
  options: z.object({ A: md, B: md, C: md, D: md }),
  figure: figureSchema.optional(),
});

const LETTERS_AF = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
const letter = z.enum(LETTERS_AF);

// Y-2 (moslashtirish): umumiy variantlar ro'yxati (A–F) va har bir band uchun mos variantni tanlash.
// Taxmin: rasmiy spetsifikatsiyadagi aniq tuzilish PDF dan tasdiqlanmagan (docs/loyiha.md).
export const y2PayloadSchema = z.object({
  options: z
    .partialRecord(letter, md)
    .refine((o) => Object.keys(o).length >= 2, 'kamida ikkita variant kerak'),
  items: z
    .array(z.object({ id: z.string().min(1), text_md: md }))
    .min(1)
    .refine((items) => new Set(items.map((i) => i.id)).size === items.length, 'band id lari takrorlanmasin'),
  figure: figureSchema.optional(),
});

const openPart = z.object({
  prompt_md: md,
  /** o'lchov birligi / yaxlitlash qoidasi, masalan "javobni yuzdan birgacha yaxlitlang" */
  hint: z.string().optional(),
});

export const oPayloadSchema = z.object({
  parts: z
    .object({ a: openPart.optional(), b: openPart.optional() })
    .refine((p) => p.a !== undefined || p.b !== undefined, 'a yoki b banddan kamida bittasi kerak'),
  figure: figureSchema.optional(),
});

export type Y1Payload = z.infer<typeof y1PayloadSchema>;
export type Y2Payload = z.infer<typeof y2PayloadSchema>;
export type OPayload = z.infer<typeof oPayloadSchema>;
export type Figure = z.infer<typeof figureSchema>;

export type ParsedPayload =
  | { type: 'y1'; data: Y1Payload }
  | { type: 'y2'; data: Y2Payload }
  | { type: 'o'; data: OPayload };

export function parsePayload(type: QuestionType, raw: unknown): ParsedPayload {
  switch (type) {
    case 'y1':
      return { type, data: y1PayloadSchema.parse(raw) };
    case 'y2':
      return { type, data: y2PayloadSchema.parse(raw) };
    case 'o':
      return { type, data: oPayloadSchema.parse(raw) };
  }
}

/**
 * Tarjimalar bir xil tuzilishda bo'lishi shart: variant harflari, band id lari, a/b bandlari.
 * Tuzilish farqi javob kaliti bilan nomuvofiqlikka olib kelardi.
 */
export function payloadShape(p: ParsedPayload): string {
  switch (p.type) {
    case 'y1':
      return 'y1:ABCD';
    case 'y2':
      return `y2:${Object.keys(p.data.options).sort().join('')}|${p.data.items.map((i) => i.id).join(',')}`;
    case 'o':
      return `o:${p.data.parts.a ? 'a' : ''}${p.data.parts.b ? 'b' : ''}`;
  }
}
