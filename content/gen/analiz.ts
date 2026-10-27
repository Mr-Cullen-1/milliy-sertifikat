import { frac, fAdd, fSub, fMul, fDiv, numericDistractors, slotRng, texFrac, texParen, type Frac, type Rng } from './helpers';
import { mn, fracFallbacks, langPicker, m, oSpec, pickTemplate, polyAt, polyDer, texLine, texPoly, y1Spec } from './analiz-toplam-util';
import type { BlockGenerator, SlotRequest } from './types';

// "Matematik analiz asoslari" bloki (mavzular 56-66).
// Har bir shablon: sample...(rng) parametrlarni tanlaydi, solve...(p) javobni KOD bilan hisoblaydi
// (ikkalasi ham eksport qilinadi: tests/content/analiz-math.test.ts mustaqil sonli tekshiruv qiladi).
// Parametrlar content() TASHQARISIDA bir marta hisoblanadi: 4 tilda raqamlar va kalit bir xil.

const T = String.raw;

/** (x - r) ko'rinishidagi ko'paytuvchi: r=-2 bo'lsa "x+2" */
const xm = (r: number): string => texPoly([1, -r]);

const fracOrNull = (n: number, d: number): Frac | null => (d === 0 ? null : frac(n, d));
const fracStrings = (list: readonly (Frac | null)[]): string[] => list.filter((f): f is Frac => f !== null).map((f) => m(texFrac(f)));

// ============================== Y-1, L2 shablonlar ==============================

// --- A1: murakkab funksiya hosilasi (61) ---
export interface ChainP {
  a: number;
  b: number;
  n: number;
  x0: number;
}
export function sampleChain(rng: Rng): ChainP {
  for (;;) {
    const a = rng.pick([2, 3, 4, 5, -1, -2, -3]);
    const b = rng.int(-5, 5);
    const n = rng.pick([3, 4, 5]);
    const x0 = rng.int(-2, 3);
    const u = a * x0 + b;
    if (b !== 0 && Math.abs(u) >= 1 && Math.abs(u) <= 3) return { a, b, n, x0 };
  }
}
export const solveChain = ({ a, b, n, x0 }: ChainP): number => n * a * (a * x0 + b) ** (n - 1);

function tplChain(req: SlotRequest) {
  const p = sampleChain(slotRng(req, 'chain'));
  const rng = slotRng(req, 'chain-opt');
  const { a, b, n, x0 } = p;
  const u = a * x0 + b;
  const v = solveChain(p);
  const lin = texPoly([a, b]);
  const ds = numericDistractors(v, [n * u ** (n - 1), n * a * u ** n, a * u ** (n - 1), n * a * x0 ** (n - 1), u ** n], rng, mn);
  return y1Spec({
    topic: 61,
    difficulty: req.difficulty,
    estSeconds: 110,
    correct: m(String(v)),
    distractors: ds,
    rng,
    text: (lang) => {
      const L = langPicker(lang);
      const f = `f(x)=(${lin})^{${n}}`;
      return {
        stem_md: L(
          T`$${f}$ funksiyaning $x_0=${x0}$ nuqtadagi hosilasi $f^{\prime}(x_0)$ ni toping.`,
          T`Найдите производную $f^{\prime}(x_0)$ функции $${f}$ в точке $x_0=${x0}$.`,
          T`$${f}$ funkciyasınıń $x_0=${x0}$ noqatındaǵı tuwındısı $f^{\prime}(x_0)$ tı tabıń.`, // kaa: tekshirilsin
          T`Find the derivative $f^{\prime}(x_0)$ of $${f}$ at the point $x_0=${x0}$.`,
        ),
        solution_md: L(
          T`Murakkab funksiya hosilasi: $f^{\prime}(x)=${n}(${lin})^{${n - 1}}\cdot(${a})$. $x=${x0}$ da $${lin}=${u}$, shuning uchun $f^{\prime}(${x0})=${n}\cdot${texParen(u)}^{${n - 1}}\cdot${texParen(a)}=${v}$.`,
          T`Производная сложной функции: $f^{\prime}(x)=${n}(${lin})^{${n - 1}}\cdot(${a})$. При $x=${x0}$ имеем $${lin}=${u}$, поэтому $f^{\prime}(${x0})=${n}\cdot${texParen(u)}^{${n - 1}}\cdot${texParen(a)}=${v}$.`,
          T`Quramalı funkciyanıń tuwındısı: $f^{\prime}(x)=${n}(${lin})^{${n - 1}}\cdot(${a})$. $x=${x0}$ de $${lin}=${u}$, sonıń ushın $f^{\prime}(${x0})=${n}\cdot${texParen(u)}^{${n - 1}}\cdot${texParen(a)}=${v}$.`,
          T`By the chain rule $f^{\prime}(x)=${n}(${lin})^{${n - 1}}\cdot(${a})$. At $x=${x0}$ we get $${lin}=${u}$, so $f^{\prime}(${x0})=${n}\cdot${texParen(u)}^{${n - 1}}\cdot${texParen(a)}=${v}$.`,
        ),
        mistake_note_md: L(
          T`Ichki funksiya hosilasi $${a}$ ga ko'paytirishni unutish.`,
          T`Забыть умножить на производную внутренней функции $${a}$.`,
          T`Ishki funkciyanıń tuwındısı $${a}$ ǵa kóbeytiwdi umıtıw.`,
          T`Forgetting to multiply by the derivative $${a}$ of the inner function.`,
        ),
      };
    },
  });
}

// --- A2: urinma tenglamasi (62) ---
export interface TangentP {
  coefs: number[];
  x0: number;
}
export function sampleTangent(rng: Rng): TangentP {
  for (;;) {
    const coefs = [1, rng.int(-3, 3), rng.int(-4, 4), rng.int(-5, 5)];
    const x0 = rng.int(-2, 2);
    if (polyAt(polyDer(coefs), x0) !== 0) return { coefs, x0 };
  }
}
export function solveTangent({ coefs, x0 }: TangentP): { k: number; b: number; f0: number } {
  const k = polyAt(polyDer(coefs), x0);
  const f0 = polyAt(coefs, x0);
  return { k, b: f0 - k * x0, f0 };
}

function tplTangent(req: SlotRequest) {
  const p = sampleTangent(slotRng(req, 'tan'));
  const rng = slotRng(req, 'tan-opt');
  const { k, b, f0 } = solveTangent(p);
  const [, pc, qc] = p.coefs as [number, number, number, number];
  const kWrong = 3 * p.x0 * p.x0 + 2 * pc + qc;
  const ds = [
    texLine(k, f0),
    texLine(k, -b),
    texLine(kWrong, f0 - kWrong * p.x0),
    texLine(-k, b),
    texLine(f0, b),
    texLine(k + 1, b),
  ].map(m);
  const f = texPoly(p.coefs);
  return y1Spec({
    topic: 62,
    extraTopics: [60],
    difficulty: req.difficulty,
    estSeconds: 130,
    correct: m(texLine(k, b)),
    distractors: ds,
    rng,
    text: (lang) => {
      const L = langPicker(lang);
      return {
        stem_md: L(
          T`$f(x)=${f}$ funksiya grafigiga abssissasi $x_0=${p.x0}$ bo'lgan nuqtada o'tkazilgan urinma tenglamasini toping.`,
          T`Составьте уравнение касательной к графику функции $f(x)=${f}$ в точке с абсциссой $x_0=${p.x0}$.`,
          T`$f(x)=${f}$ funkciyasınıń grafigine abscissası $x_0=${p.x0}$ bolǵan noqatta júrgizilgen urınba teńlemesin tabıń.`,
          T`Write the equation of the tangent line to the graph of $f(x)=${f}$ at the point with abscissa $x_0=${p.x0}$.`,
        ),
        solution_md: L(
          T`$f^{\prime}(x)=${texPoly(polyDer(p.coefs))}$, shuning uchun burchak koeffitsiyenti $k=f^{\prime}(${p.x0})=${k}$. $f(${p.x0})=${f0}$. Urinma: $y=${f0}+${texParen(k)}(${xm(p.x0)})$, ya'ni $${texLine(k, b)}$.`,
          T`$f^{\prime}(x)=${texPoly(polyDer(p.coefs))}$, значит угловой коэффициент $k=f^{\prime}(${p.x0})=${k}$. $f(${p.x0})=${f0}$. Касательная: $y=${f0}+${texParen(k)}(${xm(p.x0)})$, то есть $${texLine(k, b)}$.`,
          T`$f^{\prime}(x)=${texPoly(polyDer(p.coefs))}$, sonıń ushın múyeshlik koeffициent $k=f^{\prime}(${p.x0})=${k}$. $f(${p.x0})=${f0}$. Urınba: $y=${f0}+${texParen(k)}(${xm(p.x0)})$, yaǵnıy $${texLine(k, b)}$.`,
          T`$f^{\prime}(x)=${texPoly(polyDer(p.coefs))}$, so the slope is $k=f^{\prime}(${p.x0})=${k}$ and $f(${p.x0})=${f0}$. The tangent is $y=${f0}+${texParen(k)}(${xm(p.x0)})$, that is $${texLine(k, b)}$.`,
        ),
        mistake_note_md: L(
          T`Urinma tenglamasida $-kx_0$ hadini tashlab ketish yoki ishorani adashtirish.`,
          T`Потерять слагаемое $-kx_0$ или ошибиться в знаке при записи уравнения касательной.`,
          T`Urınba teńlemesinde $-kx_0$ ǵ di tastap ketiw yamasa belgini qáte jazıw.`,
          T`Dropping the term $-kx_0$ or making a sign error in the tangent equation.`,
        ),
      };
    },
  });
}

// --- A3: ekstremum (63) ---
export interface ExtremumP {
  r1: number;
  r2: number;
}
export function sampleExtremum(rng: Rng): ExtremumP {
  const r1 = rng.int(-3, 2);
  return { r1, r2: r1 + rng.int(1, 4) };
}
/** f(x)=2x^3+bx^2+cx, f'(x)=6(x-r1)(x-r2): r1 - lokal maksimum, r2 - lokal minimum nuqtasi */
export function solveExtremum({ r1, r2 }: ExtremumP): { coefs: number[]; fmin: number; fmax: number } {
  const coefs = [2, -3 * (r1 + r2), 6 * r1 * r2, 0];
  return { coefs, fmin: polyAt(coefs, r2), fmax: polyAt(coefs, r1) };
}

function tplExtremum(req: SlotRequest) {
  const p = sampleExtremum(slotRng(req, 'ext'));
  const rng = slotRng(req, 'ext-opt');
  const { coefs, fmin, fmax } = solveExtremum(p);
  const ds = numericDistractors(fmin, [fmax, p.r2, p.r1, -fmin, fmin + fmax], rng, mn);
  const f = texPoly(coefs);
  return y1Spec({
    topic: 63,
    difficulty: req.difficulty,
    estSeconds: 150,
    correct: m(String(fmin)),
    distractors: ds,
    rng,
    text: (lang) => {
      const L = langPicker(lang);
      return {
        stem_md: L(
          T`$f(x)=${f}$ funksiyaning lokal minimum nuqtasidagi qiymatini toping.`,
          T`Найдите значение функции $f(x)=${f}$ в точке её локального минимума.`,
          T`$f(x)=${f}$ funkciyasınıń lokal minimum noqatındaǵı mánisin tabıń.`,
          T`Find the value of $f(x)=${f}$ at its point of local minimum.`,
        ),
        solution_md: L(
          T`$f^{\prime}(x)=${texPoly(polyDer(coefs))}=6(${xm(p.r1)})(${xm(p.r2)})$. Hosila $x=${p.r1}$ da musbatdan manfiyga, $x=${p.r2}$ da manfiydan musbatga o'tadi, demak minimum $x=${p.r2}$ da: $f(${p.r2})=${fmin}$.`,
          T`$f^{\prime}(x)=${texPoly(polyDer(coefs))}=6(${xm(p.r1)})(${xm(p.r2)})$. Производная меняет знак с плюса на минус в $x=${p.r1}$ и с минуса на плюс в $x=${p.r2}$, значит минимум в $x=${p.r2}$: $f(${p.r2})=${fmin}$.`,
          T`$f^{\prime}(x)=${texPoly(polyDer(coefs))}=6(${xm(p.r1)})(${xm(p.r2)})$. Tuwındı $x=${p.r1}$ de oń belgiden teris belgige, $x=${p.r2}$ de teristen ońǵa ótedi, demek minimum $x=${p.r2}$ de: $f(${p.r2})=${fmin}$.`,
          T`$f^{\prime}(x)=${texPoly(polyDer(coefs))}=6(${xm(p.r1)})(${xm(p.r2)})$. The derivative changes sign from plus to minus at $x=${p.r1}$ and from minus to plus at $x=${p.r2}$, so the minimum is at $x=${p.r2}$: $f(${p.r2})=${fmin}$.`,
        ),
        mistake_note_md: L(
          T`Minimum nuqtasi bilan maksimum nuqtasini adashtirish yoki nuqtaning o'zini (qiymat o'rniga) yozish.`,
          T`Перепутать точку минимума с точкой максимума или записать саму точку вместо значения функции.`,
          T`Minimum noqatın maksimum noqatı menen shatastırıw yamasa mánis ornına noqattıń ózin jazıw.`,
          T`Mixing up the minimum and maximum points, or giving the point itself instead of the function value.`,
        ),
      };
    },
  });
}

// --- A4: kesmada eng katta/kichik qiymat (64) ---
export interface SegmentP {
  k: number;
  c: number;
  lo: number;
  hi: number;
  wantMax: boolean;
}
export function sampleSegment(rng: Rng): SegmentP {
  for (;;) {
    const k = rng.pick([1, 2]);
    const c = rng.int(-4, 6);
    const lo = rng.int(-3, 1);
    const hi = rng.int(2, 4);
    if (lo < k && k < hi && lo < hi) return { k, c, lo, hi, wantMax: rng.chance(0.5) };
  }
}
/** f(x)=x^3-3k^2x+c; kritik nuqtalar +-k */
export function solveSegment({ k, c, lo, hi, wantMax }: SegmentP): { coefs: number[]; value: number; candidates: number[] } {
  const coefs = [1, 0, -3 * k * k, c];
  const pts = [lo, hi, ...[-k, k].filter((x) => x > lo && x < hi)];
  const vals = pts.map((x) => polyAt(coefs, x));
  return { coefs, value: wantMax ? Math.max(...vals) : Math.min(...vals), candidates: vals };
}

function tplSegment(req: SlotRequest) {
  const p = sampleSegment(slotRng(req, 'seg'));
  const rng = slotRng(req, 'seg-opt');
  const { coefs, value, candidates } = solveSegment(p);
  const other = p.wantMax ? Math.min(...candidates) : Math.max(...candidates);
  const f = texPoly(coefs);
  const ds = numericDistractors(value, [other, ...candidates, polyAt(coefs, p.k) + polyAt(coefs, -p.k)], rng, mn);
  const seg = `[${p.lo};\\,${p.hi}]`;
  return y1Spec({
    topic: 64,
    extraTopics: [63],
    difficulty: req.difficulty,
    estSeconds: 160,
    correct: m(String(value)),
    distractors: ds,
    rng,
    text: (lang) => {
      const L = langPicker(lang);
      const big = p.wantMax;
      return {
        stem_md: L(
          T`$f(x)=${f}$ funksiyaning $${seg}$ kesmadagi eng ${big ? 'katta' : 'kichik'} qiymatini toping.`,
          T`Найдите ${big ? 'наибольшее' : 'наименьшее'} значение функции $f(x)=${f}$ на отрезке $${seg}$.`,
          T`$f(x)=${f}$ funkciyasınıń $${seg}$ kesindidegi eń ${big ? 'úlken' : 'kishi'} mánisin tabıń.`,
          T`Find the ${big ? 'largest' : 'smallest'} value of $f(x)=${f}$ on the segment $${seg}$.`,
        ),
        solution_md: L(
          T`$f^{\prime}(x)=3x^{2}-${3 * p.k * p.k}=0$ dan kritik nuqtalar $x=\pm ${p.k}$. Kesma ichidagi kritik nuqtalar va chetlaridagi qiymatlar: ${candidates.map((v) => `$${v}$`).join(', ')}. Javob: $${value}$.`,
          T`Из $f^{\prime}(x)=3x^{2}-${3 * p.k * p.k}=0$ получаем критические точки $x=\pm ${p.k}$. Значения в критических точках внутри отрезка и на концах: ${candidates.map((v) => `$${v}$`).join(', ')}. Ответ: $${value}$.`,
          T`$f^{\prime}(x)=3x^{2}-${3 * p.k * p.k}=0$ nan kritikalıq noqatlar $x=\pm ${p.k}$. Kesindi ishindegi kritikalıq noqatlardaǵı hám shetlerindegi mánisler: ${candidates.map((v) => `$${v}$`).join(', ')}. Juwap: $${value}$.`,
          T`From $f^{\prime}(x)=3x^{2}-${3 * p.k * p.k}=0$ the critical points are $x=\pm ${p.k}$. Values at the critical points inside the segment and at the endpoints: ${candidates.map((v) => `$${v}$`).join(', ')}. Answer: $${value}$.`,
        ),
        mistake_note_md: L(
          T`Kesma uchlaridagi qiymatlarni tekshirmay, faqat lokal ekstremumni javob qilib olish.`,
          T`Не проверить значения на концах отрезка и взять только локальный экстремум.`,
          T`Kesindi ushlarındaǵı mánislerdi teksermey, tek lokal ekstremumdı juwap etip alıw.`,
          T`Not checking the endpoints of the segment and taking only a local extremum.`,
        ),
      };
    },
  });
}

// --- A5: arifmetik progressiya yig'indisi (57) ---
export interface ApP {
  a1: number;
  d: number;
  p: number;
  q: number;
  n: number;
}
export function sampleAp(rng: Rng): ApP {
  const p = rng.int(2, 5);
  return { a1: rng.int(-8, 12), d: rng.pick([-4, -3, -2, -1, 1, 2, 3, 4, 5]), p, q: rng.int(p + 2, 9), n: rng.int(10, 16) };
}
export function solveAp({ a1, d, p, q, n }: ApP): { ap: number; aq: number; sn: number } {
  return { ap: a1 + (p - 1) * d, aq: a1 + (q - 1) * d, sn: (n * (2 * a1 + (n - 1) * d)) / 2 };
}

function tplAp(req: SlotRequest) {
  const p = sampleAp(slotRng(req, 'ap'));
  const rng = slotRng(req, 'ap-opt');
  const { ap, aq, sn } = solveAp(p);
  const { a1, d, n } = p;
  const s = (k: number) => (k * (2 * a1 + (k - 1) * d)) / 2;
  const an = a1 + (n - 1) * d;
  const wrong2 = (n * (2 * a1 + n * d)) / 2;
  const ds = numericDistractors(sn, [s(n - 1), s(n + 1), n * an, Number.isInteger(wrong2) ? wrong2 : s(n + 2)], rng, mn);
  return y1Spec({
    topic: 57,
    difficulty: req.difficulty,
    estSeconds: 120,
    correct: m(String(sn)),
    distractors: ds,
    rng,
    text: (lang) => {
      const L = langPicker(lang);
      const cond = `a_{${p.p}}=${ap},\\ a_{${p.q}}=${aq}`;
      return {
        stem_md: L(
          T`Arifmetik progressiyada $${cond}$. Progressiyaning dastlabki $${n}$ ta hadi yig'indisini toping.`,
          T`В арифметической прогрессии $${cond}$. Найдите сумму первых $${n}$ членов прогрессии.`,
          T`Arifmetikalıq progressiyada $${cond}$. Progressiyanıń dáslepki $${n}$ aǵzasınıń qosındısın tabıń.`,
          T`In an arithmetic progression $${cond}$. Find the sum of the first $${n}$ terms.`,
        ),
        solution_md: L(
          T`$d=\dfrac{${aq}-${texParen(ap)}}{${p.q}-${p.p}}=${d}$, $a_1=${ap}-${p.p - 1}\cdot${texParen(d)}=${a1}$. $S_{${n}}=\dfrac{2\cdot${texParen(a1)}+${n - 1}\cdot${texParen(d)}}{2}\cdot ${n}=${sn}$.`,
          T`$d=\dfrac{${aq}-${texParen(ap)}}{${p.q}-${p.p}}=${d}$, $a_1=${ap}-${p.p - 1}\cdot${texParen(d)}=${a1}$. $S_{${n}}=\dfrac{2\cdot${texParen(a1)}+${n - 1}\cdot${texParen(d)}}{2}\cdot ${n}=${sn}$.`,
          T`$d=\dfrac{${aq}-${texParen(ap)}}{${p.q}-${p.p}}=${d}$, $a_1=${ap}-${p.p - 1}\cdot${texParen(d)}=${a1}$. $S_{${n}}=\dfrac{2\cdot${texParen(a1)}+${n - 1}\cdot${texParen(d)}}{2}\cdot ${n}=${sn}$.`,
          T`$d=\dfrac{${aq}-${texParen(ap)}}{${p.q}-${p.p}}=${d}$, $a_1=${ap}-${p.p - 1}\cdot${texParen(d)}=${a1}$. $S_{${n}}=\dfrac{2\cdot${texParen(a1)}+${n - 1}\cdot${texParen(d)}}{2}\cdot ${n}=${sn}$.`,
        ),
        mistake_note_md: L(
          T`Yig'indi formulasida $n-1$ o'rniga $n$ ni qo'yish yoki $a_1$ ni noto'g'ri topish.`,
          T`Подставить $n$ вместо $n-1$ в формулу суммы или неверно найти $a_1$.`,
          T`Qosındı formulasında $n-1$ ornına $n$ di qoyıw yamasa $a_1$ di qáte tabıw.`,
          T`Using $n$ instead of $n-1$ in the sum formula or finding $a_1$ incorrectly.`,
        ),
      };
    },
  });
}

// --- A6: cheksiz kamayuvchi geometrik progressiya yig'indisi (58) ---
export interface GpP {
  q: Frac;
  c: number;
  m: number;
  t: number;
  neg: boolean;
}
const GP_Q: readonly [number, number][] = [
  [1, 2],
  [1, 3],
  [2, 3],
  [1, 4],
  [3, 4],
  [1, 5],
  [2, 5],
];
export function sampleGp(rng: Rng): GpP {
  const [t, mm] = rng.pick(GP_Q);
  const neg = rng.chance(0.5);
  return { q: frac(neg ? -t : t, mm), c: rng.int(1, 6), m: mm, t, neg };
}
/** b1 = m^2 c, b3 = c t^2; S = b1/(1-q) */
export function solveGp({ q, c, m: mm, t }: GpP): { b1: number; b3: number; s: Frac } {
  const b1 = mm * mm * c;
  return { b1, b3: c * t * t, s: fDiv(frac(b1), fSub(frac(1), q)) };
}

function tplGp(req: SlotRequest) {
  const p = sampleGp(slotRng(req, 'gp'));
  const rng = slotRng(req, 'gp-opt');
  const { b1, b3, s } = solveGp(p);
  const one = frac(1);
  const opp = fDiv(frac(b1), fSub(one, frac(-p.q.n, p.q.d)));
  const qq = fMul(p.q, p.q);
  const ds = fracStrings([
    opp,
    fDiv(frac(b1), fSub(one, qq)),
    fAdd(fAdd(frac(b1), fMul(frac(b1), p.q)), fMul(frac(b1), qq)),
    fMul(frac(b1), fSub(one, p.q)),
    fDiv(frac(b1), fAdd(one, qq)),
  ]);
  return y1Spec({
    topic: 58,
    difficulty: req.difficulty,
    estSeconds: 130,
    correct: m(texFrac(s)),
    pad: fracStrings(fracFallbacks(s)),
    distractors: ds,
    rng,
    text: (lang) => {
      const L = langPicker(lang);
      const sign = p.neg ? 'q<0' : 'q>0';
      const cond = `b_1=${b1},\\ b_3=${b3}`;
      return {
        stem_md: L(
          T`Cheksiz kamayuvchi geometrik progressiyada $${cond}$ va $${sign}$. Progressiya hadlarining yig'indisini toping.`,
          T`В бесконечно убывающей геометрической прогрессии $${cond}$ и $${sign}$. Найдите сумму членов прогрессии.`,
          T`Sheksiz kemeyiwshi geometriyalıq progressiyada $${cond}$ hám $${sign}$. Progressiya aǵzalarınıń qosındısın tabıń.`, // kaa: tekshirilsin
          T`In an infinite decreasing geometric progression $${cond}$ and $${sign}$. Find the sum of the terms.`,
        ),
        solution_md: L(
          T`$q^{2}=\dfrac{b_3}{b_1}=\dfrac{${b3}}{${b1}}=${texFrac(fMul(p.q, p.q))}$, $${sign}$ bo'lgani uchun $q=${texFrac(p.q)}$. $S=\dfrac{b_1}{1-q}=\dfrac{${b1}}{1-${texParen2(p.q)}}=${texFrac(s)}$.`,
          T`$q^{2}=\dfrac{b_3}{b_1}=\dfrac{${b3}}{${b1}}=${texFrac(fMul(p.q, p.q))}$, так как $${sign}$, то $q=${texFrac(p.q)}$. $S=\dfrac{b_1}{1-q}=\dfrac{${b1}}{1-${texParen2(p.q)}}=${texFrac(s)}$.`,
          T`$q^{2}=\dfrac{b_3}{b_1}=\dfrac{${b3}}{${b1}}=${texFrac(fMul(p.q, p.q))}$, $${sign}$ bolǵanı ushın $q=${texFrac(p.q)}$. $S=\dfrac{b_1}{1-q}=\dfrac{${b1}}{1-${texParen2(p.q)}}=${texFrac(s)}$.`,
          T`$q^{2}=\dfrac{b_3}{b_1}=\dfrac{${b3}}{${b1}}=${texFrac(fMul(p.q, p.q))}$ and $${sign}$, so $q=${texFrac(p.q)}$. $S=\dfrac{b_1}{1-q}=\dfrac{${b1}}{1-${texParen2(p.q)}}=${texFrac(s)}$.`,
        ),
        mistake_note_md: L(
          T`$q$ ning ishorasini e'tiborsiz qoldirish yoki $\dfrac{b_1}{1-q^{2}}$ deb olish.`,
          T`Не учесть знак $q$ или взять $\dfrac{b_1}{1-q^{2}}$.`,
          T`$q$ dıń belgisin itibarǵa almaw yamasa $\dfrac{b_1}{1-q^{2}}$ dep alıw.`,
          T`Ignoring the sign of $q$ or using $\dfrac{b_1}{1-q^{2}}$.`,
        ),
      };
    },
  });
}

/** manfiy kasrni qavsga oladi: -1/3 -> (-\frac{1}{3}) */
function texParen2(f: Frac): string {
  return f.n < 0 ? `(${texFrac(f)})` : texFrac(f);
}

// --- A7: 0/0 ko'rinishidagi limit (59) ---
export interface Lim00P {
  p: number;
  q: number;
}
export function sampleLim00(rng: Rng): Lim00P {
  for (;;) {
    const q = rng.pick([-4, -3, -2, -1, 1, 2, 3, 4]);
    const p = rng.int(-5, 5);
    if (p !== q) return { p, q };
  }
}
/** lim_{x->q} (x^2-(p+q)x+pq)/(x^2-q^2) = (q-p)/(2q) */
export const solveLim00 = ({ p, q }: Lim00P): Frac => frac(q - p, 2 * q);

function tplLim00(req: SlotRequest) {
  const p = sampleLim00(slotRng(req, 'lim00'));
  const rng = slotRng(req, 'lim00-opt');
  const { p: pp, q } = p;
  const ans = solveLim00(p);
  const ds = [...fracStrings([fracOrNull(pp - q, 2 * q), fracOrNull(q - pp, q), fracOrNull(q + pp, 2 * q), fracOrNull(q - pp, q * q), fracOrNull(pp, q)]), m('1')];
  const num = texPoly([1, -(pp + q), pp * q]);
  const den = texPoly([1, 0, -q * q]);
  const expr = `\\lim_{x\\to ${q}}\\dfrac{${num}}{${den}}`;
  return y1Spec({
    topic: 59,
    difficulty: req.difficulty,
    estSeconds: 110,
    correct: m(texFrac(ans)),
    pad: fracStrings(fracFallbacks(ans)),
    distractors: ds,
    rng,
    text: (lang) => {
      const L = langPicker(lang);
      return {
        stem_md: L(
          T`Limitni hisoblang: $${expr}$.`,
          T`Вычислите предел: $${expr}$.`,
          T`Limitti esaplań: $${expr}$.`,
          T`Evaluate the limit: $${expr}$.`,
        ),
        solution_md: L(
          T`Surat ham maxraj $x=${q}$ da nolga aylanadi. Ko'paytuvchilarga ajratamiz: $\dfrac{(${xm(pp)})(${xm(q)})}{(${xm(q)})(${xm(-q)})}=\dfrac{${xm(pp)}}{${xm(-q)}}$. $x\to ${q}$ da limit $${texFrac(ans)}$.`,
          T`И числитель, и знаменатель обращаются в нуль при $x=${q}$. Разложим на множители: $\dfrac{(${xm(pp)})(${xm(q)})}{(${xm(q)})(${xm(-q)})}=\dfrac{${xm(pp)}}{${xm(-q)}}$. При $x\to ${q}$ предел равен $${texFrac(ans)}$.`,
          T`Alım da, bólim de $x=${q}$ de nolge aylanadı. Kóbeytiwshilerge ajıratamız: $\dfrac{(${xm(pp)})(${xm(q)})}{(${xm(q)})(${xm(-q)})}=\dfrac{${xm(pp)}}{${xm(-q)}}$. $x\to ${q}$ de limit $${texFrac(ans)}$.`,
          T`Both numerator and denominator vanish at $x=${q}$. Factor: $\dfrac{(${xm(pp)})(${xm(q)})}{(${xm(q)})(${xm(-q)})}=\dfrac{${xm(pp)}}{${xm(-q)}}$. As $x\to ${q}$ the limit is $${texFrac(ans)}$.`,
        ),
        mistake_note_md: L(
          T`Qisqartirgandan keyin suratdagi ayirmaning ishorasini noto'g'ri qo'yish ($q-p$ o'rniga $p-q$).`,
          T`После сокращения перепутать порядок вычитания ($p-q$ вместо $q-p$).`,
          T`Qısqartqannan keyin alımdaǵı ayırmanıń belgisin qáte qoyıw ($q-p$ ornına $p-q$).`,
          T`Reversing the order of subtraction after cancelling ($p-q$ instead of $q-p$).`,
        ),
      };
    },
  });
}

// --- A8: ketma-ketlik limiti (56) ---
export interface SeqLimP {
  p: number;
  q: number;
  r: number;
  s: number;
  t: number;
  u: number;
}
export function sampleSeqLim(rng: Rng): SeqLimP {
  return { p: rng.int(1, 4), q: rng.int(-3, 5), r: rng.int(1, 4), s: rng.int(-3, 5), t: rng.int(1, 6), u: rng.int(0, 5) };
}
/** lim (pn+q)(rn+s)/(tn^2+un) = pr/t */
export const solveSeqLim = ({ p, r, t }: SeqLimP): Frac => frac(p * r, t);

function tplSeqLim(req: SlotRequest) {
  const k = sampleSeqLim(slotRng(req, 'seqlim'));
  const rng = slotRng(req, 'seqlim-opt');
  const ans = solveSeqLim(k);
  const ds = [
    ...fracStrings([frac(k.p, k.t), frac(k.r, k.t), frac(k.p + k.r, k.t), frac(k.p * k.r + k.q * k.s, k.t), frac(k.p * k.r, k.t * k.t)]),
    m('\\infty'),
  ];
  const expr = `\\lim_{n\\to\\infty}\\dfrac{(${texPoly([k.p, k.q], 'n')})(${texPoly([k.r, k.s], 'n')})}{${texPoly([k.t, k.u, 0], 'n')}}`;
  return y1Spec({
    topic: 56,
    difficulty: req.difficulty,
    estSeconds: 100,
    correct: m(texFrac(ans)),
    pad: fracStrings(fracFallbacks(ans)),
    distractors: ds,
    rng,
    text: (lang) => {
      const L = langPicker(lang);
      return {
        stem_md: L(
          T`Ketma-ketlik limitini toping: $${expr}$.`,
          T`Найдите предел последовательности: $${expr}$.`,
          T`Izbe-izliktiń limitin tabıń: $${expr}$.`,
          T`Find the limit of the sequence: $${expr}$.`,
        ),
        solution_md: L(
          T`Surat ham maxrajning eng yuqori darajasi $n^{2}$. Surat $n^{2}$ oldidagi koeffitsiyent $${k.p}\cdot ${k.r}=${k.p * k.r}$, maxrajniki $${k.t}$. Shuning uchun limit $\dfrac{${k.p * k.r}}{${k.t}}=${texFrac(ans)}$.`,
          T`Старшая степень и в числителе, и в знаменателе равна $n^{2}$. Коэффициент числителя при $n^{2}$ равен $${k.p}\cdot ${k.r}=${k.p * k.r}$, знаменателя $${k.t}$. Предел $\dfrac{${k.p * k.r}}{${k.t}}=${texFrac(ans)}$.`,
          T`Alım da, bólim de eń joqarı dárejesi $n^{2}$. Alımdaǵı $n^{2}$ aldındaǵı koeffitsiyent $${k.p}\cdot ${k.r}=${k.p * k.r}$, bólimdiki $${k.t}$. Sonıń ushın limit $\dfrac{${k.p * k.r}}{${k.t}}=${texFrac(ans)}$.`,
          T`The highest power in both numerator and denominator is $n^{2}$. The leading coefficient of the numerator is $${k.p}\cdot ${k.r}=${k.p * k.r}$ and of the denominator $${k.t}$. The limit is $\dfrac{${k.p * k.r}}{${k.t}}=${texFrac(ans)}$.`,
        ),
        mistake_note_md: L(
          T`Faqat bitta qavs koeffitsiyentini olib, ikkinchisini unutish.`,
          T`Взять коэффициент только одной скобки и забыть вторую.`,
          T`Tek bir qawıs koeffitsiyentin alıp, ekinshisin umıtıw.`,
          T`Taking the coefficient of only one bracket and forgetting the other.`,
        ),
      };
    },
  });
}

// --- A9: boshlang'ich funksiya (65) ---
export interface AntiP {
  p: number;
  q: number;
  r: number;
  x1: number;
  x2: number;
  s: number;
}
export function sampleAnti(rng: Rng): AntiP {
  const x1 = rng.int(0, 2);
  return { p: rng.pick([1, 2, 3, -1, -2]), q: rng.int(-3, 3), r: rng.int(-4, 5), x1, x2: x1 + rng.int(1, 2), s: rng.int(-6, 8) };
}
/** f=3p x^2+2q x+r, F=p x^3+q x^2+r x+C, F(x1)=s */
export function solveAnti({ p, q, r, x1, x2, s }: AntiP): { fCoefs: number[]; value: number; g2: number } {
  const g = (x: number) => p * x ** 3 + q * x ** 2 + r * x;
  return { fCoefs: [3 * p, 2 * q, r], value: s + g(x2) - g(x1), g2: g(x2) };
}

function tplAnti(req: SlotRequest) {
  const k = sampleAnti(slotRng(req, 'anti'));
  const rng = slotRng(req, 'anti-opt');
  const { fCoefs, value, g2 } = solveAnti(k);
  const g1 = k.p * k.x1 ** 3 + k.q * k.x1 ** 2 + k.r * k.x1;
  const ds = numericDistractors(value, [g2, g2 + k.s, polyAt(fCoefs, k.x2), k.s - (g2 - g1), g2 - g1], rng, mn);
  const f = texPoly(fCoefs);
  return y1Spec({
    topic: 65,
    difficulty: req.difficulty,
    estSeconds: 120,
    correct: m(String(value)),
    distractors: ds,
    rng,
    text: (lang) => {
      const L = langPicker(lang);
      return {
        stem_md: L(
          T`$F(x)$ funksiya $f(x)=${f}$ funksiyaning boshlang'ich funksiyasi va $F(${k.x1})=${k.s}$. $F(${k.x2})$ ni toping.`,
          T`Функция $F(x)$ является первообразной функции $f(x)=${f}$, причём $F(${k.x1})=${k.s}$. Найдите $F(${k.x2})$.`,
          T`$F(x)$ funkciyası $f(x)=${f}$ funkciyasınıń dáslepki funkciyası hám $F(${k.x1})=${k.s}$. $F(${k.x2})$ di tabıń.`,
          T`$F(x)$ is an antiderivative of $f(x)=${f}$ and $F(${k.x1})=${k.s}$. Find $F(${k.x2})$.`,
        ),
        solution_md: L(
          T`$F(x)=${texPoly([k.p, k.q, k.r, 0])}+C$. $F(${k.x1})=${k.s}$ dan $C=${k.s - g1}$. Demak $F(${k.x2})=${g2}+${texParen(k.s - g1)}=${value}$.`,
          T`$F(x)=${texPoly([k.p, k.q, k.r, 0])}+C$. Из $F(${k.x1})=${k.s}$ находим $C=${k.s - g1}$. Тогда $F(${k.x2})=${g2}+${texParen(k.s - g1)}=${value}$.`,
          T`$F(x)=${texPoly([k.p, k.q, k.r, 0])}+C$. $F(${k.x1})=${k.s}$ den $C=${k.s - g1}$. Demek $F(${k.x2})=${g2}+${texParen(k.s - g1)}=${value}$.`,
          T`$F(x)=${texPoly([k.p, k.q, k.r, 0])}+C$. From $F(${k.x1})=${k.s}$ we get $C=${k.s - g1}$. Hence $F(${k.x2})=${g2}+${texParen(k.s - g1)}=${value}$.`,
        ),
        mistake_note_md: L(
          T`Integrallash doimiysi $C$ ni topmasdan qoldirish.`,
          T`Не найти постоянную интегрирования $C$.`,
          T`Integrallaw turaqlısı $C$ nı tabpay qaldırıw.`,
          T`Leaving out the constant of integration $C$.`,
        ),
      };
    },
  });
}

// --- A10: parabola va Ox o'qi bilan chegaralangan yuza (66) ---
export interface AreaP {
  k: number;
  p: number;
  q: number;
}
export function sampleArea(rng: Rng): AreaP {
  const p = rng.int(-3, 2);
  return { k: rng.pick([1, 2, 3, -1, -2, -3]), p, q: p + rng.int(2, 6) };
}
/** y=k(x-p)(x-q), yuza = |k|(q-p)^3/6 */
export const solveArea = ({ k, p, q }: AreaP): { coefs: number[]; area: Frac } => ({
  coefs: [k, -k * (p + q), k * p * q],
  area: frac(Math.abs(k) * (q - p) ** 3, 6),
});

function tplArea(req: SlotRequest) {
  const a = sampleArea(slotRng(req, 'area'));
  const rng = slotRng(req, 'area-opt');
  const { coefs, area } = solveArea(a);
  const w = a.q - a.p;
  const ak = Math.abs(a.k);
  const ds = fracStrings([frac(w ** 3, 6), frac(ak * w ** 3, 3), frac(ak * w ** 2, 2), frac(ak * w ** 3, 2), frac(a.k * w ** 3, 6)]);
  const f = texPoly(coefs);
  return y1Spec({
    topic: 66,
    difficulty: req.difficulty,
    estSeconds: 150,
    correct: m(texFrac(area)),
    pad: fracStrings(fracFallbacks(area)),
    distractors: ds,
    rng,
    text: (lang) => {
      const L = langPicker(lang);
      const int = `\\int_{${a.p}}^{${a.q}}`;
      return {
        stem_md: L(
          T`$y=${f}$ parabola va $Ox$ o'qi bilan chegaralangan shaklning yuzini toping.`,
          T`Найдите площадь фигуры, ограниченной параболой $y=${f}$ и осью $Ox$.`,
          T`$y=${f}$ parabolası hám $Ox$ kósheri menen shegaralanǵan figuranıń maydanın tabıń.`,
          T`Find the area of the region bounded by the parabola $y=${f}$ and the $Ox$ axis.`,
        ),
        solution_md: L(
          T`$${f}=${a.k}(${xm(a.p)})(${xm(a.q)})$, kesishish nuqtalari $x=${a.p}$ va $x=${a.q}$. $S=\left|${int}(${f})\,dx\right|=\dfrac{${ak}\cdot ${w}^{3}}{6}=${texFrac(area)}$.`,
          T`$${f}=${a.k}(${xm(a.p)})(${xm(a.q)})$, точки пересечения с осью $x=${a.p}$ и $x=${a.q}$. $S=\left|${int}(${f})\,dx\right|=\dfrac{${ak}\cdot ${w}^{3}}{6}=${texFrac(area)}$.`,
          T`$${f}=${a.k}(${xm(a.p)})(${xm(a.q)})$, kesiliw noqatları $x=${a.p}$ hám $x=${a.q}$. $S=\left|${int}(${f})\,dx\right|=\dfrac{${ak}\cdot ${w}^{3}}{6}=${texFrac(area)}$.`,
          T`$${f}=${a.k}(${xm(a.p)})(${xm(a.q)})$, the roots are $x=${a.p}$ and $x=${a.q}$. $S=\left|${int}(${f})\,dx\right|=\dfrac{${ak}\cdot ${w}^{3}}{6}=${texFrac(area)}$.`,
        ),
        mistake_note_md: L(
          T`Yuza manfiy chiqsa ishorani o'zgartirmaslik yoki $|k|$ ga ko'paytirishni unutish.`,
          T`Оставить отрицательный знак у площади или забыть множитель $|k|$.`,
          T`Maydan teris shıqsa belgini ózgertpew yamasa $|k|$ ǵa kóbeytiwdi umıtıw.`,
          T`Leaving the area negative or forgetting the factor $|k|$.`,
        ),
      };
    },
  });
}

// --- A11: bo'linma hosilasi (60) ---
export interface QuotP {
  a: number;
  b: number;
  x0: number;
}
export function sampleQuot(rng: Rng): QuotP {
  for (;;) {
    const k = { a: rng.int(-5, 5), b: rng.int(1, 4), x0: rng.int(0, 3) };
    if (solveQuot(k).n !== 0) return k;
  }
}
/** f=(x^2+a)/(x+b); f'(x0)=(2x0(x0+b)-(x0^2+a))/(x0+b)^2 */
export const solveQuot = ({ a, b, x0 }: QuotP): Frac => frac(2 * x0 * (x0 + b) - (x0 * x0 + a), (x0 + b) ** 2);

function tplQuot(req: SlotRequest) {
  const k = sampleQuot(slotRng(req, 'quot'));
  const rng = slotRng(req, 'quot-opt');
  const { a, b, x0 } = k;
  const ans = solveQuot(k);
  const den = (x0 + b) ** 2;
  const ds = [
    ...fracStrings([
      frac(2 * x0 * (x0 + b) + (x0 * x0 + a), den),
      frac(-(2 * x0 * (x0 + b) - (x0 * x0 + a)), den),
      frac(2 * x0 * (x0 + b) - (x0 * x0 + a), x0 + b),
      frac(2 * x0, 1),
    ]),
  ];
  const f = `f(x)=\\dfrac{${texPoly([1, 0, a])}}{${texPoly([1, b])}}`;
  return y1Spec({
    topic: 60,
    difficulty: req.difficulty,
    estSeconds: 120,
    correct: m(texFrac(ans)),
    pad: fracStrings(fracFallbacks(ans)),
    distractors: ds,
    rng,
    text: (lang) => {
      const L = langPicker(lang);
      return {
        stem_md: L(
          T`$${f}$ funksiyaning $x_0=${x0}$ nuqtadagi hosilasini toping.`,
          T`Найдите производную функции $${f}$ в точке $x_0=${x0}$.`,
          T`$${f}$ funkciyasınıń $x_0=${x0}$ noqatındaǵı tuwındısın tabıń.`,
          T`Find the derivative of $${f}$ at the point $x_0=${x0}$.`,
        ),
        solution_md: L(
          T`Bo'linma hosilasi: $f^{\prime}(x)=\dfrac{2x(${texPoly([1, b])})-(${texPoly([1, 0, a])})}{(${texPoly([1, b])})^{2}}$. $x=${x0}$ da: $\dfrac{${2 * x0 * (x0 + b)}-${texParen(x0 * x0 + a)}}{${den}}=${texFrac(ans)}$.`,
          T`Производная частного: $f^{\prime}(x)=\dfrac{2x(${texPoly([1, b])})-(${texPoly([1, 0, a])})}{(${texPoly([1, b])})^{2}}$. При $x=${x0}$: $\dfrac{${2 * x0 * (x0 + b)}-${texParen(x0 * x0 + a)}}{${den}}=${texFrac(ans)}$.`,
          T`Bólindi tuwındısı: $f^{\prime}(x)=\dfrac{2x(${texPoly([1, b])})-(${texPoly([1, 0, a])})}{(${texPoly([1, b])})^{2}}$. $x=${x0}$ de: $\dfrac{${2 * x0 * (x0 + b)}-${texParen(x0 * x0 + a)}}{${den}}=${texFrac(ans)}$.`,
          T`Quotient rule: $f^{\prime}(x)=\dfrac{2x(${texPoly([1, b])})-(${texPoly([1, 0, a])})}{(${texPoly([1, b])})^{2}}$. At $x=${x0}$: $\dfrac{${2 * x0 * (x0 + b)}-${texParen(x0 * x0 + a)}}{${den}}=${texFrac(ans)}$.`,
        ),
        mistake_note_md: L(
          T`Surat hosilasi bilan maxraj hosilasini bo'lish yoki suratdagi ayirma tartibini adashtirish.`,
          T`Делить производную числителя на производную знаменателя или перепутать порядок разности в числителе.`,
          T`Alım tuwındısın bólim tuwındısına bóliw yamasa alımdaǵı ayırma tártibin shatastırıw.`,
          T`Dividing the derivative of the numerator by that of the denominator, or reversing the order of the numerator difference.`,
        ),
      };
    },
  });
}

// ============================== O (ochiq), L3 shablonlar ==============================

// --- O1: urinma va uning Ox bilan kesishishi (62) ---
export function solveTangentOpen(p: TangentP): { k: number; xInt: Frac } {
  const { k, f0 } = solveTangent(p);
  return { k, xInt: frac(k * p.x0 - f0, k) };
}

function otplTangent(req: SlotRequest) {
  const p = sampleTangent(slotRng(req, 'otan'));
  const { k, xInt } = solveTangentOpen(p);
  const { b, f0 } = solveTangent(p);
  const f = texPoly(p.coefs);
  return oSpec({
    topic: 62,
    extraTopics: [60],
    difficulty: req.difficulty,
    estSeconds: 360,
    a: frac(k),
    b: xInt,
    text: (lang) => {
      const L = langPicker(lang);
      return {
        stem_md: L(
          T`$f(x)=${f}$ funksiya grafigiga abssissasi $x_0=${p.x0}$ bo'lgan nuqtada urinma o'tkazilgan.`,
          T`К графику функции $f(x)=${f}$ в точке с абсциссой $x_0=${p.x0}$ проведена касательная.`,
          T`$f(x)=${f}$ funkciyasınıń grafigine abscissası $x_0=${p.x0}$ bolǵan noqatta urınba júrgizilgen.`,
          T`A tangent line is drawn to the graph of $f(x)=${f}$ at the point with abscissa $x_0=${p.x0}$.`,
        ),
        a: {
          prompt_md: L(T`Urinmaning burchak koeffitsiyentini toping.`, T`Найдите угловой коэффициент касательной.`, T`Urınbanıń múyeshlik koeffitsiyentin tabıń.`, T`Find the slope of the tangent.`),
        },
        b: {
          prompt_md: L(
            T`Urinmaning $Ox$ o'qi bilan kesishish nuqtasi abssissasini toping.`,
            T`Найдите абсциссу точки пересечения касательной с осью $Ox$.`,
            T`Urınbanıń $Ox$ kósheri menen kesiliw noqatınıń abscissasın tabıń.`,
            T`Find the abscissa of the point where the tangent meets the $Ox$ axis.`,
          ),
          hint: L(`Butun son, oddiy kasr (masalan 3/4) yoki o'nli kasr`, `Целое число, обыкновенная дробь (например 3/4) или десятичная дробь`, `Pútin san, ápiwayı bólshek (mısalı 3/4) yamasa onlıq bólshek`, `An integer, a common fraction (e.g. 3/4) or a decimal`),
        },
        solution_md: L(
          T`a) $f^{\prime}(x)=${texPoly(polyDer(p.coefs))}$, $k=f^{\prime}(${p.x0})=${k}$. b) $f(${p.x0})=${f0}$, urinma $${texLine(k, b)}$. $y=0$ da $x=${texFrac(xInt)}$.`,
          T`а) $f^{\prime}(x)=${texPoly(polyDer(p.coefs))}$, $k=f^{\prime}(${p.x0})=${k}$. б) $f(${p.x0})=${f0}$, касательная $${texLine(k, b)}$. При $y=0$ получаем $x=${texFrac(xInt)}$.`,
          T`a) $f^{\prime}(x)=${texPoly(polyDer(p.coefs))}$, $k=f^{\prime}(${p.x0})=${k}$. b) $f(${p.x0})=${f0}$, urınba $${texLine(k, b)}$. $y=0$ de $x=${texFrac(xInt)}$.`,
          T`a) $f^{\prime}(x)=${texPoly(polyDer(p.coefs))}$, $k=f^{\prime}(${p.x0})=${k}$. b) $f(${p.x0})=${f0}$, the tangent is $${texLine(k, b)}$. Setting $y=0$ gives $x=${texFrac(xInt)}$.`,
        ),
        mistake_note_md: L(
          T`$y=0$ qo'yib $x$ ni topishda ishora xatosi: $x=-\dfrac{b}{k}$.`,
          T`Ошибка знака при $y=0$: $x=-\dfrac{b}{k}$.`,
          T`$y=0$ qoyıp $x$ ti tabıwda belgi qátesi: $x=-\dfrac{b}{k}$.`,
          T`A sign error when setting $y=0$: $x=-\dfrac{b}{k}$.`,
        ),
      };
    },
  });
}

// --- O2: devor yonidagi to'siqli maydon (64) ---
export interface FenceP {
  c: number;
}
export const sampleFence = (rng: Rng): FenceP => ({ c: rng.int(4, 25) });
/** 3x+y=L (L=6c), S=x(L-3x): x=c, S=3c^2 */
export const solveFence = ({ c }: FenceP): { total: number; x: number; y: number; area: number } => ({ total: 6 * c, x: c, y: 3 * c, area: 3 * c * c });

function otplFence(req: SlotRequest) {
  const p = sampleFence(slotRng(req, 'fence'));
  const s = solveFence(p);
  return oSpec({
    topic: 64,
    difficulty: req.difficulty,
    estSeconds: 360,
    a: frac(s.x),
    b: frac(s.area),
    text: (lang) => {
      const L = langPicker(lang);
      return {
        stem_md: L(
          T`Devor yonida to'g'ri to'rtburchak shaklidagi maydon to'r bilan o'raladi: devorga parallel bitta tomon va devorga perpendikulyar uchta to'siq ($x$ uzunlikdagi uch bo'lak, shundan biri maydonni o'rtadan ikkiga bo'ladi). Jami to'r uzunligi $${s.total}$ m. Maydonning yuzi eng katta bo'lsin.`,
          T`Прямоугольный участок у стены огораживают сеткой: одна сторона параллельно стене и три перпендикулярные стене секции длиной $x$ (одна из них делит участок пополам). Общая длина сетки $${s.total}$ м. Площадь участка должна быть наибольшей.`,
          T`Diywal janında tuwrı tórtmúyeshlik formasındaǵı maydan tor menen ornaladı: diywalǵa parallel bir tárep hám diywalǵa perpendikulyar úsh bólek ($x$ uzınlıqtaǵı úsh bólek, olardıń biri maydandı ortadan ekige bóledi). Tordıń jámi uzınlıǵı $${s.total}$ m. Maydannıń maydanı eń úlken bolsın.`,
          T`A rectangular plot next to a wall is fenced with wire: one side parallel to the wall and three sections of length $x$ perpendicular to it (one of them splits the plot in half). The total length of wire is $${s.total}$ m. The area must be as large as possible.`,
        ),
        a: {
          prompt_md: L(T`$x$ ning qiymatini (metrda) toping.`, T`Найдите значение $x$ (в метрах).`, T`$x$ tiń mánisin (metrde) tabıń.`, T`Find the value of $x$ (in metres).`),
        },
        b: {
          prompt_md: L(T`Maydonning eng katta yuzini toping.`, T`Найдите наибольшую площадь участка.`, T`Maydannıń eń úlken maydanın tabıń.`, T`Find the maximum area of the plot.`),
          hint: L(`Kvadrat metrda`, `В квадратных метрах`, `Kvadrat metrde`, `In square metres`),
        },
        solution_md: L(
          T`Devorga parallel tomon $y=${s.total}-3x$. Yuza $S(x)=x(${s.total}-3x)=${s.total}x-3x^{2}$. $S^{\prime}(x)=${s.total}-6x=0$ dan $x=${s.x}$. U maksimum nuqtasi (parabola shoxlari pastga). $S(${s.x})=${s.x}\cdot ${s.y}=${s.area}$.`,
          T`Сторона, параллельная стене, $y=${s.total}-3x$. Площадь $S(x)=x(${s.total}-3x)=${s.total}x-3x^{2}$. Из $S^{\prime}(x)=${s.total}-6x=0$ находим $x=${s.x}$. Это максимум (ветви параболы вниз). $S(${s.x})=${s.x}\cdot ${s.y}=${s.area}$.`,
          T`Diywalǵa parallel tárep $y=${s.total}-3x$. Maydan $S(x)=x(${s.total}-3x)=${s.total}x-3x^{2}$. $S^{\prime}(x)=${s.total}-6x=0$ den $x=${s.x}$. Bul maksimum (parabola shaqaları tómenge). $S(${s.x})=${s.x}\cdot ${s.y}=${s.area}$.`,
          T`The side parallel to the wall is $y=${s.total}-3x$. The area is $S(x)=x(${s.total}-3x)=${s.total}x-3x^{2}$. From $S^{\prime}(x)=${s.total}-6x=0$ we get $x=${s.x}$, a maximum (the parabola opens downward). $S(${s.x})=${s.x}\cdot ${s.y}=${s.area}$.`,
        ),
        mistake_note_md: L(
          T`Uchta perpendikulyar to'siq o'rniga ikkitasini hisoblash ($y=L-2x$ deb olish).`,
          T`Считать два перпендикулярных участка вместо трёх ($y=L-2x$).`,
          T`Úsh perpendikulyar bólek ornına ekewin esaplaw ($y=L-2x$ dep alıw).`,
          T`Counting two perpendicular sections instead of three ($y=L-2x$).`,
        ),
      };
    },
  });
}

// --- O3: ochiq quti (64) ---
export interface BoxP {
  k: number;
}
export const sampleBox = (rng: Rng): BoxP => ({ k: rng.int(2, 8) });
/** a=6k, V=x(a-2x)^2: x=k, V=16k^3 */
export const solveBox = ({ k }: BoxP): { side: number; x: number; volume: number } => ({ side: 6 * k, x: k, volume: 16 * k ** 3 });

function otplBox(req: SlotRequest) {
  const p = sampleBox(slotRng(req, 'box'));
  const s = solveBox(p);
  return oSpec({
    topic: 64,
    extraTopics: [85],
    difficulty: req.difficulty,
    estSeconds: 360,
    a: frac(s.x),
    b: frac(s.volume),
    text: (lang) => {
      const L = langPicker(lang);
      return {
        stem_md: L(
          T`Tomoni $${s.side}$ sm bo'lgan kvadrat shaklidagi kartonning to'rt burchagidan tomoni $x$ sm bo'lgan kvadratlar qirqib olinadi va qolgan qismdan usti ochiq quti yasaladi. Qutining hajmi eng katta bo'lsin.`,
          T`Из квадратного листа картона со стороной $${s.side}$ см по углам вырезают квадраты со стороной $x$ см, а из оставшейся части делают коробку без крышки. Объём коробки должен быть наибольшим.`,
          T`Tárepi $${s.side}$ sm bolǵan kvadrat formasındaǵı kartonnıń tórt múyeshinen tárepi $x$ sm bolǵan kvadratlar kesip alınadı hám qalǵan bólimnen ústi ashıq qutı jasaladı. Qutınıń kólemi eń úlken bolsın.`,
          T`From each corner of a square cardboard sheet of side $${s.side}$ cm, squares of side $x$ cm are cut out and the rest is folded into an open box. The volume of the box must be as large as possible.`,
        ),
        a: {
          prompt_md: L(T`$x$ ning qiymatini (sm da) toping.`, T`Найдите значение $x$ (в см).`, T`$x$ tiń mánisin (sm de) tabıń.`, T`Find the value of $x$ (in cm).`),
        },
        b: {
          prompt_md: L(T`Qutining eng katta hajmini toping.`, T`Найдите наибольший объём коробки.`, T`Qutınıń eń úlken kólemin tabıń.`, T`Find the maximum volume of the box.`),
          hint: L(`Kub santimetrda`, `В кубических сантиметрах`, `Kub santimetrde`, `In cubic centimetres`),
        },
        solution_md: L(
          T`Quti tubi tomoni $${s.side}-2x$, balandligi $x$. $V(x)=x(${s.side}-2x)^{2}$. $V^{\prime}(x)=(${s.side}-2x)(${s.side}-6x)=0$ dan $x=${s.x}$ (ikkinchisi $x=${s.side / 2}$ da hajm nol). $V(${s.x})=${s.x}\cdot ${4 * p.k}^{2}=${s.volume}$.`,
          T`Основание коробки со стороной $${s.side}-2x$, высота $x$. $V(x)=x(${s.side}-2x)^{2}$. Из $V^{\prime}(x)=(${s.side}-2x)(${s.side}-6x)=0$ получаем $x=${s.x}$ (при $x=${s.side / 2}$ объём равен нулю). $V(${s.x})=${s.x}\cdot ${4 * p.k}^{2}=${s.volume}$.`,
          T`Qutı tabanınıń tárepi $${s.side}-2x$, biyikligi $x$. $V(x)=x(${s.side}-2x)^{2}$. $V^{\prime}(x)=(${s.side}-2x)(${s.side}-6x)=0$ den $x=${s.x}$ ($x=${s.side / 2}$ de kólem nol). $V(${s.x})=${s.x}\cdot ${4 * p.k}^{2}=${s.volume}$.`,
          T`The base of the box has side $${s.side}-2x$ and the height is $x$. $V(x)=x(${s.side}-2x)^{2}$. From $V^{\prime}(x)=(${s.side}-2x)(${s.side}-6x)=0$ we get $x=${s.x}$ (at $x=${s.side / 2}$ the volume is zero). $V(${s.x})=${s.x}\cdot ${4 * p.k}^{2}=${s.volume}$.`,
        ),
        mistake_note_md: L(
          T`Quti tubi tomonini $a-x$ deb olish ($a-2x$ o'rniga).`,
          T`Взять сторону основания $a-x$ вместо $a-2x$.`,
          T`Qutı tabanınıń tárepin $a-x$ dep alıw ($a-2x$ ornına).`,
          T`Taking the base side as $a-x$ instead of $a-2x$.`,
        ),
      };
    },
  });
}

// --- O4: parametrli ekstremum (63) ---
export interface CritP {
  r1: number;
  r2: number;
  c: number;
}
export function sampleCrit(rng: Rng): CritP {
  for (;;) {
    const r1 = rng.int(-3, 2);
    const r2 = r1 + rng.int(1, 5);
    const c = rng.int(-5, 9);
    if ((r1 + r2) % 2 === 0 && c !== 0) return { r1, r2, c };
  }
}
/** f=x^3+px^2+qx+c, f'(r1)=f'(r2)=0: p=-3(r1+r2)/2, q=3 r1 r2; lokal maksimum f(r1) */
export function solveCrit({ r1, r2, c }: CritP): { p: number; q: number; fmax: number } {
  const p = (-3 * (r1 + r2)) / 2;
  const q = 3 * r1 * r2;
  return { p, q, fmax: polyAt([1, p, q, c], r1) };
}

function otplCrit(req: SlotRequest) {
  const k = sampleCrit(slotRng(req, 'crit'));
  const { p, q, fmax } = solveCrit(k);
  const cs = `${k.c < 0 ? '-' : '+'}${Math.abs(k.c)}`;
  const f = `f(x)=x^{3}+px^{2}+qx${cs}`;
  return oSpec({
    topic: 63,
    extraTopics: [60],
    difficulty: req.difficulty,
    estSeconds: 380,
    a: frac(p + q),
    b: frac(fmax),
    text: (lang) => {
      const L = langPicker(lang);
      return {
        stem_md: L(
          T`$${f}$ funksiya $x=${k.r1}$ va $x=${k.r2}$ nuqtalarda ekstremumga erishadi ($p$ va $q$ o'zgarmas sonlar).`,
          T`Функция $${f}$ имеет экстремумы в точках $x=${k.r1}$ и $x=${k.r2}$ ($p$ и $q$ — постоянные числа).`,
          T`$${f}$ funkciyası $x=${k.r1}$ hám $x=${k.r2}$ noqatlarında ekstremumǵa erisedi ($p$ hám $q$ — turaqlı sanlar).`,
          T`The function $${f}$ has extrema at $x=${k.r1}$ and $x=${k.r2}$ ($p$ and $q$ are constants).`,
        ),
        a: { prompt_md: L(T`$p+q$ ning qiymatini toping.`, T`Найдите значение $p+q$.`, T`$p+q$ diń mánisin tabıń.`, T`Find the value of $p+q$.`) },
        b: {
          prompt_md: L(T`Funksiyaning lokal maksimumdagi qiymatini toping.`, T`Найдите значение функции в точке локального максимума.`, T`Funkciyanıń lokal maksimumdaǵı mánisin tabıń.`, T`Find the value of the function at its local maximum.`),
        },
        solution_md: L(
          T`$f^{\prime}(x)=3x^{2}+2px+q=3(${xm(k.r1)})(${xm(k.r2)})$. Koeffitsiyentlarni tenglab: $2p=${-3 * (k.r1 + k.r2)}$, $q=${q}$, ya'ni $p=${p}$, $p+q=${p + q}$. Bosh koeffitsiyent musbat, shuning uchun maksimum $x=${k.r1}$ da: $f(${k.r1})=${fmax}$.`,
          T`$f^{\prime}(x)=3x^{2}+2px+q=3(${xm(k.r1)})(${xm(k.r2)})$. Сравнивая коэффициенты: $2p=${-3 * (k.r1 + k.r2)}$, $q=${q}$, то есть $p=${p}$, $p+q=${p + q}$. Старший коэффициент положителен, поэтому максимум в $x=${k.r1}$: $f(${k.r1})=${fmax}$.`,
          T`$f^{\prime}(x)=3x^{2}+2px+q=3(${xm(k.r1)})(${xm(k.r2)})$. Koeffitsiyentlerdi teńlestirip: $2p=${-3 * (k.r1 + k.r2)}$, $q=${q}$, yaǵnıy $p=${p}$, $p+q=${p + q}$. Bas koeffitsiyent oń, sonıń ushın maksimum $x=${k.r1}$ de: $f(${k.r1})=${fmax}$.`,
          T`$f^{\prime}(x)=3x^{2}+2px+q=3(${xm(k.r1)})(${xm(k.r2)})$. Comparing coefficients: $2p=${-3 * (k.r1 + k.r2)}$, $q=${q}$, so $p=${p}$ and $p+q=${p + q}$. The leading coefficient is positive, so the maximum is at $x=${k.r1}$: $f(${k.r1})=${fmax}$.`,
        ),
        mistake_note_md: L(
          T`Hosilani $3(x-x_1)(x-x_2)$ emas, $(x-x_1)(x-x_2)$ ko'rinishida yozib, $3$ ko'paytuvchini tashlab ketish.`,
          T`Записать производную как $(x-x_1)(x-x_2)$, потеряв множитель $3$.`,
          T`Tuwındını $3(x-x_1)(x-x_2)$ emes, $(x-x_1)(x-x_2)$ kórinisinde jazıp, $3$ kóbeytiwshisin taslap ketiw.`,
          T`Writing the derivative as $(x-x_1)(x-x_2)$ and losing the factor $3$.`,
        ),
      };
    },
  });
}

// --- O5: parabola va to'g'ri chiziq orasidagi yuza (66) ---
export interface BetweenP {
  p: number;
  q: number;
}
export function sampleBetween(rng: Rng): BetweenP {
  const p = rng.int(-3, 1);
  return { p, q: p + rng.int(2, 5) };
}
/** y=x^2 va y=(p+q)x-pq; kesishish x=p,q; yuza (q-p)^3/6 */
export const solveBetween = ({ p, q }: BetweenP): { line: number[]; area: Frac } => ({ line: [p + q, -p * q], area: frac((q - p) ** 3, 6) });

function otplBetween(req: SlotRequest) {
  const k = sampleBetween(slotRng(req, 'btw'));
  const { line, area } = solveBetween(k);
  const ln = texPoly(line);
  return oSpec({
    topic: 66,
    difficulty: req.difficulty,
    estSeconds: 360,
    a: frac(k.q),
    b: area,
    text: (lang) => {
      const L = langPicker(lang);
      return {
        stem_md: L(
          T`$y=x^{2}$ parabola va $y=${ln}$ to'g'ri chiziq berilgan.`,
          T`Даны парабола $y=x^{2}$ и прямая $y=${ln}$.`,
          T`$y=x^{2}$ parabolası hám $y=${ln}$ tuwrı sızıǵı berilgen.`,
          T`The parabola $y=x^{2}$ and the line $y=${ln}$ are given.`,
        ),
        a: {
          prompt_md: L(T`Kesishish nuqtalaridan kattasining abssissasini toping.`, T`Найдите абсциссу большей из точек пересечения.`, T`Kesiliw noqatlarınıń úlkeniniń abscissasın tabıń.`, T`Find the abscissa of the larger intersection point.`),
        },
        b: {
          prompt_md: L(T`Ular bilan chegaralangan shaklning yuzini toping.`, T`Найдите площадь фигуры, ограниченной ими.`, T`Olar menen shegaralanǵan figuranıń maydanın tabıń.`, T`Find the area of the region bounded by them.`),
          hint: L(`Butun son, oddiy kasr (masalan 9/2) yoki o'nli kasr`, `Целое число, обыкновенная дробь (например 9/2) или десятичная дробь`, `Pútin san, ápiwayı bólshek (mısalı 9/2) yamasa onlıq bólshek`, `An integer, a common fraction (e.g. 9/2) or a decimal`),
        },
        solution_md: L(
          T`$x^{2}=${ln}$ dan $${texPoly([1, -(k.p + k.q), k.p * k.q])}=0$, ildizlar $x=${k.p}$ va $x=${k.q}$. Kattasi $${k.q}$. Yuza: $\int_{${k.p}}^{${k.q}}(${ln}-x^{2})\,dx=\dfrac{(${k.q}-${texParen(k.p)})^{3}}{6}=${texFrac(area)}$.`,
          T`Из $x^{2}=${ln}$ получаем $${texPoly([1, -(k.p + k.q), k.p * k.q])}=0$, корни $x=${k.p}$ и $x=${k.q}$. Большая абсцисса равна $${k.q}$. Площадь: $\int_{${k.p}}^{${k.q}}(${ln}-x^{2})\,dx=\dfrac{(${k.q}-${texParen(k.p)})^{3}}{6}=${texFrac(area)}$.`,
          T`$x^{2}=${ln}$ den $${texPoly([1, -(k.p + k.q), k.p * k.q])}=0$, túbirler $x=${k.p}$ hám $x=${k.q}$. Úlkeni $${k.q}$. Maydan: $\int_{${k.p}}^{${k.q}}(${ln}-x^{2})\,dx=\dfrac{(${k.q}-${texParen(k.p)})^{3}}{6}=${texFrac(area)}$.`,
          T`From $x^{2}=${ln}$ we get $${texPoly([1, -(k.p + k.q), k.p * k.q])}=0$ with roots $x=${k.p}$ and $x=${k.q}$; the larger is $${k.q}$. Area: $\int_{${k.p}}^{${k.q}}(${ln}-x^{2})\,dx=\dfrac{(${k.q}-${texParen(k.p)})^{3}}{6}=${texFrac(area)}$.`,
        ),
        mistake_note_md: L(
          T`Yuzani hisoblashda yuqoridagi va pastdagi grafikni adashtirib, manfiy javob olish.`,
          T`Перепутать верхний и нижний графики и получить отрицательную площадь.`,
          T`Maydandı esaplawda joqarıdaǵı hám tómendegi grafikti shatastırıp, teris juwap alıw.`,
          T`Swapping the upper and lower graphs and getting a negative area.`,
        ),
      };
    },
  });
}

// --- O6: arifmetik progressiya (57) ---
export interface ApOpenP {
  a1: number;
  d: number;
  n: number;
}
export function sampleApOpen(rng: Rng): ApOpenP {
  return { a1: rng.int(-6, 10), d: rng.pick([-3, -2, -1, 1, 2, 3, 4, 5]), n: rng.int(10, 14) };
}
/** a2+a9=A, a5=B -> d=A-2B */
export function solveApOpen({ a1, d, n }: ApOpenP): { A: number; B: number; dFound: number; a1Found: number; sn: number } {
  const A = 2 * a1 + 9 * d;
  const B = a1 + 4 * d;
  const dFound = A - 2 * B;
  const a1Found = B - 4 * dFound;
  return { A, B, dFound, a1Found, sn: (n * (2 * a1Found + (n - 1) * dFound)) / 2 };
}

function otplAp(req: SlotRequest) {
  const k = sampleApOpen(slotRng(req, 'apo'));
  const s = solveApOpen(k);
  return oSpec({
    topic: 57,
    difficulty: req.difficulty,
    estSeconds: 330,
    a: frac(s.dFound),
    b: frac(s.sn),
    text: (lang) => {
      const L = langPicker(lang);
      const cond = `a_2+a_9=${s.A},\\ a_5=${s.B}`;
      return {
        stem_md: L(
          T`Arifmetik progressiyada $${cond}$.`,
          T`В арифметической прогрессии $${cond}$.`,
          T`Arifmetikalıq progressiyada $${cond}$.`,
          T`In an arithmetic progression $${cond}$.`,
        ),
        a: { prompt_md: L(T`Progressiya ayirmasi $d$ ni toping.`, T`Найдите разность $d$ прогрессии.`, T`Progressiya ayırması $d$ nı tabıń.`, T`Find the common difference $d$.`) },
        b: {
          prompt_md: L(T`Dastlabki $${k.n}$ ta hadi yig'indisini toping.`, T`Найдите сумму первых $${k.n}$ членов.`, T`Dáslepki $${k.n}$ aǵzasınıń qosındısın tabıń.`, T`Find the sum of the first $${k.n}$ terms.`),
        },
        solution_md: L(
          T`$a_2+a_9=2a_1+9d=${s.A}$, $a_5=a_1+4d=${s.B}$. Ikkinchisini $2$ ga ko'paytirib ayiramiz: $d=${s.A}-2\cdot ${texParen(s.B)}=${s.dFound}$, keyin $a_1=${s.B}-4\cdot ${texParen(s.dFound)}=${s.a1Found}$. $S_{${k.n}}=\dfrac{2\cdot ${texParen(s.a1Found)}+${k.n - 1}\cdot ${texParen(s.dFound)}}{2}\cdot ${k.n}=${s.sn}$.`,
          T`$a_2+a_9=2a_1+9d=${s.A}$, $a_5=a_1+4d=${s.B}$. Умножим второе на $2$ и вычтем: $d=${s.A}-2\cdot ${texParen(s.B)}=${s.dFound}$, тогда $a_1=${s.B}-4\cdot ${texParen(s.dFound)}=${s.a1Found}$. $S_{${k.n}}=\dfrac{2\cdot ${texParen(s.a1Found)}+${k.n - 1}\cdot ${texParen(s.dFound)}}{2}\cdot ${k.n}=${s.sn}$.`,
          T`$a_2+a_9=2a_1+9d=${s.A}$, $a_5=a_1+4d=${s.B}$. Ekinshisin $2$ ge kóbeytip ayıramız: $d=${s.A}-2\cdot ${texParen(s.B)}=${s.dFound}$, soń $a_1=${s.B}-4\cdot ${texParen(s.dFound)}=${s.a1Found}$. $S_{${k.n}}=\dfrac{2\cdot ${texParen(s.a1Found)}+${k.n - 1}\cdot ${texParen(s.dFound)}}{2}\cdot ${k.n}=${s.sn}$.`,
          T`$a_2+a_9=2a_1+9d=${s.A}$, $a_5=a_1+4d=${s.B}$. Multiply the second equation by $2$ and subtract: $d=${s.A}-2\cdot ${texParen(s.B)}=${s.dFound}$, then $a_1=${s.B}-4\cdot ${texParen(s.dFound)}=${s.a1Found}$. $S_{${k.n}}=\dfrac{2\cdot ${texParen(s.a1Found)}+${k.n - 1}\cdot ${texParen(s.dFound)}}{2}\cdot ${k.n}=${s.sn}$.`,
        ),
        mistake_note_md: L(
          T`$a_9$ ni $a_1+9d$ deb yozish ($a_1+8d$ o'rniga).`,
          T`Записать $a_9=a_1+9d$ вместо $a_1+8d$.`,
          T`$a_9$ dı $a_1+9d$ dep jazıw ($a_1+8d$ ornına).`,
          T`Writing $a_9=a_1+9d$ instead of $a_1+8d$.`,
        ),
      };
    },
  });
}

// --- O7: cheksiz kamayuvchi geometrik progressiya (58) ---
export interface GpOpenP {
  q: Frac;
  S: number;
  b1: number;
}
export function sampleGpOpen(rng: Rng): GpOpenP {
  const [t, mm] = rng.pick(GP_Q);
  const q = frac(rng.chance(0.5) ? -t : t, mm);
  const c = rng.int(1, 5);
  const S = mm * c;
  return { q, S, b1: c * (mm - q.n * (mm / q.d)) };
}
/** S=b1/(1-q): q=1-b1/S; b3=b1 q^2 */
export function solveGpOpen({ S, b1 }: GpOpenP): { q: Frac; b3: Frac } {
  const q = fSub(frac(1), frac(b1, S));
  return { q, b3: fMul(frac(b1), fMul(q, q)) };
}

function otplGp(req: SlotRequest) {
  const k = sampleGpOpen(slotRng(req, 'gpo'));
  const { q, b3 } = solveGpOpen(k);
  return oSpec({
    topic: 58,
    difficulty: req.difficulty,
    estSeconds: 330,
    a: q,
    b: b3,
    text: (lang) => {
      const L = langPicker(lang);
      const cond = `b_1=${k.b1},\\ S=${k.S}`;
      return {
        stem_md: L(
          T`Cheksiz kamayuvchi geometrik progressiyada $${cond}$ ($S$ — hadlar yig'indisi).`,
          T`В бесконечно убывающей геометрической прогрессии $${cond}$ ($S$ — сумма всех членов).`,
          T`Sheksiz kemeyiwshi geometriyalıq progressiyada $${cond}$ ($S$ — aǵzalar qosındısı).`, // kaa: tekshirilsin
          T`In an infinite decreasing geometric progression $${cond}$ ($S$ is the sum of all terms).`,
        ),
        a: { prompt_md: L(T`Maxraj $q$ ni toping.`, T`Найдите знаменатель $q$.`, T`Bólim $q$ dı tabıń.`, T`Find the common ratio $q$.`), hint: L(`Oddiy kasr (masalan -1/3) yoki o'nli kasr`, `Обыкновенная дробь (например -1/3) или десятичная дробь`, `Ápiwayı bólshek (mısalı -1/3) yamasa onlıq bólshek`, `A common fraction (e.g. -1/3) or a decimal`) },
        b: { prompt_md: L(T`Uchinchi had $b_3$ ni toping.`, T`Найдите третий член $b_3$.`, T`Úshinshi aǵza $b_3$ tı tabıń.`, T`Find the third term $b_3$.`), hint: L(`Oddiy kasr yoki o'nli kasr`, `Обыкновенная дробь или десятичная дробь`, `Ápiwayı bólshek yamasa onlıq bólshek`, `A common fraction or a decimal`) },
        solution_md: L(
          T`$S=\dfrac{b_1}{1-q}$ dan $1-q=\dfrac{${k.b1}}{${k.S}}$, $q=1-\dfrac{${k.b1}}{${k.S}}=${texFrac(q)}$. $b_3=b_1q^{2}=${k.b1}\cdot ${texParen2(q)}^{2}=${texFrac(b3)}$.`,
          T`Из $S=\dfrac{b_1}{1-q}$ получаем $1-q=\dfrac{${k.b1}}{${k.S}}$, $q=1-\dfrac{${k.b1}}{${k.S}}=${texFrac(q)}$. $b_3=b_1q^{2}=${k.b1}\cdot ${texParen2(q)}^{2}=${texFrac(b3)}$.`,
          T`$S=\dfrac{b_1}{1-q}$ den $1-q=\dfrac{${k.b1}}{${k.S}}$, $q=1-\dfrac{${k.b1}}{${k.S}}=${texFrac(q)}$. $b_3=b_1q^{2}=${k.b1}\cdot ${texParen2(q)}^{2}=${texFrac(b3)}$.`,
          T`From $S=\dfrac{b_1}{1-q}$ we get $1-q=\dfrac{${k.b1}}{${k.S}}$, so $q=1-\dfrac{${k.b1}}{${k.S}}=${texFrac(q)}$. Then $b_3=b_1q^{2}=${k.b1}\cdot ${texParen2(q)}^{2}=${texFrac(b3)}$.`,
        ),
        mistake_note_md: L(
          T`$q=\dfrac{b_1}{S}$ deb olish yoki $q$ ni kvadratga oshirishda ishorani yo'qotish.`,
          T`Взять $q=\dfrac{b_1}{S}$ или потерять знак при возведении $q$ в квадрат.`,
          T`$q=\dfrac{b_1}{S}$ dep alıw yamasa $q$ dı kvadratqa kóteriwde belgini joǵaltıw.`,
          T`Taking $q=\dfrac{b_1}{S}$ or mishandling the sign when squaring $q$.`,
        ),
      };
    },
  });
}

// --- O8: limitlar (59, 56) ---
export interface LimOpenP {
  p: number;
  s: number;
  a: number;
  c: number;
}
export function sampleLimOpen(rng: Rng): LimOpenP {
  for (;;) {
    const p = rng.int(-5, 6);
    const s = rng.int(-5, 6);
    if (p !== s) return { p, s, a: rng.int(1, 9), c: rng.int(1, 7) };
  }
}
/** a) lim_{x->p}(x^2-(p+s)x+ps)/(x-p) = p-s; b) lim a(1+..+n)/(n^2+c) = a/2 */
export const solveLimOpen = ({ p, s, a }: LimOpenP): { first: number; second: Frac } => ({ first: p - s, second: frac(a, 2) });

function otplLim(req: SlotRequest) {
  const k = sampleLimOpen(slotRng(req, 'limo'));
  const { first, second } = solveLimOpen(k);
  const num = texPoly([1, -(k.p + k.s), k.p * k.s]);
  const e1 = `\\lim_{x\\to ${k.p}}\\dfrac{${num}}{${texPoly([1, -k.p])}}`;
  const e2 = `\\lim_{n\\to\\infty}\\dfrac{${k.a === 1 ? '' : `${k.a}\\cdot `}(1+2+3+\\dots+n)}{n^{2}+${k.c}}`;
  return oSpec({
    topic: 59,
    extraTopics: [56],
    difficulty: req.difficulty,
    estSeconds: 330,
    a: frac(first),
    b: second,
    text: (lang) => {
      const L = langPicker(lang);
      return {
        stem_md: L(T`Limitlarni hisoblang.`, T`Вычислите пределы.`, T`Limitlerdi esaplań.`, T`Evaluate the limits.`),
        a: { prompt_md: L(T`$${e1}$`, T`$${e1}$`, T`$${e1}$`, T`$${e1}$`) },
        b: {
          prompt_md: L(T`$${e2}$`, T`$${e2}$`, T`$${e2}$`, T`$${e2}$`),
          hint: L(`Butun son, oddiy kasr yoki o'nli kasr`, `Целое число, обыкновенная или десятичная дробь`, `Pútin san, ápiwayı yamasa onlıq bólshek`, `An integer, a common or a decimal fraction`),
        },
        solution_md: L(
          T`a) $${texPoly([1, -(k.p + k.s), k.p * k.s])}=(${xm(k.p)})(${xm(k.s)})$, qisqartirib $${xm(k.s)}$ ni olamiz; $x\to ${k.p}$ da $${first}$. b) $1+2+\dots+n=\dfrac{n(n+1)}{2}$, shuning uchun ifoda $\dfrac{${k.a}n(n+1)}{2(n^{2}+${k.c})}\to ${texFrac(second)}$.`,
          T`а) $${texPoly([1, -(k.p + k.s), k.p * k.s])}=(${xm(k.p)})(${xm(k.s)})$, после сокращения остаётся $${xm(k.s)}$; при $x\to ${k.p}$ получаем $${first}$. б) $1+2+\dots+n=\dfrac{n(n+1)}{2}$, поэтому выражение равно $\dfrac{${k.a}n(n+1)}{2(n^{2}+${k.c})}\to ${texFrac(second)}$.`,
          T`a) $${texPoly([1, -(k.p + k.s), k.p * k.s])}=(${xm(k.p)})(${xm(k.s)})$, qısqartıp $${xm(k.s)}$ di alamız; $x\to ${k.p}$ de $${first}$. b) $1+2+\dots+n=\dfrac{n(n+1)}{2}$, sonıń ushın an'latpa $\dfrac{${k.a}n(n+1)}{2(n^{2}+${k.c})}\to ${texFrac(second)}$.`,
          T`a) $${texPoly([1, -(k.p + k.s), k.p * k.s])}=(${xm(k.p)})(${xm(k.s)})$; after cancelling we get $${xm(k.s)}$, and as $x\to ${k.p}$ this is $${first}$. b) $1+2+\dots+n=\dfrac{n(n+1)}{2}$, so the expression equals $\dfrac{${k.a}n(n+1)}{2(n^{2}+${k.c})}\to ${texFrac(second)}$.`,
        ),
        mistake_note_md: L(
          T`Yig'indi $1+2+\dots+n$ ni $n$ ga teng deb olish yoki $\dfrac{1}{2}$ ko'paytuvchini unutish.`,
          T`Считать сумму $1+2+\dots+n$ равной $n$ или забыть множитель $\dfrac{1}{2}$.`,
          T`$1+2+\dots+n$ qosındısın $n$ ge teń dep alıw yamasa $\dfrac{1}{2}$ kóbeytiwshisin umıtıw.`,
          T`Treating the sum $1+2+\dots+n$ as $n$ or forgetting the factor $\dfrac{1}{2}$.`,
        ),
      };
    },
  });
}

// ============================== Generator ==============================

// Mavzu ketma-ketligi qo'shni shablonlarda har xil bo'lishi uchun tartiblangan.
const Y1_TEMPLATES = [tplChain, tplAp, tplTangent, tplLim00, tplExtremum, tplGp, tplAnti, tplSegment, tplSeqLim, tplArea, tplQuot] as const;
const O_TEMPLATES = [otplTangent, otplFence, otplAp, otplCrit, otplBetween, otplGp, otplBox, otplLim] as const;

export const generateAnaliz: BlockGenerator = (req) => {
  if (req.type === 'o') return pickTemplate(req, O_TEMPLATES)(req);
  return pickTemplate(req, Y1_TEMPLATES)(req);
};

export const ANALIZ_TEMPLATE_COUNTS = { y1: Y1_TEMPLATES.length, o: O_TEMPLATES.length };
