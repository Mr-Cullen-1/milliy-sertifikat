import type { BlockCode } from '../../config/topics';

export const LANGS = ['uz', 'ru', 'kaa', 'en'] as const;
export type Lang = (typeof LANGS)[number];

export type QType = 'y1' | 'y2' | 'o';
export type Level = 'L1' | 'L2' | 'L3';

/** 45 pozitsiyadan birining (bir variant uchun) talabi. */
export interface SlotRequest {
  /** 0..5 (A..F). Turli variantlarda turli savol/parametrlar chiqishi shart. */
  variant: number;
  block: BlockCode;
  type: QType;
  difficulty: Level;
  /** shu variantdagi (block, type) savollari ichidagi tartib raqami, 0 dan */
  index: number;
  /** shu variantdagi (block, type) savollari soni */
  count: number;
  /** imtihondagi o'rin, 1..45 */
  position: number;
}

export interface LocalizedContent {
  /** Markdown + KaTeX ($...$ va $$...$$). Literal "$" belgisini ishlatmang. */
  stem_md: string;
  /** y1: {options:{A,B,C,D}, figure?}; y2: {options:{A..F}, items:[{id,text_md}], figure?}; o: {parts:{a?,b?}, figure?} */
  payload: unknown;
  /** Bosqichma-bosqich yechim (Markdown + KaTeX) */
  solution_md: string;
  /** Tipik xato izohi */
  mistake_note_md?: string;
}

export interface QuestionSpec {
  /** docs/mavzular.md raqami; req.block diapazoniga tegishli bo'lishi shart */
  topic: number;
  extraTopics?: number[];
  /** req.difficulty ga teng bo'lishi shart */
  difficulty: Level;
  estSeconds?: number;
  /** y1: {correct:'B'}; y2: {pairs:{id:'A',...}} (HAMMA band); o: {a?:['3/4','0.75'], b?:[...]} */
  key: unknown;
  /**
   * Har til uchun mazmun. Raqamlar, variant harflari, band id lari, a/b bandlari va kalit
   * barcha tillarda BIR XIL bo'lishi shart (faqat matn tarjima qilinadi). Parametrlar `content`
   * tashqarisida (closure'da) bir marta hisoblanadi, shunda tillar o'rtasida farq chiqmaydi.
   */
  content: (lang: Lang) => LocalizedContent;
}

export type BlockGenerator = (req: SlotRequest) => QuestionSpec;
