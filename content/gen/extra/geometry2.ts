import { fAdd, fDiv, fMul, fSub, frac, makeRng, texFrac, y1Options, type Frac, type L10n, type Rng } from '../helpers';
import type { Level, QuestionSpec } from '../types';
import type { ExtraTemplate } from './types';

// Geometriya, 2-qism: planimetriya (7.2: mavzular 67-70, 72, 74-77, 79, 80, 82), fazoda to'g'ri chiziq va tekislik (7.3: 83, 84, 114, 115),
// fazoviy jismlar (7.4: 85-92, 116, 117), koordinatalar va vektorlar (7.5: 81, 93, 118-120). Rasmiy elementlar: config/elements.ts.
// Hammasi qisqa shartli yopiq (A-D) topshiriqlar; chizma yo'q: kerakli hamma ma'lumot matnda (koordinata, uzunlik, burchak).
// Pifagor uchliklari va to'rtliklari ishlatiladi, shunda javoblar butun yoki oddiy kasr (yoki $\pi$ ga karrali) bo'ladi.
// Javob KOD bilan hisoblanadi; mustaqil tekshiruv: tests/content/extra-geometry2-math.test.ts (savol matnidagi sonlardan qayta hisoblaydi).
// kaa (qoraqalpoq lotin): hamma kaa matnlar mutaxassis tekshiruvini kutadi (atamalar: múyesh, xorda, urınba, kesindi, vektor, shar/sfera).

const L = (uz: string, ru: string, kaa: string, en: string): L10n => ({ uz, ru, kaa, en });
const J = (...parts: (L10n | string)[]): L10n => {
  const g = (l: keyof L10n) => parts.map((p) => (typeof p === 'string' ? p : p[l])).join(' ');
  return { uz: g('uz'), ru: g('ru'), kaa: g('kaa'), en: g('en') };
};
class Retry extends Error {}
function need(ok: boolean): asserts ok {
  if (!ok) throw new Retry('qayta');
}
const M = (s: string): string => `$${s}$`;
const mi = (n: number): string => M(String(n));
const fI = (n: number): Frac => frac(n, 1);
const fNum = (f: Frac): number => f.n / f.d;
const pi = (f: Frac): string => (f.n === 0 ? '0' : f.d === 1 ? (f.n === 1 ? '\\pi' : `${f.n}\\pi`) : `\\frac{${f.n === 1 ? '' : f.n}}{${f.d}}\\pi`);
type Fmt = (f: Frac) => string;
const plain: Fmt = (f) => M(texFrac(f));
const piFmt: Fmt = (f) => M(pi(f));
const pt = (x: number, y: number): string => `(${x};\\ ${y})`;
const pt3 = (x: number, y: number, z: number): string => `(${x};\\ ${y};\\ ${z})`;
const ANSW = L('Javob', 'Ответ', 'Juwap', 'Answer');
const fin = (x: string): L10n => L(`${ANSW.uz}: ${x}.`, `${ANSW.ru}: ${x}.`, `${ANSW.kaa}: ${x}.`, `${ANSW.en}: ${x}.`);
const TRIPLES: readonly (readonly [number, number, number])[] = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
];
const QUADS: readonly (readonly [number, number, number, number])[] = [
  [1, 2, 2, 3],
  [2, 3, 6, 7],
  [4, 4, 7, 9],
  [2, 6, 9, 11],
  [6, 6, 7, 11],
  [3, 4, 12, 13],
  [1, 4, 8, 9],
];

function distract(correct: Frac, mistakes: readonly Frac[], fmt: Fmt, minVal = 0): string[] {
  const c = fmt(correct);
  const out: string[] = [];
  const seen = new Set<string>([c]);
  const push = (f: Frac) => {
    if (!Number.isFinite(f.n) || !Number.isFinite(f.d) || f.d <= 0 || fNum(f) < minVal) return;
    const t = fmt(f);
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  };
  mistakes.forEach(push);
  for (let k = 1; out.length < 5 && k < 40; k++) {
    push(fAdd(correct, frac(k, correct.d)));
    push(fSub(correct, frac(k, correct.d)));
    push(fAdd(correct, fI(k)));
    push(fSub(correct, fI(k)));
  }
  return out;
}

const ALL: ExtraTemplate[] = [];
const PARAMS = new Map<string, (seed: number) => unknown>();
/** Testlar uchun: shablonning shu seeddagi parametrlari */
export function geometry2Params(id: string, seed: number): unknown {
  const f = PARAMS.get(id);
  if (!f) throw new Error(`shablon yo'q: ${id}`);
  return f(seed);
}
function attempt<R>(id: string, seed: number, fn: (base: string) => R): R {
  let last: unknown;
  for (let i = 0; i < 600; i++) {
    try {
      return fn(`${id}|${seed}|${i}`);
    } catch (e) {
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error(`${id}#${seed}: parametr topilmadi`);
}

interface Out {
  stem: L10n;
  ans: Frac;
  mistakes: readonly Frac[];
  fmt?: Fmt;
  sol: L10n;
  mis: L10n;
  /** manfiy javobga ruxsat */
  neg?: boolean;
  /** tayyor matnli variantlar (nuqta/juftlik): ans/mistakes o'rniga */
  text?: { correct: string; wrong: readonly string[] };
}
function G<P>(id: string, topic: number, difficulty: Level, est: number, draw: (r: Rng) => P, build: (p: P, r: Rng) => Out): ExtraTemplate {
  const run = (seed: number) =>
    attempt(id, seed, (base) => {
      const p = draw(makeRng(base));
      const out = build(p, makeRng(`${base}|b`));
      const fmt = out.fmt ?? plain;
      const correct = out.text ? out.text.correct : fmt(out.ans);
      const wrong = out.text ? out.text.wrong : distract(out.ans, out.mistakes, fmt, out.neg ? -1e9 : 0);
      return { p, out, built: y1Options(correct, wrong, makeRng(`${base}|o`)) };
    });
  PARAMS.set(id, (seed) => run(seed).p);
  const tpl: ExtraTemplate = {
    id,
    topic,
    type: 'y1',
    difficulty,
    generate(seed): QuestionSpec {
      const { out, built } = run(seed);
      return {
        topic,
        difficulty,
        estSeconds: est,
        key: { correct: built.correct },
        content: (lang) => ({ stem_md: out.stem[lang], payload: { options: built.options }, solution_md: out.sol[lang], mistake_note_md: out.mis[lang] }),
      };
    },
  };
  ALL.push(tpl);
  return tpl;
}
const scale = (r: Rng, lim: number): number => r.int(1, lim);
const trip = (r: Rng): readonly [number, number, number] => r.pick(TRIPLES);

// ======================================== 7.2 Planimetriya ========================================

// --- 67: parallel to'g'ri chiziqlar va kesuvchi (L1) ---
G<{ a: number; kind: 'other' | 'smaller'; d: number }>(
  'g2-par-angle',
  67,
  'L1',
  80,
  (r) => ({ a: r.int(35, 80), kind: r.pick(['other', 'smaller'] as const), d: r.pick([10, 20, 30, 40, 50, 60, 70]) }),
  (p) => {
    const ans = p.kind === 'other' ? 180 - p.a : (180 - p.d) / 2;
    need(Number.isInteger(ans));
    return {
      stem:
        p.kind === 'other'
          ? L(`Ikki parallel to'g'ri chiziqni kesuvchi hosil qilgan ichki bir tomonli burchaklardan biri ${M(`${p.a}^\\circ`)}. Ikkinchi burchakni (gradusda) toping.`, `Одни из внутренних односторонних углов при параллельных прямых и секущей равен ${M(`${p.a}^\\circ`)}. Найдите второй угол (в градусах).`, `Eki parallel tuwrını kesiwshi payda etken ishki bir tárepli múyeshlerdiń biri ${M(`${p.a}^\\circ`)}. Ekinshi múyeshti (gradusta) tabıń.`, `One of the co-interior angles formed by a transversal across two parallel lines is ${M(`${p.a}^\\circ`)}. Find the other angle (in degrees).`)
          : L(`Ikki parallel to'g'ri chiziqni kesuvchi hosil qilgan ichki bir tomonli burchaklar ayirmasi ${M(`${p.d}^\\circ`)}. Kichik burchakni (gradusda) toping.`, `Разность внутренних односторонних углов при параллельных прямых и секущей равна ${M(`${p.d}^\\circ`)}. Найдите меньший угол (в градусах).`, `Eki parallel tuwrını kesiwshi payda etken ishki bir tárepli múyeshler ayırması ${M(`${p.d}^\\circ`)}. Kishi múyeshti (gradusta) tabıń.`, `The difference of the co-interior angles formed by a transversal across two parallel lines is ${M(`${p.d}^\\circ`)}. Find the smaller angle (in degrees).`),
      ans: fI(ans),
      mistakes: p.kind === 'other' ? [fI(p.a), fI(90 - p.a), fI(360 - p.a), fI(90)] : [fI((180 + p.d) / 2), fI(180 - p.d), fI(p.d), fI(90 - p.d)],
      sol: J(L("Ichki bir tomonli burchaklar yig'indisi $180^\\circ$.", 'Сумма внутренних односторонних углов равна $180^\\circ$.', "Ishki bir tárepli múyeshler qosındısı $180^\\circ$.", 'Co-interior angles add up to $180^\\circ$.'), fin(mi(ans))),
      mis: L("Ichki bir tomonli burchaklarni teng (almashinuvchi burchaklar kabi) deb olish.", 'Считают внутренние односторонние углы равными (как накрест лежащие).', "Ishki bir tárepli múyeshlerdi teń (almasıwshı múyeshler sıyaqlı) dep alıw.", 'Treating co-interior angles as equal (like alternate angles).'),
    };
  },
);

// --- 68: uchburchak burchaklari nisbati (L1) ---
G<{ w: [number, number, number]; ask: 'largest' | 'smallest' }>(
  'g2-tri-angles',
  68,
  'L1',
  90,
  (r) => ({ w: [r.int(1, 9), r.int(1, 9), r.int(1, 9)], ask: r.pick(['largest', 'smallest'] as const) }),
  (p) => {
    const S = p.w[0] + p.w[1] + p.w[2];
    need(180 % S === 0 && new Set(p.w).size >= 2);
    const unit = 180 / S;
    const ans = (p.ask === 'largest' ? Math.max(...p.w) : Math.min(...p.w)) * unit;
    return {
      stem: L(`Uchburchak burchaklari ${M(p.w.join(':'))} nisbatda. ${p.ask === 'largest' ? 'Eng katta' : 'Eng kichik'} burchagini (gradusda) toping.`, `Углы треугольника относятся как ${M(p.w.join(':'))}. Найдите ${p.ask === 'largest' ? 'наибольший' : 'наименьший'} угол (в градусах).`, `Úshmúyesh múyeshleri ${M(p.w.join(':'))} qatnasında. ${p.ask === 'largest' ? 'Eń úlken' : 'Eń kishi'} múyeshin (gradusta) tabıń.`, `The angles of a triangle are in the ratio ${M(p.w.join(':'))}. Find the ${p.ask === 'largest' ? 'largest' : 'smallest'} angle (in degrees).`),
      ans: fI(ans),
      mistakes: [fI(Math.max(...p.w) * 10), fI(Math.min(...p.w) * unit + (p.ask === 'largest' ? unit : -unit)), fI(180 / p.w.length), fI(360 / S * Math.max(...p.w))],
      sol: J(M(`${S}\\cdot x=180^\\circ,\\ x=${unit}^\\circ`), fin(mi(ans))),
      mis: L("Burchaklar yig'indisi $180^\\circ$ ekanini $360^\\circ$ deb olish.", 'Принимают сумму углов за $360^\\circ$.', "Múyeshler qosındısın $360^\\circ$ dep alıw.", 'Taking the angle sum as $360^\\circ$.'),
    };
  },
);

// --- 68: uchburchak tengsizligi: uchinchi tomon (L2) ---
G<{ a: number; b: number; kind: 'count' | 'maxP' | 'minP' }>(
  'g2-tri-ineq',
  68,
  'L2',
  120,
  (r) => ({ a: r.int(3, 15), b: r.int(3, 15), kind: r.pick(['count', 'maxP', 'minP'] as const) }),
  (p) => {
    need(p.a !== p.b);
    const lo = Math.abs(p.a - p.b);
    const hi = p.a + p.b;
    const ans = p.kind === 'count' ? hi - lo - 1 : p.kind === 'maxP' ? hi + (hi - 1) : hi + (lo + 1);
    return {
      stem: L(`Uchburchakning ikki tomoni ${mi(p.a)} va ${mi(p.b)}. Uchinchi tomoni butun son bo'lsa, ${p.kind === 'count' ? 'u necha xil qiymat qabul qilishi mumkin' : p.kind === 'maxP' ? 'uchburchakning eng katta mumkin bo\'lgan perimetrini toping' : 'uchburchakning eng kichik mumkin bo\'lgan perimetrini toping'}${p.kind === 'count' ? '?' : '.'}`, `Две стороны треугольника равны ${mi(p.a)} и ${mi(p.b)}. Если третья сторона — целое число, ${p.kind === 'count' ? 'сколько различных значений она может принимать?' : p.kind === 'maxP' ? 'найдите наибольший возможный периметр.' : 'найдите наименьший возможный периметр.'}`, `Úshmúyeshliktiń eki tárepi ${mi(p.a)} hám ${mi(p.b)}. Úshinshi tárepi pútin san bolsa, ${p.kind === 'count' ? 'ol neshe túrli mánis qabıl ete aladı?' : p.kind === 'maxP' ? 'eń úlken múmkin bolǵan perimetrin tabıń.' : 'eń kishi múmkin bolǵan perimetrin tabıń.'}`, `Two sides of a triangle are ${mi(p.a)} and ${mi(p.b)}. If the third side is an integer, ${p.kind === 'count' ? 'how many different values can it take?' : p.kind === 'maxP' ? 'find the largest possible perimeter.' : 'find the smallest possible perimeter.'}`),
      ans: fI(ans),
      mistakes: [fI(hi - lo), fI(hi - lo + 1), fI(2 * hi), fI(hi + lo), fI(hi + hi)],
      sol: J(M(`${lo}<c<${hi}`), L(`Butun qiymatlar: ${M(`${lo + 1},\\dots,${hi - 1}`)}.`, `Целые значения: ${M(`${lo + 1},\\dots,${hi - 1}`)}.`, `Pútin mánisler: ${M(`${lo + 1},\\dots,${hi - 1}`)}.`, `Integer values: ${M(`${lo + 1},\\dots,${hi - 1}`)}.`), fin(mi(ans))),
      mis: L("Tengsizlik qat'iy ekanini unutib chegaraviy qiymatlarni ($|a-b|$ va $a+b$) ham qo'shish.", 'Включают граничные значения ($|a-b|$ и $a+b$), забыв, что неравенство строгое.', "Teńsizlik qatań ekenin umıtıp shegaralıq mánislerdi ($|a-b|$ hám $a+b$) de qosıw.", 'Including the endpoints ($|a-b|$ and $a+b$) although the inequality is strict.'),
    };
  },
);

// --- 69: o'xshash uchburchaklar: yuzlar (L2) ---
G<{ m: number; n: number; t: number }>(
  'g2-similar-area',
  69,
  'L2',
  130,
  (r) => ({ m: r.int(2, 6), n: r.int(3, 9), t: r.int(1, 6) }),
  (p) => {
    need(p.m < p.n && p.n - p.m >= 1);
    const S1 = p.m * p.m * p.t;
    const S2 = p.n * p.n * p.t;
    return {
      stem: L(`Ikki o'xshash uchburchakning mos tomonlari ${M(`${p.m}:${p.n}`)} nisbatda. Kichik uchburchakning yuzi ${mi(S1)} bo'lsa, kattasining yuzini toping.`, `Соответственные стороны двух подобных треугольников относятся как ${M(`${p.m}:${p.n}`)}. Площадь меньшего равна ${mi(S1)}. Найдите площадь большего.`, `Eki uqsas úshmúyeshliktiń sáykes tárepleri ${M(`${p.m}:${p.n}`)} qatnasında. Kishi úshmúyeshliktiń maydanı ${mi(S1)} bolsa, úlkeniń maydanın tabıń.`, `The corresponding sides of two similar triangles are in the ratio ${M(`${p.m}:${p.n}`)}. The smaller has area ${mi(S1)}. Find the area of the larger.`),
      ans: fI(S2),
      mistakes: [frac(S1 * p.n, p.m), fI(S1 + (p.n - p.m)), frac(S1 * p.n * p.n, p.m), fI(S1 * (p.n - p.m))],
      sol: J(M(`k=\\frac{${p.n}}{${p.m}},\\ S_{2}=k^{2}S_{1}=\\frac{${p.n * p.n}}{${p.m * p.m}}\\cdot ${S1}=${S2}`), fin(mi(S2))),
      mis: L("Yuzlar nisbatini chiziqli o'xshashlik koeffitsiyentiga ($k$) teng deb olish: yuzlar $k^{2}$ nisbatda.", 'Принимают отношение площадей равным коэффициенту подобия $k$ (площади относятся как $k^{2}$).', "Maydanlar qatnasın sızıqlı uqsaslıq koefficientine ($k$) teń dep alıw: maydanlar $k^{2}$ qatnasında.", 'Taking the area ratio equal to the similarity ratio $k$ (areas scale as $k^{2}$).'),
    };
  },
);

// --- 70: to'g'ri burchakli uchburchak: gipotenuza yoki katet (L1) ---
G<{ t: number; k: number; ask: 'hyp' | 'leg' }>(
  'g2-pyth-basic',
  70,
  'L1',
  80,
  (r) => ({ t: r.int(0, 4), k: scale(r, 4), ask: r.pick(['hyp', 'leg'] as const) }),
  (p) => {
    const [a, b, c] = TRIPLES[p.t]!;
    const A = a * p.k;
    const B = b * p.k;
    const C = c * p.k;
    const ans = p.ask === 'hyp' ? C : B;
    return {
      stem: p.ask === 'hyp'
        ? L(`To'g'ri burchakli uchburchakning katetlari ${mi(A)} va ${mi(B)}. Gipotenuzasini toping.`, `Катеты прямоугольного треугольника равны ${mi(A)} и ${mi(B)}. Найдите гипотенузу.`, `Tuwrı múyeshli úshmúyeshliktiń katetleri ${mi(A)} hám ${mi(B)}. Gipotenuzasın tabıń.`, `The legs of a right triangle are ${mi(A)} and ${mi(B)}. Find the hypotenuse.`)
        : L(`To'g'ri burchakli uchburchakning gipotenuzasi ${mi(C)}, katetlaridan biri ${mi(A)}. Ikkinchi katetini toping.`, `Гипотенуза прямоугольного треугольника равна ${mi(C)}, один из катетов — ${mi(A)}. Найдите второй катет.`, `Tuwrı múyeshli úshmúyeshliktiń gipotenuzası ${mi(C)}, katetlerinen biri ${mi(A)}. Ekinshi katetin tabıń.`, `The hypotenuse of a right triangle is ${mi(C)} and one leg is ${mi(A)}. Find the other leg.`),
      ans: fI(ans),
      mistakes: p.ask === 'hyp' ? [fI(A + B), fI(B - A), fI(A * B / 2), fI(Math.abs(A * A - B * B))] : [fI(C + A), fI(C - A), fI(C * C - A * A), fI(Math.round(Math.sqrt(C * C + A * A)))],
      sol: J(M(p.ask === 'hyp' ? `c^{2}=${A}^{2}+${B}^{2}=${C * C}` : `b^{2}=${C}^{2}-${A}^{2}=${B * B}`), fin(mi(ans))),
      mis: L("Pifagor teoremasida kvadratlar o'rniga uzunliklarni qo'shish/ayirish.", 'Складывают или вычитают длины вместо квадратов в теореме Пифагора.', "Pifagor teoremasında kvadratlar ornına uzınlıqlardı qosıw/ayırıw.", 'Adding or subtracting lengths instead of squares in the Pythagorean theorem.'),
    };
  },
);

// --- 70: gipotenuzaga tushirilgan balandlik yoki proyeksiya (L2) ---
G<{ t: number; k: number; ask: 'h' | 'proj' }>(
  'g2-pyth-altitude',
  70,
  'L2',
  150,
  (r) => ({ t: r.int(0, 4), k: scale(r, 3), ask: r.pick(['h', 'proj'] as const) }),
  (p) => {
    const [a, b, c] = TRIPLES[p.t]!;
    const A = a * p.k;
    const B = b * p.k;
    const C = c * p.k;
    const ans = p.ask === 'h' ? frac(A * B, C) : frac(A * A, C);
    need(ans.d <= 30);
    return {
      stem: p.ask === 'h'
        ? L(`To'g'ri burchakli uchburchakning katetlari ${mi(A)} va ${mi(B)}. To'g'ri burchak uchidan gipotenuzaga tushirilgan balandlikni toping.`, `Катеты прямоугольного треугольника равны ${mi(A)} и ${mi(B)}. Найдите высоту, проведённую к гипотенузе.`, `Tuwrı múyeshli úshmúyeshliktiń katetleri ${mi(A)} hám ${mi(B)}. Tuwrı múyesh ushınan gipotenuzaǵa túsirilgen biyiklikti tabıń.`, `The legs of a right triangle are ${mi(A)} and ${mi(B)}. Find the altitude to the hypotenuse.`)
        : L(`To'g'ri burchakli uchburchakning katetlari ${mi(A)} va ${mi(B)}. ${mi(A)} uzunlikdagi katetning gipotenuzadagi proyeksiyasini toping.`, `Катеты прямоугольного треугольника равны ${mi(A)} и ${mi(B)}. Найдите проекцию катета длины ${mi(A)} на гипотенузу.`, `Tuwrı múyeshli úshmúyeshliktiń katetleri ${mi(A)} hám ${mi(B)}. ${mi(A)} uzınlıqtaǵı katettiń gipotenuzadaǵı proekciyasın tabıń.`, `The legs of a right triangle are ${mi(A)} and ${mi(B)}. Find the projection of the leg of length ${mi(A)} onto the hypotenuse.`),
      ans,
      mistakes: p.ask === 'h' ? [frac(A + B, 2), frac(A * B, 2), frac(C, 2), frac(A * C, B)] : [frac(A, 2), frac(A * C, B), frac(A * B, C), frac(A * A, B)],
      sol: J(M(p.ask === 'h' ? `h=\\frac{ab}{c}=\\frac{${A}\\cdot ${B}}{${C}}=${texFrac(ans)}` : `a_{c}=\\frac{a^{2}}{c}=\\frac{${A * A}}{${C}}=${texFrac(ans)}`), fin(M(texFrac(ans)))),
      mis: L("Balandlikni gipotenuzaning yarmi ($\\frac{c}{2}$, bu mediana) deb olish.", 'Принимают высоту за половину гипотенузы ($\\frac{c}{2}$ — это медиана).', "Biyiklikti gipotenuzanıń yarımı ($\\frac{c}{2}$, bul mediana) dep alıw.", 'Taking the altitude as half the hypotenuse ($\\frac{c}{2}$ is the median).'),
    };
  },
);

// --- 72: median, markaz, o'rta chiziq (L2) ---
G<{ M: number; ask: 'vertex' | 'side' | 'midP'; P: number }>(
  'g2-median-centroid',
  72,
  'L2',
  120,
  (r) => ({ M: r.int(2, 12) * 3, ask: r.pick(['vertex', 'side', 'midP'] as const), P: r.int(4, 30) * 2 }),
  (p) => {
    const ans = p.ask === 'vertex' ? (2 * p.M) / 3 : p.ask === 'side' ? p.M / 3 : p.P / 2;
    return {
      stem: p.ask === 'midP'
        ? L(`Uchburchakning perimetri ${mi(p.P)}. Uning o'rta chiziqlari hosil qilgan uchburchakning perimetrini toping.`, `Периметр треугольника равен ${mi(p.P)}. Найдите периметр треугольника, образованного его средними линиями.`, `Úshmúyeshliktiń perimetri ${mi(p.P)}. Onıń orta sızıqları payda etken úshmúyeshliktiń perimetrin tabıń.`, `The perimeter of a triangle is ${mi(p.P)}. Find the perimeter of the triangle formed by its midlines.`)
        : L(`Uchburchak medianasining uzunligi ${mi(p.M)}. Medianalar kesishgan nuqtadan ${p.ask === 'vertex' ? 'shu median chiqqan uchgacha' : 'shu median tushgan tomongacha'} bo'lgan masofani toping.`, `Длина медианы треугольника равна ${mi(p.M)}. Найдите расстояние от точки пересечения медиан ${p.ask === 'vertex' ? 'до вершины, из которой проведена эта медиана' : 'до стороны, к которой проведена эта медиана'}.`, `Úshmúyeshlik medianasınıń uzınlıǵı ${mi(p.M)}. Medianalar kesilisken noqattan ${p.ask === 'vertex' ? 'usı mediana shıqqan ushqa shekem' : 'usı mediana túsken táreptiń ortasına shekem'} aralıqtı tabıń.`, `A median of a triangle has length ${mi(p.M)}. Find the distance from the centroid ${p.ask === 'vertex' ? 'to the vertex from which the median is drawn' : 'to the midpoint of the side to which the median is drawn'}.`),
      ans: fI(ans),
      mistakes: p.ask === 'midP' ? [fI(p.P), fI(p.P / 4), fI(2 * p.P), fI(p.P / 3)] : [fI(p.M / 2), fI(p.M / 3), fI((2 * p.M) / 3), fI(p.M)].filter((f) => fNum(f) !== ans),
      sol: J(L("Medianalar kesishish nuqtasida $2:1$ nisbatda bo'linadi (uchdan hisoblanganda); o'rta chiziq tomonning yarmi.", 'Медианы точкой пересечения делятся в отношении $2:1$ (от вершины); средняя линия равна половине стороны.', "Medianalar kesilisiw noqatında $2:1$ qatnasında bólinedi (ushtan esaplaǵanda); orta sızıq táreptiń yarımı.", 'Medians are divided $2:1$ at the centroid (from the vertex); a midline is half the side.'), fin(mi(ans))),
      mis: L("Markaz medianani teng ($1:1$) bo'ladi deb olish.", 'Считают, что центр делит медиану пополам.', "Orayın medianı teń ($1:1$) bóledi dep alıw.", 'Assuming the centroid halves the median.'),
    };
  },
);

// --- 72: bissektrisa teoremasi (L2) ---
G<{ c: number; b: number; a: number }>(
  'g2-bisector',
  72,
  'L2',
  150,
  (r) => ({ c: r.int(3, 14), b: r.int(3, 14), a: r.int(4, 20) }),
  (p) => {
    need(p.b !== p.c && p.a < p.b + p.c && p.b < p.a + p.c && p.c < p.a + p.b);
    const ans = frac(p.a * p.c, p.b + p.c);
    need(ans.d <= 12);
    return {
      stem: L(`${M('ABC')} uchburchakda ${M(`AB=${p.c}`)}, ${M(`AC=${p.b}`)}, ${M(`BC=${p.a}`)}. ${M('A')} burchak bissektrisasi ${M('BC')} tomonni ${M('D')} nuqtada kesadi. ${M('BD')} ni toping.`, `В треугольнике ${M('ABC')} ${M(`AB=${p.c}`)}, ${M(`AC=${p.b}`)}, ${M(`BC=${p.a}`)}. Биссектриса угла ${M('A')} пересекает ${M('BC')} в точке ${M('D')}. Найдите ${M('BD')}.`, `${M('ABC')} úshmúyeshlikte ${M(`AB=${p.c}`)}, ${M(`AC=${p.b}`)}, ${M(`BC=${p.a}`)}. ${M('A')} múyeshiniń bissektrisası ${M('BC')} táreptı ${M('D')} noqatında kesedi. ${M('BD')} dı tabıń.`, `In triangle ${M('ABC')}, ${M(`AB=${p.c}`)}, ${M(`AC=${p.b}`)}, ${M(`BC=${p.a}`)}. The bisector of angle ${M('A')} meets ${M('BC')} at ${M('D')}. Find ${M('BD')}.`),
      ans,
      mistakes: [frac(p.a * p.b, p.b + p.c), frac(p.a, 2), frac(p.c * p.b, p.a), frac(p.a * p.c, p.b)],
      sol: J(M(`\\frac{BD}{DC}=\\frac{AB}{AC}=\\frac{${p.c}}{${p.b}}\\Rightarrow BD=\\frac{${p.a}\\cdot ${p.c}}{${p.b + p.c}}=${texFrac(ans)}`), fin(M(texFrac(ans)))),
      mis: L("Nisbatni teskari qo'yish ($\\frac{BD}{DC}=\\frac{AC}{AB}$) yoki $BC$ ni teng bo'lish.", 'Переворачивают отношение ($\\frac{BD}{DC}=\\frac{AC}{AB}$) либо делят $BC$ пополам.', "Qatnastı keri qoyıw ($\\frac{BD}{DC}=\\frac{AC}{AB}$) yamasa $BC$ nı teń bóliw.", 'Inverting the ratio ($\\frac{BD}{DC}=\\frac{AC}{AB}$) or halving $BC$.'),
    };
  },
);

// --- 74: parallelogramm yuzi (30 yoki 150 gradus) va rombning diagonallari (L2) ---
G<{ kind: 'par' | 'rhombus'; a: number; b: number; ang: 30 | 150; t: number; k: number; ask: 'side' | 'perim' | 'area' }>(
  'g2-parallelogram',
  74,
  'L2',
  130,
  (r) => ({ kind: r.pick(['par', 'rhombus'] as const), a: r.int(4, 20), b: r.int(4, 20), ang: r.pick([30, 150] as const), t: r.int(0, 4), k: scale(r, 3), ask: r.pick(['side', 'perim', 'area'] as const) }),
  (p) => {
    if (p.kind === 'par') {
      const area = frac(p.a * p.b, 2);
      return {
        stem: L(`Parallelogrammning qo'shni tomonlari ${mi(p.a)} va ${mi(p.b)}, ular orasidagi burchak ${M(`${p.ang}^\\circ`)}. Parallelogramm yuzini toping.`, `Смежные стороны параллелограмма равны ${mi(p.a)} и ${mi(p.b)}, угол между ними ${M(`${p.ang}^\\circ`)}. Найдите площадь параллелограмма.`, `Parallelogrammnıń qońsı tárepleri ${mi(p.a)} hám ${mi(p.b)}, olar arasındaǵı múyesh ${M(`${p.ang}^\\circ`)}. Parallelogramm maydanın tabıń.`, `Adjacent sides of a parallelogram are ${mi(p.a)} and ${mi(p.b)} with an angle of ${M(`${p.ang}^\\circ`)} between them. Find its area.`),
        ans: area,
        mistakes: [fI(p.a * p.b), frac(p.a * p.b, 4), fI(p.a + p.b), frac(p.a * p.b * 3, 2)],
        sol: J(M(`S=ab\\sin\\alpha=${p.a}\\cdot ${p.b}\\cdot \\frac{1}{2}=${texFrac(area)}`), fin(M(texFrac(area)))),
        mis: L("$\\sin 30^\\circ=\\frac{1}{2}$ ni hisobga olmay $ab$ ni yuz deb olish.", 'Берут $ab$ за площадь, не учитывая $\\sin 30^\\circ=\\frac{1}{2}$.', "$\\sin 30^\\circ=\\frac{1}{2}$ di esapqa almay $ab$ nı maydan dep alıw.", 'Taking $ab$ as the area without the factor $\\sin 30^\\circ=\\frac{1}{2}$.'),
      };
    }
    const [x, y, s] = TRIPLES[p.t]!;
    const d1 = 2 * x * p.k;
    const d2 = 2 * y * p.k;
    const side = s * p.k;
    const ans = p.ask === 'side' ? side : p.ask === 'perim' ? 4 * side : (d1 * d2) / 2;
    return {
      stem: L(`Rombning diagonallari ${mi(d1)} va ${mi(d2)}. Rombning ${p.ask === 'side' ? 'tomonini' : p.ask === 'perim' ? 'perimetrini' : 'yuzini'} toping.`, `Диагонали ромба равны ${mi(d1)} и ${mi(d2)}. Найдите ${p.ask === 'side' ? 'сторону' : p.ask === 'perim' ? 'периметр' : 'площадь'} ромба.`, `Rombtıń diagonalları ${mi(d1)} hám ${mi(d2)}. Rombtıń ${p.ask === 'side' ? 'tárepin' : p.ask === 'perim' ? 'perimetrin' : 'maydanın'} tabıń.`, `The diagonals of a rhombus are ${mi(d1)} and ${mi(d2)}. Find the ${p.ask === 'side' ? 'side' : p.ask === 'perim' ? 'perimeter' : 'area'} of the rhombus.`),
      ans: fI(ans),
      mistakes: p.ask === 'area' ? [fI(d1 * d2), fI(d1 + d2), fI(4 * side), fI(side * side)] : [fI((d1 + d2) / 2), fI(d1 * d2 / 2), p.ask === 'side' ? fI(4 * side) : fI(side), fI(2 * (d1 + d2))],
      sol: J(L("Diagonallar o'zaro perpendikulyar va kesishish nuqtasida teng bo'linadi: Pifagor teoremasi.", 'Диагонали перпендикулярны и точкой пересечения делятся пополам: теорема Пифагора.', "Diagonallar óz ara perpendikulyar hám kesilisiw noqatında teń bólinedi: Pifagor teoreması.", 'The diagonals are perpendicular and bisect each other: use the Pythagorean theorem.'), M(`\\sqrt{${d1 / 2}^{2}+${d2 / 2}^{2}}=${side}`), fin(mi(ans))),
      mis: L("Diagonallarni (yarmi o'rniga) tomonlar bilan adashtirish yoki rombning yuzini $d_{1}d_{2}$ deb olish.", 'Принимают диагональ (а не её половину) за катет либо берут площадь ромба как $d_{1}d_{2}$.', "Diagonallardı (yarımı ornına) tárepler menen shatastırıw yamasa romb maydanın $d_{1}d_{2}$ dep alıw.", 'Using a whole diagonal (not half) as a leg, or the rhombus area as $d_{1}d_{2}$.'),
    };
  },
);

// --- 75: to'g'ri to'rtburchak: tomon va diagonal (L1) ---
G<{ t: number; k: number; ask: 'area' | 'perim' }>(
  'g2-rectangle',
  75,
  'L1',
  100,
  (r) => ({ t: r.int(0, 4), k: scale(r, 3), ask: r.pick(['area', 'perim'] as const) }),
  (p) => {
    const [a, b, c] = TRIPLES[p.t]!;
    const A = a * p.k;
    const B = b * p.k;
    const C = c * p.k;
    const ans = p.ask === 'area' ? A * B : 2 * (A + B);
    return {
      stem: L(`To'g'ri to'rtburchakning bir tomoni ${mi(A)}, diagonali ${mi(C)}. Uning ${p.ask === 'area' ? 'yuzini' : 'perimetrini'} toping.`, `Одна сторона прямоугольника равна ${mi(A)}, диагональ — ${mi(C)}. Найдите ${p.ask === 'area' ? 'площадь' : 'периметр'} прямоугольника.`, `Tuwrı tórtmúyeshliktiń bir tárepi ${mi(A)}, diagonalı ${mi(C)}. Onıń ${p.ask === 'area' ? 'maydanın' : 'perimetrin'} tabıń.`, `One side of a rectangle is ${mi(A)} and its diagonal is ${mi(C)}. Find its ${p.ask === 'area' ? 'area' : 'perimeter'}.`),
      ans: fI(ans),
      mistakes: p.ask === 'area' ? [fI(A * C), fI(A * A), fI(B * C), fI((A * B) / 2)] : [fI(A + B), fI(2 * (A + C)), fI(A * B), fI(4 * A)],
      sol: J(M(`b=\\sqrt{${C}^{2}-${A}^{2}}=${B}`), fin(mi(ans))),
      mis: L("Ikkinchi tomonni topmasdan diagonalni tomon deb olish.", 'Берут диагональ как сторону, не находя вторую сторону.', "Ekinshi táreptı tappay diagonaldı tárep dep alıw.", 'Using the diagonal as a side without finding the second side.'),
    };
  },
);

// --- 76: teng yonli trapetsiya yuzi (L2) ---
G<{ t: number; k: number; b: number }>(
  'g2-trapezoid',
  76,
  'L2',
  150,
  (r) => ({ t: r.int(0, 4), k: scale(r, 2), b: r.int(2, 14) }),
  (p) => {
    const [x0, h0, l0] = TRIPLES[p.t]!;
    const x = x0 * p.k;
    const h = h0 * p.k;
    const l = l0 * p.k;
    const big = p.b + 2 * x;
    const ans = (p.b + x) * h;
    need(ans <= 2000);
    return {
      stem: L(`Teng yonli trapetsiyaning asoslari ${mi(p.b)} va ${mi(big)}, yon tomoni ${mi(l)}. Trapetsiya yuzini toping.`, `Основания равнобедренной трапеции равны ${mi(p.b)} и ${mi(big)}, боковая сторона — ${mi(l)}. Найдите площадь трапеции.`, `Teń jambaslı trapeciyanıń tiykarları ${mi(p.b)} hám ${mi(big)}, jan tárepi ${mi(l)}. Trapeciya maydanın tabıń.`, `The bases of an isosceles trapezoid are ${mi(p.b)} and ${mi(big)} and its leg is ${mi(l)}. Find the area.`),
      ans: fI(ans),
      mistakes: [fI(((p.b + big) * l) / 2), fI(p.b * h), fI((p.b + big) * h), fI((p.b + x) * l)],
      sol: J(M(`x=\\frac{${big}-${p.b}}{2}=${x},\\ h=\\sqrt{${l}^{2}-${x}^{2}}=${h}`), M(`S=\\frac{${p.b}+${big}}{2}\\cdot ${h}=${ans}`), fin(mi(ans))),
      mis: L("Balandlik o'rniga yon tomonni ishlatish yoki yuzni $(a+b)h$ deb yarmiga bo'lmaslik.", 'Берут боковую сторону вместо высоты либо забывают делить на 2.', "Biyiklik ornına jan táreptı qollanıw yamasa maydandı $(a+b)h$ dep yarımına bólmew.", 'Using the leg instead of the height, or forgetting to halve.'),
    };
  },
);

// --- 77: ko'pburchaklar (L1) ---
G<{ n: number; ask: 'sum' | 'diag' | 'angle' | 'findN' }>(
  'g2-polygon',
  77,
  'L1',
  100,
  (r) => ({ n: r.pick([5, 6, 8, 9, 10, 12, 15, 18]), ask: r.pick(['sum', 'diag', 'angle', 'findN'] as const) }),
  (p) => {
    const ang = ((p.n - 2) * 180) / p.n;
    need(p.ask !== 'angle' && p.ask !== 'findN' ? true : Number.isInteger(ang));
    const ans = p.ask === 'sum' ? (p.n - 2) * 180 : p.ask === 'diag' ? (p.n * (p.n - 3)) / 2 : p.ask === 'angle' ? ang : p.n;
    const stem = {
      sum: L(`Qavariq ${mi(p.n)} burchakning ichki burchaklari yig'indisini (gradusda) toping.`, `Найдите сумму внутренних углов выпуклого ${mi(p.n)}-угольника (в градусах).`, `Qabarıq ${mi(p.n)} múyeshliktiń ishki múyeshleri qosındısın (gradusta) tabıń.`, `Find the sum of the interior angles of a convex ${mi(p.n)}-gon (in degrees).`),
      diag: L(`Qavariq ${mi(p.n)} burchakning diagonallari sonini toping.`, `Найдите число диагоналей выпуклого ${mi(p.n)}-угольника.`, `Qabarıq ${mi(p.n)} múyeshliktiń diagonalları sanın tabıń.`, `Find the number of diagonals of a convex ${mi(p.n)}-gon.`),
      angle: L(`Muntazam ${mi(p.n)} burchakning ichki burchagini (gradusda) toping.`, `Найдите внутренний угол правильного ${mi(p.n)}-угольника (в градусах).`, `Durıs ${mi(p.n)} múyeshliktiń ishki múyeshin (gradusta) tabıń.`, `Find the interior angle of a regular ${mi(p.n)}-gon (in degrees).`),
      findN: L(`Muntazam ko'pburchakning ichki burchagi ${M(`${ang}^\\circ`)}. Uning tomonlari sonini toping.`, `Внутренний угол правильного многоугольника равен ${M(`${ang}^\\circ`)}. Найдите число его сторон.`, `Durıs kópmúyeshliktiń ishki múyeshi ${M(`${ang}^\\circ`)}. Onıń tárepleri sanın tabıń.`, `The interior angle of a regular polygon is ${M(`${ang}^\\circ`)}. Find the number of its sides.`),
    }[p.ask];
    return {
      stem,
      ans: fI(ans),
      mistakes: p.ask === 'sum' ? [fI(p.n * 180), fI((p.n - 1) * 180), fI(360)] : p.ask === 'diag' ? [fI((p.n * (p.n - 1)) / 2), fI(p.n * (p.n - 3)), fI(p.n - 3)] : p.ask === 'angle' ? [fI(360 / p.n), fI(180 / p.n), fI(((p.n - 1) * 180) / p.n)] : [fI(360 / (180 - ang) + 1), fI(180 / (180 - ang)), fI(Math.round(ang / 10))],
      sol: J(L(`Ichki burchaklar yig'indisi ${M('(n-2)\\cdot 180^\\circ')}; diagonallar ${M('\\frac{n(n-3)}{2}')}; tashqi burchak ${M('\\frac{360^\\circ}{n}')}.`, `Сумма внутренних углов ${M('(n-2)\\cdot 180^\\circ')}; диагоналей ${M('\\frac{n(n-3)}{2}')}; внешний угол ${M('\\frac{360^\\circ}{n}')}.`, `Ishki múyeshler qosındısı ${M('(n-2)\\cdot 180^\\circ')}; diagonallar ${M('\\frac{n(n-3)}{2}')}; sırtqı múyesh ${M('\\frac{360^\\circ}{n}')}.`, `Interior angle sum ${M('(n-2)\\cdot 180^\\circ')}; diagonals ${M('\\frac{n(n-3)}{2}')}; exterior angle ${M('\\frac{360^\\circ}{n}')}.`), fin(mi(ans))),
      mis: L("$(n-2)$ o'rniga $n$ yoki $360^\\circ$ ishlatish; diagonallar sonida juftlarni ikki marta sanash.", 'Используют $n$ вместо $(n-2)$ либо $360^\\circ$; в числе диагоналей считают пары дважды.', "$(n-2)$ ornına $n$ yamasa $360^\\circ$ qollanıw; diagonallar sanında juplardı eki ret sanaw.", 'Using $n$ instead of $(n-2)$ or $360^\\circ$; double-counting pairs for diagonals.'),
    };
  },
);

// --- 79: aylanadagi burchaklar (L2) ---
G<{ kind: 'inscribed' | 'chords' | 'secants' | 'tangent'; a: number; b: number }>(
  'g2-circle-angles',
  79,
  'L2',
  140,
  (r) => ({ kind: r.pick(['inscribed', 'chords', 'secants', 'tangent'] as const), a: r.int(5, 34) * 10, b: r.int(2, 17) * 10 }),
  (p) => {
    need(p.kind !== 'secants' || p.a > p.b);
    need(p.kind !== 'chords' || p.a + p.b < 360);
    const ans = p.kind === 'inscribed' || p.kind === 'tangent' ? p.a / 2 : p.kind === 'chords' ? (p.a + p.b) / 2 : (p.a - p.b) / 2;
    need(Number.isInteger(ans) && ans < 180 && ans > 0);
    const stem = {
      inscribed: L(`Aylananing ${mi(p.a)} gradusli yoyiga tiralgan ichki chizilgan burchakni (gradusda) toping.`, `Найдите вписанный угол, опирающийся на дугу в ${mi(p.a)} градусов.`, `Sheńberdiń ${mi(p.a)} gradusli dóǵasına tirelgen ishki sızılǵan múyeshti (gradusta) tabıń.`, `Find the inscribed angle subtending an arc of ${mi(p.a)} degrees.`),
      tangent: L(`Urinma va vatar orasidagi burchak ${mi(p.a)} gradusli yoyga tiraladi. Shu burchakni (gradusda) toping.`, `Угол между касательной и хордой опирается на дугу в ${mi(p.a)} градусов. Найдите этот угол.`, `Urınba menen xorda arasındaǵı múyesh ${mi(p.a)} gradusli dóǵaǵa tireledi. Usı múyeshti (gradusta) tabıń.`, `The angle between a tangent and a chord subtends an arc of ${mi(p.a)} degrees. Find this angle.`),
      chords: L(`Aylananing ikki vatari ichkarida kesishadi. Hosil bo'lgan burchak va unga vertikal burchak tiralgan yoylar ${mi(p.a)} va ${mi(p.b)} gradus. Shu burchakni (gradusda) toping.`, `Две хорды окружности пересекаются внутри круга. Угол и вертикальный к нему опираются на дуги ${mi(p.a)} и ${mi(p.b)} градусов. Найдите этот угол.`, `Sheńberdiń eki xordası ishinde kesilisedi. Payda bolǵan múyesh hám oǵan vertikal múyesh tirelgen dóǵalar ${mi(p.a)} hám ${mi(p.b)} gradus. Usı múyeshti (gradusta) tabıń.`, `Two chords of a circle intersect inside it. The angle and its vertical angle subtend arcs of ${mi(p.a)} and ${mi(p.b)} degrees. Find this angle.`),
      secants: L(`Aylanadan tashqaridagi nuqtadan ikki kesuvchi o'tkazilgan; ular orasidagi yoylar ${mi(p.a)} va ${mi(p.b)} gradus. Kesuvchilar orasidagi burchakni (gradusda) toping.`, `Из точки вне окружности проведены две секущие; дуги между ними ${mi(p.a)} и ${mi(p.b)} градусов. Найдите угол между секущими.`, `Sheńberden sırtqı noqattan eki kesiwshi ótkerilgen; olar arasındaǵı dóǵalar ${mi(p.a)} hám ${mi(p.b)} gradus. Kesiwshiler arasındaǵı múyeshti (gradusta) tabıń.`, `Two secants are drawn from a point outside a circle; the arcs between them are ${mi(p.a)} and ${mi(p.b)} degrees. Find the angle between the secants.`),
    }[p.kind];
    return {
      stem,
      ans: fI(ans),
      mistakes: p.kind === 'inscribed' || p.kind === 'tangent' ? [fI(p.a), fI(p.a * 2), fI(180 - p.a / 2), fI(360 - p.a)] : [fI(p.a + p.b), fI(p.a - p.b), fI((p.a + p.b) / 4), fI(Math.abs(p.a - p.b) / 2 + 10)].map((f) => f),
      sol: J(L("Ichki chizilgan burchak yoyning yarmi; ichkarida — yoylar yig'indisining yarmi; tashqarida — yoylar ayirmasining yarmi.", 'Вписанный угол — половина дуги; внутри — полусумма дуг; снаружи — полуразность дуг.', "Ishki sızılǵan múyesh dóǵanıń yarımı; ishinde — dóǵalar qosındısınıń yarımı; sırtında — dóǵalar ayırmasınıń yarımı.", 'An inscribed angle is half its arc; inside the circle, half the sum of arcs; outside, half the difference.'), fin(mi(ans))),
      mis: L("Burchakni yoyning o'ziga teng deb olish (yarmini olmaslik) yoki ichkarida ayirmani, tashqarida yig'indini olish.", 'Принимают угол равным дуге (не берут половину) либо путают сумму и разность дуг.', "Múyeshti dóǵanıń ózine teń dep alıw (yarımın almaw) yamasa ishinde ayırmanı, sırtında qosındını alıw.", 'Taking the angle equal to the arc (not halving), or mixing up the sum and difference of arcs.'),
    };
  },
);

// --- 80: to'g'ri burchakli uchburchakka ichki va tashqi chizilgan aylana (L2) ---
G<{ t: number; k: number; ask: 'r' | 'R' | 'sum' }>(
  'g2-circle-in-out',
  80,
  'L2',
  140,
  (r) => ({ t: r.int(0, 4), k: scale(r, 3), ask: r.pick(['r', 'R', 'sum'] as const) }),
  (p) => {
    const [a, b, c] = TRIPLES[p.t]!;
    const A = a * p.k;
    const B = b * p.k;
    const C = c * p.k;
    const r = (A + B - C) / 2;
    const R = C / 2;
    const ans = p.ask === 'r' ? frac(A + B - C, 2) : p.ask === 'R' ? frac(C, 2) : frac(A + B - C + C, 2);
    return {
      stem: L(`To'g'ri burchakli uchburchakning katetlari ${mi(A)} va ${mi(B)}. ${p.ask === 'r' ? 'Ichki chizilgan aylana radiusini' : p.ask === 'R' ? 'Tashqi chizilgan aylana radiusini' : 'Ichki va tashqi chizilgan aylanalar radiuslari yig\'indisini'} toping.`, `Катеты прямоугольного треугольника равны ${mi(A)} и ${mi(B)}. Найдите ${p.ask === 'r' ? 'радиус вписанной окружности' : p.ask === 'R' ? 'радиус описанной окружности' : 'сумму радиусов вписанной и описанной окружностей'}.`, `Tuwrı múyeshli úshmúyeshliktiń katetleri ${mi(A)} hám ${mi(B)}. ${p.ask === 'r' ? 'Ishki sızılǵan sheńber radiusın' : p.ask === 'R' ? 'Sırtqı sızılǵan sheńber radiusın' : 'Ishki hám sırtqı sızılǵan sheńberler radiusları qosındısın'} tabıń.`, `The legs of a right triangle are ${mi(A)} and ${mi(B)}. Find ${p.ask === 'r' ? 'the inradius' : p.ask === 'R' ? 'the circumradius' : 'the sum of the inradius and the circumradius'}.`),
      ans,
      mistakes: [frac(A + B - C, 4), frac(C, 1), frac(A + B + C, 2), frac(A * B, A + B + C), frac(A + B, 2)].filter((f) => fNum(f) !== fNum(ans)).concat(frac(A * B, 2 * (A + B + C)) ),
      sol: J(M(`c=${C},\\ r=\\frac{a+b-c}{2}=${r},\\ R=\\frac{c}{2}=${R}`), fin(M(texFrac(ans)))),
      mis: L("To'g'ri burchakli uchburchakda $R=\\frac{c}{2}$ (gipotenuza diametr) va $r=\\frac{a+b-c}{2}$ formulalarini adashtirish.", 'Путают формулы $R=\\frac{c}{2}$ (гипотенуза — диаметр) и $r=\\frac{a+b-c}{2}$.', "Tuwrı múyeshli úshmúyeshlikte $R=\\frac{c}{2}$ (gipotenuza — diametr) hám $r=\\frac{a+b-c}{2}$ formulaların shatastırıw.", 'Mixing up $R=\\frac{c}{2}$ (hypotenuse is a diameter) and $r=\\frac{a+b-c}{2}$.'),
    };
  },
);

// --- 79: kesishuvchi vatarlar va urinma-kesuvchi (L2) ---
G<{ kind: 'chords' | 'tangent'; a: number; b: number; c: number }>(
  'g2-chord-power',
  79,
  'L2',
  150,
  (r) => ({ kind: r.pick(['chords', 'tangent'] as const), a: r.int(2, 12), b: r.int(2, 12), c: r.int(2, 12) }),
  (p) => {
    if (p.kind === 'chords') {
      const ans = frac(p.a * p.b, p.c);
      need(ans.d <= 4 && fNum(ans) > 1);
      return {
        stem: L(`Aylananing ikki vatari kesishadi. Birinchi vatar kesishish nuqtasida ${mi(p.a)} va ${mi(p.b)} bo'laklarga bo'linadi, ikkinchisining bir bo'lagi ${mi(p.c)}. Ikkinchi bo'lakni toping.`, `Две хорды окружности пересекаются. Первая делится точкой пересечения на отрезки ${mi(p.a)} и ${mi(p.b)}, один из отрезков второй равен ${mi(p.c)}. Найдите другой отрезок второй хорды.`, `Sheńberdiń eki xordası kesilisedi. Birinshi xorda kesilisiw noqatında ${mi(p.a)} hám ${mi(p.b)} bólekke bólinedi, ekinshisiniń bir bólegi ${mi(p.c)}. Ekinshi bólekti tabıń.`, `Two chords of a circle intersect. The first is divided into segments ${mi(p.a)} and ${mi(p.b)}, and one segment of the second is ${mi(p.c)}. Find the other segment of the second chord.`),
        ans,
        mistakes: [frac(p.a + p.b, 2), fI(p.a * p.b), frac(p.c * p.a, p.b), fI(p.a + p.b - p.c)],
        sol: J(M(`${p.a}\\cdot ${p.b}=${p.c}\\cdot x\\Rightarrow x=${texFrac(ans)}`), fin(M(texFrac(ans)))),
        mis: L("Kesishuvchi vatarlar teoremasi o'rniga bo'laklarni qo'shish.", 'Складывают отрезки вместо применения теоремы о пересекающихся хордах.', "Kesilisiwshi xordalar teoreması ornına bóleklerdi qosıw.", 'Adding segments instead of using the intersecting-chords theorem.'),
      };
    }
    const ans = frac(p.a * p.a, p.b);
    need(ans.d <= 4 && fNum(ans) > p.b && p.a * p.a !== p.b * p.b);
    return {
      stem: L(`Aylanadan tashqaridagi nuqtadan urinma va kesuvchi o'tkazilgan. Urinma uzunligi ${mi(p.a)}, kesuvchining tashqi qismi ${mi(p.b)}. Kesuvchining butun uzunligini toping.`, `Из точки вне окружности проведены касательная и секущая. Длина касательной равна ${mi(p.a)}, внешняя часть секущей — ${mi(p.b)}. Найдите длину всей секущей.`, `Sheńberden sırtqı noqattan urınba hám kesiwshi ótkerilgen. Urınba uzınlıǵı ${mi(p.a)}, kesiwshiniń sırtqı bólegi ${mi(p.b)}. Kesiwshiniń pútin uzınlıǵın tabıń.`, `A tangent and a secant are drawn from a point outside a circle. The tangent has length ${mi(p.a)} and the external part of the secant is ${mi(p.b)}. Find the whole secant.`),
      ans,
      mistakes: [fI(p.a + p.b), fI(p.a * p.b), frac(p.a * p.a - p.b * p.b, p.b), frac(p.a * p.a - p.b * p.b, 1)],
      sol: J(M(`t^{2}=b\\cdot x\\Rightarrow ${p.a}^{2}=${p.b}\\cdot x,\\ x=${texFrac(ans)}`), fin(M(texFrac(ans)))),
      mis: L("Urinma kvadratini kesuvchining ichki qismiga tenglab, butun kesuvchi o'rniga ichki qismni topish.", 'Приравнивают квадрат касательной к внутренней части секущей и находят её вместо всей секущей.', "Urınba kvadratın kesiwshiniń ishki bólegine teńlep, pútin kesiwshi ornına ishki bólekti tabıw.", 'Setting the tangent squared equal to the inner part and finding it instead of the whole secant.'),
    };
  },
);

// --- 82: geometrik almashtirishlar: ketma-ket almashtirishdan keyingi nuqta (L2) ---
type Op = { t: 'ox' } | { t: 'oy' } | { t: 'o' } | { t: 'tr'; a: number; b: number } | { t: 'h'; k: number };
const applyOp = (p: [number, number], op: Op): [number, number] => (op.t === 'ox' ? [p[0], -p[1]] : op.t === 'oy' ? [-p[0], p[1]] : op.t === 'o' ? [-p[0], -p[1]] : op.t === 'tr' ? [p[0] + op.a, p[1] + op.b] : [p[0] * op.k, p[1] * op.k]);
const opTex = (op: Op, l: keyof L10n): string => {
  const names = {
    ox: L(`${'Ox'} o'qiga nisbatan simmetriya`, 'симметрия относительно оси Ox', 'Ox kósherine salıstırǵanda simmetriya', 'reflection in the Ox-axis'),
    oy: L(`${'Oy'} o'qiga nisbatan simmetriya`, 'симметрия относительно оси Oy', 'Oy kósherine salıstırǵanda simmetriya', 'reflection in the Oy-axis'),
    o: L('koordinata boshiga nisbatan simmetriya', 'симметрия относительно начала координат', 'koordinata basına salıstırǵanda simmetriya', 'reflection in the origin'),
  };
  if (op.t === 'ox' || op.t === 'oy' || op.t === 'o') return names[op.t][l];
  if (op.t === 'tr') return { uz: `${M(`(${op.a};\\ ${op.b})`)} vektorga parallel ko'chirish`, ru: `параллельный перенос на вектор ${M(`(${op.a};\\ ${op.b})`)}`, kaa: `${M(`(${op.a};\\ ${op.b})`)} vektorına parallel kóshiriw`, en: `translation by the vector ${M(`(${op.a};\\ ${op.b})`)}` }[l];
  return { uz: `markazi koordinata boshida ${M(`k=${op.k}`)} koeffitsiyentli gomotetiya`, ru: `гомотетия с центром в начале координат и коэффициентом ${M(`k=${op.k}`)}`, kaa: `orayı koordinata basında ${M(`k=${op.k}`)} koefficientli gomotetiya`, en: `homothety centred at the origin with ratio ${M(`k=${op.k}`)}` }[l];
};
G<{ x: number; y: number; ops: Op[] }>(
  'g2-transform-point',
  82,
  'L2',
  170,
  (r) => {
    const pool: Op[] = [{ t: 'ox' }, { t: 'oy' }, { t: 'o' }, { t: 'tr', a: r.int(-4, 4), b: r.int(-4, 4) }, { t: 'h', k: r.pick([2, 3, -1, -2]) }];
    const ops = r.shuffle(pool).slice(0, 2);
    return { x: r.int(-5, 5), y: r.int(-5, 5), ops };
  },
  (p) => {
    need(p.x !== 0 && p.y !== 0 && Math.abs(p.x) !== Math.abs(p.y));
    for (const op of p.ops) if (op.t === 'tr') need(op.a !== 0 && op.b !== 0);
    const apply = (ops: Op[]): [number, number] => ops.reduce<[number, number]>((q, op) => applyOp(q, op), [p.x, p.y]);
    const ans = apply(p.ops);
    const rev = apply([...p.ops].reverse());
    const first = apply([p.ops[0]!]);
    const second = apply([p.ops[1]!]);
    const cand = [rev, first, second, [ans[1], ans[0]] as [number, number], [-ans[0], -ans[1]] as [number, number], [ans[0], -ans[1]] as [number, number]];
    const t = (q: [number, number]) => M(pt(q[0], q[1]));
    const wrong = [...new Set(cand.filter((q) => !(q[0] === ans[0] && q[1] === ans[1])).map(t))];
    need(wrong.length >= 3);
    const stemOf = (l: keyof L10n): string => {
      const o1 = opTex(p.ops[0]!, l);
      const o2 = opTex(p.ops[1]!, l);
      return { uz: `${M(`A${pt(p.x, p.y)}`)} nuqtaga avval ${o1}, so'ng ${o2} qo'llanildi. Hosil bo'lgan nuqta koordinatalarini toping.`, ru: `К точке ${M(`A${pt(p.x, p.y)}`)} применили сначала ${o1}, затем ${o2}. Найдите координаты полученной точки.`, kaa: `${M(`A${pt(p.x, p.y)}`)} noqatqa aldın ${o1}, soń ${o2} qollanıldı. Payda bolǵan noqat koordinataların tabıń.`, en: `To the point ${M(`A${pt(p.x, p.y)}`)} first ${o1} and then ${o2} were applied. Find the coordinates of the resulting point.` }[l];
    };
    return {
      stem: { uz: stemOf('uz'), ru: stemOf('ru'), kaa: stemOf('kaa'), en: stemOf('en') },
      ans: fI(0),
      mistakes: [],
      text: { correct: t(ans), wrong },
      sol: J(L("Almashtirishlar berilgan tartibda ketma-ket bajariladi:", 'Преобразования выполняются последовательно в заданном порядке:', "Almastırıwlar berilgen tártipte izbe-iz orınlanadı:", 'The transformations are applied one after another in the given order:'), M(`${pt(p.x, p.y)}\\to ${pt(first[0], first[1])}\\to ${pt(ans[0], ans[1])}`), fin(t(ans))),
      mis: L("Almashtirishlarni teskari tartibda bajarish yoki bittasini tushirib qoldirish.", 'Выполняют преобразования в обратном порядке либо пропускают одно из них.', "Almastırıwlardı keri tártipte orınlaw yamasa birewin taslap ketiw.", 'Applying the transformations in reverse order or skipping one.'),
    };
  },
);

// ======================================== 7.3 Fazoda to'g'ri chiziq va tekislik ========================================

// --- 114: Fales teoremasi (L2) ---
G<{ x: number; y: number; z: number; kind: 'EC' | 'BC'; de: number }>(
  'g2-thales',
  114,
  'L2',
  140,
  (r) => ({ x: r.int(2, 8), y: r.int(2, 9), z: r.int(3, 12), kind: r.pick(['EC', 'BC'] as const), de: r.int(3, 12) }),
  (p) => {
    const ans = p.kind === 'EC' ? frac(p.z * p.y, p.x) : frac(p.de * (p.x + p.y), p.x);
    need(ans.d <= 4 && fNum(ans) < 80);
    return {
      stem: p.kind === 'EC'
        ? L(`${M('ABC')} uchburchakda ${M('D')} nuqta ${M('AB')} da, ${M('E')} nuqta ${M('AC')} da yotadi, ${M('DE\\parallel BC')}. ${M(`AD=${p.x}`)}, ${M(`DB=${p.y}`)}, ${M(`AE=${p.z}`)}. ${M('EC')} ni toping.`, `В треугольнике ${M('ABC')} точки ${M('D')} на ${M('AB')} и ${M('E')} на ${M('AC')}, ${M('DE\\parallel BC')}. ${M(`AD=${p.x}`)}, ${M(`DB=${p.y}`)}, ${M(`AE=${p.z}`)}. Найдите ${M('EC')}.`, `${M('ABC')} úshmúyeshlikte ${M('D')} noqat ${M('AB')} da, ${M('E')} noqat ${M('AC')} da jatadı, ${M('DE\\parallel BC')}. ${M(`AD=${p.x}`)}, ${M(`DB=${p.y}`)}, ${M(`AE=${p.z}`)}. ${M('EC')} di tabıń.`, `In triangle ${M('ABC')} point ${M('D')} lies on ${M('AB')} and ${M('E')} on ${M('AC')}, ${M('DE\\parallel BC')}. ${M(`AD=${p.x}`)}, ${M(`DB=${p.y}`)}, ${M(`AE=${p.z}`)}. Find ${M('EC')}.`)
        : L(`${M('ABC')} uchburchakda ${M('D')} nuqta ${M('AB')} da, ${M('E')} nuqta ${M('AC')} da yotadi, ${M('DE\\parallel BC')}. ${M(`AD=${p.x}`)}, ${M(`DB=${p.y}`)}, ${M(`DE=${p.de}`)}. ${M('BC')} ni toping.`, `В треугольнике ${M('ABC')} точки ${M('D')} на ${M('AB')} и ${M('E')} на ${M('AC')}, ${M('DE\\parallel BC')}. ${M(`AD=${p.x}`)}, ${M(`DB=${p.y}`)}, ${M(`DE=${p.de}`)}. Найдите ${M('BC')}.`, `${M('ABC')} úshmúyeshlikte ${M('D')} noqat ${M('AB')} da, ${M('E')} noqat ${M('AC')} da jatadı, ${M('DE\\parallel BC')}. ${M(`AD=${p.x}`)}, ${M(`DB=${p.y}`)}, ${M(`DE=${p.de}`)}. ${M('BC')} dı tabıń.`, `In triangle ${M('ABC')} point ${M('D')} lies on ${M('AB')} and ${M('E')} on ${M('AC')}, ${M('DE\\parallel BC')}. ${M(`AD=${p.x}`)}, ${M(`DB=${p.y}`)}, ${M(`DE=${p.de}`)}. Find ${M('BC')}.`),
      ans,
      mistakes: p.kind === 'EC' ? [frac(p.z * p.x, p.y), fI(p.z + p.y - p.x), frac(p.z * (p.x + p.y), p.x), frac(p.y * p.x, p.z)] : [frac(p.de * p.y, p.x), frac(p.de * (p.x + p.y), p.y), fI(p.de + p.y), frac(p.de * p.x, p.x + p.y)],
      sol: J(M(p.kind === 'EC' ? `\\frac{AD}{DB}=\\frac{AE}{EC}\\Rightarrow EC=\\frac{${p.z}\\cdot ${p.y}}{${p.x}}=${texFrac(ans)}` : `\\frac{DE}{BC}=\\frac{AD}{AB}\\Rightarrow BC=\\frac{${p.de}\\cdot ${p.x + p.y}}{${p.x}}=${texFrac(ans)}`), fin(M(texFrac(ans)))),
      mis: L("Fales nisbatida $AB$ (butun tomon) o'rniga $DB$ ni yoki aksincha ishlatish.", 'Путают отрезки в пропорции Фалеса: берут $DB$ вместо всей стороны $AB$ или наоборот.', "Fales qatnasında $AB$ (pútin tárep) ornına $DB$ nı yamasa kerisinshe qollanıw.", "Mixing up segments in Thales' proportion: using $DB$ instead of the whole side $AB$ or vice versa."),
    };
  },
);

// --- 115: uch perpendikulyar haqidagi teorema: nuqtadan to'g'ri chiziqqacha masofa (L2) ---
G<{ t: number; k: number }>(
  'g2-three-perp',
  115,
  'L2',
  150,
  (r) => ({ t: r.int(0, 4), k: scale(r, 3) }),
  (p) => {
    const [h0, d0, s0] = TRIPLES[p.t]!;
    const h = h0 * p.k;
    const d = d0 * p.k;
    const s = s0 * p.k;
    return {
      stem: L(`${M('S')} nuqtadan ${M('\\alpha')} tekislikkacha perpendikulyar ${M(`SO=${h}`)}. ${M('O')} nuqtadan tekislikdagi ${M('l')} to'g'ri chiziqqacha masofa ${mi(d)}. ${M('S')} nuqtadan ${M('l')} to'g'ri chiziqqacha masofani toping.`, `Перпендикуляр из точки ${M('S')} к плоскости ${M('\\alpha')} равен ${M(`SO=${h}`)}. Расстояние от точки ${M('O')} до прямой ${M('l')} в плоскости равно ${mi(d)}. Найдите расстояние от ${M('S')} до прямой ${M('l')}.`, `${M('S')} noqattan ${M('\\alpha')} tegisligine shekem perpendikulyar ${M(`SO=${h}`)}. ${M('O')} noqattan tegisliktegi ${M('l')} tuwrısına shekem aralıq ${mi(d)}. ${M('S')} noqattan ${M('l')} tuwrısına shekem aralıqtı tabıń.`, `The perpendicular from ${M('S')} to plane ${M('\\alpha')} is ${M(`SO=${h}`)}. The distance from ${M('O')} to the line ${M('l')} in the plane is ${mi(d)}. Find the distance from ${M('S')} to ${M('l')}.`),
      ans: fI(s),
      mistakes: [fI(h + d), fI(Math.abs(d - h)), fI(h * d), fI(Math.round(Math.sqrt(Math.abs(d * d - h * h))))],
      sol: J(L("Uch perpendikulyar haqidagi teorema: $SH\\perp l$, $OH\\perp l$; to'g'ri burchakli $SOH$ uchburchakda Pifagor:", 'Теорема о трёх перпендикулярах: $SH\\perp l$, $OH\\perp l$; в прямоугольном треугольнике $SOH$ по Пифагору:', "Úsh perpendikulyar haqqındaǵı teorema: $SH\\perp l$, $OH\\perp l$; tuwrı múyeshli $SOH$ úshmúyeshlikte Pifagor:", 'By the three perpendiculars theorem $SH\\perp l$, $OH\\perp l$; in the right triangle $SOH$ by Pythagoras:'), M(`SH=\\sqrt{${h}^{2}+${d}^{2}}=${s}`), fin(mi(s))),
      mis: L("Masofalarni qo'shish ($h+d$) yoki Pifagor o'rniga ayirish.", 'Складывают расстояния ($h+d$) либо вычитают вместо теоремы Пифагора.', "Aralıqlardı qosıw ($h+d$) yamasa Pifagor ornına ayırıw.", 'Adding the distances ($h+d$) or subtracting instead of using Pythagoras.'),
    };
  },
);

// --- 84: nuqtadan tekislikkacha masofa (L2) ---
G<{ q: number; k: number; x0: number; y0: number; z0: number; d: number; sgn: [number, number, number] }>(
  'g2-point-plane',
  84,
  'L2',
  170,
  (r) => ({ q: r.int(0, 6), k: 1, x0: r.int(-4, 5), y0: r.int(-4, 5), z0: r.int(-4, 5), d: r.int(-9, 9), sgn: [r.pick([1, -1]), r.pick([1, -1]), r.pick([1, -1])] as [number, number, number] }),
  (p) => {
    const [a0, b0, c0, n] = QUADS[p.q]!;
    const a = a0 * p.sgn[0];
    const b = b0 * p.sgn[1];
    const c = c0 * p.sgn[2];
    const num = Math.abs(a * p.x0 + b * p.y0 + c * p.z0 - p.d);
    need(num !== 0 && p.d !== 0);
    const ans = frac(num, n);
    const plane = `${a === 1 ? '' : a === -1 ? '-' : a}x${b < 0 ? '-' : '+'}${Math.abs(b) === 1 ? '' : Math.abs(b)}y${c < 0 ? '-' : '+'}${Math.abs(c) === 1 ? '' : Math.abs(c)}z=${p.d}`;
    return {
      stem: L(`${M(`M${pt3(p.x0, p.y0, p.z0)}`)} nuqtadan ${M(plane)} tekislikkacha masofani toping.`, `Найдите расстояние от точки ${M(`M${pt3(p.x0, p.y0, p.z0)}`)} до плоскости ${M(plane)}.`, `${M(`M${pt3(p.x0, p.y0, p.z0)}`)} noqattan ${M(plane)} tegisligine shekem aralıqtı tabıń.`, `Find the distance from the point ${M(`M${pt3(p.x0, p.y0, p.z0)}`)} to the plane ${M(plane)}.`),
      ans,
      mistakes: [frac(num, 1), frac(Math.abs(a * p.x0 + b * p.y0 + c * p.z0 + p.d), n), frac(num, n * n), frac(num, a0 + b0 + c0)],
      sol: J(M(`d=\\frac{|${a}\\cdot ${p.x0}${b < 0 ? '' : '+'}${b}\\cdot ${p.y0}${c < 0 ? '' : '+'}${c}\\cdot ${p.z0}-${p.d}|}{\\sqrt{${a * a}+${b * b}+${c * c}}}=\\frac{${num}}{${n}}`.replace(/--/g, '+').replace(/\+-/g, '-')), fin(M(texFrac(ans)))),
      mis: L("Maxrajda ildiz chiqarishni unutish yoki erkin hadni ($d$) ayirish o'rniga qo'shish.", 'Забывают корень в знаменателе либо прибавляют свободный член вместо вычитания.', "Bólimde túbir shıǵarıwdı umıtıw yamasa erkin hádti ($d$) ayırıw ornına qosıw.", 'Forgetting the root in the denominator, or adding the constant instead of subtracting.'),
    };
  },
);

// --- 84: to'g'ri chiziq va tekislik orasidagi burchak (L2) ---
G<{ t: number; k: number; fn: 'sin' | 'cos' | 'tan' }>(
  'g2-line-plane-angle',
  84,
  'L2',
  150,
  (r) => ({ t: r.int(0, 4), k: scale(r, 3), fn: r.pick(['sin', 'cos', 'tan'] as const) }),
  (p) => {
    const [pr, h, l] = TRIPLES[p.t]!;
    const P = pr * p.k;
    const H = h * p.k;
    const Ls = l * p.k;
    const ans = p.fn === 'sin' ? frac(H, Ls) : p.fn === 'cos' ? frac(P, Ls) : frac(H, P);
    return {
      stem: L(`Tekislikka og'ma kesma ${mi(Ls)} ga teng, uning shu tekislikdagi proyeksiyasi ${mi(P)} ga teng. Og'ma va tekislik orasidagi burchakning ${p.fn === 'sin' ? 'sinusini' : p.fn === 'cos' ? 'kosinusini' : 'tangensini'} toping.`, `Наклонная к плоскости равна ${mi(Ls)}, а её проекция на плоскость — ${mi(P)}. Найдите ${p.fn === 'sin' ? 'синус' : p.fn === 'cos' ? 'косинус' : 'тангенс'} угла между наклонной и плоскостью.`, `Tegislikke qıya kesindi ${mi(Ls)} ǵa teń, onıń usı tegisliktegi proekciyası ${mi(P)} ǵa teń. Qıya menen tegislik arasındaǵı múyeshtiń ${p.fn === 'sin' ? 'sinusın' : p.fn === 'cos' ? 'kosinusın' : 'tangensin'} tabıń.`, `An oblique segment to a plane has length ${mi(Ls)} and its projection onto the plane has length ${mi(P)}. Find the ${p.fn === 'sin' ? 'sine' : p.fn === 'cos' ? 'cosine' : 'tangent'} of the angle between the segment and the plane.`),
      ans,
      mistakes: [frac(P, Ls), frac(H, Ls), frac(H, P), frac(P, H), frac(Ls, P)].filter((f) => fNum(f) !== fNum(ans)).filter((f) => fNum(f) > 0),
      sol: J(M(`h=\\sqrt{${Ls}^{2}-${P}^{2}}=${H}`), M(p.fn === 'sin' ? `\\sin\\varphi=\\frac{${H}}{${Ls}}` : p.fn === 'cos' ? `\\cos\\varphi=\\frac{${P}}{${Ls}}` : `\\tan\\varphi=\\frac{${H}}{${P}}`), fin(M(texFrac(ans)))),
      mis: L("Burchakni proyeksiya va balandlik orasida emas, og'ma va tekislik orasida olishni unutib, sinus bilan kosinusni almashtirish.", 'Путают синус и косинус: угол между наклонной и плоскостью — это угол между наклонной и её проекцией.', "Sinus penen kosinustı almastırıw: qıya menen tegislik arasındaǵı múyesh — qıya menen onıń proekciyası arasındaǵı múyesh.", 'Swapping sine and cosine: the angle with the plane is the angle between the segment and its projection.'),
    };
  },
);

// ======================================== 7.4 Fazoviy jismlar ========================================

// --- 86: to'g'ri burchakli parallelepiped diagonali (L1) ---
G<{ q: number; k: number; ask: 'diag' | 'edge' }>(
  'g2-box-diag',
  86,
  'L1',
  110,
  (r) => ({ q: r.int(0, 6), k: scale(r, 3), ask: r.pick(['diag', 'edge'] as const) }),
  (p) => {
    const [a, b, c, d] = QUADS[p.q]!;
    const A = a * p.k;
    const B = b * p.k;
    const C = c * p.k;
    const D = d * p.k;
    return {
      stem: p.ask === 'diag'
        ? L(`To'g'ri burchakli parallelepipedning o'lchamlari ${mi(A)}, ${mi(B)} va ${mi(C)}. Uning diagonalini toping.`, `Измерения прямоугольного параллелепипеда равны ${mi(A)}, ${mi(B)} и ${mi(C)}. Найдите его диагональ.`, `Tuwrı múyeshli parallelepipedtiń ólshemleri ${mi(A)}, ${mi(B)} hám ${mi(C)}. Onıń diagonalın tabıń.`, `The dimensions of a cuboid are ${mi(A)}, ${mi(B)} and ${mi(C)}. Find its space diagonal.`)
        : L(`To'g'ri burchakli parallelepipedning diagonali ${mi(D)}, ikki o'lchami ${mi(A)} va ${mi(B)}. Uchinchi o'lchamini toping.`, `Диагональ прямоугольного параллелепипеда равна ${mi(D)}, два измерения — ${mi(A)} и ${mi(B)}. Найдите третье измерение.`, `Tuwrı múyeshli parallelepipedtiń diagonalı ${mi(D)}, eki ólshemi ${mi(A)} hám ${mi(B)}. Úshinshi ólshemin tabıń.`, `The space diagonal of a cuboid is ${mi(D)} and two dimensions are ${mi(A)} and ${mi(B)}. Find the third dimension.`),
      ans: fI(p.ask === 'diag' ? D : C),
      mistakes: p.ask === 'diag' ? [fI(A + B + C), fI(Math.round(Math.sqrt(A * A + B * B))), fI(Math.round(Math.sqrt(A * A + C * C))), fI(D + p.k)] : [fI(D - A - B), fI(Math.round(Math.sqrt(D * D - A * A))), fI(Math.abs(D - A)), fI(C + p.k)],
      sol: J(M(p.ask === 'diag' ? `d^{2}=a^{2}+b^{2}+c^{2}=${D * D}` : `c^{2}=d^{2}-a^{2}-b^{2}=${C * C}`), fin(mi(p.ask === 'diag' ? D : C))),
      mis: L("Diagonal uchun o'lchamlarni qo'shish yoki uchinchi o'lchamni hisobga olmay faqat tekislik diagonalini olish.", 'Складывают измерения либо берут диагональ грани, не учитывая третье измерение.', "Diagonal ushın ólshemlerdi qosıw yamasa úshinshi ólshemdi esapqa almay tek tegislik diagonalın alıw.", 'Adding the dimensions, or using a face diagonal and ignoring the third dimension.'),
    };
  },
);

// --- 85: to'g'ri prizma: asosi to'g'ri burchakli uchburchak (L1) ---
G<{ t: number; k: number; H: number; ask: 'vol' | 'lateral' | 'total' }>(
  'g2-prism',
  85,
  'L1',
  130,
  (r) => ({ t: r.int(0, 4), k: 1, H: r.int(2, 12), ask: r.pick(['vol', 'lateral', 'total'] as const) }),
  (p) => {
    const [a, b, c] = TRIPLES[p.t]!;
    const base = (a * b) / 2;
    const perim = a + b + c;
    const ans = p.ask === 'vol' ? base * p.H : p.ask === 'lateral' ? perim * p.H : perim * p.H + 2 * base;
    return {
      stem: L(`To'g'ri prizmaning asosi katetlari ${mi(a)} va ${mi(b)} bo'lgan to'g'ri burchakli uchburchak, balandligi ${mi(p.H)}. Prizmaning ${p.ask === 'vol' ? 'hajmini' : p.ask === 'lateral' ? 'yon sirtini' : 'to\'la sirtini'} toping.`, `Основание прямой призмы — прямоугольный треугольник с катетами ${mi(a)} и ${mi(b)}, высота призмы ${mi(p.H)}. Найдите ${p.ask === 'vol' ? 'объём' : p.ask === 'lateral' ? 'площадь боковой поверхности' : 'площадь полной поверхности'}.`, `Tuwrı prizmanıń tiykarı katetleri ${mi(a)} hám ${mi(b)} bolǵan tuwrı múyeshli úshmúyeshlik, biyikligi ${mi(p.H)}. Prizmanıń ${p.ask === 'vol' ? 'kólemin' : p.ask === 'lateral' ? 'jan betin' : 'tolıq betin'} tabıń.`, `The base of a right prism is a right triangle with legs ${mi(a)} and ${mi(b)}, and the height is ${mi(p.H)}. Find the ${p.ask === 'vol' ? 'volume' : p.ask === 'lateral' ? 'lateral surface area' : 'total surface area'}.`),
      ans: fI(ans),
      mistakes: p.ask === 'vol' ? [fI(a * b * p.H), fI(perim * p.H), fI(base + p.H)] : p.ask === 'lateral' ? [fI(base * p.H), fI((a + b) * p.H), fI(perim * p.H + base)] : [fI(perim * p.H + base), fI(perim * p.H), fI(base * p.H + 2 * base)],
      sol: J(M(`c=${c},\\ S_{asos}=${base},\\ P=${perim}`), M(p.ask === 'vol' ? `V=S_{asos}H=${ans}` : p.ask === 'lateral' ? `S_{yon}=PH=${ans}` : `S=PH+2S_{asos}=${ans}`), fin(mi(ans))),
      mis: L("Asos yuzini perimetr bilan, hajmni yon sirt bilan adashtirish; to'la sirtda ikkita asosni ($2S_{asos}$) unutish.", 'Путают площадь основания с периметром, объём с боковой поверхностью; в полной поверхности забывают два основания ($2S$ (основания)).', "Tiykar maydanın perimetr penen, kólemdi jan bet penen shatastırıw; tolıq bette eki tiykardı ($2S_{tiykar}$) umıtıw.", 'Mixing up base area and perimeter, volume and lateral area; forgetting two bases ($2S_{base}$) in the total surface.'),
    };
  },
);

// --- 87: muntazam to'rtburchakli piramida (L2) ---
G<{ t: number; k: number; ask: 'vol' | 'lateral' | 'slant' }>(
  'g2-pyramid',
  87,
  'L2',
  170,
  (r) => ({ t: r.int(0, 4), k: scale(r, 2), ask: r.pick(['vol', 'lateral', 'slant'] as const) }),
  (p) => {
    const [x0, h0, l0] = TRIPLES[p.t]!;
    const x = x0 * p.k;
    const h = h0 * p.k;
    const l = l0 * p.k;
    const a = 2 * x;
    const ans = p.ask === 'vol' ? frac(a * a * h, 3) : p.ask === 'lateral' ? fI(2 * a * l) : fI(l);
    return {
      stem: L(`Muntazam to'rtburchakli piramidaning asos tomoni ${mi(a)}, balandligi ${mi(h)}. ${p.ask === 'vol' ? 'Hajmini' : p.ask === 'lateral' ? 'Yon sirtini' : 'Apofemasini (yon yoq balandligini)'} toping.`, `Сторона основания правильной четырёхугольной пирамиды равна ${mi(a)}, высота — ${mi(h)}. Найдите ${p.ask === 'vol' ? 'объём' : p.ask === 'lateral' ? 'площадь боковой поверхности' : 'апофему'}.`, `Durıs tórtmúyeshli piramidanıń tiykar tárepi ${mi(a)}, biyikligi ${mi(h)}. ${p.ask === 'vol' ? 'Kólemin' : p.ask === 'lateral' ? 'Jan betin' : 'Apofemasın'} tabıń.`, `A regular square pyramid has base side ${mi(a)} and height ${mi(h)}. Find its ${p.ask === 'vol' ? 'volume' : p.ask === 'lateral' ? 'lateral surface area' : 'slant height'}.`),
      ans,
      mistakes: p.ask === 'vol' ? [fI(a * a * h), frac(a * a * h, 2), frac(a * h, 3)] : p.ask === 'lateral' ? [fI(a * l), fI(4 * a * l), fI(2 * a * h), fI(a * a + 2 * a * l)] : [fI(h), fI(Math.round(Math.sqrt(h * h + a * a))), fI(x + h), fI(Math.abs(h - x))],
      sol: J(M(`l=\\sqrt{h^{2}+\\left(\\frac{a}{2}\\right)^{2}}=\\sqrt{${h}^{2}+${x}^{2}}=${l}`), M(p.ask === 'vol' ? `V=\\frac{1}{3}a^{2}h=${texFrac(ans)}` : p.ask === 'lateral' ? `S=\\frac{1}{2}P\\,l=2al=${texFrac(ans)}` : `l=${l}`), fin(M(texFrac(ans)))),
      mis: L("Hajm formulasida $\\frac{1}{3}$ ni unutish yoki apofemani balandlik bilan, asosning yarmi o'rniga to'liq tomonni ishlatish.", 'Забывают множитель $\\frac{1}{3}$ либо путают апофему с высотой, берут сторону вместо половины стороны.', "Kólem formulasında $\\frac{1}{3}$ di umıtıw yamasa apofemanı biyiklik penen, tiykardıń yarımı ornına tolıq táreptı qollanıw.", 'Forgetting the factor $\\frac{1}{3}$, or confusing the slant height with the height / using the full side instead of half.'),
    };
  },
);

// --- 88: silindr (L1) ---
G<{ r: number; h: number; ask: 'lateral' | 'vol' | 'axial' }>(
  'g2-cylinder',
  88,
  'L1',
  100,
  (r) => ({ r: r.int(2, 9), h: r.int(2, 12), ask: r.pick(['lateral', 'vol', 'axial'] as const) }),
  (p) => {
    const ans = p.ask === 'lateral' ? fI(2 * p.r * p.h) : p.ask === 'vol' ? fI(p.r * p.r * p.h) : fI(2 * p.r * p.h);
    return {
      stem: L(`Silindrning asos radiusi ${mi(p.r)}, balandligi ${mi(p.h)}. ${p.ask === 'lateral' ? 'Yon sirtini' : p.ask === 'vol' ? 'Hajmini' : "O'q kesimining yuzini"} toping.`, `Радиус основания цилиндра равен ${mi(p.r)}, высота — ${mi(p.h)}. Найдите ${p.ask === 'lateral' ? 'площадь боковой поверхности' : p.ask === 'vol' ? 'объём' : 'площадь осевого сечения'}.`, `Cilindrdiń tiykar radiusı ${mi(p.r)}, biyikligi ${mi(p.h)}. ${p.ask === 'lateral' ? 'Jan betin' : p.ask === 'vol' ? 'Kólemin' : "Kósher kesimniń maydanın"} tabıń.`, `A cylinder has base radius ${mi(p.r)} and height ${mi(p.h)}. Find its ${p.ask === 'lateral' ? 'lateral surface area' : p.ask === 'vol' ? 'volume' : 'axial cross-section area'}.`),
      ans,
      mistakes: p.ask === 'vol' ? [fI(2 * p.r * p.h), fI(p.r * p.h), fI(p.r * p.r)] : [fI(p.r * p.h), fI(p.r * p.r * p.h), fI(p.r * (p.r + p.h) * 2)],
      fmt: p.ask === 'axial' ? plain : piFmt,
      sol: J(M(p.ask === 'lateral' ? `S=2\\pi rh=${pi(ans)}` : p.ask === 'vol' ? `V=\\pi r^{2}h=${pi(ans)}` : `S=2r\\cdot h=${ans.n}`), fin(p.ask === 'axial' ? mi(ans.n) : M(pi(ans)))),
      mis: L("Yon sirt formulasida $2\\pi rh$ o'rniga $\\pi rh$ yoki hajm o'rniga yon sirtni olish; o'q kesimi ($2rh$) da $\\pi$ qatnashmaydi.", 'Берут $\\pi rh$ вместо $2\\pi rh$ либо путают объём с боковой поверхностью; в осевом сечении ($2rh$) нет $\\pi$.', "Jan bet formulasında $2\\pi rh$ ornına $\\pi rh$ yamasa kólem ornına jan betti alıw; kósher kesimde ($2rh$) $\\pi$ qatnaspaydı.", 'Using $\\pi rh$ instead of $2\\pi rh$, or confusing volume with lateral area; the axial section ($2rh$) has no $\\pi$.'),
    };
  },
);

// --- 89: konus (L2) ---
G<{ t: number; k: number; ask: 'vol' | 'lateral' | 'total' }>(
  'g2-cone',
  89,
  'L2',
  150,
  (r) => ({ t: r.int(0, 4), k: scale(r, 2), ask: r.pick(['vol', 'lateral', 'total'] as const) }),
  (p) => {
    const [r0, h0, l0] = TRIPLES[p.t]!;
    const R = r0 * p.k;
    const H = h0 * p.k;
    const l = l0 * p.k;
    const ans = p.ask === 'vol' ? frac(R * R * H, 3) : p.ask === 'lateral' ? fI(R * l) : fI(R * (R + l));
    return {
      stem: L(`Konusning asos radiusi ${mi(R)}, balandligi ${mi(H)}. ${p.ask === 'vol' ? 'Hajmini' : p.ask === 'lateral' ? 'Yon sirtini' : "To'la sirtini"} toping.`, `Радиус основания конуса равен ${mi(R)}, высота — ${mi(H)}. Найдите ${p.ask === 'vol' ? 'объём' : p.ask === 'lateral' ? 'площадь боковой поверхности' : 'площадь полной поверхности'}.`, `Konustıń tiykar radiusı ${mi(R)}, biyikligi ${mi(H)}. ${p.ask === 'vol' ? 'Kólemin' : p.ask === 'lateral' ? 'Jan betin' : 'Tolıq betin'} tabıń.`, `A cone has base radius ${mi(R)} and height ${mi(H)}. Find its ${p.ask === 'vol' ? 'volume' : p.ask === 'lateral' ? 'lateral surface area' : 'total surface area'}.`),
      ans,
      fmt: piFmt,
      mistakes: p.ask === 'vol' ? [fI(R * R * H), frac(R * R * l, 3), frac(R * H, 3)] : p.ask === 'lateral' ? [fI(R * H), fI(2 * R * l), fI(R * R + R * l)] : [fI(R * l), fI(R * R + R * l * 2), fI(R * (R + H))],
      sol: J(M(`l=\\sqrt{${R}^{2}+${H}^{2}}=${l}`), M(p.ask === 'vol' ? `V=\\frac{1}{3}\\pi R^{2}H=${pi(ans)}` : p.ask === 'lateral' ? `S=\\pi Rl=${pi(ans)}` : `S=\\pi R(R+l)=${pi(ans)}`), fin(M(pi(ans)))),
      mis: L("Yasovchi o'rniga balandlikni ishlatish yoki hajm formulasida $\\frac{1}{3}$ ni unutish.", 'Используют высоту вместо образующей либо забывают $\\frac{1}{3}$ в формуле объёма.', "Jasawshı ornına biyiklikti qollanıw yamasa kólem formulasında $\\frac{1}{3}$ di umıtıw.", 'Using the height instead of the slant height, or forgetting $\\frac{1}{3}$ in the volume.'),
    };
  },
);

// --- 90: shar va sfera (L1) ---
G<{ r: number; ask: 'vol' | 'surf' | 'radius' }>(
  'g2-sphere',
  90,
  'L1',
  110,
  (r) => ({ r: r.int(2, 9), ask: r.pick(['vol', 'surf', 'radius'] as const) }),
  (p) => {
    const V = frac(4 * p.r ** 3, 3);
    const S = fI(4 * p.r * p.r);
    return {
      stem: p.ask === 'radius'
        ? L(`Sharning hajmi ${M(`${pi(V)}`)} ga teng. Uning radiusini toping.`, `Объём шара равен ${M(`${pi(V)}`)}. Найдите его радиус.`, `Shardıń kólemi ${M(`${pi(V)}`)} ǵa teń. Onıń radiusın tabıń.`, `The volume of a ball is ${M(`${pi(V)}`)}. Find its radius.`)
        : L(`Sharning radiusi ${mi(p.r)}. Uning ${p.ask === 'vol' ? 'hajmini' : 'sirtining yuzini'} toping.`, `Радиус шара равен ${mi(p.r)}. Найдите ${p.ask === 'vol' ? 'его объём' : 'площадь его поверхности'}.`, `Shardıń radiusı ${mi(p.r)}. Onıń ${p.ask === 'vol' ? 'kólemin' : 'betiniń maydanın'} tabıń.`, `The radius of a ball is ${mi(p.r)}. Find its ${p.ask === 'vol' ? 'volume' : 'surface area'}.`),
      ans: p.ask === 'vol' ? V : p.ask === 'surf' ? S : fI(p.r),
      fmt: p.ask === 'radius' ? plain : piFmt,
      mistakes: p.ask === 'vol' ? [S, fI(p.r ** 3), frac(p.r ** 3, 3), frac(2 * p.r ** 3, 3)] : p.ask === 'surf' ? [fI(p.r * p.r), fI(2 * p.r * p.r), frac(4 * p.r ** 3, 3), fI(4 * p.r)] : [fI(p.r + 1), fI(p.r - 1), frac(p.r, 2), fI(p.r * 2)],
      sol: J(M(p.ask === 'radius' ? `\\frac{4}{3}\\pi r^{3}=${pi(V)}\\Rightarrow r^{3}=${p.r ** 3},\\ r=${p.r}` : p.ask === 'vol' ? `V=\\frac{4}{3}\\pi r^{3}=${pi(V)}` : `S=4\\pi r^{2}=${pi(S)}`), fin(p.ask === 'radius' ? mi(p.r) : M(pi(p.ask === 'vol' ? V : S)))),
      mis: L("Hajm va sirt formulalarini adashtirish: $\\frac{4}{3}\\pi r^{3}$ va $4\\pi r^{2}$.", 'Путают формулы объёма и поверхности: $\\frac{4}{3}\\pi r^{3}$ и $4\\pi r^{2}$.', "Kólem hám bet formulaların shatastırıw: $\\frac{4}{3}\\pi r^{3}$ hám $4\\pi r^{2}$.", 'Mixing up the volume and surface formulas: $\\frac{4}{3}\\pi r^{3}$ and $4\\pi r^{2}$.'),
    };
  },
);

// --- 91: shar kesimi (L3) ---
G<{ t: number; k: number; ask: 'area' | 'dist' }>(
  'g2-sphere-section',
  91,
  'L3',
  180,
  (r) => ({ t: r.int(0, 4), k: scale(r, 2), ask: r.pick(['area', 'dist'] as const) }),
  (p) => {
    const [d0, rr0, R0] = TRIPLES[p.t]!;
    const d = d0 * p.k;
    const rr = rr0 * p.k;
    const R = R0 * p.k;
    return {
      stem: p.ask === 'area'
        ? L(`Radiusi ${mi(R)} bo'lgan shar markazidan ${mi(d)} masofada o'tuvchi tekislik bilan kesilgan. Kesim yuzini toping.`, `Шар радиуса ${mi(R)} пересечён плоскостью на расстоянии ${mi(d)} от центра. Найдите площадь сечения.`, `Radiusı ${mi(R)} bolǵan shar orayınan ${mi(d)} aralıqta ótiwshi tegislik penen kesilgen. Kesim maydanın tabıń.`, `A ball of radius ${mi(R)} is cut by a plane at distance ${mi(d)} from its centre. Find the area of the section.`)
        : L(`Radiusi ${mi(R)} bo'lgan sharning kesimi radiusi ${mi(rr)} bo'lgan doira. Kesim tekisligidan shar markazigacha masofani toping.`, `Сечение шара радиуса ${mi(R)} — круг радиуса ${mi(rr)}. Найдите расстояние от центра шара до плоскости сечения.`, `Radiusı ${mi(R)} bolǵan shardıń kesimi radiusı ${mi(rr)} bolǵan dóńgelek. Kesim tegisliginen shar orayına shekem aralıqtı tabıń.`, `The section of a ball of radius ${mi(R)} is a disc of radius ${mi(rr)}. Find the distance from the centre of the ball to the plane of the section.`),
      ans: fI(p.ask === 'area' ? rr * rr : d),
      fmt: p.ask === 'area' ? piFmt : plain,
      mistakes: p.ask === 'area' ? [fI(R * R - d), fI(R * R), fI(d * d), fI((R - d) ** 2)] : [fI(R - rr), fI(R + rr), fI(Math.round(Math.sqrt(R * R + rr * rr))), fI(rr)],
      sol: J(M(p.ask === 'area' ? `r^{2}=R^{2}-d^{2}=${R * R}-${d * d}=${rr * rr}` : `d^{2}=R^{2}-r^{2}=${R * R}-${rr * rr}=${d * d}`), fin(p.ask === 'area' ? M(pi(fI(rr * rr))) : mi(d))),
      mis: L("Kesim radiusini $R-d$ deb olish: $r^{2}=R^{2}-d^{2}$ (Pifagor).", 'Берут радиус сечения как $R-d$: на самом деле $r^{2}=R^{2}-d^{2}$ (Пифагор).', "Kesim radiusın $R-d$ dep alıw: aslında $r^{2}=R^{2}-d^{2}$ (Pifagor).", 'Taking the section radius as $R-d$: actually $r^{2}=R^{2}-d^{2}$ (Pythagoras).'),
    };
  },
);

// --- 116: Eyler teoremasi (L1) ---
G<{ kind: 'E' | 'V' | 'prismE' | 'pyrV'; V: number; F: number; n: number }>(
  'g2-euler',
  116,
  'L1',
  100,
  (r) => ({ kind: r.pick(['E', 'V', 'prismE', 'pyrV'] as const), V: r.int(6, 20), F: r.int(5, 14), n: r.int(3, 12) }),
  (p) => {
    const E = p.V + p.F - 2;
    const ans = p.kind === 'E' ? E : p.kind === 'V' ? p.V : p.kind === 'prismE' ? 3 * p.n : p.n + 1;
    return {
      stem: p.kind === 'E'
        ? L(`Qavariq ko'pyoqlikning ${mi(p.V)} ta uchi va ${mi(p.F)} ta yog'i bor. Qirralari sonini toping.`, `У выпуклого многогранника ${mi(p.V)} вершин и ${mi(p.F)} граней. Найдите число рёбер.`, `Qabarıq kópjaqlınıń ${mi(p.V)} ushı hám ${mi(p.F)} jaǵı bar. Qabırǵaları sanın tabıń.`, `A convex polyhedron has ${mi(p.V)} vertices and ${mi(p.F)} faces. Find the number of edges.`)
        : p.kind === 'V'
          ? L(`Qavariq ko'pyoqlikning ${mi(E)} ta qirrasi va ${mi(p.F)} ta yog'i bor. Uchlari sonini toping.`, `У выпуклого многогранника ${mi(E)} рёбер и ${mi(p.F)} граней. Найдите число вершин.`, `Qabarıq kópjaqlınıń ${mi(E)} qabırǵası hám ${mi(p.F)} jaǵı bar. Ushları sanın tabıń.`, `A convex polyhedron has ${mi(E)} edges and ${mi(p.F)} faces. Find the number of vertices.`)
          : p.kind === 'prismE'
            ? L(`${mi(p.n)} burchakli prizmaning qirralari sonini toping.`, `Найдите число рёбер ${mi(p.n)}-угольной призмы.`, `${mi(p.n)} múyeshli prizmanıń qabırǵaları sanın tabıń.`, `Find the number of edges of an ${mi(p.n)}-gonal prism.`)
            : L(`${mi(p.n)} burchakli piramidaning uchlari sonini toping.`, `Найдите число вершин ${mi(p.n)}-угольной пирамиды.`, `${mi(p.n)} múyeshli piramidanıń ushları sanın tabıń.`, `Find the number of vertices of an ${mi(p.n)}-gonal pyramid.`),
      ans: fI(ans),
      mistakes: p.kind === 'E' ? [fI(p.V + p.F), fI(p.V + p.F + 2), fI(p.V * p.F)] : p.kind === 'V' ? [fI(E + p.F), fI(E - p.F + 2 + 1), fI(E - p.F)] : p.kind === 'prismE' ? [fI(2 * p.n), fI(3 * p.n + 2), fI(p.n + 2)] : [fI(2 * p.n), fI(p.n), fI(p.n + 2)],
      sol: J(L("Eyler teoremasi: $V-E+F=2$.", 'Теорема Эйлера: $V-E+F=2$.', "Eyler teoreması: $V-E+F=2$.", "Euler's theorem: $V-E+F=2$."), fin(mi(ans))),
      mis: L("Eyler formulasida ishoralarni adashtirish ($V+F=E$ deb olish).", 'Путают знаки в формуле Эйлера (берут $V+F=E$).', "Eyler formulasında belgilerdi shatastırıw ($V+F=E$ dep alıw).", 'Mixing up signs in Euler\'s formula (taking $V+F=E$).'),
    };
  },
);

// --- 92: kubga ichki chizilgan shar (L3) ---
G<{ a: number; ask: 'vol' | 'surf' }>(
  'g2-cube-sphere',
  92,
  'L3',
  170,
  (r) => ({ a: r.int(2, 12), ask: r.pick(['vol', 'surf'] as const) }),
  (p) => {
    const ans = p.ask === 'vol' ? frac(p.a ** 3, 6) : fI(p.a * p.a);
    return {
      stem: L(`Qirrasi ${mi(p.a)} bo'lgan kubga shar ichki chizilgan. Sharning ${p.ask === 'vol' ? 'hajmini' : 'sirtining yuzini'} toping.`, `В куб с ребром ${mi(p.a)} вписан шар. Найдите ${p.ask === 'vol' ? 'объём шара' : 'площадь поверхности шара'}.`, `Qabırǵası ${mi(p.a)} bolǵan kubqa shar ishki sızılǵan. Shardıń ${p.ask === 'vol' ? 'kólemin' : 'betiniń maydanın'} tabıń.`, `A ball is inscribed in a cube of edge ${mi(p.a)}. Find the ${p.ask === 'vol' ? 'volume' : 'surface area'} of the ball.`),
      ans,
      fmt: piFmt,
      mistakes: p.ask === 'vol' ? [frac(p.a ** 3, 3), frac(4 * p.a ** 3, 3), frac(p.a ** 3, 2), frac(p.a ** 3 * 4, 24)] : [fI(4 * p.a * p.a), fI(p.a * p.a * 2), frac(p.a * p.a, 2), fI(p.a * p.a * 6)],
      sol: J(M(`r=\\frac{a}{2}=${texFrac(frac(p.a, 2))}`), M(p.ask === 'vol' ? `V=\\frac{4}{3}\\pi r^{3}=${pi(ans)}` : `S=4\\pi r^{2}=${pi(ans)}`), fin(M(pi(ans)))),
      mis: L("Sharning radiusini kub qirrasiga teng ($r=a$) deb olish: radius qirraning yarmi.", 'Принимают радиус шара равным ребру куба ($r=a$): радиус — половина ребра.', "Shardıń radiusın kub qabırǵasına teń ($r=a$) dep alıw: radius qabırǵanıń yarımı.", 'Taking the ball radius equal to the cube edge ($r=a$): the radius is half the edge.'),
    };
  },
);

// --- 117: shar segmenti (L3) ---
G<{ R: number; h: number; ask: 'vol' | 'base' }>(
  'g2-sphere-cap',
  117,
  'L3',
  190,
  (r) => ({ R: r.int(3, 12), h: r.int(1, 10), ask: r.pick(['vol', 'base'] as const) }),
  (p) => {
    need(p.h < 2 * p.R && p.h !== p.R);
    const vol = frac(p.h * p.h * (3 * p.R - p.h), 3);
    const base = fI(p.h * (2 * p.R - p.h));
    const ans = p.ask === 'vol' ? vol : base;
    return {
      stem: L(`Radiusi ${mi(p.R)} bo'lgan sharni tekislik bilan kesib, balandligi ${mi(p.h)} bo'lgan shar segmenti hosil qilindi. Segmentning ${p.ask === 'vol' ? 'hajmini' : 'asosi (kesim doirasi) yuzini'} toping.`, `Шар радиуса ${mi(p.R)} рассечён плоскостью, получен шаровой сегмент высотой ${mi(p.h)}. Найдите ${p.ask === 'vol' ? 'объём сегмента' : 'площадь его основания (круга сечения)'}.`, `Radiusı ${mi(p.R)} bolǵan sharǵa tegislik penen kesip, biyikligi ${mi(p.h)} bolǵan shar segmenti payda etildi. Segmenttiń ${p.ask === 'vol' ? 'kólemin' : 'tiykari (kesim dóńgelegi) maydanın'} tabıń.`, `A ball of radius ${mi(p.R)} is cut by a plane, giving a spherical cap of height ${mi(p.h)}. Find the ${p.ask === 'vol' ? 'volume of the cap' : 'area of its base (the section disc)'}.`),
      ans,
      fmt: piFmt,
      mistakes: p.ask === 'vol' ? [frac(p.h * p.h * (3 * p.R + p.h), 3), frac(p.h * (3 * p.R - p.h), 3), fI(p.h * p.h * (3 * p.R - p.h)), frac(4 * p.R ** 3, 3)] : [fI(p.h * (2 * p.R + p.h)), fI(p.R * p.R - p.h * p.h), fI(p.h * p.R), fI((p.R - p.h) ** 2)],
      sol: J(M(p.ask === 'vol' ? `V=\\frac{\\pi h^{2}(3R-h)}{3}=${pi(vol)}` : `r^{2}=h(2R-h)=${p.h}\\cdot ${2 * p.R - p.h}=${base.n}`), fin(M(pi(ans)))),
      mis: L("Segment formulasida $3R-h$ o'rniga $3R+h$ yoki $\\frac{1}{3}$ ni unutish.", 'Берут $3R+h$ вместо $3R-h$ либо забывают $\\frac{1}{3}$.', "Segment formulasında $3R-h$ ornına $3R+h$ yamasa $\\frac{1}{3}$ di umıtıw.", 'Using $3R+h$ instead of $3R-h$, or forgetting $\\frac{1}{3}$.'),
    };
  },
);

// ======================================== 7.5 Koordinatalar va vektorlar ========================================

// --- 81: tekislikdagi vektorlar (L1) ---
G<{ x1: number; y1: number; x2: number; y2: number; t: number; k: number; ask: 'dot' | 'comb' | 'len' }>(
  'g2-vec-plane',
  81,
  'L1',
  120,
  (r) => ({ x1: r.int(-6, 6), y1: r.int(-6, 6), x2: r.int(-6, 6), y2: r.int(-6, 6), t: r.int(0, 4), k: scale(r, 2), ask: r.pick(['dot', 'comb', 'len'] as const) }),
  (p) => {
    if (p.ask === 'len') {
      const [a, b, c] = TRIPLES[p.t]!;
      const sx = p.x1 % 2 === 0 ? 1 : -1;
      const A = a * p.k * sx;
      const B = b * p.k;
      return {
        stem: L(`${M(`\\vec{a}=${pt(A, B)}`)} vektorning uzunligini toping.`, `Найдите длину вектора ${M(`\\vec{a}=${pt(A, B)}`)}.`, `${M(`\\vec{a}=${pt(A, B)}`)} vektorınıń uzınlıǵın tabıń.`, `Find the length of the vector ${M(`\\vec{a}=${pt(A, B)}`)}.`),
        ans: fI(c * p.k),
        mistakes: [fI(Math.abs(A) + B), fI(A * A + B * B), fI(Math.abs(A) * B), fI(Math.abs(Math.abs(A) - B))],
        sol: J(M(`|\\vec{a}|=\\sqrt{${A}^{2}+${B}^{2}}=${c * p.k}`), fin(mi(c * p.k))),
        mis: L("Uzunlikni koordinatalar yig'indisi (ildizsiz) deb olish.", 'Принимают длину за сумму координат (без корня).', "Uzınlıqtı koordinatalar qosındısı (túbirsiz) dep alıw.", 'Taking the length as the sum of coordinates (no root).'),
      };
    }
    const dot = p.x1 * p.x2 + p.y1 * p.y2;
    const comb = (2 * p.x1 - 3 * p.x2) + (2 * p.y1 - 3 * p.y2);
    need(p.x1 !== 0 && p.y1 !== 0 && p.x2 !== 0 && p.y2 !== 0 && dot !== 0 && comb !== 0 && dot !== comb);
    return {
      stem: p.ask === 'dot'
        ? L(`${M(`\\vec{a}=${pt(p.x1, p.y1)}`)} va ${M(`\\vec{b}=${pt(p.x2, p.y2)}`)} vektorlarning skalyar ko'paytmasini toping.`, `Найдите скалярное произведение векторов ${M(`\\vec{a}=${pt(p.x1, p.y1)}`)} и ${M(`\\vec{b}=${pt(p.x2, p.y2)}`)}.`, `${M(`\\vec{a}=${pt(p.x1, p.y1)}`)} hám ${M(`\\vec{b}=${pt(p.x2, p.y2)}`)} vektorlarınıń skalyar kóbeymesin tabıń.`, `Find the dot product of ${M(`\\vec{a}=${pt(p.x1, p.y1)}`)} and ${M(`\\vec{b}=${pt(p.x2, p.y2)}`)}.`)
        : L(`${M(`\\vec{a}=${pt(p.x1, p.y1)}`)} va ${M(`\\vec{b}=${pt(p.x2, p.y2)}`)} bo'lsa, ${M('2\\vec{a}-3\\vec{b}')} vektor koordinatalarining yig'indisini toping.`, `Если ${M(`\\vec{a}=${pt(p.x1, p.y1)}`)} и ${M(`\\vec{b}=${pt(p.x2, p.y2)}`)}, найдите сумму координат вектора ${M('2\\vec{a}-3\\vec{b}')}.`, `${M(`\\vec{a}=${pt(p.x1, p.y1)}`)} hám ${M(`\\vec{b}=${pt(p.x2, p.y2)}`)} bolsa, ${M('2\\vec{a}-3\\vec{b}')} vektor koordinatalarınıń qosındısın tabıń.`, `If ${M(`\\vec{a}=${pt(p.x1, p.y1)}`)} and ${M(`\\vec{b}=${pt(p.x2, p.y2)}`)}, find the sum of the coordinates of ${M('2\\vec{a}-3\\vec{b}')}.`),
      ans: fI(p.ask === 'dot' ? dot : comb),
      neg: true,
      mistakes: p.ask === 'dot' ? [fI(p.x1 * p.y2 + p.y1 * p.x2), fI(p.x1 + p.x2 + p.y1 + p.y2), fI(-dot), fI(p.x1 * p.x2 - p.y1 * p.y2)] : [fI(2 * p.x1 + 3 * p.x2 + 2 * p.y1 + 3 * p.y2), fI(-comb), fI((p.x1 - p.x2) + (p.y1 - p.y2)), fI(3 * p.x1 - 2 * p.x2 + 3 * p.y1 - 2 * p.y2)],
      sol: J(M(p.ask === 'dot' ? `\\vec{a}\\cdot\\vec{b}=${p.x1}\\cdot ${p.x2 < 0 ? `(${p.x2})` : p.x2}+${p.y1 < 0 ? `(${p.y1})` : p.y1}\\cdot ${p.y2 < 0 ? `(${p.y2})` : p.y2}=${dot}` : `2\\vec{a}-3\\vec{b}=${pt(2 * p.x1 - 3 * p.x2, 2 * p.y1 - 3 * p.y2)}`), fin(mi(p.ask === 'dot' ? dot : comb))),
      mis: L("Skalyar ko'paytmada mos koordinatalarni ko'paytirish o'rniga o'zaro (x*y) ko'paytirish; ayirishda ishorani adashtirish.", 'Перемножают координаты крест-накрест вместо соответствующих; путают знак при вычитании.', "Skalyar kóbeymede sáykes koordinatalardı kóbeytiw ornına kesim-kesim kóbeytiw; ayırıwda belgini shatastırıw.", 'Multiplying coordinates crosswise instead of matching ones; sign errors when subtracting.'),
    };
  },
);

// --- 119: kollinear va perpendikulyar vektorlar (L2) ---
G<{ a: number; b: number; c: number; kind: 'col' | 'perp' }>(
  'g2-vec-param',
  119,
  'L2',
  140,
  (r) => ({ a: r.int(-6, 6), b: r.int(-6, 6), c: r.int(-6, 6), kind: r.pick(['col', 'perp'] as const) }),
  (p) => {
    need(p.a !== 0 && p.b !== 0 && p.c !== 0);
    const ans = p.kind === 'col' ? frac(p.b * p.c, p.a) : frac(-p.a * p.c, p.b);
    need(ans.d <= 3 && ans.n !== 0 && Math.abs(ans.n) <= 40);
    return {
      stem: L(`${M(`\\vec{a}=${pt(p.a, p.b)}`)} va ${M(`\\vec{b}=(${p.c};\\ k)`)} vektorlar ${p.kind === 'col' ? 'kollinear' : 'perpendikulyar'} bo'ladigan ${M('k')} ning qiymatini toping.`, `Найдите значение ${M('k')}, при котором векторы ${M(`\\vec{a}=${pt(p.a, p.b)}`)} и ${M(`\\vec{b}=(${p.c};\\ k)`)} ${p.kind === 'col' ? 'коллинеарны' : 'перпендикулярны'}.`, `${M(`\\vec{a}=${pt(p.a, p.b)}`)} hám ${M(`\\vec{b}=(${p.c};\\ k)`)} vektorları ${p.kind === 'col' ? 'kollinear' : 'perpendikulyar'} bolatuǵın ${M('k')} nıń mánisin tabıń.`, `Find ${M('k')} for which the vectors ${M(`\\vec{a}=${pt(p.a, p.b)}`)} and ${M(`\\vec{b}=(${p.c};\\ k)`)} are ${p.kind === 'col' ? 'collinear' : 'perpendicular'}.`),
      ans,
      neg: true,
      mistakes: p.kind === 'col' ? [frac(-p.b * p.c, p.a), frac(p.a * p.c, p.b), frac(p.a * p.b, p.c), frac(p.b, p.a)] : [frac(p.a * p.c, p.b), frac(-p.b * p.c, p.a), frac(p.b * p.c, p.a), frac(-p.a, p.b)],
      sol: J(M(p.kind === 'col' ? `\\frac{${p.c}}{${p.a}}=\\frac{k}{${p.b}}\\Rightarrow k=${texFrac(ans)}` : `${p.a}\\cdot ${p.c}${p.b < 0 ? '' : '+'}${p.b}k=0\\Rightarrow k=${texFrac(ans)}`.replace('+-', '-')), fin(M(texFrac(ans)))),
      mis: L("Kollinearlik sharti (koordinatalar proporsional) bilan perpendikulyarlik sharti (skalyar ko'paytma nol) ni adashtirish.", 'Путают условие коллинеарности (пропорциональность координат) и перпендикулярности (скалярное произведение равно нулю).', "Kollinearlıq shárti (koordinatalar proporcional) penen perpendikulyarlıq shártin (skalyar kóbeyme nol) shatastırıw.", 'Mixing up collinearity (proportional coordinates) and perpendicularity (dot product zero).'),
    };
  },
);

// --- 120: kesmani berilgan nisbatda bo'lish (L2) ---
G<{ A: [number, number, number]; B: [number, number, number]; m: number; n: number; dim: 2 | 3; coord: 0 | 1 | 2 }>(
  'g2-section-ratio',
  120,
  'L2',
  150,
  (r) => ({ A: [r.int(-8, 8), r.int(-8, 8), r.int(-8, 8)], B: [r.int(-8, 8), r.int(-8, 8), r.int(-8, 8)], m: r.int(1, 4), n: r.int(1, 4), dim: r.pick([2, 3] as const), coord: r.pick([0, 1, 2] as const) }),
  (p) => {
    need(p.m !== p.n && p.A[p.coord] !== p.B[p.coord] && (p.dim === 3 || p.coord < 2));
    const ans = frac(p.n * p.A[p.coord]! + p.m * p.B[p.coord]!, p.m + p.n);
    need(ans.d <= 7 && Math.abs(ans.n) <= 40);
    const name = ['x', 'y', 'z'][p.coord]!;
    const Af = p.dim === 2 ? pt(p.A[0], p.A[1]) : pt3(...p.A);
    const Bf = p.dim === 2 ? pt(p.B[0], p.B[1]) : pt3(...p.B);
    const swap = frac(p.m * p.A[p.coord]! + p.n * p.B[p.coord]!, p.m + p.n);
    const mid = frac(p.A[p.coord]! + p.B[p.coord]!, 2);
    return {
      stem: L(`${M(`A${Af}`)} va ${M(`B${Bf}`)} nuqtalar berilgan. ${M('C')} nuqta ${M('AB')} kesmani ${M('A')} dan boshlab ${M(`${p.m}:${p.n}`)} nisbatda bo'ladi (${M(`AC:CB=${p.m}:${p.n}`)}). ${M('C')} nuqtaning ${M(name)} koordinatasini toping.`, `Даны точки ${M(`A${Af}`)} и ${M(`B${Bf}`)}. Точка ${M('C')} делит отрезок ${M('AB')} в отношении ${M(`AC:CB=${p.m}:${p.n}`)}. Найдите координату ${M(name)} точки ${M('C')}.`, `${M(`A${Af}`)} hám ${M(`B${Bf}`)} noqatları berilgen. ${M('C')} noqat ${M('AB')} kesindini ${M(`AC:CB=${p.m}:${p.n}`)} qatnasında bóledi. ${M('C')} noqatınıń ${M(name)} koordinatasın tabıń.`, `Points ${M(`A${Af}`)} and ${M(`B${Bf}`)} are given. Point ${M('C')} divides ${M('AB')} in the ratio ${M(`AC:CB=${p.m}:${p.n}`)}. Find the ${M(name)}-coordinate of ${M('C')}.`),
      ans,
      neg: true,
      mistakes: [swap, mid, frac(p.m * p.A[p.coord]! - p.n * p.B[p.coord]!, p.m + p.n), frac(p.A[p.coord]! + p.m * (p.B[p.coord]! - p.A[p.coord]!), p.n)],
      sol: J(M(`${name}_{C}=\\frac{${p.n}\\cdot ${p.A[p.coord]}+${p.m}\\cdot ${p.B[p.coord]}}{${p.m + p.n}}=${texFrac(ans)}`.replace('+-', '-')), fin(M(texFrac(ans)))),
      mis: L("Nisbat sonlarini almashtirib qo'yish ($A$ ga yaqin nuqta uchun kichik son $B$ koordinatasiga ko'paytiriladi) yoki o'rta nuqta formulasini olish.", 'Меняют местами числа отношения (меньшее число умножается на координату $B$) либо берут формулу середины.', "Qatnas sanların almastırıp qoyıw (kishi san $B$ koordinatasına kóbeytiledi) yamasa orta noqat formulasın alıw.", 'Swapping the ratio numbers (the smaller multiplies the coordinate of $B$) or using the midpoint formula.'),
    };
  },
);

// --- 118: sfera tenglamasi (L2) ---
G<{ a: number; b: number; c: number; R: number; ask: 'R' | 'sum' | 'r2' }>(
  'g2-sphere-eq',
  118,
  'L2',
  160,
  (r) => ({ a: r.int(-5, 5), b: r.int(-5, 5), c: r.int(-5, 5), R: r.int(2, 9), ask: r.pick(['R', 'sum', 'r2'] as const) }),
  (p) => {
    need(p.a !== 0 && p.b !== 0 && p.c !== 0 && p.a + p.b + p.c !== 0);
    const s = p.a * p.a + p.b * p.b + p.c * p.c - p.R * p.R;
    const term = (v: number, n: string) => `${v === 0 ? '' : v < 0 ? `+${-2 * v}${n}` : `-${2 * v}${n}`}`;
    const eq = `x^{2}+y^{2}+z^{2}${term(p.a, 'x')}${term(p.b, 'y')}${term(p.c, 'z')}${s < 0 ? `-${-s}` : s > 0 ? `+${s}` : ''}=0`;
    const ans = p.ask === 'R' ? p.R : p.ask === 'sum' ? p.a + p.b + p.c : p.R * p.R;
    return {
      stem: L(`${M(eq)} tenglama sferani aniqlaydi. ${p.ask === 'R' ? 'Sfera radiusini' : p.ask === 'sum' ? 'Sfera markazi koordinatalarining yig\'indisini' : 'Sfera radiusining kvadratini'} toping.`, `Уравнение ${M(eq)} задаёт сферу. Найдите ${p.ask === 'R' ? 'радиус сферы' : p.ask === 'sum' ? 'сумму координат центра сферы' : 'квадрат радиуса сферы'}.`, `${M(eq)} teńlemesi sferanı anıqlaydı. ${p.ask === 'R' ? 'Sfera radiusın' : p.ask === 'sum' ? 'Sfera orayı koordinatalarınıń qosındısın' : 'Sfera radiusınıń kvadratın'} tabıń.`, `The equation ${M(eq)} defines a sphere. Find ${p.ask === 'R' ? 'its radius' : p.ask === 'sum' ? 'the sum of the coordinates of its centre' : 'the square of its radius'}.`),
      ans: fI(ans),
      neg: true,
      mistakes: p.ask === 'R' ? [fI(p.R * p.R), fI(Math.round(Math.sqrt(Math.abs(s)))), fI(p.R + 1), fI(Math.abs(p.a) + Math.abs(p.b) + Math.abs(p.c))] : p.ask === 'sum' ? [fI(-(p.a + p.b + p.c)), fI(2 * (p.a + p.b + p.c)), fI(Math.abs(p.a) + Math.abs(p.b) + Math.abs(p.c)), fI(p.a * p.b * p.c)] : [fI(p.R), fI(-s), fI(p.a * p.a + p.b * p.b + p.c * p.c), fI(2 * p.R)],
      sol: J(L("To'la kvadratlarga ajratamiz:", 'Выделяем полные квадраты:', "Tolıq kvadratlarǵa ajıratamız:", 'Complete the squares:'), M(`(x${p.a < 0 ? '+' : '-'}${Math.abs(p.a)})^{2}+(y${p.b < 0 ? '+' : '-'}${Math.abs(p.b)})^{2}+(z${p.c < 0 ? '+' : '-'}${Math.abs(p.c)})^{2}=${p.R * p.R}`), fin(mi(ans))),
      mis: L("Markaz koordinatalarini ishorasi bilan olish (tenglamada $x-a$, markaz $a$) yoki $R^{2}$ o'rniga $R$ ni topish.", 'Путают знак координат центра ($(x-a)^{2}$ — центр $a$) либо принимают $R^{2}$ за $R$.', "Orayı koordinatalarınıń belgisin qáte alıw ($(x-a)^{2}$ — oray $a$) yamasa $R^{2}$ ornına $R$ di tabıw.", 'Wrong sign of the centre coordinates ($(x-a)^{2}$ means centre $a$), or taking $R^{2}$ for $R$.'),
    };
  },
);

// --- 93: fazodagi vektorlar (L2) ---
G<{ q1: number; q2: number; ask: 'cos' | 'perp'; sg: [number, number, number]; m1: number }>(
  'g2-space-vec',
  93,
  'L2',
  180,
  (r) => ({ q1: r.int(0, 6), q2: r.int(0, 6), ask: r.pick(['cos', 'perp'] as const), sg: [r.pick([1, -1]), r.pick([1, -1]), r.pick([1, -1])] as [number, number, number], m1: r.int(1, 6) }),
  (p) => {
    const [a1, a2, a3, na] = QUADS[p.q1]!;
    const [b1, b2, b3, nb] = QUADS[p.q2]!;
    const A: [number, number, number] = [a1 * p.sg[0], a2 * p.sg[1], a3 * p.sg[2]];
    const B: [number, number, number] = [b1, b2 * p.sg[0], b3 * p.sg[1]];
    const dot = A[0] * B[0] + A[1] * B[1] + A[2] * B[2];
    if (p.ask === 'cos') {
      need(dot !== 0 && p.q1 !== p.q2);
      const ans = frac(dot, na * nb);
      need(ans.d <= 200);
      return {
        stem: L(`${M(`\\vec{a}=${pt3(...A)}`)} va ${M(`\\vec{b}=${pt3(...B)}`)} vektorlar orasidagi burchak kosinusini toping.`, `Найдите косинус угла между векторами ${M(`\\vec{a}=${pt3(...A)}`)} и ${M(`\\vec{b}=${pt3(...B)}`)}.`, `${M(`\\vec{a}=${pt3(...A)}`)} hám ${M(`\\vec{b}=${pt3(...B)}`)} vektorları arasındaǵı múyesh kosinusın tabıń.`, `Find the cosine of the angle between ${M(`\\vec{a}=${pt3(...A)}`)} and ${M(`\\vec{b}=${pt3(...B)}`)}.`),
        ans,
        neg: true,
        mistakes: [frac(dot, na + nb), frac(dot, na * nb * na), frac(-dot, na * nb), frac(dot, 1)].filter((f) => Math.abs(fNum(f)) <= 1 || true),
        sol: J(M(`\\cos\\varphi=\\frac{\\vec{a}\\cdot\\vec{b}}{|\\vec{a}||\\vec{b}|}=\\frac{${dot}}{${na}\\cdot ${nb}}=${texFrac(ans)}`), fin(M(texFrac(ans)))),
        mis: L("Uzunliklar ko'paytmasi o'rniga yig'indisini olish yoki skalyar ko'paytmada ishorani adashtirish.", 'Берут сумму длин вместо произведения либо ошибаются в знаке скалярного произведения.', "Uzınlıqlar kóbeymesi ornına qosındısın alıw yamasa skalyar kóbeymede belgini shatastırıw.", 'Using the sum of lengths instead of the product, or a sign slip in the dot product.'),
      };
    }
    const x = A[0];
    const y = A[1];
    const z = A[2];
    need(z !== 0 && p.m1 !== 0);
    const ans = frac(-(x * p.m1 + y * p.m1 * 2), z);
    need(ans.d <= 3 && ans.n !== 0 && Math.abs(ans.n) <= 40);
    return {
      stem: L(`${M(`\\vec{a}=${pt3(x, y, z)}`)} va ${M(`\\vec{b}=(${p.m1};\\ ${2 * p.m1};\\ k)`)} vektorlar perpendikulyar bo'ladigan ${M('k')} ni toping.`, `Найдите ${M('k')}, при котором векторы ${M(`\\vec{a}=${pt3(x, y, z)}`)} и ${M(`\\vec{b}=(${p.m1};\\ ${2 * p.m1};\\ k)`)} перпендикулярны.`, `${M(`\\vec{a}=${pt3(x, y, z)}`)} hám ${M(`\\vec{b}=(${p.m1};\\ ${2 * p.m1};\\ k)`)} vektorları perpendikulyar bolatuǵın ${M('k')} nı tabıń.`, `Find ${M('k')} for which ${M(`\\vec{a}=${pt3(x, y, z)}`)} and ${M(`\\vec{b}=(${p.m1};\\ ${2 * p.m1};\\ k)`)} are perpendicular.`),
      ans,
      neg: true,
      mistakes: [frac(x * p.m1 + y * p.m1 * 2, z), frac(-(x + 2 * y), 1), frac(z, x * p.m1 + y * p.m1 * 2), frac(-(x * p.m1 + y * p.m1 * 2), 1)],
      sol: J(M(`${x}\\cdot ${p.m1}+${y}\\cdot ${2 * p.m1}+${z}k=0\\Rightarrow k=${texFrac(ans)}`.replace('+-', '-')), fin(M(texFrac(ans)))),
      mis: L("Perpendikulyarlik shartida skalyar ko'paytmani nolga tenglash o'rniga koordinatalarni proporsional deb olish.", 'Вместо равенства скалярного произведения нулю используют пропорциональность координат.', "Perpendikulyarlıq shártinde skalyar kóbeymeni nolge teńlew ornına koordinatalardı proporcional dep alıw.", 'Using proportional coordinates instead of setting the dot product to zero.'),
    };
  },
);

export const GEOMETRY2_TEMPLATES: ExtraTemplate[] = ALL;
