import { G, HINT_NUM } from './geometriya-plan-glossary';
import { frac, keyForms, makeRng, slotRng, texFrac, texParen, y1Options, type Frac, type L10n, type Rng } from './helpers';
import { ACCENT, lerp, polar, pt, scene, wrapSvg } from './svg';
import type { BlockGenerator, Lang, LocalizedContent, SlotRequest } from './types';

// Geometriya: PLANIMETRIYA qismi (mavzular 67–82). Faqat index juft bo'lgan so'rovlarga javob beradi.
// Barcha parametrlar build() ichida (content() tashqarisida) bir marta hisoblanadi; tillar faqat matnni farqlaydi.

const sr = String.raw;
const L = (uz: string, ru: string, kaa: string, en: string): L10n => ({ uz, ru, kaa, en });
const P = (...paras: string[]): string => paras.join('\n\n');
const num = (n: number): string => String(Math.round(n * 100) / 100);
const m$ = (s: string | number): string => `$${s}$`;
const N$ = (n: number): string => m$(num(n));
const tp = texParen;

function texSqrt(n: number): string {
  let k = 1;
  let rest = n;
  for (let f = 2; f * f <= rest; f++) {
    while (rest % (f * f) === 0) {
      rest /= f * f;
      k *= f;
    }
  }
  if (rest === 1) return String(k);
  return k === 1 ? `\\sqrt{${rest}}` : `${k}\\sqrt{${rest}}`;
}

const isqrt = (n: number): number => {
  const s = Math.round(Math.sqrt(n));
  if (s * s !== n) throw new Error(`${n} to'liq kvadrat emas`);
  return s;
};

// --- Tuzilma ---

interface Fig {
  svg: string;
  alt: L10n;
}

interface Built {
  key: unknown;
  extraTopics?: number[];
  content: (lang: Lang) => LocalizedContent;
}

interface Ctx {
  req: SlotRequest;
  rng: Rng;
  /** Shablonning shu variantdagi navbatiga mos parametrlar to'plami (variantlar bo'yicha takrorlanmaydi) */
  pick: <T>(cases: readonly T[]) => T;
}

interface Template {
  topic: number;
  est: number;
  build: (c: Ctx) => Built;
}

const figOf = (f: Fig | undefined, lang: Lang) => (f ? { figure: { svg: f.svg, alt: f.alt[lang] } } : {});

interface Y1Def {
  stem: L10n;
  figure?: Fig;
  correct: string;
  wrongs: string[];
  solution: L10n;
  mistake: L10n;
  extraTopics?: number[];
}

function y1(c: Ctx, d: Y1Def): Built {
  const b = y1Options(d.correct, d.wrongs, c.rng);
  return {
    key: { correct: b.correct },
    extraTopics: d.extraTopics,
    content: (lang) => ({
      stem_md: d.stem[lang],
      payload: { options: b.options, ...figOf(d.figure, lang) },
      solution_md: d.solution[lang],
      mistake_note_md: d.mistake[lang],
    }),
  };
}

interface Y2Def {
  stem: L10n;
  figure?: Fig;
  /** 3 ta band: matn va to'g'ri qiymat (til-neytral variant matni) */
  items: { text: L10n; value: string }[];
  /** Kamida 3 ta chalg'ituvchi variant matni (to'g'ri qiymatlardan farqli) */
  distractors: string[];
  solution: L10n;
  mistake: L10n;
  extraTopics?: number[];
}

function y2(c: Ctx, d: Y2Def): Built {
  const right = d.items.map((i) => i.value);
  const extra = [...new Set(d.distractors)].filter((v) => !right.includes(v)).slice(0, 6 - right.length);
  if (new Set(right).size !== right.length || extra.length < 6 - right.length) throw new Error('y2: variantlar noyob emas');
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
  const shuffled = c.rng.shuffle([...right, ...extra]);
  const options: Record<string, string> = {};
  shuffled.forEach((v, i) => (options[letters[i]!] = v));
  const pairs: Record<string, string> = {};
  d.items.forEach((it, i) => (pairs[String(i + 1)] = letters[shuffled.indexOf(it.value)]!));
  return {
    key: { pairs },
    extraTopics: d.extraTopics,
    content: (lang) => ({
      stem_md: d.stem[lang],
      payload: { options, items: d.items.map((it, i) => ({ id: String(i + 1), text_md: it.text[lang] })), ...figOf(d.figure, lang) },
      solution_md: d.solution[lang],
      mistake_note_md: d.mistake[lang],
    }),
  };
}

interface PartDef {
  prompt: L10n;
  answer: Frac;
}

interface ODef {
  stem: L10n;
  figure?: Fig;
  a?: PartDef;
  b?: PartDef;
  solution: L10n;
  mistake: L10n;
  extraTopics?: number[];
}

function open(d: ODef): Built {
  const part = (p: PartDef | undefined, lang: Lang) => (p ? { prompt_md: p.prompt[lang], hint: HINT_NUM[lang] } : undefined);
  return {
    key: { ...(d.a ? { a: keyForms(d.a.answer) } : {}), ...(d.b ? { b: keyForms(d.b.answer) } : {}) },
    extraTopics: d.extraTopics,
    content: (lang) => ({
      stem_md: d.stem[lang],
      payload: { parts: { ...(d.a ? { a: part(d.a, lang) } : {}), ...(d.b ? { b: part(d.b, lang) } : {}) }, ...figOf(d.figure, lang) },
      solution_md: d.solution[lang],
      mistake_note_md: d.mistake[lang],
    }),
  };
}

/** Pool dan: to'g'ri qiymatlardan farqli, o'zaro noyob n ta qiymatni matn sifatida oladi. */
function distinctFrom(pool: readonly number[], exclude: readonly number[], fmt: (n: number) => string): string[] {
  const seen = new Set(exclude.map(fmt));
  const out: string[] = [];
  for (const v of pool) {
    if (!Number.isFinite(v) || v <= 0) continue;
    const s = fmt(v);
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

// =====================================================================================
// Y-1, L2 shablonlari
// =====================================================================================

// 1) Romb: diagonallar -> perimetr (74)
const RHOMBUS: readonly (readonly [number, number])[] = [[12, 16], [10, 24], [16, 30], [24, 32], [18, 24], [30, 40], [30, 16], [14, 48]];

const y1Rhombus: Template = {
  topic: 74,
  est: 100,
  build(c) {
    const [d1, d2] = c.pick(RHOMBUS);
    const p = d1 / 2;
    const q = d2 / 2;
    const s = isqrt(p * p + q * q);
    const perim = 4 * s;
    const A = pt(-p, 0);
    const B = pt(0, q);
    const C = pt(p, 0);
    const D = pt(0, -q);
    const O = pt(0, 0);
    const sc = scene([A, B, C, D]);
    const svg = wrapSvg(
      sc.poly([A, B, C, D]),
      sc.seg(A, C, { dash: true }),
      sc.seg(B, D, { dash: true }),
      sc.rightAngle(O, C, B),
      sc.label(A, 'A'),
      sc.label(B, 'B'),
      sc.label(C, 'C'),
      sc.label(D, 'D'),
      sc.mark(A, C, String(d1), D, 0.27),
      sc.mark(B, D, String(d2), A, 0.27),
    );
    return y1(c, {
      stem: L(
        sr`$ABCD$ rombning diagonallari $${d1}$ sm va $${d2}$ sm. Rombning perimetrini (sm da) toping.`,
        sr`Диагонали ромба $ABCD$ равны $${d1}$ см и $${d2}$ см. Найдите периметр ромба (в см).`,
        sr`$ABCD$ rombınıń diagonalları $${d1}$ sm hám $${d2}$ sm. Rombtıń perimetrin (sm de) tabıń.`,
        sr`The diagonals of rhombus $ABCD$ are $${d1}$ cm and $${d2}$ cm. Find the perimeter of the rhombus (in cm).`,
      ),
      figure: {
        svg,
        alt: L(
          `Romb ABCD, diagonallari AC = ${d1} va BD = ${d2}, ular perpendikulyar kesishadi.`,
          `Ромб ABCD, диагонали AC = ${d1} и BD = ${d2} пересекаются под прямым углом.`,
          `Romb ABCD, diagonalları AC = ${d1} hám BD = ${d2} tuwrı múyesh astında kesiledi.`,
          `Rhombus ABCD with perpendicular diagonals AC = ${d1} and BD = ${d2}.`,
        ),
      },
      correct: m$(perim),
      wrongs: [2 * (d1 + d2), 8 * s, s, 2 * s].map(N$),
      solution: L(
        P(
          sr`Romb diagonallari o'zaro perpendikulyar va kesishish nuqtasida teng ikkiga bo'linadi. Shuning uchun romb tomoni katetlari $${p}$ va $${q}$ bo'lgan to'g'ri burchakli uchburchakning gipotenuzasi bo'ladi.`,
          sr`$a=\sqrt{${p}^2+${q}^2}=\sqrt{${p * p + q * q}}=${s}$.`,
          sr`Perimetr: $P=4a=4\cdot ${s}=${perim}$ sm.`,
        ),
        P(
          sr`Диагонали ромба взаимно перпендикулярны и точкой пересечения делятся пополам. Поэтому сторона ромба — гипотенуза прямоугольного треугольника с катетами $${p}$ и $${q}$.`,
          sr`$a=\sqrt{${p}^2+${q}^2}=\sqrt{${p * p + q * q}}=${s}$.`,
          sr`Периметр: $P=4a=4\cdot ${s}=${perim}$ см.`,
        ),
        P(
          sr`Romb diagonalları óz ara perpendikulyar hám kesilisiw noqatında teń ekige bólinedi. Sonıń ushın romb tárepi katetleri $${p}$ hám $${q}$ bolǵan tuwrımúyeshli úshmúyeshliktiń gipotenuzası boladı.`,
          sr`$a=\sqrt{${p}^2+${q}^2}=\sqrt{${p * p + q * q}}=${s}$.`,
          sr`Perimetr: $P=4a=4\cdot ${s}=${perim}$ sm.`,
        ),
        P(
          sr`The diagonals of a rhombus are perpendicular and bisect each other. So the side of the rhombus is the hypotenuse of a right triangle with legs $${p}$ and $${q}$.`,
          sr`$a=\sqrt{${p}^2+${q}^2}=\sqrt{${p * p + q * q}}=${s}$.`,
          sr`Perimeter: $P=4a=4\cdot ${s}=${perim}$ cm.`,
        ),
      ),
      mistake: L(
        sr`Yarim diagonallar o'rniga butun diagonallarni Pifagor formulasiga qo'yish yoki tomonni topgach uni $4$ ga ko'paytirishni unutish.`,
        sr`Подставляют в теорему Пифагора целые диагонали вместо их половин или забывают умножить найденную сторону на $4$.`,
        sr`Yarım diagonallar ornına pútin diagonallardı Pifagor formulasına qoyıw yamasa tárepti tapqannan keyin $4$ ke kóbeytiwdi umıtıw.`,
        sr`Using the full diagonals instead of their halves in the Pythagorean theorem, or forgetting to multiply the side by $4$.`,
      ),
    });
  },
};

// 2) Teng yonli trapetsiya: asoslar va yon tomon -> yuza (76)
const TRAP_CASES: readonly (readonly [number, number])[] = [[1, 5], [2, 4], [1, 8], [3, 6], [2, 7], [1, 10], [3, 9]];

const y1IsoTrapezoid: Template = {
  topic: 76,
  est: 120,
  build(c) {
    const [k, b] = c.pick(TRAP_CASES);
    const a = b + 6 * k;
    const leg = 5 * k;
    const h = 4 * k;
    const area = ((a + b) / 2) * h;
    const A = pt(-a / 2, 0);
    const D = pt(a / 2, 0);
    const B = pt(-b / 2, h);
    const C = pt(b / 2, h);
    const H = pt(-b / 2, 0);
    const sc = scene([A, B, C, D]);
    const svg = wrapSvg(
      sc.poly([A, B, C, D]),
      sc.seg(B, H, { dash: true }),
      sc.rightAngle(H, B, D),
      sc.label(A, 'A'),
      sc.label(B, 'B'),
      sc.label(C, 'C'),
      sc.label(D, 'D'),
      sc.label(H, 'H', pt(-b / 2, h), 13, 14),
      sc.mark(B, C, String(b)),
      sc.mark(A, D, String(a)),
      sc.mark(A, B, String(leg)),
    );
    return y1(c, {
      stem: L(
        sr`Teng yonli $ABCD$ trapetsiyaning asoslari $BC=${b}$ sm va $AD=${a}$ sm, yon tomoni $AB=${leg}$ sm. Trapetsiyaning yuzini (sm² da) toping.`,
        sr`Основания равнобедренной трапеции $ABCD$ равны $BC=${b}$ см и $AD=${a}$ см, боковая сторона $AB=${leg}$ см. Найдите площадь трапеции (в см²).`,
        sr`Teń jambaslı $ABCD$ trapeciyanıń tiykarları $BC=${b}$ sm hám $AD=${a}$ sm, jan tárepi $AB=${leg}$ sm. Trapeciyanıń maydanın (sm² de) tabıń.`, // kaa: tekshirilsin (teń jambaslı, jan tárep)
        sr`The bases of isosceles trapezoid $ABCD$ are $BC=${b}$ cm and $AD=${a}$ cm, and its leg is $AB=${leg}$ cm. Find the area of the trapezoid (in cm²).`,
      ),
      figure: {
        svg,
        alt: L(
          `Teng yonli ABCD trapetsiya: BC = ${b} yuqori asos, AD = ${a} pastki asos, AB = ${leg} yon tomon; B uchidan AD ga BH balandlik tushirilgan.`,
          `Равнобедренная трапеция ABCD: верхнее основание BC = ${b}, нижнее AD = ${a}, боковая сторона AB = ${leg}; из вершины B проведена высота BH к AD.`,
          `Teń jambaslı ABCD trapeciya: joqarǵı tiykar BC = ${b}, tómengi tiykar AD = ${a}, jan tárep AB = ${leg}; B túyininen AD ǵa BH biyikligi túsirilgen.`,
          `Isosceles trapezoid ABCD with top base BC = ${b}, bottom base AD = ${a}, leg AB = ${leg}; the altitude BH is drawn to AD.`,
        ),
      },
      correct: m$(area),
      wrongs: [((a + b) / 2) * leg, (a + b) * h, a * h, b * h].map(N$),
      solution: L(
        P(
          sr`$B$ uchidan balandlik tushiramiz: $BH\perp AD$. Teng yonli trapetsiyada $AH=\dfrac{AD-BC}{2}=\dfrac{${a}-${b}}{2}=${3 * k}$.`,
          sr`To'g'ri burchakli $ABH$ uchburchakdan: $BH=\sqrt{AB^2-AH^2}=\sqrt{${leg}^2-${3 * k}^2}=${h}$.`,
          sr`Yuza: $S=\dfrac{BC+AD}{2}\cdot BH=\dfrac{${b}+${a}}{2}\cdot ${h}=${area}$ sm².`,
        ),
        P(
          sr`Из вершины $B$ опустим высоту $BH\perp AD$. В равнобедренной трапеции $AH=\dfrac{AD-BC}{2}=\dfrac{${a}-${b}}{2}=${3 * k}$.`,
          sr`Из прямоугольного треугольника $ABH$: $BH=\sqrt{AB^2-AH^2}=\sqrt{${leg}^2-${3 * k}^2}=${h}$.`,
          sr`Площадь: $S=\dfrac{BC+AD}{2}\cdot BH=\dfrac{${b}+${a}}{2}\cdot ${h}=${area}$ см².`,
        ),
        P(
          sr`$B$ túyininen biyiklik túsiremiz: $BH\perp AD$. Teń jambaslı trapeciyada $AH=\dfrac{AD-BC}{2}=\dfrac{${a}-${b}}{2}=${3 * k}$.`,
          sr`Tuwrımúyeshli $ABH$ úshmúyeshlikten: $BH=\sqrt{AB^2-AH^2}=\sqrt{${leg}^2-${3 * k}^2}=${h}$.`,
          sr`Maydan: $S=\dfrac{BC+AD}{2}\cdot BH=\dfrac{${b}+${a}}{2}\cdot ${h}=${area}$ sm².`,
        ),
        P(
          sr`Draw the altitude $BH\perp AD$ from $B$. In an isosceles trapezoid $AH=\dfrac{AD-BC}{2}=\dfrac{${a}-${b}}{2}=${3 * k}$.`,
          sr`From right triangle $ABH$: $BH=\sqrt{AB^2-AH^2}=\sqrt{${leg}^2-${3 * k}^2}=${h}$.`,
          sr`Area: $S=\dfrac{BC+AD}{2}\cdot BH=\dfrac{${b}+${a}}{2}\cdot ${h}=${area}$ cm².`,
        ),
      ),
      mistake: L(
        sr`Balandlik o'rniga yon tomonni ishlatish ($S=\dfrac{BC+AD}{2}\cdot AB$) yoki yuzni hisoblashda $\dfrac12$ ni unutish.`,
        sr`Используют боковую сторону вместо высоты ($S=\dfrac{BC+AD}{2}\cdot AB$) или забывают множитель $\dfrac12$.`,
        sr`Biyiklik ornına jan tárepti paydalanıw ($S=\dfrac{BC+AD}{2}\cdot AB$) yamasa maydandı esaplawda $\dfrac12$ ni umıtıw.`,
        sr`Using the leg instead of the altitude ($S=\dfrac{BC+AD}{2}\cdot AB$) or forgetting the factor $\dfrac12$.`,
      ),
    });
  },
};

// 3) Urinmalar: PA + PB (79)
const TANGENT_CASES: readonly (readonly [number, number, number])[] = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [6, 8, 10], [9, 12, 15], [12, 16, 20], [10, 24, 26], [15, 20, 25]];

const y1Tangents: Template = {
  topic: 79,
  est: 110,
  build(c) {
    const [r, pa, d] = c.pick(TANGENT_CASES);
    const O = pt(0, 0);
    const Pp = pt(d, 0);
    const A = pt((r * r) / d, (r * pa) / d);
    const B = pt((r * r) / d, -(r * pa) / d);
    const sc = scene([O, Pp, A, B], { circles: [{ c: O, r }] });
    const svg = wrapSvg(
      sc.circle(O, r),
      sc.seg(Pp, A),
      sc.seg(Pp, B),
      sc.seg(O, A, { dash: true }),
      sc.seg(O, B, { dash: true }),
      sc.seg(O, Pp, { dash: true }),
      sc.rightAngle(A, O, Pp),
      sc.rightAngle(B, O, Pp),
      sc.dot(O),
      sc.label(O, 'O', Pp, 14),
      sc.label(Pp, 'P', O),
      sc.label(A, 'A', O),
      sc.label(B, 'B', O),
      sc.mark(O, A, String(r), B, 0.45),
      sc.mark(O, Pp, String(d), A, 0.78),
    );
    return y1(c, {
      stem: L(
        sr`$O$ markazli aylananing radiusi $${r}$ sm. Aylanadan tashqaridagi $P$ nuqtadan aylanaga $PA$ va $PB$ urinmalar o'tkazilgan ($A$ va $B$ — urinish nuqtalari), $OP=${d}$ sm. $PA+PB$ yig'indini (sm da) toping.`,
        sr`Радиус окружности с центром $O$ равен $${r}$ см. Из точки $P$ вне окружности проведены касательные $PA$ и $PB$ ($A$ и $B$ — точки касания), $OP=${d}$ см. Найдите сумму $PA+PB$ (в см).`,
        sr`Orayı $O$ bolǵan sheńberdiń radiusı $${r}$ sm. Sheńberden sırttaǵı $P$ noqattan sheńberge $PA$ hám $PB$ urınbaları júrgizilgen ($A$ hám $B$ — urınıw noqatları), $OP=${d}$ sm. $PA+PB$ jıyındısın (sm de) tabıń.`,
        sr`The circle with center $O$ has radius $${r}$ cm. From a point $P$ outside the circle the tangents $PA$ and $PB$ are drawn ($A$ and $B$ are the points of tangency), $OP=${d}$ cm. Find $PA+PB$ (in cm).`,
      ),
      figure: {
        svg,
        alt: L(
          `O markazli aylana, tashqaridagi P nuqtadan PA va PB urinmalar; radius ${r}, OP = ${d}.`,
          `Окружность с центром O, из внешней точки P проведены касательные PA и PB; радиус ${r}, OP = ${d}.`,
          `Orayı O bolǵan sheńber, sırttaǵı P noqattan PA hám PB urınbaları; radius ${r}, OP = ${d}.`,
          `Circle with center O and tangents PA and PB from the outside point P; radius ${r}, OP = ${d}.`,
        ),
      },
      correct: m$(2 * pa),
      wrongs: [pa, 2 * (d - r), pa * pa, d + pa].map(N$),
      solution: L(
        P(
          sr`Urinma urinish nuqtasiga o'tkazilgan radiusga perpendikulyar: $OA\perp PA$. To'g'ri burchakli $OAP$ uchburchakdan $PA=\sqrt{OP^2-OA^2}=\sqrt{${d}^2-${r}^2}=${pa}$.`,
          sr`Tashqi nuqtadan o'tkazilgan urinma kesmalari teng: $PB=PA=${pa}$.`,
          sr`Demak, $PA+PB=${2 * pa}$ sm.`,
        ),
        P(
          sr`Касательная перпендикулярна радиусу, проведённому в точку касания: $OA\perp PA$. Из прямоугольного треугольника $OAP$: $PA=\sqrt{OP^2-OA^2}=\sqrt{${d}^2-${r}^2}=${pa}$.`,
          sr`Отрезки касательных, проведённых из одной точки, равны: $PB=PA=${pa}$.`,
          sr`Значит, $PA+PB=${2 * pa}$ см.`,
        ),
        P(
          sr`Urınba urınıw noqatına júrgizilgen radiusqa perpendikulyar: $OA\perp PA$. Tuwrımúyeshli $OAP$ úshmúyeshlikten $PA=\sqrt{OP^2-OA^2}=\sqrt{${d}^2-${r}^2}=${pa}$.`,
          sr`Sırtqı noqattan júrgizilgen urınba kesindileri teń: $PB=PA=${pa}$.`,
          sr`Demek, $PA+PB=${2 * pa}$ sm.`,
        ),
        P(
          sr`A tangent is perpendicular to the radius at the point of tangency: $OA\perp PA$. From right triangle $OAP$: $PA=\sqrt{OP^2-OA^2}=\sqrt{${d}^2-${r}^2}=${pa}$.`,
          sr`Tangent segments drawn from one point are equal: $PB=PA=${pa}$.`,
          sr`So $PA+PB=${2 * pa}$ cm.`,
        ),
      ),
      mistake: L(
        sr`Faqat bitta urinma kesmasini topib, ikkinchisini qo'shishni unutish yoki $PA=OP-OA$ deb olish (Pifagor teoremasi kerak).`,
        sr`Находят только один отрезок касательной и забывают второй, либо считают $PA=OP-OA$ (нужна теорема Пифагора).`,
        sr`Tek bir urınba kesindisin tabıp, ekinshisin qosıwdı umıtıw yamasa $PA=OP-OA$ dep alıw (Pifagor teoreması kerek).`,
        sr`Finding only one tangent segment and forgetting the second, or taking $PA=OP-OA$ (the Pythagorean theorem is needed).`,
      ),
    });
  },
};

// 4) Kosinuslar teoremasi, 60 va 120 gradus (71)
const COS_CASES: readonly (readonly [number, number, 60 | 120])[] = [[3, 8, 60], [5, 8, 60], [8, 15, 60], [7, 15, 60], [5, 21, 60], [16, 21, 60], [3, 5, 120], [5, 16, 120], [7, 8, 120], [6, 10, 120], [14, 16, 120]];

const y1Cosines: Template = {
  topic: 71,
  est: 120,
  build(c) {
    const [a, b, g] = c.pick(COS_CASES);
    const ab = a * b;
    const c2 = g === 60 ? a * a + b * b - ab : a * a + b * b + ab;
    const side = isqrt(c2);
    const wrongC2 = g === 60 ? a * a + b * b + ab : a * a + b * b - ab;
    const sign = g === 60 ? '-' : '+';
    const A = pt(0, 0);
    const B = pt(a, 0);
    const C = pt(b * Math.cos((g * Math.PI) / 180), b * Math.sin((g * Math.PI) / 180));
    const sc = scene([A, B, C]);
    const svg = wrapSvg(
      sc.poly([A, B, C]),
      sc.angle(A, B, C, `${g}°`, 20),
      sc.label(A, 'A'),
      sc.label(B, 'B'),
      sc.label(C, 'C'),
      sc.mark(A, B, String(a)),
      sc.mark(A, C, String(b)),
    );
    return y1(c, {
      stem: L(
        sr`$ABC$ uchburchakda $AB=${a}$ sm, $AC=${b}$ sm va $\angle BAC=${g}^{\circ}$. $BC$ tomonning uzunligini (sm da) toping.`,
        sr`В треугольнике $ABC$ известно: $AB=${a}$ см, $AC=${b}$ см, $\angle BAC=${g}^{\circ}$. Найдите длину стороны $BC$ (в см).`,
        sr`$ABC$ úshmúyeshlikte $AB=${a}$ sm, $AC=${b}$ sm hám $\angle BAC=${g}^{\circ}$. $BC$ táreptiń uzınlıǵın (sm de) tabıń.`,
        sr`In triangle $ABC$, $AB=${a}$ cm, $AC=${b}$ cm and $\angle BAC=${g}^{\circ}$. Find the length of side $BC$ (in cm).`,
      ),
      figure: {
        svg,
        alt: L(
          `ABC uchburchak: AB = ${a}, AC = ${b}, A uchidagi burchak ${g} gradus.`,
          `Треугольник ABC: AB = ${a}, AC = ${b}, угол при вершине A равен ${g} градусов.`,
          `ABC úshmúyeshlik: AB = ${a}, AC = ${b}, A túyinindegi múyesh ${g} gradus.`,
          `Triangle ABC with AB = ${a}, AC = ${b} and the angle at A equal to ${g} degrees.`,
        ),
      },
      correct: m$(side),
      wrongs: [a + b, Math.abs(a - b), texSqrt(a * a + b * b), texSqrt(wrongC2)].map((v) => m$(v)),
      solution: L(
        P(
          sr`Kosinuslar teoremasi: $BC^2=AB^2+AC^2-2\cdot AB\cdot AC\cdot\cos A$.`,
          sr`$\cos ${g}^{\circ}=${g === 60 ? '' : '-'}\dfrac12$, shuning uchun $BC^2=${a * a}+${b * b}${sign}${ab}=${c2}$.`,
          sr`$BC=\sqrt{${c2}}=${side}$ sm.`,
        ),
        P(
          sr`Теорема косинусов: $BC^2=AB^2+AC^2-2\cdot AB\cdot AC\cdot\cos A$.`,
          sr`$\cos ${g}^{\circ}=${g === 60 ? '' : '-'}\dfrac12$, поэтому $BC^2=${a * a}+${b * b}${sign}${ab}=${c2}$.`,
          sr`$BC=\sqrt{${c2}}=${side}$ см.`,
        ),
        P(
          sr`Kosinuslar teoreması: $BC^2=AB^2+AC^2-2\cdot AB\cdot AC\cdot\cos A$.`,
          sr`$\cos ${g}^{\circ}=${g === 60 ? '' : '-'}\dfrac12$, sonlıqtan $BC^2=${a * a}+${b * b}${sign}${ab}=${c2}$.`,
          sr`$BC=\sqrt{${c2}}=${side}$ sm.`,
        ),
        P(
          sr`Law of cosines: $BC^2=AB^2+AC^2-2\cdot AB\cdot AC\cdot\cos A$.`,
          sr`$\cos ${g}^{\circ}=${g === 60 ? '' : '-'}\dfrac12$, so $BC^2=${a * a}+${b * b}${sign}${ab}=${c2}$.`,
          sr`$BC=\sqrt{${c2}}=${side}$ cm.`,
        ),
      ),
      mistake: L(
        sr`Pifagor teoremasini qo'llash ($BC^2=AB^2+AC^2$) yoki $\cos 120^{\circ}$ ning ishorasini adashtirish: $-\dfrac12$ bo'lgani uchun $-2ab\cos A=+ab$ bo'ladi.`,
        sr`Применяют теорему Пифагора ($BC^2=AB^2+AC^2$) или путают знак $\cos 120^{\circ}$: он равен $-\dfrac12$, поэтому $-2ab\cos A=+ab$.`,
        sr`Pifagor teoremasın qollanıw ($BC^2=AB^2+AC^2$) yamasa $\cos 120^{\circ}$ tıń belgisin shatastırıw: ol $-\dfrac12$, sonlıqtan $-2ab\cos A=+ab$ boladı.`,
        sr`Applying the Pythagorean theorem ($BC^2=AB^2+AC^2$) or mixing up the sign of $\cos 120^{\circ}$: it is $-\dfrac12$, so $-2ab\cos A=+ab$.`,
      ),
    });
  },
};

// 5) Muntazam ko'pburchak: ichki burchak -> diagonallar soni (77)
const POLY_N: readonly number[] = [8, 9, 10, 12, 15, 18, 20];

const y1Polygon: Template = {
  topic: 77,
  est: 100,
  build(c) {
    const n = c.pick(POLY_N);
    const ang = ((n - 2) * 180) / n;
    const ext = 180 - ang;
    const diag = (n * (n - 3)) / 2;
    return y1(c, {
      stem: L(
        sr`Muntazam ko'pburchakning har bir ichki burchagi $${ang}^{\circ}$ ga teng. Bu ko'pburchakning diagonallari sonini toping.`,
        sr`Каждый внутренний угол правильного многоугольника равен $${ang}^{\circ}$. Найдите число диагоналей этого многоугольника.`,
        sr`Muntazam kópmúyeshliktiń hár bir ishki múyeshi $${ang}^{\circ}$ qa teń. Usı kópmúyeshliktiń diagonalları sanın tabıń.`, // kaa: tekshirilsin (kópmúyeshlik)
        sr`Each interior angle of a regular polygon equals $${ang}^{\circ}$. Find the number of diagonals of this polygon.`,
      ),
      correct: m$(diag),
      wrongs: [n * (n - 3), (n * (n - 1)) / 2, n, diag + n].map(N$),
      solution: L(
        P(
          sr`Tashqi burchak: $180^{\circ}-${ang}^{\circ}=${ext}^{\circ}$. Muntazam ko'pburchak tashqi burchaklarining yig'indisi $360^{\circ}$ bo'lgani uchun tomonlar soni $n=\dfrac{360}{${ext}}=${n}$.`,
          sr`Diagonallar soni: $\dfrac{n(n-3)}{2}=\dfrac{${n}\cdot ${n - 3}}{2}=${diag}$.`,
        ),
        P(
          sr`Внешний угол: $180^{\circ}-${ang}^{\circ}=${ext}^{\circ}$. Сумма внешних углов правильного многоугольника равна $360^{\circ}$, поэтому число сторон $n=\dfrac{360}{${ext}}=${n}$.`,
          sr`Число диагоналей: $\dfrac{n(n-3)}{2}=\dfrac{${n}\cdot ${n - 3}}{2}=${diag}$.`,
        ),
        P(
          sr`Sırtqı múyesh: $180^{\circ}-${ang}^{\circ}=${ext}^{\circ}$. Muntazam kópmúyeshlik sırtqı múyeshleriniń jıyındısı $360^{\circ}$ bolǵanı ushın táreplar sanı $n=\dfrac{360}{${ext}}=${n}$.`,
          sr`Diagonallar sanı: $\dfrac{n(n-3)}{2}=\dfrac{${n}\cdot ${n - 3}}{2}=${diag}$.`,
        ),
        P(
          sr`Exterior angle: $180^{\circ}-${ang}^{\circ}=${ext}^{\circ}$. The exterior angles of a regular polygon add up to $360^{\circ}$, so the number of sides is $n=\dfrac{360}{${ext}}=${n}$.`,
          sr`Number of diagonals: $\dfrac{n(n-3)}{2}=\dfrac{${n}\cdot ${n - 3}}{2}=${diag}$.`,
        ),
      ),
      mistake: L(
        sr`Diagonallar sonini $n(n-3)$ deb olib, ikkiga bo'lishni unutish (har bir diagonal ikki marta sanaladi) yoki barcha kesmalar sonini $\dfrac{n(n-1)}{2}$ olish.`,
        sr`Берут $n(n-3)$ и забывают разделить на два (каждая диагональ посчитана дважды) либо берут число всех отрезков $\dfrac{n(n-1)}{2}$.`,
        sr`Diagonallar sanın $n(n-3)$ dep alıp, ekige bóliwdi umıtıw (hár bir diagonal eki ret sanaladı) yamasa barlıq kesindiler sanın $\dfrac{n(n-1)}{2}$ alıw.`,
        sr`Taking $n(n-3)$ and forgetting to divide by two (each diagonal is counted twice), or using the number of all segments $\dfrac{n(n-1)}{2}$.`,
      ),
    });
  },
};

// 6) Koordinatalar: o'rta nuqta va kesma uzunligi (81)
const COORD_CASES: readonly (readonly [number, number, number, number])[] = [
  [-1, 2, 3, 4],
  [2, -3, 4, -3],
  [0, 1, -5, 12],
  [-4, -2, 12, 5],
  [3, 5, 6, 8],
  [-2, 4, -8, 6],
  [1, -1, 8, 15],
  [-3, 0, -15, 8],
];

const y1Coords: Template = {
  topic: 81,
  est: 110,
  build(c) {
    const [ax, ay, hx, hy] = c.pick(COORD_CASES);
    const mx = ax + hx;
    const my = ay + hy;
    const bx = ax + 2 * hx;
    const by = ay + 2 * hy;
    const dx = bx - ax;
    const dy = by - ay;
    const len = isqrt(dx * dx + dy * dy);
    return y1(c, {
      stem: L(
        sr`$AB$ kesmaning o'rtasi $M(${mx};${my})$, $A$ nuqta esa $(${ax};${ay})$ koordinatalarga ega. $AB$ kesmaning uzunligini toping.`,
        sr`Середина отрезка $AB$ — точка $M(${mx};${my})$, а точка $A$ имеет координаты $(${ax};${ay})$. Найдите длину отрезка $AB$.`,
        sr`$AB$ kesindiniń ortası $M(${mx};${my})$, al $A$ noqattıń koordinataları $(${ax};${ay})$. $AB$ kesindiniń uzınlıǵın tabıń.`,
        sr`The midpoint of segment $AB$ is $M(${mx};${my})$ and the point $A$ has coordinates $(${ax};${ay})$. Find the length of segment $AB$.`,
      ),
      correct: m$(len),
      wrongs: [len / 2, len * len, 2 * (Math.abs(hx) + Math.abs(hy)), Math.abs(hx) + Math.abs(hy)].map(N$),
      solution: L(
        P(
          sr`$M$ — $AB$ ning o'rtasi, demak $B=2M-A$. $B$ nuqtaning koordinatalari: $2\cdot ${tp(mx)}-${tp(ax)}=${bx}$ va $2\cdot ${tp(my)}-${tp(ay)}=${by}$.`,
          sr`$AB=\sqrt{(${bx}-${tp(ax)})^2+(${by}-${tp(ay)})^2}=\sqrt{${dx * dx}+${dy * dy}}=${len}$.`,
        ),
        P(
          sr`$M$ — середина $AB$, значит $B=2M-A$. Координаты точки $B$: $2\cdot ${tp(mx)}-${tp(ax)}=${bx}$ и $2\cdot ${tp(my)}-${tp(ay)}=${by}$.`,
          sr`$AB=\sqrt{(${bx}-${tp(ax)})^2+(${by}-${tp(ay)})^2}=\sqrt{${dx * dx}+${dy * dy}}=${len}$.`,
        ),
        P(
          sr`$M$ — $AB$ ortası, demek $B=2M-A$. $B$ noqattıń koordinataları: $2\cdot ${tp(mx)}-${tp(ax)}=${bx}$ hám $2\cdot ${tp(my)}-${tp(ay)}=${by}$.`,
          sr`$AB=\sqrt{(${bx}-${tp(ax)})^2+(${by}-${tp(ay)})^2}=\sqrt{${dx * dx}+${dy * dy}}=${len}$.`,
        ),
        P(
          sr`$M$ is the midpoint of $AB$, so $B=2M-A$. The coordinates of $B$ are $2\cdot ${tp(mx)}-${tp(ax)}=${bx}$ and $2\cdot ${tp(my)}-${tp(ay)}=${by}$.`,
          sr`$AB=\sqrt{(${bx}-${tp(ax)})^2+(${by}-${tp(ay)})^2}=\sqrt{${dx * dx}+${dy * dy}}=${len}$.`,
        ),
      ),
      mistake: L(
        sr`Faqat $AM$ ni topib to'xtash (u $AB$ ning yarmi) yoki kvadrat ildiz olishni unutish.`,
        sr`Находят только $AM$ (это половина $AB$) или забывают извлечь квадратный корень.`,
        sr`Tek $AM$ di tabıp toqtaw (ol $AB$ nıń yarımı) yamasa kvadrat túbir shıǵarıwdı umıtıw.`,
        sr`Stopping after finding $AM$ (which is half of $AB$) or forgetting the square root.`,
      ),
    });
  },
};

// =====================================================================================
// Y-1, L3 shablonlari
// =====================================================================================

// 1) To'g'ri burchakli uchburchak: gipotenuza + ichki chizilgan aylana radiusi -> yuza (80, 70)
const INCIRCLE_CASES: readonly (readonly [number, number, number, number])[] = [[3, 4, 5, 2], [3, 4, 5, 3], [5, 12, 13, 1], [5, 12, 13, 2], [8, 15, 17, 1], [7, 24, 25, 1], [20, 21, 29, 1]];

const y1Incircle: Template = {
  topic: 80,
  est: 200,
  build(c) {
    const [a0, b0, c0, k] = c.pick(INCIRCLE_CASES);
    const a = a0 * k;
    const b = b0 * k;
    const hyp = c0 * k;
    const r = (a + b - hyp) / 2;
    const S = (a * b) / 2;
    const semi = hyp + r;
    const Cc = pt(0, 0);
    const Bb = pt(a, 0);
    const Aa = pt(0, b);
    const I = pt(r, r);
    const T = pt(r, 0);
    const sc = scene([Aa, Bb, Cc], { circles: [{ c: I, r }] });
    const svg = wrapSvg(
      sc.poly([Aa, Bb, Cc]),
      sc.circle(I, r, { color: ACCENT }),
      sc.seg(I, T, { dash: true, color: ACCENT }),
      sc.dot(I),
      sc.rightAngle(Cc, Bb, Aa),
      sc.label(Aa, 'A'),
      sc.label(Bb, 'B'),
      sc.label(Cc, 'C'),
      sc.mark(Aa, Bb, String(hyp)),
      sc.mark(I, T, String(r), Cc, 0.5, 11),
    );
    return y1(c, {
      stem: L(
        sr`To'g'ri burchakli uchburchakning gipotenuzasi $${hyp}$ sm, unga ichki chizilgan aylananing radiusi $${r}$ sm. Uchburchakning yuzini (sm² da) toping.`,
        sr`Гипотенуза прямоугольного треугольника равна $${hyp}$ см, а радиус вписанной в него окружности — $${r}$ см. Найдите площадь треугольника (в см²).`,
        sr`Tuwrımúyeshli úshmúyeshliktiń gipotenuzası $${hyp}$ sm, oǵan ishine sızılǵan sheńberdiń radiusı $${r}$ sm. Úshmúyeshliktiń maydanın (sm² de) tabıń.`,
        sr`The hypotenuse of a right triangle is $${hyp}$ cm and the radius of its inscribed circle is $${r}$ cm. Find the area of the triangle (in cm²).`,
      ),
      figure: {
        svg,
        alt: L(
          `To'g'ri burchakli ABC uchburchak (C uchida to'g'ri burchak), gipotenuza ${hyp}, ichiga radiusi ${r} bo'lgan aylana chizilgan.`,
          `Прямоугольный треугольник ABC (прямой угол C), гипотенуза ${hyp}, вписана окружность радиуса ${r}.`,
          `Tuwrımúyeshli ABC úshmúyeshlik (C túyininde tuwrı múyesh), gipotenuza ${hyp}, ishine radiusı ${r} bolǵan sheńber sızılǵan.`,
          `Right triangle ABC (right angle at C) with hypotenuse ${hyp} and an inscribed circle of radius ${r}.`,
        ),
      },
      correct: m$(S),
      wrongs: [r * hyp, r * (hyp + 2 * r), (r * (hyp + r)) / 2, r * r + hyp].map(N$),
      solution: L(
        P(
          sr`Katetlarni $a$ va $b$ deb belgilaymiz. To'g'ri burchakli uchburchakda ichki chizilgan aylana radiusi $r=\dfrac{a+b-c}{2}$, bundan $a+b=c+2r=${hyp}+${2 * r}=${hyp + 2 * r}$.`,
          sr`Yarim perimetr: $p=\dfrac{a+b+c}{2}=\dfrac{${hyp + 2 * r}+${hyp}}{2}=${semi}$.`,
          sr`Yuza: $S=pr=${semi}\cdot ${r}=${S}$ sm².`,
        ),
        P(
          sr`Обозначим катеты $a$ и $b$. В прямоугольном треугольнике радиус вписанной окружности $r=\dfrac{a+b-c}{2}$, откуда $a+b=c+2r=${hyp}+${2 * r}=${hyp + 2 * r}$.`,
          sr`Полупериметр: $p=\dfrac{a+b+c}{2}=\dfrac{${hyp + 2 * r}+${hyp}}{2}=${semi}$.`,
          sr`Площадь: $S=pr=${semi}\cdot ${r}=${S}$ см².`,
        ),
        P(
          sr`Katetlerdi $a$ hám $b$ dep belgileymiz. Tuwrımúyeshli úshmúyeshlikte ishine sızılǵan sheńber radiusı $r=\dfrac{a+b-c}{2}$, bunnan $a+b=c+2r=${hyp}+${2 * r}=${hyp + 2 * r}$.`,
          sr`Yarım perimetr: $p=\dfrac{a+b+c}{2}=\dfrac{${hyp + 2 * r}+${hyp}}{2}=${semi}$.`,
          sr`Maydan: $S=pr=${semi}\cdot ${r}=${S}$ sm².`,
        ),
        P(
          sr`Let the legs be $a$ and $b$. In a right triangle the inradius is $r=\dfrac{a+b-c}{2}$, so $a+b=c+2r=${hyp}+${2 * r}=${hyp + 2 * r}$.`,
          sr`Semiperimeter: $p=\dfrac{a+b+c}{2}=\dfrac{${hyp + 2 * r}+${hyp}}{2}=${semi}$.`,
          sr`Area: $S=pr=${semi}\cdot ${r}=${S}$ cm².`,
        ),
      ),
      mistake: L(
        sr`$S=pr$ formulasida $p$ — yarim perimetr ekanini unutib, butun perimetrni qo'yish, yoki yuzani $\dfrac{rc}{2}$ deb olish.`,
        sr`В формуле $S=pr$ подставляют весь периметр вместо полупериметра $p$ либо считают площадь равной $\dfrac{rc}{2}$.`,
        sr`$S=pr$ formulasında $p$ — yarım perimetr ekenin umıtıp, pútin perimetrdi qoyıw yamasa maydandı $\dfrac{rc}{2}$ dep alıw.`,
        sr`Putting the whole perimeter instead of the semiperimeter $p$ in $S=pr$, or taking the area to be $\dfrac{rc}{2}$.`,
      ),
      extraTopics: [70, 73],
    });
  },
};

// 2) Diagonallari perpendikulyar teng yonli trapetsiya (76)
const PERP_CASES: readonly (readonly [number, number])[] = [[12, 6], [10, 4], [16, 8], [14, 6], [18, 12], [20, 10], [22, 8]];

const y1PerpTrapezoid: Template = {
  topic: 76,
  est: 210,
  build(c) {
    const [a, b] = c.pick(PERP_CASES);
    const h = (a + b) / 2;
    const area = h * h;
    const A = pt(-a / 2, 0);
    const D = pt(a / 2, 0);
    const B = pt(-b / 2, h);
    const C = pt(b / 2, h);
    const O = pt(0, a / 2);
    const sc = scene([A, B, C, D]);
    const svg = wrapSvg(
      sc.poly([A, B, C, D]),
      sc.seg(A, C, { dash: true }),
      sc.seg(B, D, { dash: true }),
      sc.rightAngle(O, C, D, 9),
      sc.label(A, 'A'),
      sc.label(B, 'B'),
      sc.label(C, 'C'),
      sc.label(D, 'D'),
      sc.mark(B, C, String(b)),
      sc.mark(A, D, String(a)),
    );
    return y1(c, {
      stem: L(
        sr`Teng yonli $ABCD$ trapetsiyaning asoslari $AD=${a}$ sm va $BC=${b}$ sm, diagonallari o'zaro perpendikulyar. Trapetsiyaning yuzini (sm² da) toping.`,
        sr`Основания равнобедренной трапеции $ABCD$ равны $AD=${a}$ см и $BC=${b}$ см, а её диагонали взаимно перпендикулярны. Найдите площадь трапеции (в см²).`,
        sr`Teń jambaslı $ABCD$ trapeciyanıń tiykarları $AD=${a}$ sm hám $BC=${b}$ sm, diagonalları óz ara perpendikulyar. Trapeciyanıń maydanın (sm² de) tabıń.`,
        sr`The bases of isosceles trapezoid $ABCD$ are $AD=${a}$ cm and $BC=${b}$ cm, and its diagonals are perpendicular. Find the area of the trapezoid (in cm²).`,
      ),
      figure: {
        svg,
        alt: L(
          `Teng yonli ABCD trapetsiya: asoslari AD = ${a}, BC = ${b}; AC va BD diagonallari perpendikulyar kesishadi.`,
          `Равнобедренная трапеция ABCD: основания AD = ${a}, BC = ${b}; диагонали AC и BD перпендикулярны.`,
          `Teń jambaslı ABCD trapeciya: tiykarları AD = ${a}, BC = ${b}; AC hám BD diagonalları perpendikulyar.`,
          `Isosceles trapezoid ABCD with bases AD = ${a}, BC = ${b} and perpendicular diagonals AC and BD.`,
        ),
      },
      correct: N$(area),
      wrongs: [(a * a - b * b) / 4, ((a + b) * (a + b)) / 2, a * b, h].map(N$),
      solution: L(
        P(
          sr`$C$ nuqtadan $BD$ ga parallel to'g'ri chiziq o'tkazamiz; u $AD$ ning davomini $E$ nuqtada kesadi. $BCED$ parallelogramm, shuning uchun $DE=BC=${b}$ va $CE=BD$.`,
          sr`Teng yonli trapetsiyada diagonallar teng: $AC=BD=CE$. $AC\perp BD$ va $CE\parallel BD$ bo'lgani uchun $AC\perp CE$. Demak, $ACE$ — teng yonli to'g'ri burchakli uchburchak, uning gipotenuzasi $AE=${a}+${b}=${a + b}$.`,
          sr`Gipotenuzaga tushirilgan balandlik $\dfrac{AE}{2}=${h}$ — bu trapetsiyaning ham balandligi.`,
          sr`$S=\dfrac{${a}+${b}}{2}\cdot ${h}=${area}$ sm².`,
        ),
        P(
          sr`Проведём через $C$ прямую, параллельную $BD$; она пересекает продолжение $AD$ в точке $E$. $BCED$ — параллелограмм, поэтому $DE=BC=${b}$ и $CE=BD$.`,
          sr`В равнобедренной трапеции диагонали равны: $AC=BD=CE$. Так как $AC\perp BD$ и $CE\parallel BD$, то $AC\perp CE$. Значит, $ACE$ — равнобедренный прямоугольный треугольник с гипотенузой $AE=${a}+${b}=${a + b}$.`,
          sr`Высота к гипотенузе равна $\dfrac{AE}{2}=${h}$ — это и высота трапеции.`,
          sr`$S=\dfrac{${a}+${b}}{2}\cdot ${h}=${area}$ см².`,
        ),
        P(
          sr`$C$ noqattan $BD$ ǵa parallel tuwrı sızıq júrgizemiz; ol $AD$ nıń dawamın $E$ noqatta kesedi. $BCED$ parallelogramm, sonlıqtan $DE=BC=${b}$ hám $CE=BD$.`,
          sr`Teń jambaslı trapeciyada diagonallar teń: $AC=BD=CE$. $AC\perp BD$ hám $CE\parallel BD$ bolǵanı ushın $AC\perp CE$. Demek, $ACE$ — teń jambaslı tuwrımúyeshli úshmúyeshlik, gipotenuzası $AE=${a}+${b}=${a + b}$.`,
          sr`Gipotenuzaǵa túsirilgen biyiklik $\dfrac{AE}{2}=${h}$ — bul trapeciyanıń da biyikligi.`,
          sr`$S=\dfrac{${a}+${b}}{2}\cdot ${h}=${area}$ sm².`,
        ),
        P(
          sr`Draw through $C$ a line parallel to $BD$; it meets the extension of $AD$ at $E$. $BCED$ is a parallelogram, so $DE=BC=${b}$ and $CE=BD$.`,
          sr`In an isosceles trapezoid the diagonals are equal: $AC=BD=CE$. Since $AC\perp BD$ and $CE\parallel BD$, we get $AC\perp CE$. So $ACE$ is an isosceles right triangle with hypotenuse $AE=${a}+${b}=${a + b}$.`,
          sr`The altitude to the hypotenuse is $\dfrac{AE}{2}=${h}$, and this is also the height of the trapezoid.`,
          sr`$S=\dfrac{${a}+${b}}{2}\cdot ${h}=${area}$ cm².`,
        ),
      ),
      mistake: L(
        sr`Balandlikni $\dfrac{a-b}{2}$ deb olish. Diagonallar perpendikulyar bo'lsa, balandlik o'rta chiziqqa teng: $h=\dfrac{a+b}{2}$.`,
        sr`Берут высоту равной $\dfrac{a-b}{2}$. При перпендикулярных диагоналях высота равна средней линии: $h=\dfrac{a+b}{2}$.`,
        sr`Biyiklikti $\dfrac{a-b}{2}$ dep alıw. Diagonallar perpendikulyar bolsa, biyiklik orta sızıqqa teń: $h=\dfrac{a+b}{2}$.`, // kaa: tekshirilsin (orta sızıq)
        sr`Taking the height to be $\dfrac{a-b}{2}$. When the diagonals are perpendicular the height equals the midline: $h=\dfrac{a+b}{2}$.`,
      ),
    });
  },
};

// 3) Bissektrisa va yuzlar nisbati (72, 73)
// Yuza S = (m + n) * u; uchburchak mavjud bo'lishi uchun S < m * n / 2 (sin A < 1) bo'lishi shart.
const BISECT_CASES: readonly (readonly [number, number, number])[] = [[8, 12, 2], [10, 15, 2], [6, 9, 1], [12, 18, 3], [5, 7, 1], [9, 15, 2], [10, 14, 2], [12, 20, 3], [4, 10, 1]];

const y1Bisector: Template = {
  topic: 72,
  est: 190,
  build(c) {
    const [mm, nn, u] = c.pick(BISECT_CASES);
    const S = (mm + nn) * u;
    const part = mm * u;
    const s35 = Math.sin((35 * Math.PI) / 180);
    const c35 = Math.cos((35 * Math.PI) / 180);
    const A = pt(0, 0);
    const B = pt(-mm * s35, -mm * c35);
    const C = pt(nn * s35, -nn * c35);
    const D = pt((nn * B.x + mm * C.x) / (mm + nn), (nn * B.y + mm * C.y) / (mm + nn));
    const sc = scene([A, B, C]);
    const svg = wrapSvg(
      sc.poly([A, B, C]),
      sc.seg(A, D, { dash: true }),
      sc.angle(A, B, D, undefined, 22),
      sc.angle(A, D, C, undefined, 22),
      sc.label(A, 'A', pt(0, -1)),
      sc.label(B, 'B'),
      sc.label(C, 'C'),
      sc.label(D, 'D', A, 13),
      sc.mark(A, B, String(mm)),
      sc.mark(A, C, String(nn)),
    );
    return y1(c, {
      stem: L(
        sr`$ABC$ uchburchakda $AB=${mm}$ sm, $AC=${nn}$ sm, uchburchakning yuzi $${S}$ sm². $AD$ kesma $\angle A$ ning bissektrisasi ($D$ nuqta $BC$ tomonda yotadi). $ABD$ uchburchakning yuzini (sm² da) toping.`,
        sr`В треугольнике $ABC$ известно: $AB=${mm}$ см, $AC=${nn}$ см, площадь треугольника равна $${S}$ см². Отрезок $AD$ — биссектриса угла $A$ (точка $D$ лежит на стороне $BC$). Найдите площадь треугольника $ABD$ (в см²).`,
        sr`$ABC$ úshmúyeshlikte $AB=${mm}$ sm, $AC=${nn}$ sm, úshmúyeshliktiń maydanı $${S}$ sm². $AD$ kesindi $\angle A$ dıń bissektrisası ($D$ noqat $BC$ tárepte jatadı). $ABD$ úshmúyeshliktiń maydanın (sm² de) tabıń.`,
        sr`In triangle $ABC$, $AB=${mm}$ cm, $AC=${nn}$ cm and the area is $${S}$ cm². Segment $AD$ is the bisector of $\angle A$ ($D$ lies on side $BC$). Find the area of triangle $ABD$ (in cm²).`,
      ),
      figure: {
        svg,
        alt: L(
          `ABC uchburchak, A burchak bissektrisasi AD (D nuqta BC da); AB = ${mm}, AC = ${nn}.`,
          `Треугольник ABC, биссектриса AD угла A (точка D на BC); AB = ${mm}, AC = ${nn}.`,
          `ABC úshmúyeshlik, A múyeshiniń bissektrisası AD (D noqat BC da); AB = ${mm}, AC = ${nn}.`,
          `Triangle ABC with the bisector AD of angle A (D on BC); AB = ${mm}, AC = ${nn}.`,
        ),
      },
      correct: m$(part),
      wrongs: [(S * nn) / (mm + nn), S / 2, (S * mm) / nn, S - mm].map(N$),
      solution: L(
        P(
          sr`Bissektrisa xossasi: $\dfrac{BD}{DC}=\dfrac{AB}{AC}=\dfrac{${mm}}{${nn}}$.`,
          sr`$ABD$ va $ADC$ uchburchaklarning $A$ uchidan tushirilgan balandligi umumiy, demak yuzlar asoslariga proporsional: $\dfrac{S(ABD)}{S(ADC)}=\dfrac{BD}{DC}=\dfrac{${mm}}{${nn}}$.`,
          sr`Shuning uchun $S(ABD)=${S}\cdot\dfrac{${mm}}{${mm}+${nn}}=${part}$ sm².`,
        ),
        P(
          sr`Свойство биссектрисы: $\dfrac{BD}{DC}=\dfrac{AB}{AC}=\dfrac{${mm}}{${nn}}$.`,
          sr`У треугольников $ABD$ и $ADC$ общая высота из вершины $A$, значит их площади относятся как основания: $\dfrac{S(ABD)}{S(ADC)}=\dfrac{BD}{DC}=\dfrac{${mm}}{${nn}}$.`,
          sr`Поэтому $S(ABD)=${S}\cdot\dfrac{${mm}}{${mm}+${nn}}=${part}$ см².`,
        ),
        P(
          sr`Bissektrisa qásiyeti: $\dfrac{BD}{DC}=\dfrac{AB}{AC}=\dfrac{${mm}}{${nn}}$.`,
          sr`$ABD$ hám $ADC$ úshmúyeshliklerdiń $A$ túyininen túsirilgen biyikligi ulıwma, demek maydanlar tiykarlarına proporcional: $\dfrac{S(ABD)}{S(ADC)}=\dfrac{BD}{DC}=\dfrac{${mm}}{${nn}}$.`,
          sr`Sonlıqtan $S(ABD)=${S}\cdot\dfrac{${mm}}{${mm}+${nn}}=${part}$ sm².`,
        ),
        P(
          sr`Angle bisector theorem: $\dfrac{BD}{DC}=\dfrac{AB}{AC}=\dfrac{${mm}}{${nn}}$.`,
          sr`Triangles $ABD$ and $ADC$ share the altitude from $A$, so their areas are proportional to their bases: $\dfrac{S(ABD)}{S(ADC)}=\dfrac{BD}{DC}=\dfrac{${mm}}{${nn}}$.`,
          sr`Hence $S(ABD)=${S}\cdot\dfrac{${mm}}{${mm}+${nn}}=${part}$ cm².`,
        ),
      ),
      mistake: L(
        sr`Bissektrisa uchburchakni teng yuzli ikki qismga bo'ladi deb o'ylash (bu mediana xossasi) yoki nisbatni teskari olish.`,
        sr`Считают, что биссектриса делит треугольник на равные по площади части (это свойство медианы), или берут отношение наоборот.`,
        sr`Bissektrisa úshmúyeshlikti teń maydanlı eki bólekke bóledi dep oylaw (bul mediana qásiyeti) yamasa qatnastı keri alıw.`,
        sr`Believing the bisector splits the triangle into equal areas (that is a property of the median), or inverting the ratio.`,
      ),
      extraTopics: [73],
    });
  },
};

// 4) Urinma va kesuvchi teoremasi (79)
const TS_CASES: readonly (readonly [number, number, number])[] = [[1, 2, 3], [1, 3, 5], [2, 1, 2], [1, 4, 5], [3, 1, 2], [1, 2, 4], [2, 2, 3], [1, 3, 4]];

const y1TangentSecant: Template = {
  topic: 79,
  est: 230,
  build(c) {
    const [a, b, cc] = c.pick(TS_CASES);
    const x = a * b * b;
    const y = a * (cc * cc - b * b);
    const tan = a * b * cc;
    const rad = Math.max(y * 0.65, tan * 0.55);
    const h = Math.sqrt(rad * rad - (y * y) / 4);
    const O = pt(x + y / 2, h);
    const d = Math.hypot(O.x, O.y);
    const theta = Math.atan2(O.y, O.x);
    const alpha = Math.asin(rad / d);
    const T = pt(tan * Math.cos(theta + alpha), tan * Math.sin(theta + alpha));
    const Pp = pt(0, 0);
    const A = pt(x, 0);
    const B = pt(x + y, 0);
    const sc = scene([Pp, B, T, O], { circles: [{ c: O, r: rad }] });
    const svg = wrapSvg(
      sc.circle(O, rad),
      sc.seg(Pp, B),
      sc.seg(Pp, T),
      sc.seg(O, T, { dash: true }),
      sc.rightAngle(T, O, Pp, 9),
      sc.dot(A),
      sc.dot(B),
      sc.dot(T),
      sc.label(Pp, 'P', O),
      sc.label(A, 'A', O, 14),
      sc.label(B, 'B', O, 14),
      sc.label(T, 'T', O),
      sc.mark(Pp, T, String(tan), O),
      sc.mark(A, B, String(y), O, 0.5, 26),
    );
    return y1(c, {
      stem: L(
        sr`$P$ nuqtadan aylanaga $PT$ urinma ($T$ — urinish nuqtasi) va aylanani $A$ hamda $B$ nuqtalarda kesuvchi to'g'ri chiziq o'tkazilgan ($A$ nuqta $P$ ga yaqin). $PT=${tan}$ sm, $AB=${y}$ sm. $PA$ kesmaning uzunligini (sm da) toping.`,
        sr`Из точки $P$ к окружности проведены касательная $PT$ ($T$ — точка касания) и секущая, пересекающая окружность в точках $A$ и $B$ (точка $A$ ближе к $P$). $PT=${tan}$ см, $AB=${y}$ см. Найдите длину отрезка $PA$ (в см).`,
        sr`$P$ noqattan sheńberge $PT$ urınba ($T$ — urınıw noqatı) hám sheńberdi $A$ hám $B$ noqatlarında keship ótetuǵın kesiwshi júrgizilgen ($A$ noqat $P$ ǵa jaqın). $PT=${tan}$ sm, $AB=${y}$ sm. $PA$ kesindiniń uzınlıǵın (sm de) tabıń.`,
        sr`From a point $P$ a tangent $PT$ ($T$ is the point of tangency) and a secant meeting the circle at $A$ and $B$ ($A$ is nearer to $P$) are drawn. $PT=${tan}$ cm, $AB=${y}$ cm. Find the length of $PA$ (in cm).`,
      ),
      figure: {
        svg,
        alt: L(
          `P nuqtadan aylanaga PT urinma (PT = ${tan}) va A, B nuqtalarda kesuvchi (AB = ${y}).`,
          `Из точки P к окружности проведены касательная PT (PT = ${tan}) и секущая через точки A и B (AB = ${y}).`,
          `P noqattan sheńberge PT urınba (PT = ${tan}) hám A, B noqatlarında kesiwshi (AB = ${y}).`,
          `From the point P a tangent PT (PT = ${tan}) and a secant through A and B (AB = ${y}) are drawn to the circle.`,
        ),
      },
      correct: m$(x),
      wrongs: [x + y, tan, (tan * tan) / y, y].map(N$),
      solution: L(
        P(
          sr`Urinma va kesuvchi teoremasi: $PT^2=PA\cdot PB$. $PA=x$ desak, $PB=x+${y}$.`,
          sr`$x(x+${y})=${tan}^2=${tan * tan}$, ya'ni $x^2+${y}x-${tan * tan}=0$.`,
          sr`Diskriminant: $D=${y}^2+4\cdot ${tan * tan}=${y * y + 4 * tan * tan}$, $\sqrt{D}=${2 * x + y}$, $x=\dfrac{-${y}+${2 * x + y}}{2}=${x}$ (manfiy ildiz yaramaydi).`,
          sr`Javob: $PA=${x}$ sm.`,
        ),
        P(
          sr`Теорема о касательной и секущей: $PT^2=PA\cdot PB$. Пусть $PA=x$, тогда $PB=x+${y}$.`,
          sr`$x(x+${y})=${tan}^2=${tan * tan}$, то есть $x^2+${y}x-${tan * tan}=0$.`,
          sr`Дискриминант: $D=${y}^2+4\cdot ${tan * tan}=${y * y + 4 * tan * tan}$, $\sqrt{D}=${2 * x + y}$, $x=\dfrac{-${y}+${2 * x + y}}{2}=${x}$ (отрицательный корень не подходит).`,
          sr`Ответ: $PA=${x}$ см.`,
        ),
        P(
          sr`Urınba hám kesiwshi teoreması: $PT^2=PA\cdot PB$. $PA=x$ desek, $PB=x+${y}$.`,
          sr`$x(x+${y})=${tan}^2=${tan * tan}$, yaǵnıy $x^2+${y}x-${tan * tan}=0$.`,
          sr`Diskriminant: $D=${y}^2+4\cdot ${tan * tan}=${y * y + 4 * tan * tan}$, $\sqrt{D}=${2 * x + y}$, $x=\dfrac{-${y}+${2 * x + y}}{2}=${x}$ (teris túbir jaramaydı).`,
          sr`Juwap: $PA=${x}$ sm.`,
        ),
        P(
          sr`Tangent-secant theorem: $PT^2=PA\cdot PB$. Let $PA=x$, then $PB=x+${y}$.`,
          sr`$x(x+${y})=${tan}^2=${tan * tan}$, i.e. $x^2+${y}x-${tan * tan}=0$.`,
          sr`Discriminant: $D=${y}^2+4\cdot ${tan * tan}=${y * y + 4 * tan * tan}$, $\sqrt{D}=${2 * x + y}$, $x=\dfrac{-${y}+${2 * x + y}}{2}=${x}$ (the negative root is rejected).`,
          sr`Answer: $PA=${x}$ cm.`,
        ),
      ),
      mistake: L(
        sr`Teoremani $PT=PA\cdot PB$ deb yozish (kvadratni unutish) yoki $PB$ ni topib, uni $PA$ deb javob sifatida yozib qo'yish.`,
        sr`Записывают теорему как $PT=PA\cdot PB$ (забыв квадрат) либо находят $PB$ и выдают его за $PA$.`,
        sr`Teoremanı $PT=PA\cdot PB$ dep jazıw (kvadratın umıtıw) yamasa $PB$ nı tabıp, onı $PA$ dep juwap etip jazıw.`,
        sr`Writing the theorem as $PT=PA\cdot PB$ (forgetting the square) or finding $PB$ and reporting it as $PA$.`,
      ),
    });
  },
};

// =====================================================================================
// Y-2 (moslashtirish) shablonlari
// =====================================================================================

// L2: doira va aylana kattaliklari (78)
const CIRCLE_R: readonly number[] = [3, 9, 12, 15, 18, 21];

const y2Circle: Template = {
  topic: 78,
  est: 180,
  build(c) {
    const r = c.pick(CIRCLE_R);
    const vals = [2 * r, r * r, (r * r) / 3];
    const pool = [r, 2 * r * r, 3 * r, 4 * r, 6 * r, r * r / 2, (r * r) / 9, 2 * r + 6];
    const fmt = (v: number) => m$(`${num(v)}\\pi`);
    const O = pt(0, 0);
    const A = polar(O, 1, 0);
    const B = polar(O, 1, 120);
    const sc = scene([O], { circles: [{ c: O, r: 1 }], pad: 28 });
    const svg = wrapSvg(
      sc.circle(O, 1),
      sc.seg(O, A),
      sc.seg(O, B),
      sc.angle(O, A, B, '120°', 16),
      sc.dot(O),
      sc.label(O, 'O', pt(0.4, 0.4), 12, 14),
      sc.label(A, 'A', O),
      sc.label(B, 'B', O),
      sc.mark(O, A, String(r), B, 0.6),
    );
    return y2(c, {
      stem: L(
        sr`Radiusi $${r}$ sm bo'lgan aylana va doira berilgan. Har bir kattalikni uning qiymati bilan moslang (qiymatlar $\pi$ ga ko'paytma ko'rinishida; uzunlik sm da, yuza sm² da).`,
        sr`Дана окружность радиуса $${r}$ см и ограниченный ею круг. Сопоставьте каждую величину с её значением (значения даны как множитель при $\pi$; длина в см, площадь в см²).`,
        sr`Radiusı $${r}$ sm bolǵan sheńber hám dóńgelek berilgen. Hár bir shamanı onıń mánisi menen sáykes qoyıń (mánisler $\pi$ ge kóbeytindi kórinisinde; uzınlıq sm de, maydan sm² de).`, // kaa: tekshirilsin
        sr`A circle of radius $${r}$ cm and the disk it bounds are given. Match each quantity with its value (values are written as a multiple of $\pi$; length in cm, area in cm²).`,
      ),
      figure: {
        svg,
        alt: L(
          `O markazli aylana, radiusi ${r}; OA va OB radiuslar orasidagi markaziy burchak 120 gradus.`,
          `Окружность с центром O и радиусом ${r}; центральный угол между радиусами OA и OB равен 120 градусов.`,
          `Orayı O, radiusı ${r} bolǵan sheńber; OA hám OB radiusları arasındaǵı orayılıq múyesh 120 gradus.`,
          `Circle with center O and radius ${r}; the central angle between radii OA and OB is 120 degrees.`,
        ),
      },
      items: [
        { text: G.circumference, value: fmt(vals[0]!) },
        { text: G.diskArea, value: fmt(vals[1]!) },
        {
          text: L(
            sr`Markaziy burchagi $120^{\circ}$ bo'lgan sektor yuzi`,
            sr`Площадь сектора с центральным углом $120^{\circ}$`,
            sr`Orayılıq múyeshi $120^{\circ}$ bolǵan sektor maydanı`,
            sr`Area of the sector with central angle $120^{\circ}$`,
          ),
          value: fmt(vals[2]!),
        },
      ],
      distractors: distinctFrom(pool, vals, fmt),
      solution: L(
        P(
          sr`Aylana uzunligi: $C=2\pi r=2\pi\cdot ${r}=${2 * r}\pi$.`,
          sr`Doira yuzi: $S=\pi r^2=\pi\cdot ${r}^2=${r * r}\pi$.`,
          sr`Sektor yuzi doira yuzining $\dfrac{120}{360}=\dfrac13$ qismi: $\dfrac13\cdot ${r * r}\pi=${num((r * r) / 3)}\pi$.`,
        ),
        P(
          sr`Длина окружности: $C=2\pi r=2\pi\cdot ${r}=${2 * r}\pi$.`,
          sr`Площадь круга: $S=\pi r^2=\pi\cdot ${r}^2=${r * r}\pi$.`,
          sr`Площадь сектора — $\dfrac{120}{360}=\dfrac13$ площади круга: $\dfrac13\cdot ${r * r}\pi=${num((r * r) / 3)}\pi$.`,
        ),
        P(
          sr`Sheńber uzınlıǵı: $C=2\pi r=2\pi\cdot ${r}=${2 * r}\pi$.`,
          sr`Dóńgelek maydanı: $S=\pi r^2=\pi\cdot ${r}^2=${r * r}\pi$.`,
          sr`Sektor maydanı dóńgelek maydanınıń $\dfrac{120}{360}=\dfrac13$ bólegi: $\dfrac13\cdot ${r * r}\pi=${num((r * r) / 3)}\pi$.`,
        ),
        P(
          sr`Circumference: $C=2\pi r=2\pi\cdot ${r}=${2 * r}\pi$.`,
          sr`Area of the disk: $S=\pi r^2=\pi\cdot ${r}^2=${r * r}\pi$.`,
          sr`The sector is $\dfrac{120}{360}=\dfrac13$ of the disk: $\dfrac13\cdot ${r * r}\pi=${num((r * r) / 3)}\pi$.`,
        ),
      ),
      mistake: L(
        sr`Aylana uzunligini $\pi r$, doira yuzini esa $2\pi r$ deb adashtirish; sektor yuzini butun doira yuzidan kichraytirmasdan yozish.`,
        sr`Путают формулы: длина окружности — не $\pi r$, а площадь круга — не $2\pi r$; не берут нужную долю круга для сектора.`,
        sr`Sheńber uzınlıǵın $\pi r$, dóńgelek maydanın $2\pi r$ dep shatastırıw; sektor maydanın pútkil dóńgelek maydanınan kishirmey jazıw.`,
        sr`Mixing up the formulas (the circumference is not $\pi r$ and the area is not $2\pi r$), or not taking the right fraction of the disk for the sector.`,
      ),
    });
  },
};

// L2: uchburchak burchaklari nisbati (68)
const ANGLE_RATIOS: readonly (readonly [number, number, number])[] = [[2, 3, 4], [1, 2, 3], [3, 4, 5], [2, 3, 5], [1, 3, 5], [2, 3, 7]];

const y2TriangleAngles: Template = {
  topic: 68,
  est: 180,
  build(c) {
    const [p, q, w] = c.pick(ANGLE_RATIOS);
    const x = 180 / (p + q + w);
    const [s, mid, l] = [p * x, q * x, w * x];
    const rad = (deg: number) => (deg * Math.PI) / 180;
    const A = pt(0, 0);
    const B = pt(Math.sin(rad(l)), 0);
    const C = pt(Math.sin(rad(mid)) * Math.cos(rad(s)), Math.sin(rad(mid)) * Math.sin(rad(s)));
    const sc = scene([A, B, C], { pad: 36 });
    const svg = wrapSvg(sc.poly([A, B, C]), sc.label(A, 'A'), sc.label(B, 'B'), sc.label(C, 'C'));
    const fmt = (v: number) => m$(`${num(v)}^{\\circ}`);
    const right = [s, l, 180 - s];
    const pool = [mid, 180 - mid, 180 - l, l - s, 2 * s, 90 - s];
    return y2(c, {
      stem: L(
        sr`$ABC$ uchburchak burchaklarining nisbati $${p}:${q}:${w}$ kabi. Quyidagi kattaliklarni qiymatlari (gradusda) bilan moslang.`,
        sr`Углы треугольника $ABC$ относятся как $${p}:${q}:${w}$. Сопоставьте величины с их значениями (в градусах).`,
        sr`$ABC$ úshmúyeshliktiń múyeshleri $${p}:${q}:${w}$ qatnasında. Tómendegi shamalardı mánisleri (gradusta) menen sáykes qoyıń.`,
        sr`The angles of triangle $ABC$ are in the ratio $${p}:${q}:${w}$. Match each quantity with its value (in degrees).`,
      ),
      figure: {
        svg,
        alt: L(
          'ABC uchburchak (burchaklar nisbati berilgan, shakl taxminiy).',
          'Треугольник ABC (углы заданы отношением, рисунок схематичный).',
          'ABC úshmúyeshlik (múyeshler qatnası berilgen, súwret shama menen).',
          'Triangle ABC (angles are given by a ratio; the sketch is approximate).',
        ),
      },
      items: [
        {
          text: L('Eng kichik burchak', 'Наименьший угол', 'Eń kishi múyesh', 'The smallest angle'),
          value: fmt(right[0]!),
        },
        {
          text: L('Eng katta burchak', 'Наибольший угол', 'Eń úlken múyesh', 'The largest angle'),
          value: fmt(right[1]!),
        },
        {
          text: L(
            "Eng kichik burchak uchidagi tashqi burchak",
            'Внешний угол при вершине наименьшего угла',
            'Eń kishi múyesh túyinindegi sırtqı múyesh',
            'The exterior angle at the vertex of the smallest angle',
          ),
          value: fmt(right[2]!),
        },
      ],
      distractors: distinctFrom(pool, right, fmt),
      solution: L(
        P(
          sr`Burchaklar yig'indisi $180^{\circ}$: $${p}x+${q}x+${w}x=180^{\circ}$, bundan $x=${x}^{\circ}$.`,
          sr`Burchaklar: $${s}^{\circ}$, $${mid}^{\circ}$, $${l}^{\circ}$. Eng kichigi $${s}^{\circ}$, eng kattasi $${l}^{\circ}$.`,
          sr`Tashqi burchak qo'shni ichki burchak bilan birga $180^{\circ}$ ni tashkil qiladi: $180^{\circ}-${s}^{\circ}=${180 - s}^{\circ}$.`,
        ),
        P(
          sr`Сумма углов равна $180^{\circ}$: $${p}x+${q}x+${w}x=180^{\circ}$, откуда $x=${x}^{\circ}$.`,
          sr`Углы: $${s}^{\circ}$, $${mid}^{\circ}$, $${l}^{\circ}$. Наименьший — $${s}^{\circ}$, наибольший — $${l}^{\circ}$.`,
          sr`Внешний угол вместе со смежным внутренним даёт $180^{\circ}$: $180^{\circ}-${s}^{\circ}=${180 - s}^{\circ}$.`,
        ),
        P(
          sr`Múyeshler jıyındısı $180^{\circ}$: $${p}x+${q}x+${w}x=180^{\circ}$, bunnan $x=${x}^{\circ}$.`,
          sr`Múyeshler: $${s}^{\circ}$, $${mid}^{\circ}$, $${l}^{\circ}$. Eń kishisi $${s}^{\circ}$, eń úlkeni $${l}^{\circ}$.`,
          sr`Sırtqı múyesh qońsı ishki múyesh penen birge $180^{\circ}$ boladı: $180^{\circ}-${s}^{\circ}=${180 - s}^{\circ}$.`,
        ),
        P(
          sr`The angles add up to $180^{\circ}$: $${p}x+${q}x+${w}x=180^{\circ}$, so $x=${x}^{\circ}$.`,
          sr`The angles are $${s}^{\circ}$, $${mid}^{\circ}$, $${l}^{\circ}$. The smallest is $${s}^{\circ}$, the largest is $${l}^{\circ}$.`,
          sr`An exterior angle and the adjacent interior angle sum to $180^{\circ}$: $180^{\circ}-${s}^{\circ}=${180 - s}^{\circ}$.`,
        ),
      ),
      mistake: L(
        sr`Tashqi burchakni qo'shni ichki burchak bilan emas, boshqa burchak bilan adashtirish yoki nisbat qismlarini $180^{\circ}$ ga bo'lmasdan, $360^{\circ}$ ga bo'lish.`,
        sr`Путают внешний угол со смежным внутренним либо делят $360^{\circ}$ (а не $180^{\circ}$) в заданном отношении.`,
        sr`Sırtqı múyeshti qońsı ishki múyesh penen emes, basqa múyesh penen shatastırıw yamasa qatnastı $180^{\circ}$ qa emes, $360^{\circ}$ qa bóliw.`,
        sr`Confusing the exterior angle with another angle instead of the adjacent interior one, or splitting $360^{\circ}$ rather than $180^{\circ}$ in the given ratio.`,
      ),
      extraTopics: [67],
    });
  },
};

// L3: nuqtaning almashtirilgan tasvirlari (82, 81)
const TRANSFORM_CASES: readonly (readonly [number, number, readonly number[]])[] = [
  [2, 5, [0, 2, 3]],
  [3, -1, [1, 3, 4]],
  [-4, 2, [2, 4, 5]],
  [6, -3, [0, 1, 5]],
  [-2, 7, [1, 2, 3]],
  [5, -4, [3, 4, 5]],
];

const TRANSFORM_NAMES: readonly L10n[] = [
  L(`Ox o'qiga nisbatan simmetriya`, 'Симметрия относительно оси Ox', 'Ox kósherine qatnasla simmetriya', 'Reflection in the Ox axis'),
  L(`Oy o'qiga nisbatan simmetriya`, 'Симметрия относительно оси Oy', 'Oy kósherine qatnasla simmetriya', 'Reflection in the Oy axis'),
  L('Koordinatalar boshiga nisbatan simmetriya', 'Симметрия относительно начала координат', 'Koordinatalar basına qatnasla simmetriya', 'Reflection in the origin'),
  L(sr`$y=x$ to'g'ri chiziqqa nisbatan simmetriya`, sr`Симметрия относительно прямой $y=x$`, sr`$y=x$ tuwrı sızıǵına qatnasla simmetriya`, sr`Reflection in the line $y=x$`),
  L(
    sr`Koordinatalar boshi atrofida soat miliga teskari $90^{\circ}$ ga burish`,
    sr`Поворот на $90^{\circ}$ против часовой стрелки вокруг начала координат`,
    sr`Koordinatalar bası átirapında saat tilińe qarsı $90^{\circ}$ qa burıw`, // kaa: tekshirilsin (saat tili)
    sr`Rotation by $90^{\circ}$ counterclockwise about the origin`,
  ),
  L(
    sr`Koordinatalar boshi atrofida soat mili bo'yicha $90^{\circ}$ ga burish`,
    sr`Поворот на $90^{\circ}$ по часовой стрелке вокруг начала координат`,
    sr`Koordinatalar bası átirapında saat tili boyınsha $90^{\circ}$ qa burıw`,
    sr`Rotation by $90^{\circ}$ clockwise about the origin`,
  ),
];

const y2Transformations: Template = {
  topic: 82,
  est: 240,
  build(c) {
    const [x, y, chosen] = c.pick(TRANSFORM_CASES);
    const images: [number, number][] = [
      [x, -y],
      [-x, y],
      [-x, -y],
      [y, x],
      [-y, x],
      [y, -x],
    ];
    const fmt = ([u, v]: [number, number]) => m$(`(${u};${v})`);
    const edge = Math.max(Math.abs(x), Math.abs(y)) + 2;
    const Ap = pt(x, y);
    const sc = scene([pt(-edge, -edge), pt(edge, edge)], { pad: 20 });
    const svg = wrapSvg(
      sc.seg(pt(-edge, 0), pt(edge, 0)),
      sc.seg(pt(0, -edge), pt(0, edge)),
      sc.seg(Ap, pt(x, 0), { dash: true, color: ACCENT }),
      sc.seg(Ap, pt(0, y), { dash: true, color: ACCENT }),
      sc.dot(Ap),
      sc.textAt(pt(edge, 0.9), 'x', 14),
      sc.textAt(pt(0.9, edge), 'y', 14),
      sc.label(Ap, `A(${x};${y})`, pt(0, 0), 20, 13),
    );
    const chosenImages = chosen.map((i) => fmt(images[i]!));
    const unchosen = [0, 1, 2, 3, 4, 5].filter((i) => !chosen.includes(i)).map((i) => fmt(images[i]!));
    return y2(c, {
      stem: L(
        sr`$A(${x};${y})$ nuqtaga turli almashtirishlar qo'llandi. Har bir almashtirishni hosil bo'lgan nuqtaning koordinatalari bilan moslang.`,
        sr`К точке $A(${x};${y})$ применили разные преобразования. Сопоставьте каждое преобразование с координатами полученной точки.`,
        sr`$A(${x};${y})$ noqatqa túrli almastırıwlar qollanıldı. Hár bir almastırıwdı payda bolǵan noqattıń koordinataları menen sáykes qoyıń.`,
        sr`Different transformations were applied to the point $A(${x};${y})$. Match each transformation with the coordinates of the resulting point.`,
      ),
      figure: {
        svg,
        alt: L(
          `Koordinata tekisligida A(${x}; ${y}) nuqta.`,
          `Точка A(${x}; ${y}) на координатной плоскости.`,
          `Koordinata tegisliginde A(${x}; ${y}) noqat.`,
          `The point A(${x}; ${y}) in the coordinate plane.`,
        ),
      },
      items: chosen.map((i, k) => ({ text: TRANSFORM_NAMES[i]!, value: chosenImages[k]! })),
      distractors: unchosen,
      solution: L(
        P(
          sr`Qoidalar: $Ox$ ga nisbatan $(x;y)\to(x;-y)$; $Oy$ ga nisbatan $(x;y)\to(-x;y)$; koordinatalar boshiga nisbatan $(x;y)\to(-x;-y)$; $y=x$ ga nisbatan $(x;y)\to(y;x)$; soat miliga teskari $90^{\circ}$ ga burishda $(x;y)\to(-y;x)$; soat mili bo'yicha burishda $(x;y)\to(y;-x)$.`,
          `1-band: ${chosenImages[0]}; 2-band: ${chosenImages[1]}; 3-band: ${chosenImages[2]}.`,
        ),
        P(
          sr`Правила: относительно $Ox$ $(x;y)\to(x;-y)$; относительно $Oy$ $(x;y)\to(-x;y)$; относительно начала координат $(x;y)\to(-x;-y)$; относительно $y=x$ $(x;y)\to(y;x)$; поворот на $90^{\circ}$ против часовой стрелки $(x;y)\to(-y;x)$; по часовой стрелке $(x;y)\to(y;-x)$.`,
          `Пункт 1: ${chosenImages[0]}; пункт 2: ${chosenImages[1]}; пункт 3: ${chosenImages[2]}.`,
        ),
        P(
          sr`Qaǵıydalar: $Ox$ qa qatnasla $(x;y)\to(x;-y)$; $Oy$ qa qatnasla $(x;y)\to(-x;y)$; koordinatalar basına qatnasla $(x;y)\to(-x;-y)$; $y=x$ ke qatnasla $(x;y)\to(y;x)$; saat tilińe qarsı $90^{\circ}$ qa burıwda $(x;y)\to(-y;x)$; saat tili boyınsha $(x;y)\to(y;-x)$.`,
          `1-bánd: ${chosenImages[0]}; 2-bánd: ${chosenImages[1]}; 3-bánd: ${chosenImages[2]}.`,
        ),
        P(
          sr`Rules: reflection in $Ox$ gives $(x;y)\to(x;-y)$; in $Oy$ gives $(x;y)\to(-x;y)$; in the origin gives $(x;y)\to(-x;-y)$; in $y=x$ gives $(x;y)\to(y;x)$; a $90^{\circ}$ counterclockwise rotation gives $(x;y)\to(-y;x)$; a clockwise one gives $(x;y)\to(y;-x)$.`,
          `Item 1: ${chosenImages[0]}; item 2: ${chosenImages[1]}; item 3: ${chosenImages[2]}.`,
        ),
      ),
      mistake: L(
        sr`Soat miliga teskari va soat mili bo'yicha burishni, hamda $Ox$ va $Oy$ o'qlariga nisbatan simmetriyani bir-biri bilan adashtirish.`,
        sr`Путают повороты по часовой и против часовой стрелки, а также симметрии относительно осей $Ox$ и $Oy$.`,
        sr`Saat tilińe qarsı hám saat tili boyınsha burıwdı, sonday-aq $Ox$ hám $Oy$ kósherlerine qatnasla simmetriyanı bir-biri menen shatastırıw.`,
        sr`Mixing up clockwise and counterclockwise rotations, or reflections in the $Ox$ and $Oy$ axes.`,
      ),
      extraTopics: [81],
    });
  },
};

// L3: to'g'ri burchakli uchburchak kattaliklari (70, 72, 73)
const RIGHT_LEGS: readonly (readonly [number, number])[] = [[6, 8], [9, 12], [12, 16], [15, 20], [7, 24], [18, 24]];

const y2RightTriangle: Template = {
  topic: 70,
  est: 240,
  build(c) {
    const [a, b] = c.pick(RIGHT_LEGS);
    const hyp = isqrt(a * a + b * b);
    const S = (a * b) / 2;
    const alt = (a * b) / hyp;
    const fmt = (v: number) => m$(num(v));
    const right = [hyp, S, alt];
    const pool = [a + b, a + b + hyp, hyp / 2, (a + b) / 2, a * b, S / 2, a + b - hyp, hyp + alt];
    const Cc = pt(0, 0);
    const Bb = pt(a, 0);
    const Aa = pt(0, b);
    const t = (b * b) / (a * a + b * b);
    const H = lerp(Aa, Bb, t);
    const sc = scene([Aa, Bb, Cc]);
    const svg = wrapSvg(
      sc.poly([Aa, Bb, Cc]),
      sc.seg(Cc, H, { dash: true, color: ACCENT }),
      sc.rightAngle(Cc, Bb, Aa),
      sc.rightAngle(H, Cc, Bb, 8),
      sc.label(Aa, 'A'),
      sc.label(Bb, 'B'),
      sc.label(Cc, 'C'),
      sc.label(H, 'H', Cc, 13, 14),
      sc.mark(Cc, Bb, String(a)),
      sc.mark(Cc, Aa, String(b)),
    );
    return y2(c, {
      stem: L(
        sr`To'g'ri burchakli uchburchakning katetlari $${a}$ sm va $${b}$ sm. Kattaliklarni ularning qiymatlari bilan moslang (uzunlik sm da, yuza sm² da).`,
        sr`Катеты прямоугольного треугольника равны $${a}$ см и $${b}$ см. Сопоставьте величины с их значениями (длина в см, площадь в см²).`,
        sr`Tuwrımúyeshli úshmúyeshliktiń katetleri $${a}$ sm hám $${b}$ sm. Shamalardı olardıń mánisleri menen sáykes qoyıń (uzınlıq sm de, maydan sm² de).`,
        sr`The legs of a right triangle are $${a}$ cm and $${b}$ cm. Match each quantity with its value (length in cm, area in cm²).`,
      ),
      figure: {
        svg,
        alt: L(
          `To'g'ri burchakli ABC uchburchak: AC = ${b}, BC = ${a}; C dan gipotenuzaga CH balandlik tushirilgan.`,
          `Прямоугольный треугольник ABC: AC = ${b}, BC = ${a}; из вершины C проведена высота CH к гипотенузе.`,
          `Tuwrımúyeshli ABC úshmúyeshlik: AC = ${b}, BC = ${a}; C dan gipotenuzaǵa CH biyikligi túsirilgen.`,
          `Right triangle ABC with AC = ${b}, BC = ${a}; the altitude CH is drawn to the hypotenuse.`,
        ),
      },
      items: [
        { text: L('Gipotenuza uzunligi', 'Длина гипотенузы', 'Gipotenuza uzınlıǵı', 'Length of the hypotenuse'), value: fmt(right[0]!) },
        { text: L('Uchburchak yuzi', 'Площадь треугольника', 'Úshmúyeshlik maydanı', 'Area of the triangle'), value: fmt(right[1]!) },
        {
          text: L('Gipotenuzaga tushirilgan balandlik', 'Высота, проведённая к гипотенузе', 'Gipotenuzaǵa túsirilgen biyiklik', 'Altitude to the hypotenuse'),
          value: fmt(right[2]!),
        },
      ],
      distractors: distinctFrom(pool, right, fmt),
      solution: L(
        P(
          sr`Pifagor teoremasi: $c=\sqrt{${a}^2+${b}^2}=${hyp}$ sm.`,
          sr`Yuza: $S=\dfrac{ab}{2}=\dfrac{${a}\cdot ${b}}{2}=${S}$ sm².`,
          sr`Yuzani gipotenuza va unga tushirilgan balandlik orqali ham yozamiz: $S=\dfrac{c\cdot h}{2}$, bundan $h=\dfrac{2S}{c}=\dfrac{${2 * S}}{${hyp}}=${num(alt)}$ sm.`,
        ),
        P(
          sr`Теорема Пифагора: $c=\sqrt{${a}^2+${b}^2}=${hyp}$ см.`,
          sr`Площадь: $S=\dfrac{ab}{2}=\dfrac{${a}\cdot ${b}}{2}=${S}$ см².`,
          sr`Запишем площадь и через гипотенузу с высотой: $S=\dfrac{c\cdot h}{2}$, откуда $h=\dfrac{2S}{c}=\dfrac{${2 * S}}{${hyp}}=${num(alt)}$ см.`,
        ),
        P(
          sr`Pifagor teoreması: $c=\sqrt{${a}^2+${b}^2}=${hyp}$ sm.`,
          sr`Maydan: $S=\dfrac{ab}{2}=\dfrac{${a}\cdot ${b}}{2}=${S}$ sm².`,
          sr`Maydandı gipotenuza hám oǵan túsirilgen biyiklik arqalı da jazamız: $S=\dfrac{c\cdot h}{2}$, bunnan $h=\dfrac{2S}{c}=\dfrac{${2 * S}}{${hyp}}=${num(alt)}$ sm.`,
        ),
        P(
          sr`Pythagorean theorem: $c=\sqrt{${a}^2+${b}^2}=${hyp}$ cm.`,
          sr`Area: $S=\dfrac{ab}{2}=\dfrac{${a}\cdot ${b}}{2}=${S}$ cm².`,
          sr`Write the area also through the hypotenuse and its altitude: $S=\dfrac{c\cdot h}{2}$, so $h=\dfrac{2S}{c}=\dfrac{${2 * S}}{${hyp}}=${num(alt)}$ cm.`,
        ),
      ),
      mistake: L(
        sr`Gipotenuzaga tushirilgan balandlikni gipotenuzaning yarmi (mediana) bilan adashtirish, yoki yuzni $ab$ deb ($\dfrac12$ siz) olish.`,
        sr`Путают высоту, проведённую к гипотенузе, с половиной гипотенузы (медианой) или берут площадь $ab$ без множителя $\dfrac12$.`,
        sr`Gipotenuzaǵa túsirilgen biyiklikti gipotenuzanıń yarımı (mediana) menen shatastırıw yamasa maydandı $ab$ dep ($\dfrac12$ siz) alıw.`,
        sr`Confusing the altitude to the hypotenuse with half the hypotenuse (the median), or taking the area as $ab$ without the factor $\dfrac12$.`,
      ),
      extraTopics: [73, 72],
    });
  },
};

// =====================================================================================
// O (ochiq javob) shablonlari, L3
// =====================================================================================

// 1) Koordinatalar: uchburchak yuzi va ichki chizilgan aylana radiusi (81, 73, 80)
const COORD_TRI: readonly (readonly [number, number, number])[] = [[14, 5, 12], [8, 0, 6], [12, 0, 5], [12, 6, 8], [16, 8, 15], [14, 7, 24], [24, 12, 16], [24, 12, 5]];

const oCoordTriangle: Template = {
  topic: 81,
  est: 330,
  build(c) {
    const [base, px, py] = c.pick(COORD_TRI);
    const tx = c.rng.int(-4, 4);
    const ty = c.rng.int(-4, 4);
    const flip = c.rng.chance(0.5) ? -1 : 1;
    const bx = tx;
    const by = ty;
    const cx = tx + base;
    const cy = ty;
    const ax = tx + px;
    const ay = ty + flip * py;
    const sAB = isqrt(px * px + py * py);
    const sAC = isqrt((base - px) * (base - px) + py * py);
    const S = (base * py) / 2;
    const pp = (sAB + sAC + base) / 2;
    const rf = frac(S * 2, sAB + sAC + base);
    const Aa = pt(ax, ay);
    const Bb = pt(bx, by);
    const Cc = pt(cx, cy);
    const sc = scene([Aa, Bb, Cc], { pad: 50 });
    const svg = wrapSvg(
      sc.poly([Aa, Bb, Cc]),
      sc.dot(Aa),
      sc.dot(Bb),
      sc.dot(Cc),
      sc.label(Aa, `A(${ax};${ay})`, undefined, 24, 13),
      sc.label(Bb, `B(${bx};${by})`, undefined, 26, 13),
      sc.label(Cc, `C(${cx};${cy})`, undefined, 26, 13),
    );
    return open({
      stem: L(
        sr`Koordinata tekisligida $A(${ax};${ay})$, $B(${bx};${by})$ va $C(${cx};${cy})$ nuqtalar berilgan. $ABC$ uchburchak uchun quyidagilarni toping.`,
        sr`На координатной плоскости заданы точки $A(${ax};${ay})$, $B(${bx};${by})$ и $C(${cx};${cy})$. Для треугольника $ABC$ найдите следующее.`,
        sr`Koordinata tegisliginde $A(${ax};${ay})$, $B(${bx};${by})$ hám $C(${cx};${cy})$ noqatları berilgen. $ABC$ úshmúyeshlik ushın tómendegilerdi tabıń.`,
        sr`The points $A(${ax};${ay})$, $B(${bx};${by})$ and $C(${cx};${cy})$ are given in the coordinate plane. For triangle $ABC$, find the following.`,
      ),
      figure: {
        svg,
        alt: L(
          `Koordinata tekisligidagi ABC uchburchak: A(${ax}; ${ay}), B(${bx}; ${by}), C(${cx}; ${cy}).`,
          `Треугольник ABC на координатной плоскости: A(${ax}; ${ay}), B(${bx}; ${by}), C(${cx}; ${cy}).`,
          `Koordinata tegisligindegi ABC úshmúyeshlik: A(${ax}; ${ay}), B(${bx}; ${by}), C(${cx}; ${cy}).`,
          `Triangle ABC in the coordinate plane: A(${ax}; ${ay}), B(${bx}; ${by}), C(${cx}; ${cy}).`,
        ),
      },
      a: {
        prompt: L('Uchburchakning yuzini toping.', 'Найдите площадь треугольника.', 'Úshmúyeshliktiń maydanın tabıń.', 'Find the area of the triangle.'),
        answer: frac(S),
      },
      b: {
        prompt: L(
          'Uchburchakka ichki chizilgan aylananing radiusini toping.',
          'Найдите радиус вписанной в треугольник окружности.',
          'Úshmúyeshlikke ishine sızılǵan sheńberdiń radiusın tabıń.',
          'Find the radius of the circle inscribed in the triangle.',
        ),
        answer: rf,
      },
      solution: L(
        P(
          sr`$B$ va $C$ nuqtalarning ordinatalari teng ($${by}$), shuning uchun $BC\parallel Ox$ va $BC=|${cx}-${tp(bx)}|=${base}$. $A$ nuqtadan $BC$ gacha masofa $h=|${ay}-${tp(by)}|=${py}$.`,
          sr`a) $S=\dfrac12\cdot BC\cdot h=\dfrac12\cdot ${base}\cdot ${py}=${S}$.`,
          sr`b) Tomonlar: $AB=\sqrt{(${ax}-${tp(bx)})^2+(${ay}-${tp(by)})^2}=${sAB}$, $AC=\sqrt{(${ax}-${tp(cx)})^2+(${ay}-${tp(cy)})^2}=${sAC}$. Yarim perimetr $p=\dfrac{${sAB}+${base}+${sAC}}{2}=${pp}$.`,
          sr`Ichki chizilgan aylana radiusi: $r=\dfrac{S}{p}=\dfrac{${S}}{${pp}}=${texFrac(rf)}$.`,
        ),
        P(
          sr`Ординаты точек $B$ и $C$ равны ($${by}$), поэтому $BC\parallel Ox$ и $BC=|${cx}-${tp(bx)}|=${base}$. Расстояние от $A$ до $BC$: $h=|${ay}-${tp(by)}|=${py}$.`,
          sr`а) $S=\dfrac12\cdot BC\cdot h=\dfrac12\cdot ${base}\cdot ${py}=${S}$.`,
          sr`б) Стороны: $AB=\sqrt{(${ax}-${tp(bx)})^2+(${ay}-${tp(by)})^2}=${sAB}$, $AC=\sqrt{(${ax}-${tp(cx)})^2+(${ay}-${tp(cy)})^2}=${sAC}$. Полупериметр $p=\dfrac{${sAB}+${base}+${sAC}}{2}=${pp}$.`,
          sr`Радиус вписанной окружности: $r=\dfrac{S}{p}=\dfrac{${S}}{${pp}}=${texFrac(rf)}$.`,
        ),
        P(
          sr`$B$ hám $C$ noqatlarınıń ordinataları teń ($${by}$), sonlıqtan $BC\parallel Ox$ hám $BC=|${cx}-${tp(bx)}|=${base}$. $A$ noqattan $BC$ ǵa shekemgi aralıq $h=|${ay}-${tp(by)}|=${py}$.`,
          sr`a) $S=\dfrac12\cdot BC\cdot h=\dfrac12\cdot ${base}\cdot ${py}=${S}$.`,
          sr`b) Táreplar: $AB=\sqrt{(${ax}-${tp(bx)})^2+(${ay}-${tp(by)})^2}=${sAB}$, $AC=\sqrt{(${ax}-${tp(cx)})^2+(${ay}-${tp(cy)})^2}=${sAC}$. Yarım perimetr $p=\dfrac{${sAB}+${base}+${sAC}}{2}=${pp}$.`,
          sr`Ishine sızılǵan sheńber radiusı: $r=\dfrac{S}{p}=\dfrac{${S}}{${pp}}=${texFrac(rf)}$.`,
        ),
        P(
          sr`The ordinates of $B$ and $C$ are equal ($${by}$), so $BC\parallel Ox$ and $BC=|${cx}-${tp(bx)}|=${base}$. The distance from $A$ to $BC$ is $h=|${ay}-${tp(by)}|=${py}$.`,
          sr`a) $S=\dfrac12\cdot BC\cdot h=\dfrac12\cdot ${base}\cdot ${py}=${S}$.`,
          sr`b) Sides: $AB=\sqrt{(${ax}-${tp(bx)})^2+(${ay}-${tp(by)})^2}=${sAB}$, $AC=\sqrt{(${ax}-${tp(cx)})^2+(${ay}-${tp(cy)})^2}=${sAC}$. Semiperimeter $p=\dfrac{${sAB}+${base}+${sAC}}{2}=${pp}$.`,
          sr`Inradius: $r=\dfrac{S}{p}=\dfrac{${S}}{${pp}}=${texFrac(rf)}$.`,
        ),
      ),
      mistake: L(
        sr`$r=\dfrac{S}{p}$ da $p$ — yarim perimetr ekanini unutib, butun perimetrni qo'yish; yoki $BC$ ga balandlikni noto'g'ri hisoblash.`,
        sr`В формуле $r=\dfrac{S}{p}$ подставляют весь периметр вместо полупериметра либо неверно находят высоту к $BC$.`,
        sr`$r=\dfrac{S}{p}$ da $p$ — yarım perimetr ekenin umıtıp, pútin perimetrdi qoyıw; yamasa $BC$ ǵa biyiklikti qate esaplaw.`,
        sr`Using the whole perimeter instead of the semiperimeter in $r=\dfrac{S}{p}$, or computing the height to $BC$ incorrectly.`,
      ),
      extraTopics: [73, 80],
    });
  },
};

// 2) Vatar: markazdan masofa va AOB uchburchak yuzi (79, 73, 70)
const CHORD_CASES: readonly (readonly [number, number, number])[] = [
  [5, 4, 3],
  [5, 3, 4],
  [13, 12, 5],
  [13, 5, 12],
  [10, 8, 6],
  [10, 6, 8],
  [17, 15, 8],
  [17, 8, 15],
  [25, 24, 7],
  [25, 7, 24],
  [15, 12, 9],
  [15, 9, 12],
];

const oChord: Template = {
  topic: 79,
  est: 300,
  build(c) {
    const [r, half, dist] = c.pick(CHORD_CASES);
    const O = pt(0, 0);
    const A = pt(-half, -dist);
    const B = pt(half, -dist);
    const M = pt(0, -dist);
    const sc = scene([O, A, B], { circles: [{ c: O, r }] });
    const svg = wrapSvg(
      sc.circle(O, r),
      sc.seg(A, B),
      sc.seg(O, A, { dash: true }),
      sc.seg(O, B, { dash: true }),
      sc.seg(O, M, { dash: true }),
      sc.rightAngle(M, O, B, 9),
      sc.dot(O),
      sc.label(O, 'O', pt(0, -1), 14),
      sc.label(A, 'A', O),
      sc.label(B, 'B', O),
      sc.label(M, 'M', O, 14, 14),
      sc.mark(O, A, String(r), B, 0.5),
      sc.mark(A, B, String(2 * half), O),
    );
    return open({
      stem: L(
        sr`$O$ markazli aylananing radiusi $${r}$ ga teng, $AB$ vatarning uzunligi $${2 * half}$. Quyidagilarni toping.`,
        sr`Радиус окружности с центром $O$ равен $${r}$, длина хорды $AB$ равна $${2 * half}$. Найдите следующее.`,
        sr`Orayı $O$ bolǵan sheńberdiń radiusı $${r}$ ǵa teń, $AB$ xordanıń uzınlıǵı $${2 * half}$. Tómendegilerdi tabıń.`,
        sr`The circle with center $O$ has radius $${r}$ and the chord $AB$ has length $${2 * half}$. Find the following.`,
      ),
      figure: {
        svg,
        alt: L(
          `O markazli aylana, radiusi ${r}; AB vatar uzunligi ${2 * half}, OM perpendikulyar vatarga tushirilgan.`,
          `Окружность с центром O, радиус ${r}; хорда AB длиной ${2 * half}, из центра опущен перпендикуляр OM на хорду.`,
          `Orayı O, radiusı ${r} bolǵan sheńber; AB xordasınıń uzınlıǵı ${2 * half}, OM perpendikulyarı xordaǵa túsirilgen.`,
          `Circle with center O and radius ${r}; chord AB of length ${2 * half} and the perpendicular OM from the center to the chord.`,
        ),
      },
      a: {
        prompt: L(
          sr`$O$ nuqtadan $AB$ vatargacha bo'lgan masofani toping.`,
          sr`Найдите расстояние от точки $O$ до хорды $AB$.`,
          sr`$O$ noqattan $AB$ xordaǵa shekemgi aralıqtı tabıń.`,
          sr`Find the distance from $O$ to the chord $AB$.`,
        ),
        answer: frac(dist),
      },
      b: {
        prompt: L(
          sr`$AOB$ uchburchakning yuzini toping.`,
          sr`Найдите площадь треугольника $AOB$.`,
          sr`$AOB$ úshmúyeshliktiń maydanın tabıń.`,
          sr`Find the area of triangle $AOB$.`,
        ),
        answer: frac(half * dist),
      },
      solution: L(
        P(
          sr`$OM\perp AB$ o'tkazamiz. Markazdan vatarga tushirilgan perpendikulyar vatarni teng ikkiga bo'ladi: $AM=\dfrac{AB}{2}=${half}$.`,
          sr`a) To'g'ri burchakli $OMA$ uchburchakdan $OM=\sqrt{OA^2-AM^2}=\sqrt{${r}^2-${half}^2}=${dist}$.`,
          sr`b) $S(AOB)=\dfrac12\cdot AB\cdot OM=\dfrac12\cdot ${2 * half}\cdot ${dist}=${half * dist}$.`,
        ),
        P(
          sr`Проведём $OM\perp AB$. Перпендикуляр из центра к хорде делит её пополам: $AM=\dfrac{AB}{2}=${half}$.`,
          sr`а) Из прямоугольного треугольника $OMA$: $OM=\sqrt{OA^2-AM^2}=\sqrt{${r}^2-${half}^2}=${dist}$.`,
          sr`б) $S(AOB)=\dfrac12\cdot AB\cdot OM=\dfrac12\cdot ${2 * half}\cdot ${dist}=${half * dist}$.`,
        ),
        P(
          sr`$OM\perp AB$ júrgizemiz. Orayınan xordaǵa túsirilgen perpendikulyar xordanı teń ekige bóledi: $AM=\dfrac{AB}{2}=${half}$.`,
          sr`a) Tuwrımúyeshli $OMA$ úshmúyeshlikten $OM=\sqrt{OA^2-AM^2}=\sqrt{${r}^2-${half}^2}=${dist}$.`,
          sr`b) $S(AOB)=\dfrac12\cdot AB\cdot OM=\dfrac12\cdot ${2 * half}\cdot ${dist}=${half * dist}$.`,
        ),
        P(
          sr`Draw $OM\perp AB$. The perpendicular from the center to a chord bisects it: $AM=\dfrac{AB}{2}=${half}$.`,
          sr`a) From right triangle $OMA$: $OM=\sqrt{OA^2-AM^2}=\sqrt{${r}^2-${half}^2}=${dist}$.`,
          sr`b) $S(AOB)=\dfrac12\cdot AB\cdot OM=\dfrac12\cdot ${2 * half}\cdot ${dist}=${half * dist}$.`,
        ),
      ),
      mistake: L(
        sr`Pifagor teoremasiga vatarning o'zini ($AB$) qo'yish; to'g'risi — uning yarmi $AM$. Yuzni hisoblashda $\dfrac12$ ni unutish.`,
        sr`Подставляют в теорему Пифагора всю хорду $AB$ вместо её половины $AM$; забывают множитель $\dfrac12$ в площади.`,
        sr`Pifagor teoremasına xordanıń ózin ($AB$) qoyıw; durısı — onıń yarımı $AM$. Maydandı esaplawda $\dfrac12$ ni umıtıw.`,
        sr`Putting the whole chord $AB$ into the Pythagorean theorem instead of its half $AM$; forgetting the factor $\dfrac12$ in the area.`,
      ),
      extraTopics: [73, 70],
    });
  },
};

// 3) O'xshashlik: DE || AC (69, 72)
const SIM_CASES: readonly (readonly [number, number, number, number, number])[] = [
  [3, 5, 2, 4, 4],
  [2, 5, 3, 3, 2],
  [2, 3, 2, 6, 5],
  [3, 4, 3, 5, 3],
  [1, 3, 4, 5, 2],
  [4, 5, 1, 3, 3],
  [3, 7, 1, 2, 1],
];

const oSimilar: Template = {
  topic: 69,
  est: 320,
  build(c) {
    const [p, q, t, mm, u] = c.pick(SIM_CASES);
    const bd = p * t;
    const da = (q - p) * t;
    const ac = q * mm;
    const de = p * mm;
    const S = q * q * u;
    const small = p * p * u;
    const trap = S - small;
    const Aa = pt(0, 0);
    const Cc = pt(10, 0);
    const Bb = pt(3.5, 7);
    const D = lerp(Bb, Aa, p / q);
    const E = lerp(Bb, Cc, p / q);
    const sc = scene([Aa, Bb, Cc]);
    const svg = wrapSvg(
      sc.poly([Aa, Bb, Cc]),
      sc.seg(D, E, { dash: true, color: ACCENT }),
      sc.dot(D),
      sc.dot(E),
      sc.label(Aa, 'A'),
      sc.label(Bb, 'B'),
      sc.label(Cc, 'C'),
      sc.label(D, 'D', pt(5, 3)),
      sc.label(E, 'E', pt(5, 3)),
      sc.mark(Bb, D, String(bd), pt(5, 3), 0.5, 12),
      sc.mark(D, Aa, String(da), pt(5, 3), 0.5, 12),
      sc.mark(Aa, Cc, String(ac)),
    );
    return open({
      stem: L(
        sr`$ABC$ uchburchakning $AB$ tomonida $D$ nuqta, $BC$ tomonida $E$ nuqta olingan va $DE\parallel AC$. $BD=${bd}$ sm, $DA=${da}$ sm, $AC=${ac}$ sm, $ABC$ uchburchakning yuzi $${S}$ sm². Quyidagilarni toping.`,
        sr`На стороне $AB$ треугольника $ABC$ взята точка $D$, на стороне $BC$ — точка $E$, причём $DE\parallel AC$. $BD=${bd}$ см, $DA=${da}$ см, $AC=${ac}$ см, площадь треугольника $ABC$ равна $${S}$ см². Найдите следующее.`,
        sr`$ABC$ úshmúyeshliktiń $AB$ tárepinde $D$ noqat, $BC$ tárepinde $E$ noqat alınǵan hám $DE\parallel AC$. $BD=${bd}$ sm, $DA=${da}$ sm, $AC=${ac}$ sm, $ABC$ úshmúyeshliktiń maydanı $${S}$ sm². Tómendegilerdi tabıń.`,
        sr`On side $AB$ of triangle $ABC$ a point $D$ is taken and on side $BC$ a point $E$, with $DE\parallel AC$. $BD=${bd}$ cm, $DA=${da}$ cm, $AC=${ac}$ cm and the area of triangle $ABC$ is $${S}$ cm². Find the following.`,
      ),
      figure: {
        svg,
        alt: L(
          `ABC uchburchak, D nuqta AB da, E nuqta BC da, DE AC ga parallel; BD = ${bd}, DA = ${da}, AC = ${ac}.`,
          `Треугольник ABC, точка D на AB, точка E на BC, DE параллельна AC; BD = ${bd}, DA = ${da}, AC = ${ac}.`,
          `ABC úshmúyeshlik, D noqat AB da, E noqat BC da, DE AC ǵa parallel; BD = ${bd}, DA = ${da}, AC = ${ac}.`,
          `Triangle ABC with D on AB and E on BC, DE parallel to AC; BD = ${bd}, DA = ${da}, AC = ${ac}.`,
        ),
      },
      a: {
        prompt: L('$DE$ kesmaning uzunligini toping (sm da).', 'Найдите длину отрезка $DE$ (в см).', '$DE$ kesindiniń uzınlıǵın tabıń (sm de).', 'Find the length of segment $DE$ (in cm).'),
        answer: frac(de),
      },
      b: {
        prompt: L(
          '$ADEC$ trapetsiyaning yuzini toping (sm² da).',
          'Найдите площадь трапеции $ADEC$ (в см²).',
          '$ADEC$ trapeciyanıń maydanın tabıń (sm² de).',
          'Find the area of trapezoid $ADEC$ (in cm²).',
        ),
        answer: frac(trap),
      },
      solution: L(
        P(
          sr`$DE\parallel AC$ bo'lgani uchun $BDE$ va $BAC$ uchburchaklar o'xshash. O'xshashlik koeffitsienti $k=\dfrac{BD}{BA}=\dfrac{${bd}}{${bd}+${da}}=\dfrac{${p}}{${q}}$.`,
          sr`a) $DE=k\cdot AC=\dfrac{${p}}{${q}}\cdot ${ac}=${de}$.`,
          sr`b) O'xshash figuralar yuzlarining nisbati $k^2$ ga teng: $S(BDE)=k^2S=\dfrac{${p * p}}{${q * q}}\cdot ${S}=${small}$. $ADEC$ trapetsiyaning yuzi: $${S}-${small}=${trap}$.`,
        ),
        P(
          sr`Так как $DE\parallel AC$, треугольники $BDE$ и $BAC$ подобны. Коэффициент подобия $k=\dfrac{BD}{BA}=\dfrac{${bd}}{${bd}+${da}}=\dfrac{${p}}{${q}}$.`,
          sr`а) $DE=k\cdot AC=\dfrac{${p}}{${q}}\cdot ${ac}=${de}$.`,
          sr`б) Площади подобных фигур относятся как $k^2$: $S(BDE)=k^2S=\dfrac{${p * p}}{${q * q}}\cdot ${S}=${small}$. Площадь трапеции $ADEC$: $${S}-${small}=${trap}$.`,
        ),
        P(
          sr`$DE\parallel AC$ bolǵanı ushın $BDE$ hám $BAC$ úshmúyeshlikler uqsas. Uqsaslıq koeffitsienti $k=\dfrac{BD}{BA}=\dfrac{${bd}}{${bd}+${da}}=\dfrac{${p}}{${q}}$.`,
          sr`a) $DE=k\cdot AC=\dfrac{${p}}{${q}}\cdot ${ac}=${de}$.`,
          sr`b) Uqsas figuralar maydanlarınıń qatnası $k^2$ qa teń: $S(BDE)=k^2S=\dfrac{${p * p}}{${q * q}}\cdot ${S}=${small}$. $ADEC$ trapeciyanıń maydanı: $${S}-${small}=${trap}$.`,
        ),
        P(
          sr`Since $DE\parallel AC$, triangles $BDE$ and $BAC$ are similar with ratio $k=\dfrac{BD}{BA}=\dfrac{${bd}}{${bd}+${da}}=\dfrac{${p}}{${q}}$.`,
          sr`a) $DE=k\cdot AC=\dfrac{${p}}{${q}}\cdot ${ac}=${de}$.`,
          sr`b) Areas of similar figures are in the ratio $k^2$: $S(BDE)=k^2S=\dfrac{${p * p}}{${q * q}}\cdot ${S}=${small}$. The area of trapezoid $ADEC$ is $${S}-${small}=${trap}$.`,
        ),
      ),
      mistake: L(
        sr`O'xshashlik koeffitsientini $\dfrac{BD}{DA}$ deb olish (to'g'risi $\dfrac{BD}{BA}$) yoki yuzlar nisbatini $k$ ga, $k^2$ ga emas, tenglash.`,
        sr`Берут коэффициент подобия $\dfrac{BD}{DA}$ (верно $\dfrac{BD}{BA}$) либо приравнивают отношение площадей к $k$, а не к $k^2$.`,
        sr`Uqsaslıq koeffitsientin $\dfrac{BD}{DA}$ dep alıw (durısı $\dfrac{BD}{BA}$) yamasa maydanlar qatnasın $k^2$ qa emes, $k$ ǵa teńew.`,
        sr`Taking the similarity ratio as $\dfrac{BD}{DA}$ (it is $\dfrac{BD}{BA}$), or equating the area ratio to $k$ instead of $k^2$.`,
      ),
      extraTopics: [72],
    });
  },
};

// =====================================================================================
// Generator
// =====================================================================================

interface Group {
  templates: readonly Template[];
  /** bir variantdagi (men qamragan) shu guruh slotlari soni */
  slots: number;
  /** guruh ichidagi slot raqami (0..slots-1) */
  local: (req: SlotRequest) => number;
}

const GROUPS: Record<string, Group> = {
  'y1-L2': { templates: [y1Rhombus, y1IsoTrapezoid, y1Tangents, y1Cosines, y1Polygon, y1Coords], slots: 2, local: (r) => Math.floor(r.index / 2) },
  'y1-L3': { templates: [y1Incircle, y1PerpTrapezoid, y1Bisector, y1TangentSecant], slots: 2, local: (r) => Math.floor(r.index / 2) - 2 },
  'y2-L2': { templates: [y2Circle, y2TriangleAngles], slots: 1, local: () => 0 },
  'y2-L3': { templates: [y2Transformations, y2RightTriangle], slots: 1, local: () => 0 },
  'o-L3': { templates: [oCoordTriangle, oChord, oSimilar], slots: 2, local: (r) => Math.floor(r.index / 2) },
};

export const generateGeometryPlan: BlockGenerator = (req) => {
  const gid = `${req.type}-${req.difficulty}`;
  const group = GROUPS[gid];
  if (!group) throw new Error(`geometriya-plan: ${gid} guruhi qo'llab-quvvatlanmaydi`);
  const local = group.local(req);
  if (local < 0 || local >= group.slots) throw new Error(`geometriya-plan: index ${req.index} (${gid}) mening slotim emas`);
  const draw = req.variant * group.slots + local;
  const n = group.templates.length;
  const tplIdx = draw % n;
  const occ = Math.floor(draw / n);
  const tpl = group.templates[tplIdx]!;
  const offset = makeRng(`geo-plan|${gid}|${tplIdx}`).int(0, 997);
  const ctx: Ctx = {
    req,
    rng: slotRng(req, `gp${tplIdx}`),
    pick: (cases) => cases[(occ + offset) % cases.length]!,
  };
  const built = tpl.build(ctx);
  return {
    topic: tpl.topic,
    extraTopics: built.extraTopics,
    difficulty: req.difficulty,
    estSeconds: tpl.est,
    key: built.key,
    content: built.content,
  };
};
