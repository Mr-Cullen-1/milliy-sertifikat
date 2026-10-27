import { frac, gcd, lcm, makeRng, slotRng, y1Options, type Frac, type L10n, type Rng } from './helpers';
import type { Lang, QuestionSpec, SlotRequest } from './types';

// ---------------------------------------------------------------------------
// Umumiy shablon infratuzilmasi (sonlar va algebra bloklari uchun)
// ---------------------------------------------------------------------------

/** Bitta shablonning bir variantdagi tayyor ko'rinishi (til-mustaqil: raqamlar va javoblar yagona). */
export interface Built {
  topic: number;
  extraTopics?: number[];
  est: number;
  stem: (lang: Lang) => string;
  /** To'g'ri javob (TeX, $ siz). */
  correct: string;
  /** Tipik xatolardan hosil bo'lgan chalg'ituvchi javoblar (TeX, $ siz); tartib: ehtimoli yuqorilari avval. */
  wrong: string[];
  solution: (lang: Lang) => string;
  mistake: (lang: Lang) => string;
  /** Mustaqil tekshiruv: [to'g'ridan-to'g'ri sonli hisob, javobning yopiq shakli bo'yicha qiymat] juftlari. */
  check: Array<readonly [number, number]>;
}

export interface Template {
  id: string;
  build(variant: number): Built;
}

export const T = (uz: string, ru: string, kaa: string, en: string): L10n => ({ uz, ru, kaa, en });

export const disp = (tex: string): string => `$$${tex}$$`;
export const inl = (tex: string): string => `$${tex}$`;

/** Matn (L10n) va tayyor satrlardan bosqichma-bosqich yechim yig'adi. */
export const S = (lang: Lang, ...parts: Array<L10n | string>): string => parts.map((p) => (typeof p === 'string' ? p : p[lang])).join('\n\n');

export function validBuilt(b: Built): boolean {
  const uniq = new Set(b.wrong.map((w) => w.trim()).filter((w) => w !== '' && w !== b.correct.trim()));
  if (uniq.size < 3) return false;
  return b.check.every(([a, c]) => Number.isFinite(a) && Number.isFinite(c) && Math.abs(a - c) <= 1e-9 * Math.max(1, Math.abs(a)));
}

/**
 * Shablon yaratadi. Parametrlar (variant, urinish) bo'yicha deterministik tanlanadi va 6 variantda
 * bir-biriga TENG kelmasligi kafolatlanadi (oldingi variantlar tanlovi rad etiladi).
 */
export function tpl<P>(id: string, draw: (r: Rng) => P, build: (p: P) => Built, key: (p: P) => string = (p) => JSON.stringify(p)): Template {
  return {
    id,
    build(variant: number): Built {
      const used = new Set<string>();
      let out: Built | undefined;
      for (let u = 0; u <= variant; u++) {
        let picked: Built | undefined;
        for (let attempt = 0; attempt < 600 && !picked; attempt++) {
          const p = draw(makeRng(`${id}|${u}|${attempt}`));
          const k = key(p);
          if (used.has(k)) continue;
          let b: Built;
          try {
            b = build(p);
          } catch {
            continue;
          }
          if (!validBuilt(b)) continue;
          used.add(k);
          picked = b;
        }
        if (!picked) throw new Error(`${id}: yaroqli parametr topilmadi (variant ${u})`);
        out = picked;
      }
      return out!;
    },
  };
}

/** Built -> QuestionSpec (harflar aralashtiriladi: bir marta, content() tashqarisida). */
export function buildSpec(req: SlotRequest, b: Built): QuestionSpec {
  const rng = slotRng(req, 'opt');
  const o = y1Options(inl(b.correct), b.wrong.map(inl), rng);
  return {
    topic: b.topic,
    extraTopics: b.extraTopics,
    difficulty: req.difficulty,
    estSeconds: b.est,
    key: { correct: o.correct },
    content: (lang) => ({
      stem_md: b.stem(lang),
      payload: { options: o.options },
      solution_md: b.solution(lang),
      mistake_note_md: b.mistake(lang),
    }),
  };
}

/** Havzadan (variant, index) bo'yicha aylantirib tanlash: bir variantda shablon takrorlanmaydi (pool.length >= count). */
export function pickTemplate(pool: readonly Template[], req: SlotRequest, stride: number): Template {
  return pool[(req.index + req.variant * stride) % pool.length]!;
}

// ---------------------------------------------------------------------------
// Umumiy iboralar lug'ati (glossary): uz / ru / kaa (qoraqalpoq lotin) / en
// ---------------------------------------------------------------------------

export const G = {
  calc: T('Hisoblang.', 'Вычислите.', 'Esaplań.', 'Evaluate.'),
  value: T('Ifodaning qiymatini toping.', 'Найдите значение выражения.', 'Ańlatpanıń mánisin tabıń.', 'Find the value of the expression.'),
  simplify: T('Ifodani soddalashtiring.', 'Упростите выражение.', 'Ańlatpanı ápiwayılastırıń.', 'Simplify the expression.'),
  // kaa: tekshirilsin (aǵza, uqsas)
  expand: T(
    "Qavslarni oching va o'xshash hadlarni ixchamlang.",
    'Раскройте скобки и приведите подобные слагаемые.',
    'Qawsırmalardı ashıń hám uqsas aǵzalardı ıqshamlań.',
    'Expand the brackets and combine like terms.',
  ),
  factor: T("Ko'paytuvchilarga ajrating.", 'Разложите на множители.', 'Kóbeytiwshilerge ajıratıń.', 'Factor the expression.'),
  reduce: T('Kasrni qisqartiring.', 'Сократите дробь.', 'Bólshekti qısqartıń.', 'Reduce the fraction.'),
  // kaa: tekshirilsin (irracionallıq, bólim)
  rationalize: T(
    'Kasr maxrajini irratsionallikdan qutqaring.',
    'Избавьтесь от иррациональности в знаменателе дроби.',
    'Bólshektiń bóliminen irracionallıqtı jóqatıń.',
    'Rationalize the denominator of the fraction.',
  ),
  // Umumiy so'zlar
  answerIs: T('Demak, javob', 'Значит, ответ', 'Demek, juwap', 'So the answer is'),
  therefore: T('Demak:', 'Следовательно:', 'Demek:', 'Therefore:'),
  mistakePrefix: T('Tipik xato:', 'Типичная ошибка:', 'Tipik qátelik:', 'Typical mistake:'),
};

/** Tipik xato izohi: "Tipik xato: ..." prefiksi bilan. */
export const mk = (text: L10n): ((lang: Lang) => string) => (lang) => `${G.mistakePrefix[lang]} ${text[lang]}`;

// ---------------------------------------------------------------------------
// Matematik yordamchilar
// ---------------------------------------------------------------------------

export const isSquare = (n: number): boolean => n >= 0 && Number.isInteger(Math.sqrt(n));
export const fnum = (f: Frac): number => f.n / f.d;

/** [koeffitsient, monom] juftliklaridan belgili yig'indi: terms([[2,'x^2'],[-3,'x'],[1,'']]) = "2x^2-3x+1" */
export function terms(parts: ReadonlyArray<readonly [number, string]>): string {
  let out = '';
  for (const [c, mon] of parts) {
    if (c === 0) continue;
    const mag = Math.abs(c);
    const body = mon === '' ? String(mag) : mag === 1 ? mon : `${mag}${mon}`;
    out += out === '' ? (c < 0 ? '-' : '') + body : (c < 0 ? '-' : '+') + body;
  }
  return out || '0';
}

const powTex = (v: string, d: number): string => (d === 1 ? v : d >= 10 ? `${v}^{${d}}` : `${v}^${d}`);

/** Ko'phad (yuqori darajadan boshlab koeffitsientlar): polyTex([2,-3,1]) = "2x^2-3x+1" */
export function polyTex(cs: readonly number[], v = 'x'): string {
  const deg = cs.length - 1;
  return terms(cs.map((c, i) => [c, deg - i === 0 ? '' : powTex(v, deg - i)] as const));
}

export const polyEval = (cs: readonly number[], x: number): number => cs.reduce((acc, c) => acc * x + c, 0);

/** k * sqrt(m): rootTex(2,3) = "2\sqrt{3}", rootTex(1,3) = "\sqrt{3}" */
export function rootTex(k: number, m: number): string {
  if (k === 0) return '0';
  const r = String.raw`\sqrt{${m}}`;
  if (k === 1) return r;
  if (k === -1) return `-${r}`;
  return `${k}${r}`;
}

/** sqrt(n): to'liq kvadrat bo'lsa butun son */
export const sqrtOrInt = (n: number): string => (isSquare(n) ? String(Math.round(Math.sqrt(n))) : String.raw`\sqrt{${n}}`);

/** Burchak gradusda (TeX): 30 -> "30^\circ" */
export const degTex = (d: number): string => `${d}^\\circ`;

/** Burchak radianda (TeX): 210 -> "\frac{7\pi}{6}" */
export function radTex(deg: number): string {
  const f = frac(deg, 180);
  const num = f.n === 1 ? String.raw`\pi` : String.raw`${f.n}\pi`;
  return f.d === 1 ? num : String.raw`\frac{${num}}{${f.d}}`;
}

// ---------------------------------------------------------------------------
// Aniq trigonometrik qiymatlar: a + b*sqrt2 + c*sqrt3 + d*sqrt6 (koeffitsientlar kasr)
// ---------------------------------------------------------------------------

export interface Q {
  one: Frac;
  r2: Frac;
  r3: Frac;
  r6: Frac;
}

const Z0 = frac(0);
export const q = (one: Frac = Z0, r2: Frac = Z0, r3: Frac = Z0, r6: Frac = Z0): Q => ({ one, r2, r3, r6 });

const fa = (x: Frac, y: Frac): Frac => frac(x.n * y.d + y.n * x.d, x.d * y.d);
const fm = (x: Frac, y: Frac): Frac => frac(x.n * y.n, x.d * y.d);

export const qAdd = (a: Q, b: Q): Q => q(fa(a.one, b.one), fa(a.r2, b.r2), fa(a.r3, b.r3), fa(a.r6, b.r6));
export const qScale = (a: Q, k: Frac): Q => q(fm(a.one, k), fm(a.r2, k), fm(a.r3, k), fm(a.r6, k));
export const qNeg = (a: Q): Q => qScale(a, frac(-1));

export function qMul(a: Q, b: Q): Q {
  // asoslar: 1, s2, s3, s6; s2*s3=s6, s2*s6=2 s3, s3*s6=3 s2, s2*s2=2, s3*s3=3, s6*s6=6
  const A = [a.one, a.r2, a.r3, a.r6];
  const B = [b.one, b.r2, b.r3, b.r6];
  // [indeks natijasi, koeffitsient ko'paytuvchisi] jadvali (i*j)
  const rule: Array<Array<[number, number]>> = [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[1, 1], [0, 2], [3, 1], [2, 2]],
    [[2, 1], [3, 1], [0, 3], [1, 3]],
    [[3, 1], [2, 2], [1, 3], [0, 6]],
  ];
  const out = [Z0, Z0, Z0, Z0];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const [idx, mult] = rule[i]![j]!;
      out[idx] = fa(out[idx]!, fm(fm(A[i]!, B[j]!), frac(mult)));
    }
  }
  return q(out[0], out[1], out[2], out[3]);
}

export const qNum = (a: Q): number => fnum(a.one) + fnum(a.r2) * Math.SQRT2 + fnum(a.r3) * Math.sqrt(3) + fnum(a.r6) * Math.sqrt(6);

export const qIsZero = (a: Q): boolean => [a.one, a.r2, a.r3, a.r6].every((f) => f.n === 0);

/** Kanonik TeX: umumiy maxraj, ijobiy hadlar avval, hammasi manfiy bo'lsa umumiy minus tashqariga. */
export function qTex(a: Q): string {
  const fs = [a.one, a.r2, a.r3, a.r6];
  const den0 = fs.reduce((l, f) => lcm(l, f.d), 1);
  let nums = fs.map((f) => (f.n * den0) / f.d);
  let den = den0;
  const g = [...nums, den].reduce((x, y) => gcd(x, y), 0) || 1;
  nums = nums.map((n) => n / g);
  den /= g;
  const nonzero = nums.filter((n) => n !== 0);
  if (nonzero.length === 0) return '0';
  const allNeg = nonzero.every((n) => n < 0);
  if (allNeg) nums = nums.map((n) => -n);
  const mons = ['', String.raw`\sqrt{2}`, String.raw`\sqrt{3}`, String.raw`\sqrt{6}`];
  const items = nums.map((n, i) => [n, mons[i]!] as const).filter(([n]) => n !== 0);
  items.sort((x, y) => Number(y[0] > 0) - Number(x[0] > 0));
  const numer = terms(items);
  const body = den === 1 ? numer : String.raw`\frac{${numer}}{${den}}`;
  return allNeg ? `-${body}` : body;
}

export type TrigFn = 'sin' | 'cos' | 'tan' | 'cot';

const h = frac(1, 2);
const REF: Record<TrigFn, Record<number, Q>> = {
  sin: { 0: q(), 30: q(h), 45: q(Z0, h), 60: q(Z0, Z0, h), 90: q(frac(1)) },
  cos: { 0: q(frac(1)), 30: q(Z0, Z0, h), 45: q(Z0, h), 60: q(h), 90: q() },
  tan: { 0: q(), 30: q(Z0, Z0, frac(1, 3)), 45: q(frac(1)), 60: q(Z0, Z0, frac(1)) },
  cot: { 30: q(Z0, Z0, frac(1)), 45: q(frac(1)), 60: q(Z0, Z0, frac(1, 3)), 90: q() },
};

export const trigNum = (fn: TrigFn, deg: number): number => {
  const r = (deg * Math.PI) / 180;
  return fn === 'cot' ? 1 / Math.tan(r) : Math[fn](r);
};

/** sin/cos/tan/cot ning aniq qiymati (burchak gradusda; 30/45/60 ga karrali yoki o'qlarda); aniqlanmagan bo'lsa xato. */
export function exactTrig(fn: TrigFn, deg: number): Q {
  const r = ((deg % 360) + 360) % 360;
  const a = r % 180;
  const ref = a > 90 ? 180 - a : a;
  const mag = REF[fn][ref];
  if (!mag) throw new Error(`${fn} ${deg} aniqlanmagan`);
  const v = trigNum(fn, deg);
  if (Math.abs(v) < 1e-12) return q();
  return v < 0 ? qNeg(mag) : mag;
}

export const trigName = (fn: TrigFn): string => ({ sin: String.raw`\sin`, cos: String.raw`\cos`, tan: String.raw`\operatorname{tg}`, cot: String.raw`\operatorname{ctg}` })[fn];
export const TRIG_FNS: readonly TrigFn[] = ['sin', 'cos', 'tan', 'cot'];
export const coFn = (fn: TrigFn): TrigFn => ({ sin: 'cos', cos: 'sin', tan: 'cot', cot: 'tan' } as const)[fn];

/** Q ro'yxatidan takrorlanmas TeX larni (kanonik) olish */
export const qTexList = (list: readonly Q[]): string[] => list.map(qTex);

export function safeExact(fn: TrigFn, deg: number): Q | null {
  try {
    return exactTrig(fn, deg);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Pifagor uchliklari va choraklar (trigonometriya savollari uchun)
// ---------------------------------------------------------------------------

export const TRIPLES: ReadonlyArray<readonly [number, number, number]> = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
];

export type Quadrant = 1 | 2 | 3 | 4;
export const ROMAN = ['', 'I', 'II', 'III', 'IV'] as const;
export const sinSign = (qd: Quadrant): 1 | -1 => (qd <= 2 ? 1 : -1);
export const cosSign = (qd: Quadrant): 1 | -1 => (qd === 1 || qd === 4 ? 1 : -1);

export const inQuadrant = (lang: Lang, qd: Quadrant): string =>
  ({
    uz: `$\\alpha$ burchak ${ROMAN[qd]} chorakda yotadi`,
    ru: `угол $\\alpha$ лежит ${qd === 2 ? 'во' : 'в'} ${ROMAN[qd]} четверти`,
    kaa: `$\\alpha$ múyeshi ${ROMAN[qd]} sherekte jatadı`, // kaa: tekshirilsin (sherek = chorak)
    en: `the angle $\\alpha$ lies in quadrant ${ROMAN[qd]}`,
  })[lang];
