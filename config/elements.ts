// Rasmiy "fan mazmunining tarkibi" (Matematika fanidan Milliy sertifikat spetsifikatsiyasi, 2023-yil 8-fevral tahri,
// oliygoh.uz/post/matematika-spetsifikatsiyasi): 7 bo'lim ichida 21 mazmun elementi. Mavzu bo'yicha mashq shu elementlar bo'yicha.
// docs/rasmiy-manbalar.md "Rasmiy spetsifikatsiya bilan taqqoslash".
//
// DIQQAT: 103 ta ishchi mavzu (docs/mavzular.md) bizning taksonomiyamiz; ularning elementlarga moslashtirilishi (TOPIC_ELEMENTS)
// va 104+ raqamli yangi mavzular (NEW_TOPICS) taxminiy, mutaxassis tekshiruvidan o'tishi kerak.
import { topicInBlock, type BlockCode } from './topics.ts';

export interface ContentElement {
  /** Rasmiy raqam: "2.4" */
  code: string;
  /** Rasmiy bo'lim (variantdagi 7 bo'lim) kodi */
  block: BlockCode;
  /** Rasmiy nom (o'zbekcha); boshqa tillar lib/i18n da */
  name: string;
}

export const ELEMENTS: readonly ContentElement[] = [
  { code: '1.1', block: 'sonlar', name: 'Natural sonlar' },
  { code: '1.2', block: 'sonlar', name: 'Sonlar ustida amallar' },
  { code: '2.1', block: 'algebra', name: 'Daraja va ildiz' },
  { code: '2.2', block: 'algebra', name: 'Trigonometriya asoslari' },
  { code: '2.3', block: 'algebra', name: "Ko'rsatkichli va logarifmik funksiyalar" },
  { code: '2.4', block: 'algebra', name: 'Ifodalarning shaklini almashtirish' },
  { code: '3.1', block: 'tenglama', name: 'Tenglamalar' },
  { code: '3.2', block: 'tenglama', name: 'Tengsizliklar' },
  { code: '4.1', block: 'funksiyalar', name: 'Funksiyalar' },
  { code: '5.1', block: 'toplam', name: "To'plam, mulohaza va mantiq" },
  { code: '5.2', block: 'toplam', name: "Ma'lumotlar tahlili" },
  { code: '5.3', block: 'toplam', name: 'Kombinatorika' },
  { code: '5.4', block: 'toplam', name: 'Ehtimol' },
  { code: '5.5', block: 'toplam', name: 'Modellashtirish' },
  { code: '6.1', block: 'analiz', name: 'Hosila' },
  { code: '6.2', block: 'analiz', name: 'Boshlang\'ich funksiya va integral' },
  { code: '7.1', block: 'geometriya', name: "Shakl o'lchovlari" },
  { code: '7.2', block: 'geometriya', name: 'Planimetriya' },
  { code: '7.3', block: 'geometriya', name: "Fazoda to'g'ri chiziq va tekislik" },
  { code: '7.4', block: 'geometriya', name: 'Fazoviy jismlar' },
  { code: '7.5', block: 'geometriya', name: 'Koordinatalar va vektorlar' },
];

export const ELEMENT_CODES = ELEMENTS.map((e) => e.code);
export const elementByCode = (code: string): ContentElement | undefined => ELEMENTS.find((e) => e.code === code);
export const isElementCode = (v: unknown): v is string => typeof v === 'string' && ELEMENT_CODES.includes(v);

/** 104+ raqamli yangi mavzular: rasmiy spetsifikatsiyada bor, 103 ishchi mavzuda yo'q (docs/rasmiy-manbalar.md). */
export interface NewTopic {
  id: number;
  name: string;
  /** birinchisi asosiy element */
  elements: string[];
}

export const NEW_TOPICS: readonly NewTopic[] = [
  { id: 104, name: 'Kompleks sonlar', elements: ['1.2'] },
  { id: 105, name: 'Masshtab', elements: ['2.4'] },
  { id: 106, name: "Sonli tengsizliklar va ularni darajaga ko'tarish", elements: ['2.1'] },
  { id: 107, name: "Burchakning radian o'lchovi; nuqtani burish", elements: ['2.2'] },
  { id: 108, name: "Ikki o'zgaruvchili tengsizliklar sistemasi", elements: ['3.2'] },
  { id: 109, name: 'Tenglama va tengsizlikni grafik usulda yechish', elements: ['3.1', '3.2'] },
  { id: 110, name: "Hosilaning fizik ma'nosi; normal tenglamasi", elements: ['6.1'] },
  { id: 111, name: 'Mantiq: konversiya, inversiya, kontrapozitsiya, predikat, kvantor', elements: ['5.1'] },
  { id: 112, name: 'Standart chetlanish', elements: ['5.2'] },
  { id: 113, name: "Modellashtirish: chiziqli, kvadratik, ko'rsatkichli va trigonometrik modellar", elements: ['5.5'] },
  { id: 114, name: 'Fales teoremasi', elements: ['7.3'] },
  { id: 115, name: 'Uch perpendikulyar teoremasi; proyeksiyalar', elements: ['7.3'] },
  { id: 116, name: "Eyler teoremasi; muntazam ko'pyoqlar", elements: ['7.4'] },
  { id: 117, name: 'Shar segmenti, sektori va qatlami', elements: ['7.4'] },
  { id: 118, name: 'Sfera tenglamasi', elements: ['7.5'] },
  { id: 119, name: 'Kollinear va komplanar vektorlar; bazis bo\'yicha yoyish', elements: ['7.5'] },
  { id: 120, name: 'Kesmani berilgan nisbatda bo\'lish', elements: ['7.5'] },
  { id: 121, name: "Funksional bog'liqlik: jadval, grafik va formula", elements: ['4.1'] },
];

/** Eng katta mavzu raqami (103 ishchi + yangi mavzular). */
export const MAX_TOPIC_ID = Math.max(103, ...NEW_TOPICS.map((t) => t.id));

/** 1..103 ishchi mavzu -> rasmiy elementlar (birinchisi asosiy). Taxminiy, mutaxassis tekshiradi. */
const T: Record<number, string[]> = {
  1: ['1.1'], 2: ['1.1'], 3: ['1.1'],
  4: ['1.2'], 5: ['1.2'], 6: ['1.2'], 7: ['2.4'], 8: ['2.4'], 9: ['1.2'], 10: ['1.2'], 11: ['1.2'],
  12: ['2.1'], 13: ['2.1'], 14: ['2.1'],
  15: ['2.4'], 16: ['2.4'], 17: ['2.4'], 18: ['2.4'],
  19: ['2.1'], 20: ['2.1'],
  21: ['2.3'],
  22: ['2.2'], 23: ['2.2'], 24: ['2.2'], 25: ['2.2'], 26: ['2.2'],
  27: ['2.4'],
  28: ['3.1', '3.2'], 29: ['3.1'], 30: ['3.2'], 31: ['3.1'], 32: ['3.1', '3.2'], 33: ['3.1', '3.2'], 34: ['3.1', '3.2'],
  35: ['3.1'], 36: ['3.2'], 37: ['3.1', '3.2'], 38: ['3.1', '3.2'], 39: ['3.1'], 40: ['3.2'], 41: ['3.1'],
  42: ['2.4'],
  43: ['4.1'], 44: ['4.1'], 45: ['4.1'], 46: ['4.1'], 47: ['4.1'], 48: ['4.1'], 49: ['4.1'],
  50: ['4.1', '2.3'], 51: ['4.1', '2.3'],
  52: ['4.1', '2.2'], 53: ['4.1'], 54: ['4.1'], 55: ['4.1'],
  56: ['2.4'], 57: ['2.4'], 58: ['2.4'], 59: ['4.1'],
  60: ['6.1'], 61: ['6.1'], 62: ['6.1'], 63: ['6.1'], 64: ['6.1'],
  65: ['6.2'], 66: ['6.2'],
  67: ['7.2'], 68: ['7.2'], 69: ['7.2'], 70: ['7.2'], 71: ['7.2'], 72: ['7.2'],
  73: ['7.2', '7.1'], 74: ['7.2'], 75: ['7.2'], 76: ['7.2'], 77: ['7.2'],
  78: ['7.2', '7.1'], 79: ['7.2'], 80: ['7.2'],
  81: ['7.5'], 82: ['7.2'],
  83: ['7.3'], 84: ['7.3', '7.1'],
  85: ['7.4'], 86: ['7.4'], 87: ['7.4'], 88: ['7.4'], 89: ['7.4'], 90: ['7.4'], 91: ['7.4'], 92: ['7.4'],
  93: ['7.5'],
  94: ['5.1'], 95: ['5.1'],
  96: ['5.3'], 97: ['5.3'], 98: ['5.3'],
  99: ['5.4'], 100: ['5.4'],
  101: ['5.2'], 102: ['5.2'],
  103: ['5.5'],
};

export const TOPIC_ELEMENTS: Readonly<Record<number, readonly string[]>> = {
  ...T,
  ...Object.fromEntries(NEW_TOPICS.map((t) => [t.id, t.elements])),
};

/** Mavzu raqami -> uning rasmiy bo'limlari (barcha elementlari bo'yicha). */
export function officialBlocksOf(topic: number): BlockCode[] {
  const els = TOPIC_ELEMENTS[topic] ?? [];
  return [...new Set(els.map((c) => elementByCode(c)?.block).filter((b): b is BlockCode => !!b))];
}

/** Mavzu raqami -> asosiy rasmiy bo'lim (yangi mock variantlarda savol shu bo'limning slotiga tushadi). */
export const officialPrimaryBlock = (topic: number): BlockCode | undefined => {
  const first = TOPIC_ELEMENTS[topic]?.[0];
  return first ? elementByCode(first)?.block : undefined;
};

/**
 * Mavzu savolning blokida bo'lishi mumkinmi: bizning ishchi diapazon (config/topics.ts) YOKI rasmiy joylashuv (mavzuning elementi shu bo'limda).
 * Eski variantlar (A–F) bizning diapazonda, yangilari rasmiy joylashuvda tuzilgan: ikkalasi ham yaroqli.
 */
export const topicAllowedInBlock = (block: BlockCode, topic: number): boolean => topicInBlock(block, topic) || officialBlocksOf(topic).includes(block);
