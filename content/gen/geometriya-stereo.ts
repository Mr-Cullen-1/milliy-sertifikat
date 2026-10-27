// Geometriya, STEREOMETRIYA qismi (mavzular 83-93). Faqat req.index toq bo'lgan so'rovlarga javob beradi
// (juft indekslarni planimetriya generatori bajaradi). Javob kaliti va chalg'ituvchilar parametrlardan kod bilan hisoblanadi.
import { fMul, frac, keyForms, makeRng, slotRng, texFrac, type Frac, type L10n, type Rng, type Y1Built } from './helpers';
import { LAYOUT } from './layout';
import {
  ACCENT,
  SOFT,
  Svg,
  along,
  boxPoly,
  cross3,
  dot3,
  drawCone,
  drawCylinder,
  drawFrustum,
  drawPoly,
  drawSphere,
  ellipseHalf,
  norm3,
  polyEdges,
  prismPoly,
  pyramidPoly,
  regularBase,
  segLabel,
  squareBase,
  sub3,
  lerp3,
  type P2,
  type Poly,
  type V3,
} from './svg3d';
import {
  QUADS,
  TERMS,
  TRIPLES,
  figureOf,
  intOptions,
  isSquare,
  isqrt,
  pickRound,
  q,
  qNum,
  qOptions,
  qTex,
  texPt,
  y2Options,
  type Qty,
} from './stereo-lib';
import type { BlockGenerator, Lang, QuestionSpec, SlotRequest } from './types';

// ============================ Umumiy qurilma ============================

const L = (uz: string, ru: string, kaa: string, en: string): L10n => ({ uz, ru, kaa, en });
const join = (...lines: string[]): string => lines.join('\n\n');

interface Ctx {
  req: SlotRequest;
  /** shu shablon necha marta ishlatilgani (turli raund = turli parametrlar) */
  round: number;
  rng: Rng;
}

interface Texts {
  stem: string;
  solution: string;
  mistake: string;
}

export interface StereoFacts {
  id: string;
  [k: string]: unknown;
}

export interface StereoInstance {
  spec: QuestionSpec;
  facts: StereoFacts;
}

interface Template {
  id: string;
  build: (c: Ctx) => StereoInstance;
}

const EST = { y1L2: 120, y1L3: 210, y2: 300, o: 360 } as const;

type FigureFn = (lang: Lang) => { svg: string; alt: string };

function y1Spec(c: Ctx, topic: number, est: number, built: Y1Built, texts: (lang: Lang) => Texts, figure?: FigureFn): QuestionSpec {
  return {
    topic,
    difficulty: c.req.difficulty,
    estSeconds: est,
    key: { correct: built.correct },
    content: (lang) => {
      const t = texts(lang);
      return {
        stem_md: t.stem,
        solution_md: t.solution,
        mistake_note_md: t.mistake,
        payload: { options: built.options, ...(figure ? { figure: figure(lang) } : {}) },
      };
    },
  };
}

const OPEN_HINT = L(
  'Javobni butun son yoki oddiy kasr (masalan 7/3) ko\'rinishida yozing.',
  'Запишите ответ целым числом или обыкновенной дробью (например 7/3).',
  'Juwapttı pútin san yamasa ápiwayı bólshek (mısalı 7/3) kórinisinde jazıń.', // kaa: tekshirilsin
  'Write the answer as an integer or a common fraction (for example 7/3).',
);

interface OpenPart {
  prompt: L10n;
  forms: string[];
}

function oSpec(c: Ctx, topic: number, parts: { a: OpenPart; b: OpenPart }, stem: L10n, solution: L10n, mistake: L10n, figure?: FigureFn): QuestionSpec {
  return {
    topic,
    difficulty: c.req.difficulty,
    estSeconds: EST.o,
    key: { a: parts.a.forms, b: parts.b.forms },
    content: (lang) => ({
      stem_md: stem[lang],
      solution_md: solution[lang],
      mistake_note_md: mistake[lang],
      payload: {
        parts: {
          a: { prompt_md: parts.a.prompt[lang], hint: OPEN_HINT[lang] },
          b: { prompt_md: parts.b.prompt[lang], hint: OPEN_HINT[lang] },
        },
        ...(figure ? { figure: figure(lang) } : {}),
      },
    }),
  };
}

const sh = <T>(rng: Rng, items: readonly T[]): T[] => rng.shuffle(items);
const nameTex = (s: string): string => s.replace(/([A-Z])1/g, '$1_1');
const tanOf = (deg: 30 | 45 | 60): Qty => (deg === 45 ? q(1) : deg === 60 ? q(1, { sq: 3 }) : q(frac(1, 3), { sq: 3 }));
const qMul = (a: Qty, k: Frac): Qty => ({ ...a, c: fMul(a.c, k) });

/** Chizma o'lchovsiz: juda yassi yoki cho'zinchoq ko'rinmasligi uchun balandlikni cheklaydi (sonlar yorliqlarda). */
const clampH = (h: number, ref: number): number => Math.min(Math.max(h, 0.7 * ref), 1.6 * ref);

/** Rasm ichidagi kesma uchun qisqa yordamchi */
const dashed = { dash: true, color: ACCENT, width: 2 } as const;
const solid = { color: ACCENT, width: 2.4 } as const;

// ============================ Y-1, L2 shablonlari ============================

/** 86: to'g'ri burchakli parallelepiped: diagonal va ikki o'lcham -> hajm */
const boxDiag: Template = {
  id: 'boxDiag',
  build(c) {
    const [qa, qb, qc, d] = pickRound(
      QUADS.filter((x) => x[3] >= 7 && x[3] <= 25),
      c.round,
      'boxDiag',
    );
    const [p1, p2, h] = sh(c.rng, [qa, qb, qc]) as [number, number, number];
    const V = p1 * p2 * h;
    const built = qOptions(q(V), [q(p1 * p2 * d), q(Math.abs(d - p1 - p2) * p1 * p2), q(frac(V, 3)), q((p1 + p2) * h * d), q(p1 * p2 * (h + 1))], c.rng);

    const svg = new Svg();
    const poly = boxPoly(p1, p2, h);
    const ctx = drawPoly(svg, poly);
    const P = poly.verts.map(ctx.pt);
    svg.line(P[0]!, P[6]!, dashed);
    segLabel(svg, P[0]!, P[1]!, String(p1), ctx.center);
    segLabel(svg, P[0]!, P[3]!, String(p2), ctx.center);
    const m = along(P[0]!, P[6]!, 0.5);
    svg.text([m[0] + 9, m[1] - 8], String(d), { size: 12, color: ACCENT, bold: true });
    const fig = figureOf(
      svg,
      L(
        `To'g'ri burchakli parallelepiped: asosi tomonlari ${p1} va ${p2}, diagonali ${d}.`,
        `Прямоугольный параллелепипед: стороны основания ${p1} и ${p2}, диагональ ${d}.`,
        `Tuwrı múyeshli parallelepiped: tiykarınıń tárepleri ${p1} hám ${p2}, diagonalı ${d}.`,
        `Rectangular box: base sides ${p1} and ${p2}, space diagonal ${d}.`,
      ),
    );

    const texts = (lang: Lang): Texts => ({
      stem: L(
        `To'g'ri burchakli parallelepipedning asosi tomonlari $${p1}$ va $${p2}$, diagonali esa $${d}$ ga teng. Parallelepipedning hajmini toping.`,
        `Стороны основания прямоугольного параллелепипеда равны $${p1}$ и $${p2}$, а его диагональ равна $${d}$. Найдите объём параллелепипеда.`,
        `Tuwrı múyeshli parallelepipedtiń tiykarınıń tárepleri $${p1}$ hám $${p2}$, diagonalı $${d}$ ge teń. Parallelepipedtiń kólemin tabıń.`,
        `The base of a rectangular box has sides $${p1}$ and $${p2}$, and the space diagonal of the box equals $${d}$. Find the volume of the box.`,
      )[lang],
      solution: join(
        L(
          `Parallelepiped diagonalining kvadrati uchta o'lcham kvadratlari yig'indisiga teng: $d^2=a^2+b^2+c^2$.`,
          `Квадрат диагонали параллелепипеда равен сумме квадратов трёх измерений: $d^2=a^2+b^2+c^2$.`,
          `Parallelepiped diagonalınıń kvadratı úsh ólshem kvadratlarınıń qosındısına teń: $d^2=a^2+b^2+c^2$.`,
          `The square of the space diagonal equals the sum of the squares of the three dimensions: $d^2=a^2+b^2+c^2$.`,
        )[lang],
        `$c^2=${d}^2-${p1}^2-${p2}^2=${d * d}-${p1 * p1}-${p2 * p2}=${h * h}$, $c=${h}$.`,
        `$V=abc=${p1}\\cdot${p2}\\cdot${h}=${V}$.`,
      ),
      mistake: L(
        `Diagonal formulasida kvadratlarni unutish ($d=a+b+c$ deb olish) yoki diagonalni balandlik o'rnida ishlatish.`,
        `Забыть о квадратах в формуле диагонали ($d=a+b+c$) или принять диагональ за высоту.`,
        `Diagonal formulasında kvadratlardı umıtıw ($d=a+b+c$ dep alıw) yamasa diagonaldı biyiklik orında paydalanıw.`,
        `Forgetting the squares in the diagonal formula ($d=a+b+c$) or using the diagonal as the height.`,
      )[lang],
    });
    return { spec: y1Spec(c, 86, EST.y1L2, built, texts, fig), facts: { id: 'boxDiag', dims: [p1, p2, h], d } };
  },
};

/** 87: muntazam to'rtburchakli piramida: asos tomoni va balandlik -> yon sirt */
const pyrLateral: Template = {
  id: 'pyrLateral',
  build(c) {
    const [x, y, m] = pickRound(
      TRIPLES.filter((t) => t[2] <= 26),
      c.round,
      'pyrLateral',
    );
    const [p, h] = sh(c.rng, [x, y]) as [number, number];
    const a = 2 * p;
    const S = 2 * a * m;
    const built = qOptions(q(S), [q(a * m), q(a * a + 2 * a * m), q(4 * a * m), q(2 * a * h), q(a * h * 2 + a * a)], c.rng);

    const svg = new Svg();
    const poly = pyramidPoly(squareBase(a), [a / 2, a / 2, clampH(h, a)]);
    const O: V3 = [a / 2, a / 2, 0];
    const ctx = drawPoly(svg, poly, { extraPts: [O] });
    const P = poly.verts.map(ctx.pt);
    svg.line(ctx.pt(O), P[4]!, dashed);
    svg.dot(ctx.pt(O), 2);
    svg.text([ctx.pt(O)[0] + 9, ctx.pt(O)[1] + 8], 'O', { size: 12, bold: true });
    segLabel(svg, P[0]!, P[1]!, String(a), ctx.center);
    svg.text([along(ctx.pt(O), P[4]!, 0.5)[0] + 9, along(ctx.pt(O), P[4]!, 0.5)[1]], String(h), { size: 12, color: ACCENT, bold: true });
    const fig = figureOf(
      svg,
      L(
        `Muntazam to'rtburchakli piramida SABCD: asos tomoni ${a}, balandligi SO = ${h}.`,
        `Правильная четырёхугольная пирамида SABCD: сторона основания ${a}, высота SO = ${h}.`,
        `Durıs tórtmúyeshli piramida SABCD: tiykar tárepi ${a}, biyikligi SO = ${h}.`,
        `Regular square pyramid SABCD: base side ${a}, height SO = ${h}.`,
      ),
    );

    const texts = (lang: Lang): Texts => ({
      stem: L(
        `Muntazam to'rtburchakli piramidaning asosi tomoni $${a}$, balandligi $${h}$ ga teng. Piramidaning yon sirtining yuzini toping.`,
        `Сторона основания правильной четырёхугольной пирамиды равна $${a}$, а высота равна $${h}$. Найдите площадь боковой поверхности пирамиды.`,
        `Durıs tórtmúyeshli piramidanıń tiykarınıń tárepi $${a}$, biyikligi $${h}$ ǵa teń. Piramidanıń jan bet maydanın tabıń.`,
        `The base of a regular square pyramid has side $${a}$ and the height of the pyramid is $${h}$. Find the lateral surface area of the pyramid.`,
      )[lang],
      solution: join(
        L(
          `Yon yoqning balandligi (apofema) $m$: asos markazidan yon yoq asosigacha masofa $\\frac{a}{2}=${p}$, shuning uchun $m=\\sqrt{h^2+${p}^2}=\\sqrt{${h}^2+${p}^2}=${m}$.`,
          `Высота боковой грани (апофема) $m$: расстояние от центра основания до стороны основания равно $\\frac{a}{2}=${p}$, поэтому $m=\\sqrt{${h}^2+${p}^2}=${m}$.`,
          `Jan jaqtıń biyikligi (apofema) $m$: tiykar orayınan tiykar tárepine shekemgi aralıq $\\frac{a}{2}=${p}$, sonıń ushın $m=\\sqrt{${h}^2+${p}^2}=${m}$.`,
          `The slant height $m$ of a lateral face: the distance from the center of the base to a side of the base is $\\frac{a}{2}=${p}$, so $m=\\sqrt{${h}^2+${p}^2}=${m}$.`,
        )[lang],
        L(
          `Yon sirt to'rtta teng uchburchakdan iborat: $S=4\\cdot\\frac12 am=2am=2\\cdot${a}\\cdot${m}=${S}$.`,
          `Боковая поверхность состоит из четырёх равных треугольников: $S=4\\cdot\\frac12 am=2am=2\\cdot${a}\\cdot${m}=${S}$.`,
          `Jan bet tórt teń úshmúyeshlikten ibarat: $S=4\\cdot\\frac12 am=2am=2\\cdot${a}\\cdot${m}=${S}$.`,
          `The lateral surface consists of four equal triangles: $S=4\\cdot\\frac12 am=2am=2\\cdot${a}\\cdot${m}=${S}$.`,
        )[lang],
      ),
      mistake: L(
        `Apofema o'rniga piramida balandligini ishlatish yoki asos yuzini ham qo'shib yuborish (bu to'liq sirt bo'lib qoladi).`,
        `Использовать вместо апофемы высоту пирамиды или добавить площадь основания (получится полная поверхность).`,
        `Apofema ornına piramida biyikligin paydalanıw yamasa tiykar maydanın da qosıp jiberiw (bul tolıq bet boladı).`,
        `Using the pyramid height instead of the slant height, or adding the base area (that gives the total surface).`,
      )[lang],
    });
    return { spec: y1Spec(c, 87, EST.y1L2, built, texts, fig), facts: { id: 'pyrLateral', a, h } };
  },
};

/** 88: silindr: o'q kesimi yuzi va radius -> hajm */
const cylSection: Template = {
  id: 'cylSection',
  build(c) {
    const pool: [number, number][] = [];
    for (let R = 2; R <= 9; R++) for (let h = 2; h <= 13; h++) pool.push([R, h]);
    const [R, h] = pickRound(pool, c.round, 'cylSection');
    const S = 2 * R * h;
    const built = qOptions(q(R * R * h, { pi: true }), [q(R * S, { pi: true }), q(R * R * S, { pi: true }), q(S, { pi: true }), q(frac(R * R * h, 3), { pi: true }), q(R * h * h, { pi: true })], c.rng);

    const svg = new Svg();
    const rx = 52;
    const hp = 110;
    const base: P2 = [160, 168];
    svg.poly(
      [
        [base[0] - rx, base[1]],
        [base[0] + rx, base[1]],
        [base[0] + rx, base[1] - hp],
        [base[0] - rx, base[1] - hp],
      ],
      { fill: SOFT, opacity: 0.55, color: SOFT, width: 0.1 },
    );
    const r = drawCylinder(svg, base, rx, hp);
    svg.line(r.c, r.top, { dash: true, color: ACCENT, width: 1.6 });
    svg.line(r.top, [r.top[0] + rx, r.top[1]], solid);
    svg.dot(r.top, 2);
    svg.text([r.top[0] + rx / 2, r.top[1] - 9], 'R', { size: 13, color: ACCENT, bold: true });
    svg.text([base[0] - 18, base[1] - hp / 2], 'S', { size: 15, color: ACCENT, bold: true });
    const fig = figureOf(
      svg,
      L(
        `Silindr va uning o'q kesimi (to'g'ri to'rtburchak, yuzi ${S}); asosining radiusi ${R}.`,
        `Цилиндр и его осевое сечение (прямоугольник площади ${S}); радиус основания ${R}.`,
        `Cilindr hám onıń kósher kesimi (tuwrı tórtmúyeshlik, maydanı ${S}); tiykarınıń radiusı ${R}.`,
        `A cylinder and its axial section (a rectangle of area ${S}); base radius ${R}.`,
      ),
    );

    const texts = (lang: Lang): Texts => ({
      stem: L(
        `Silindr o'q kesimining yuzi $${S}$ ga, asosining radiusi $${R}$ ga teng. Silindrning hajmini toping.`,
        `Площадь осевого сечения цилиндра равна $${S}$, а радиус основания равен $${R}$. Найдите объём цилиндра.`,
        `Cilindrdiń kósher kesiminiń maydanı $${S}$ ge, tiykarınıń radiusı $${R}$ ge teń. Cilindrdiń kólemin tabıń.`,
        `The axial section of a cylinder has area $${S}$ and the base radius is $${R}$. Find the volume of the cylinder.`,
      )[lang],
      solution: join(
        L(
          `O'q kesimi — tomonlari $2R$ va $h$ bo'lgan to'g'ri to'rtburchak: $S=2Rh$, bundan $h=\\frac{S}{2R}=\\frac{${S}}{${2 * R}}=${h}$.`,
          `Осевое сечение — прямоугольник со сторонами $2R$ и $h$: $S=2Rh$, откуда $h=\\frac{S}{2R}=\\frac{${S}}{${2 * R}}=${h}$.`,
          `Kósher kesim — tárepleri $2R$ hám $h$ bolǵan tuwrı tórtmúyeshlik: $S=2Rh$, bunnan $h=\\frac{S}{2R}=\\frac{${S}}{${2 * R}}=${h}$.`,
          `The axial section is a rectangle with sides $2R$ and $h$: $S=2Rh$, so $h=\\frac{S}{2R}=\\frac{${S}}{${2 * R}}=${h}$.`,
        )[lang],
        `$V=\\pi R^2h=\\pi\\cdot${R}^2\\cdot${h}=${R * R * h}\\pi$.`,
      ),
      mistake: L(
        `O'q kesimi yuzini $Rh$ deb olish (diametr o'rniga radius): balandlik ikki barobar katta chiqib, hajm noto'g'ri bo'ladi.`,
        `Считать площадь сечения равной $Rh$ (радиус вместо диаметра): высота получается вдвое больше, объём неверный.`,
        `Kesim maydanın $Rh$ dep alıw (diametr ornına radius): biyiklik eki ese úlken shıǵıp, kólem qáte boladı.`,
        `Taking the section area as $Rh$ (radius instead of diameter): the height comes out twice too large.`,
      )[lang],
    });
    return { spec: y1Spec(c, 88, EST.y1L2, built, texts, fig), facts: { id: 'cylSection', R, h, S } };
  },
};

/** 89: konus: asos radiusi va o'q kesimi yuzi -> yon sirt */
const coneGen: Template = {
  id: 'coneGen',
  build(c) {
    const [x, y, l] = pickRound(
      TRIPLES.filter((t) => t[2] <= 30),
      c.round,
      'coneGen',
    );
    const [r, h] = sh(c.rng, [x, y]) as [number, number];
    const S = r * h;
    const built = qOptions(q(r * l, { pi: true }), [q(r * h, { pi: true }), q(r * r, { pi: true }), q(r * (r + l), { pi: true }), q(l * l, { pi: true }), q(2 * r * l, { pi: true })], c.rng);

    const svg = new Svg();
    const rx = 62;
    const hp = 128;
    const base: P2 = [160, 172];
    svg.poly([[base[0] - rx, base[1]], [base[0] + rx, base[1]], [base[0], base[1] - hp]], { fill: SOFT, opacity: 0.55, color: SOFT, width: 0.1 });
    const cn = drawCone(svg, base, rx, hp);
    svg.line(cn.c, cn.top, { dash: true, color: ACCENT, width: 1.6 });
    svg.line(cn.c, [base[0] + rx, base[1]], solid);
    svg.dot(cn.c, 2);
    svg.text([base[0] + rx / 2, base[1] + 14], 'r', { size: 13, color: ACCENT, bold: true });
    svg.text([base[0] - 22, base[1] - hp / 3], 'S', { size: 15, color: ACCENT, bold: true });
    const fig = figureOf(
      svg,
      L(
        `Konus va uning o'q kesimi (uchburchak, yuzi ${S}); asosining radiusi ${r}.`,
        `Конус и его осевое сечение (треугольник площади ${S}); радиус основания ${r}.`,
        `Konus hám onıń kósher kesimi (úshmúyeshlik, maydanı ${S}); tiykarınıń radiusı ${r}.`,
        `A cone and its axial section (a triangle of area ${S}); base radius ${r}.`,
      ),
    );

    const texts = (lang: Lang): Texts => ({
      stem: L(
        `Konus asosining radiusi $${r}$ ga, o'q kesimining yuzi $${S}$ ga teng. Konusning yon sirtining yuzini toping.`,
        `Радиус основания конуса равен $${r}$, а площадь осевого сечения равна $${S}$. Найдите площадь боковой поверхности конуса.`,
        `Konus tiykarınıń radiusı $${r}$ ge, kósher kesiminiń maydanı $${S}$ ge teń. Konustıń jan bet maydanın tabıń.`,
        `The base radius of a cone is $${r}$ and the area of its axial section is $${S}$. Find the lateral surface area of the cone.`,
      )[lang],
      solution: join(
        L(
          `O'q kesimi — asosi $2r$, balandligi $h$ bo'lgan teng yonli uchburchak: $S=\\frac12\\cdot2r\\cdot h=rh$, demak $h=\\frac{${S}}{${r}}=${h}$.`,
          `Осевое сечение — равнобедренный треугольник с основанием $2r$ и высотой $h$: $S=\\frac12\\cdot2r\\cdot h=rh$, значит $h=\\frac{${S}}{${r}}=${h}$.`,
          `Kósher kesim — tiykarı $2r$, biyikligi $h$ bolǵan teń jambaslı úshmúyeshlik: $S=\\frac12\\cdot2r\\cdot h=rh$, demek $h=\\frac{${S}}{${r}}=${h}$.`,
          `The axial section is an isosceles triangle with base $2r$ and height $h$: $S=\\frac12\\cdot2r\\cdot h=rh$, so $h=\\frac{${S}}{${r}}=${h}$.`,
        )[lang],
        `$l=\\sqrt{r^2+h^2}=\\sqrt{${r * r}+${h * h}}=${l}$.`,
        `$S_{l}=\\pi rl=\\pi\\cdot${r}\\cdot${l}=${r * l}\\pi$.`,
      ),
      mistake: L(
        `Yasovchi o'rniga balandlikni olish ($\\pi rh$) yoki asos yuzini qo'shib yuborish.`,
        `Взять вместо образующей высоту ($\\pi rh$) или добавить площадь основания.`,
        `Jasawshı ornına biyiklikti alıw ($\\pi rh$) yamasa tiykar maydanın qosıp jiberiw.`,
        `Using the height instead of the slant height ($\\pi rh$), or adding the base area.`,
      )[lang],
    });
    return { spec: y1Spec(c, 89, EST.y1L2, built, texts, fig), facts: { id: 'coneGen', r, h, S } };
  },
};

/** 90: shar: kesim yuzi va markazdan masofa -> shar sirti */
const sphereSection: Template = {
  id: 'sphereSection',
  build(c) {
    const pool: [number, number][] = [];
    for (let r = 3; r <= 12; r++) for (let d = 2; d <= 12; d++) if (r !== d) pool.push([r, d]);
    const [r, d] = pickRound(pool, c.round, 'sphereSection');
    const R2 = r * r + d * d;
    const built = qOptions(
      q(4 * R2, { pi: true }),
      [q(4 * (r * r - d * d), { pi: true }), q(4 * r * r, { pi: true }), q(4 * d * d, { pi: true }), q(R2, { pi: true }), q(4 * (r + d) * (r + d), { pi: true })],
      c.rng,
    );

    const svg = new Svg();
    const Rp = 76;
    const k = Rp / Math.sqrt(R2);
    const O: P2 = [160, 118];
    drawSphere(svg, O, Rp);
    const O1: P2 = [O[0], O[1] - d * k];
    const rp = r * k;
    svg.ellipse(O1, rp, rp * 0.3, { color: ACCENT, width: 2 });
    svg.line(O, O1, dashed);
    svg.line(O1, [O1[0] + rp, O1[1]], solid);
    svg.dot(O, 2.4);
    svg.dot(O1, 2.4, ACCENT);
    svg.text([O[0] - 10, O[1] + 11], 'O', { size: 12, bold: true });
    svg.text([O1[0] - 11, O1[1] - 10], 'O1', { size: 12, color: ACCENT, bold: true });
    svg.text([O[0] + 8, (O[1] + O1[1]) / 2 + 3], 'd', { size: 12, color: ACCENT, bold: true });
    svg.text([O1[0] + rp / 2, O1[1] + 12], 'r', { size: 12, color: ACCENT, bold: true });
    const fig = figureOf(
      svg,
      L(
        `Shar va uni kesgan tekislik: markazdan masofa ${d}, kesim doirasi yuzi ${r * r}π.`,
        `Шар и секущая плоскость: расстояние от центра ${d}, площадь сечения ${r * r}π.`,
        `Shar hám onı kesken tegislik: orayınan aralıq ${d}, kesim maydanı ${r * r}π.`,
        `A ball cut by a plane: distance from the center ${d}, section area ${r * r}π.`,
      ),
    );

    const texts = (lang: Lang): Texts => ({
      stem: L(
        `Shar markazidan $${d}$ masofada o'tuvchi tekislik sharni yuzi $${r * r}\\pi$ bo'lgan doira bo'yicha kesadi. Shar sirtining yuzini toping.`,
        `Плоскость, проходящая на расстоянии $${d}$ от центра шара, пересекает шар по кругу площади $${r * r}\\pi$. Найдите площадь поверхности шара.`,
        `Shar orayınan $${d}$ aralıqtan ótken tegislik sharni maydanı $${r * r}\\pi$ bolǵan dóńgelek boyınsha kesedi. Shar betiniń maydanın tabıń.`,
        `A plane at distance $${d}$ from the center of a ball cuts the ball in a disk of area $${r * r}\\pi$. Find the surface area of the ball.`,
      )[lang],
      solution: join(
        L(
          `Kesim radiusi $r$: $\\pi r^2=${r * r}\\pi$, demak $r=${r}$.`,
          `Радиус сечения $r$: $\\pi r^2=${r * r}\\pi$, значит $r=${r}$.`,
          `Kesim radiusı $r$: $\\pi r^2=${r * r}\\pi$, demek $r=${r}$.`,
          `The radius of the section is $r$: $\\pi r^2=${r * r}\\pi$, so $r=${r}$.`,
        )[lang],
        L(
          `Shar radiusi, markazdan kesim markazigacha masofa va kesim radiusi to'g'ri burchakli uchburchak hosil qiladi: $R^2=r^2+d^2=${r * r}+${d * d}=${R2}$.`,
          `Радиус шара, расстояние до плоскости и радиус сечения образуют прямоугольный треугольник: $R^2=r^2+d^2=${r * r}+${d * d}=${R2}$.`,
          `Shar radiusı, oraydan kesim orayına shekemgi aralıq hám kesim radiusı tuwrı múyeshli úshmúyeshlik payda etedi: $R^2=r^2+d^2=${r * r}+${d * d}=${R2}$.`,
          `The radius of the ball, the distance to the plane and the section radius form a right triangle: $R^2=r^2+d^2=${r * r}+${d * d}=${R2}$.`,
        )[lang],
        `$S=4\\pi R^2=4\\pi\\cdot${R2}=${4 * R2}\\pi$.`,
      ),
      mistake: L(
        `$R^2=r^2-d^2$ deb olish: Pifagor teoremasida shar radiusi gipotenuza, ya'ni eng katta tomon.`,
        `Писать $R^2=r^2-d^2$: радиус шара — гипотенуза, то есть наибольшая сторона треугольника.`,
        `$R^2=r^2-d^2$ dep alıw: Pifagor teoremasında shar radiusı gipotenuza, yaǵnıy eń úlken tárep.`,
        `Writing $R^2=r^2-d^2$: the radius of the ball is the hypotenuse, the longest side.`,
      )[lang],
    });
    return { spec: y1Spec(c, 90, EST.y1L2, built, texts, fig), facts: { id: 'sphereSection', r, d } };
  },
};

/** 93: koordinatalar: A va AB o'rtasi M -> |AB| */
const coordVec: Template = {
  id: 'coordVec',
  build(c) {
    const [qa, qb, qc, D] = pickRound(
      QUADS.filter((x) => x[3] <= 15),
      c.round,
      'coordVec',
    );
    const u = sh(c.rng, [qa, qb, qc]).map((v) => (c.rng.chance(0.5) ? -v : v)) as [number, number, number];
    const A = [c.rng.int(-4, 4), c.rng.int(-4, 4), c.rng.int(-4, 4)] as [number, number, number];
    const M = A.map((v, i) => v + u[i]!) as [number, number, number];
    const B = A.map((v, i) => v + 2 * u[i]!) as [number, number, number];
    const built = intOptions(2 * D, [D, D * D, 2 * (qa + qb + qc), qa + qb + qc, 4 * D, 2 * D * D], c.rng);

    const texts = (lang: Lang): Texts => ({
      stem: L(
        `Fazoda $${texPt('A', A)}$ nuqta va $AB$ kesmaning o'rtasi $${texPt('M', M)}$ berilgan. $AB$ kesmaning uzunligini toping.`,
        `В пространстве даны точка $${texPt('A', A)}$ и середина $${texPt('M', M)}$ отрезка $AB$. Найдите длину отрезка $AB$.`,
        `Keńislikte $${texPt('A', A)}$ noqatı hám $AB$ kesindisiniń ortası $${texPt('M', M)}$ berilgen. $AB$ kesindisiniń uzınlıǵın tabıń.`,
        `In space, a point $${texPt('A', A)}$ and the midpoint $${texPt('M', M)}$ of the segment $AB$ are given. Find the length of $AB$.`,
      )[lang],
      solution: join(
        `$\\vec{AM}=(${M.map((v, i) => v - A[i]!).join(';\\,')})$, $|AM|=\\sqrt{${u.map((v) => v * v).join('+')}}=\\sqrt{${D * D}}=${D}$.`,
        L(
          `$M$ — $AB$ ning o'rtasi, shuning uchun $B=2M-A=${texPt('', B)}$ va $|AB|=2|AM|=2\\cdot${D}=${2 * D}$.`,
          `$M$ — середина $AB$, поэтому $B=2M-A=${texPt('', B)}$ и $|AB|=2|AM|=2\\cdot${D}=${2 * D}$.`,
          `$M$ — $AB$ nıń ortası, sonıń ushın $B=2M-A=${texPt('', B)}$ hám $|AB|=2|AM|=2\\cdot${D}=${2 * D}$.`,
          `$M$ is the midpoint of $AB$, so $B=2M-A=${texPt('', B)}$ and $|AB|=2|AM|=2\\cdot${D}=${2 * D}$.`,
        )[lang],
      ),
      mistake: L(
        `$AM$ uzunligini topib to'xtash: $AB$ kesma $AM$ dan ikki marta uzun.`,
        `Остановиться на длине $AM$: отрезок $AB$ вдвое длиннее $AM$.`,
        `$AM$ uzınlıǵın tawıp toqtap qalıw: $AB$ kesindisi $AM$ nan eki ese uzın.`,
        `Stopping at the length of $AM$: the segment $AB$ is twice as long as $AM$.`,
      )[lang],
    });
    return { spec: y1Spec(c, 93, EST.y1L2, built, texts), facts: { id: 'coordVec', A, M } };
  },
};

// --- 83: fazoda to'g'ri chiziqlarning o'zaro joylashuvi (ko'pyoqlik qirralari bo'yicha sanash) ---

type Rel = 'parallel' | 'intersect' | 'skew';

export interface SolidDef {
  id: string;
  poly: Poly;
  kind: L10n;
  label: string;
  /** qirra nomi, masalan AA1, SA */
  edgeName: (a: number, b: number) => string;
}

export function buildSolids(): SolidDef[] {
  const prism = (id: string, n: number, kind: L10n, h: number): SolidDef => {
    const poly = prismPoly(regularBase(n, 1), h);
    return { id, poly, kind, label: nameTex(poly.names.slice(0, n).join('') + poly.names.slice(n).join('')), edgeName: (a, b) => poly.names[a]! + poly.names[b]! };
  };
  const pyr = (id: string, n: number, kind: L10n, apex: V3): SolidDef => {
    const poly = pyramidPoly(regularBase(n, 1), apex);
    return {
      id,
      poly,
      kind,
      label: 'S' + poly.names.slice(0, n).join(''),
      edgeName: (a, b) => (b === n ? poly.names[b]! + poly.names[a]! : poly.names[a]! + poly.names[b]!),
    };
  };
  const cubeP = boxPoly(1, 1, 1);
  const cube: SolidDef = {
    id: 'cube',
    poly: cubeP,
    kind: TERMS.cube,
    label: 'ABCDA_1B_1C_1D_1',
    edgeName: (a, b) => cubeP.names[a]! + cubeP.names[b]!,
  };
  return [
    cube,
    prism('triPrism', 3, L("muntazam uchburchakli prizma", 'правильная треугольная призма', 'durıs úshmúyeshli prizma', 'regular triangular prism'), 1.6),
    prism('pentPrism', 5, L("muntazam beshburchakli prizma", 'правильная пятиугольная призма', 'durıs bes múyeshli prizma', 'regular pentagonal prism'), 1.6),
    prism('hexPrism', 6, L("muntazam oltiburchakli prizma", 'правильная шестиугольная призма', 'durıs alti múyeshli prizma', 'regular hexagonal prism'), 1.6),
    pyr('quadPyr', 4, TERMS.regQuadPyramid, [0, 0, 1.6]),
    pyr('hexPyr', 6, L("muntazam oltiburchakli piramida", 'правильная шестиугольная пирамида', 'durıs alti múyeshli piramida', 'regular hexagonal pyramid'), [0, 0, 1.6]),
  ];
}

export function lineRelation(poly: Poly, e1: readonly [number, number], e2: readonly [number, number]): Rel {
  const p1 = poly.verts[e1[0]]!;
  const d1 = sub3(poly.verts[e1[1]]!, p1);
  const p2 = poly.verts[e2[0]]!;
  const d2 = sub3(poly.verts[e2[1]]!, p2);
  const cr = cross3(d1, d2);
  if (norm3(cr) < 1e-9 * norm3(d1) * norm3(d2)) return 'parallel';
  return Math.abs(dot3(sub3(p2, p1), cr)) < 1e-9 * norm3(cr) ? 'intersect' : 'skew';
}

const skewCount: Template = {
  id: 'skewCount',
  build(c) {
    const solids = buildSolids();
    const cands: { s: number; e: number; rel: Rel }[] = [];
    solids.forEach((s, si) => {
      const edges = polyEdges(s.poly);
      edges.forEach((e, ei) => {
        for (const rel of ['skew', 'parallel', 'intersect'] as Rel[]) {
          const n = edges.filter((f, fi) => fi !== ei && lineRelation(s.poly, e, f) === rel).length;
          if (n >= 2) cands.push({ s: si, e: ei, rel });
        }
      });
    });
    const pick = pickRound(cands, c.round, 'skewCount');
    const solidDef = solids[pick.s]!;
    const edges = polyEdges(solidDef.poly);
    const e = edges[pick.e]!;
    const groups: Record<Rel, string[]> = { parallel: [], intersect: [], skew: [] };
    edges.forEach((f, fi) => {
      if (fi !== pick.e) groups[lineRelation(solidDef.poly, e, f)].push(nameTex(solidDef.edgeName(f[0], f[1])));
    });
    const answer = groups[pick.rel].length;
    const eName = solidDef.edgeName(e[0], e[1]);
    const built = intOptions(answer, [groups.parallel.length, groups.intersect.length, groups.skew.length, edges.length - 1 - answer, answer + 1, answer - 1], c.rng);

    const svg = new Svg();
    drawPoly(svg, solidDef.poly, { highlight: [e] });
    const fig = figureOf(
      svg,
      L(
        `${solidDef.kind.uz} ${solidDef.poly.names.join('')}; ${eName} qirrasi ajratib ko'rsatilgan.`,
        `${solidDef.kind.ru}; ребро ${eName} выделено.`,
        `${solidDef.kind.kaa}; ${eName} qabırǵası ajıratıp kórsetilgen.`,
        `${solidDef.kind.en}; the edge ${eName} is highlighted.`,
      ),
    );
    const En = nameTex(eName);
    const list = (arr: string[], lang: Lang): string => (arr.length ? `$${arr.join(',\\ ')}$ (${arr.length})` : L('yo\'q', 'нет', 'joq', 'none')[lang]);

    const texts = (lang: Lang): Texts => {
      const relPhrase: Record<Rel, L10n> = {
        skew: L(`ayqash bo'ladi`, `скрещиваются с прямой`, `ayqas boladı`, `are skew to line`),
        parallel: L(`parallel bo'ladi`, `параллельны прямой`, `parallel boladı`, `are parallel to line`),
        intersect: L(`kesishadi`, `пересекают прямую`, `kesiledi`, `intersect line`),
      };
      const rp = relPhrase[pick.rel][lang];
      const stem = {
        uz: `Berilgan: ${solidDef.kind.uz} $${solidDef.label}$. Qolgan qirralari yotgan to'g'ri chiziqlardan nechtasi $${En}$ qirra yotgan to'g'ri chiziq bilan ${rp}?`,
        ru: `Дано: ${solidDef.kind.ru} $${solidDef.label}$. Сколько из прямых, содержащих остальные рёбра, ${rp} $${En}$?`,
        kaa: `Berilgen: $${solidDef.label}$ ${solidDef.kind.kaa}. Qalǵan qabırǵalar jatqan tuwrı sızıqlardan neshewi $${En}$ qabırǵa jatqan tuwrı sızıq penen ${pick.rel === 'intersect' ? 'kesiledi' : relPhrase[pick.rel].kaa}?`,
        en: `Given: ${solidDef.kind.en} $${solidDef.label}$. How many of the lines containing the other edges ${rp} $${En}$?`,
      }[lang];
      return {
        stem,
        solution: join(
          L(
            `$${En}$ qirraga nisbatan qolgan qirralarni tekshiramiz (to'g'ri chiziqlar sifatida).`,
            `Рассмотрим остальные рёбра как прямые относительно ребра $${En}$.`,
            `$${En}$ qabırǵasına salıstırǵanda qalǵan qabırǵalardı tuwrı sızıqlar retinde tekseremiz.`,
            `We compare the other edges, viewed as lines, with the edge $${En}$.`,
          )[lang],
          `${TERMS.parallel[lang]}: ${list(groups.parallel, lang)}; ${TERMS.intersecting[lang]}: ${list(groups.intersect, lang)}; ${TERMS.skew[lang]}: ${list(groups.skew, lang)}.`,
          L(`Javob: $${answer}$.`, `Ответ: $${answer}$.`, `Juwap: $${answer}$.`, `Answer: $${answer}$.`)[lang],
        ),
        mistake: L(
          `Parallel yoki kesishuvchi qirralarni ayqashlar qatoriga qo'shib yuborish, yoki qirraning o'zini sanash.`,
          `Причислить параллельные или пересекающиеся рёбра к скрещивающимся либо посчитать само ребро.`,
          `Parallel yamasa kesilisiwshi qabırǵalardı ayqaslar qatarına qosıp jiberiw, yamasa qabırǵanıń ózin sanaw.`,
          `Counting parallel or intersecting edges as skew ones, or counting the edge itself.`,
        )[lang],
      };
    };
    return { spec: y1Spec(c, 83, EST.y1L2, built, texts, fig), facts: { id: 'skewCount', solid: solidDef.id, edge: pick.e, rel: pick.rel, answer } };
  },
};

/** 84: piramida yon yog'i va asos orasidagi burchak -> hajm */
const pyrAngle: Template = {
  id: 'pyrAngle',
  build(c) {
    const pool: [30 | 45 | 60, number][] = [];
    for (const al of [45, 60, 30] as const) for (let k = 1; k <= 5; k++) pool.push([al, k]);
    const [al, k] = pickRound(pool, c.round, 'pyrAngle');
    const a = 6 * k;
    const t = tanOf(al);
    const base = frac(a * a * a, 6);
    const V = { c: fMul(base, t.c), sq: t.sq } satisfies Qty;
    const co = tanOf(al === 45 ? 45 : al === 60 ? 30 : 60);
    const built = qOptions(V, [{ c: fMul(frac(a * a * a, 3), t.c), sq: t.sq }, { c: fMul(base, co.c), sq: co.sq }, qMul(V, frac(3)), qMul(V, frac(1, 2)), qMul(V, frac(6))], c.rng);
    const h = (a / 2) * (al === 45 ? 1 : al === 60 ? Math.sqrt(3) : 1 / Math.sqrt(3));

    const svg = new Svg();
    const poly = pyramidPoly(squareBase(a), [a / 2, a / 2, h]);
    const O: V3 = [a / 2, a / 2, 0];
    const M: V3 = [a / 2, 0, 0];
    const ctx = drawPoly(svg, poly, { extraPts: [O, M] });
    const P = poly.verts.map(ctx.pt);
    svg.line(ctx.pt(O), P[4]!, dashed);
    svg.line(ctx.pt(O), ctx.pt(M), dashed);
    svg.line(P[4]!, ctx.pt(M), solid);
    svg.dot(ctx.pt(O), 2);
    svg.dot(ctx.pt(M), 2);
    svg.text([ctx.pt(O)[0] + 9, ctx.pt(O)[1] - 7], 'O', { size: 12, bold: true });
    svg.text([ctx.pt(M)[0] - 4, ctx.pt(M)[1] + 13], 'M', { size: 12, bold: true });
    svg.text([ctx.pt(M)[0] + 24, ctx.pt(M)[1] - 7], `${al}°`, { size: 12, color: ACCENT, bold: true });
    segLabel(svg, P[0]!, along(P[0]!, P[1]!, 0.35), String(a), ctx.center);
    const fig = figureOf(
      svg,
      L(
        `Muntazam to'rtburchakli piramida; yon yog'i asos bilan ${al} gradus burchak tashkil qiladi, asos tomoni ${a}.`,
        `Правильная четырёхугольная пирамида; боковая грань наклонена к основанию под углом ${al} градусов, сторона основания ${a}.`,
        `Durıs tórtmúyeshli piramida; jan jaǵı tiykar menen ${al} gradus múyesh jasaydı, tiykar tárepi ${a}.`,
        `Regular square pyramid; a lateral face makes an angle of ${al} degrees with the base, base side ${a}.`,
      ),
    );

    const texts = (lang: Lang): Texts => ({
      stem: L(
        `Muntazam to'rtburchakli piramidaning asos tomoni $${a}$ ga teng, yon yog'i asos tekisligi bilan $${al}^{\\circ}$ burchak hosil qiladi. Piramidaning hajmini toping.`,
        `Сторона основания правильной четырёхугольной пирамиды равна $${a}$, боковая грань образует с плоскостью основания угол $${al}^{\\circ}$. Найдите объём пирамиды.`,
        `Durıs tórtmúyeshli piramidanıń tiykar tárepi $${a}$ ǵa teń, jan jaǵı tiykar tegisligi menen $${al}^{\\circ}$ múyesh payda etedi. Piramidanıń kólemin tabıń.`,
        `The base of a regular square pyramid has side $${a}$, and a lateral face makes an angle of $${al}^{\\circ}$ with the plane of the base. Find the volume of the pyramid.`,
      )[lang],
      solution: join(
        L(
          `Asos markazidan yon yoq asosigacha masofa $OM=\\frac a2=${a / 2}$. $SOM$ to'g'ri burchakli uchburchakda $\\angle SMO=${al}^{\\circ}$, shuning uchun $h=OM\\cdot\\tan${al}^{\\circ}=${qTex({ c: fMul(frac(a, 2), t.c), sq: t.sq })}$.`,
          `Расстояние от центра основания до стороны $OM=\\frac a2=${a / 2}$. В прямоугольном треугольнике $SOM$ угол $\\angle SMO=${al}^{\\circ}$, поэтому $h=OM\\cdot\\tan${al}^{\\circ}=${qTex({ c: fMul(frac(a, 2), t.c), sq: t.sq })}$.`,
          `Tiykar orayınan jan jaq tiykarına shekemgi aralıq $OM=\\frac a2=${a / 2}$. $SOM$ tuwrı múyeshli úshmúyeshliginde $\\angle SMO=${al}^{\\circ}$, sonıń ushın $h=OM\\cdot\\tan${al}^{\\circ}=${qTex({ c: fMul(frac(a, 2), t.c), sq: t.sq })}$.`,
          `The distance from the center of the base to the side is $OM=\\frac a2=${a / 2}$. In the right triangle $SOM$ we have $\\angle SMO=${al}^{\\circ}$, so $h=OM\\cdot\\tan${al}^{\\circ}=${qTex({ c: fMul(frac(a, 2), t.c), sq: t.sq })}$.`,
        )[lang],
        `$V=\\frac13a^2h=\\frac13\\cdot${a * a}\\cdot${qTex({ c: fMul(frac(a, 2), t.c), sq: t.sq })}=${qTex(V)}$.`,
      ),
      mistake: L(
        `Balandlikni topishda $a/2$ o'rniga $a$ ni olish yoki $\\tan 30^{\\circ}$ va $\\tan 60^{\\circ}$ ni almashtirish.`,
        `Брать $a$ вместо $a/2$ при вычислении высоты или путать $\\tan 30^{\\circ}$ и $\\tan 60^{\\circ}$.`,
        `Biyiklikti tabıwda $a/2$ ornına $a$ nı alıw yamasa $\\tan 30^{\\circ}$ hám $\\tan 60^{\\circ}$ tı almastırıw.`,
        `Using $a$ instead of $a/2$ for the height, or swapping $\\tan 30^{\\circ}$ and $\\tan 60^{\\circ}$.`,
      )[lang],
    });
    return { spec: y1Spec(c, 84, EST.y1L2, built, texts, fig), facts: { id: 'pyrAngle', a, alpha: al } };
  },
};

const Y1_L2: Template[] = [boxDiag, skewCount, pyrLateral, cylSection, pyrAngle, coneGen, sphereSection, coordVec];

// ============================ Y-1, L3 shablonlari ============================

/** 92: shar ichiga chizilgan konus (o'q kesimi teng tomonli uchburchak) */
const coneInSphere: Template = {
  id: 'coneInSphere',
  build(c) {
    const m = pickRound([1, 2, 3, 4, 5], c.round, 'coneInSphere');
    const R = 2 * m;
    const ball = q(frac(32 * m ** 3, 3), { pi: true });
    const V = q(3 * m ** 3, { pi: true });
    const built = qOptions(V, [q(2 * m ** 3, { pi: true }), q(4 * m ** 3, { pi: true }), q(frac(8 * m ** 3, 3), { pi: true }), q(frac(16 * m ** 3, 3), { pi: true }), q(8 * m ** 3, { pi: true })], c.rng);

    const svg = new Svg();
    const O: P2 = [160, 112];
    const Rp = 82;
    svg.circle(O, Rp);
    const top: P2 = [O[0], O[1] - Rp];
    const by = O[1] + Rp / 2;
    const hw = (Rp * Math.sqrt(3)) / 2;
    svg.poly([top, [O[0] - hw, by], [O[0] + hw, by]], {});
    ellipseHalf(svg, [O[0], by], hw, hw * 0.28, 'front');
    ellipseHalf(svg, [O[0], by], hw, hw * 0.28, 'back', { dash: true, width: 1.2 });
    svg.line(top, [O[0], by], { dash: true, width: 1.2 });
    svg.line(O, [O[0] + Rp * Math.cos(Math.PI / 6), O[1] + Rp * Math.sin(Math.PI / 6)], dashed);
    svg.dot(O, 2.4);
    svg.text([O[0] - 10, O[1] - 8], 'O', { size: 12, bold: true });
    svg.text([O[0] + Rp * 0.5 + 8, O[1] + 24], 'R', { size: 13, color: ACCENT, bold: true });
    const fig = figureOf(
      svg,
      L(
        `Sharga chizilgan konus: o'q kesimi — shar katta doirasiga chizilgan teng tomonli uchburchak.`,
        `Конус, вписанный в шар: осевое сечение — равносторонний треугольник, вписанный в большой круг.`,
        `Sharǵa sızılǵan konus: kósher kesimi — shardıń úlken dóńgelegine sızılǵan teń tárepli úshmúyeshlik.`,
        `A cone inscribed in a ball: its axial section is an equilateral triangle inscribed in a great circle.`,
      ),
    );

    const texts = (lang: Lang): Texts => ({
      stem: L(
        `Hajmi $${qTex(ball)}$ bo'lgan sharga konus chizilgan: konusning uchi va asosining aylanasi shar sirtida yotadi, o'q kesimi esa teng tomonli uchburchak. Konusning hajmini toping.`,
        `В шар объёма $${qTex(ball)}$ вписан конус: его вершина и окружность основания лежат на поверхности шара, а осевое сечение — равносторонний треугольник. Найдите объём конуса.`,
        `Kólemi $${qTex(ball)}$ bolǵan sharǵa konus sızılǵan: konustıń ushı hám tiykarınıń aylanası shar betinde jatadı, kósher kesimi teń tárepli úshmúyeshlik. Konustıń kólemin tabıń.`,
        `A cone is inscribed in a ball of volume $${qTex(ball)}$: its apex and the circle of its base lie on the sphere, and its axial section is an equilateral triangle. Find the volume of the cone.`,
      )[lang],
      solution: join(
        L(
          `Shar radiusi: $\\frac43\\pi R^3=${qTex(ball)}$, bundan $R^3=${8 * m ** 3}$, $R=${R}$.`,
          `Радиус шара: $\\frac43\\pi R^3=${qTex(ball)}$, откуда $R^3=${8 * m ** 3}$, $R=${R}$.`,
          `Shar radiusı: $\\frac43\\pi R^3=${qTex(ball)}$, bunnan $R^3=${8 * m ** 3}$, $R=${R}$.`,
          `The radius of the ball: $\\frac43\\pi R^3=${qTex(ball)}$, so $R^3=${8 * m ** 3}$ and $R=${R}$.`,
        )[lang],
        L(
          `O'q kesimi radiusi $R$ bo'lgan aylanaga chizilgan teng tomonli uchburchak: balandligi $h=\\frac{3R}{2}=${3 * m}$, tomoni $R\\sqrt3$, asos radiusi $r=\\frac{R\\sqrt3}{2}$, $r^2=\\frac{3R^2}{4}=${3 * m * m}$.`,
          `Осевое сечение — равносторонний треугольник, вписанный в окружность радиуса $R$: высота $h=\\frac{3R}{2}=${3 * m}$, сторона $R\\sqrt3$, радиус основания $r=\\frac{R\\sqrt3}{2}$, $r^2=\\frac{3R^2}{4}=${3 * m * m}$.`,
          `Kósher kesim — radiusı $R$ bolǵan aylanaǵa sızılǵan teń tárepli úshmúyeshlik: biyikligi $h=\\frac{3R}{2}=${3 * m}$, tárepi $R\\sqrt3$, tiykar radiusı $r=\\frac{R\\sqrt3}{2}$, $r^2=\\frac{3R^2}{4}=${3 * m * m}$.`,
          `The axial section is an equilateral triangle inscribed in a circle of radius $R$: its height is $h=\\frac{3R}{2}=${3 * m}$, its side is $R\\sqrt3$, the base radius is $r=\\frac{R\\sqrt3}{2}$, $r^2=\\frac{3R^2}{4}=${3 * m * m}$.`,
        )[lang],
        `$V=\\frac13\\pi r^2h=\\frac13\\pi\\cdot${3 * m * m}\\cdot${3 * m}=${3 * m ** 3}\\pi$.`,
      ),
      mistake: L(
        `Teng tomonli uchburchakning balandligi $\\frac{3R}{2}$ ekanini unutib, balandlikni $R$ yoki $2R$ deb olish.`,
        `Забыть, что высота правильного треугольника, вписанного в окружность, равна $\\frac{3R}{2}$, и взять $R$ или $2R$.`,
        `Teń tárepli úshmúyeshliktiń biyikligi $\\frac{3R}{2}$ ekenin umıtıp, biyiklikti $R$ yamasa $2R$ dep alıw.`,
        `Forgetting that the height of the inscribed equilateral triangle is $\\frac{3R}{2}$ and using $R$ or $2R$ instead.`,
      )[lang],
    });
    return { spec: y1Spec(c, 92, EST.y1L3, built, texts, fig), facts: { id: 'coneInSphere', m } };
  },
};

/** 87: muntazam uchburchakli piramida: yon qirra va balandlik -> hajm */
const triPyr: Template = {
  id: 'triPyr',
  build(c) {
    const [x, y, l] = pickRound(
      TRIPLES.filter((t) => t[2] <= 30),
      c.round,
      'triPyr',
    );
    const [rho, h] = sh(c.rng, [x, y]) as [number, number];
    const k = rho * rho * h;
    const V: Qty = { c: frac(k, 4), sq: 3 };
    const built = qOptions(V, [{ c: frac(k, 12), sq: 3 }, { c: frac(3 * k, 4), sq: 3 }, { c: frac(l * l * h, 12), sq: 3 }, { c: frac(l * l * h, 4), sq: 3 }, { c: frac(k, 6), sq: 3 }], c.rng);

    const svg = new Svg();
    const poly = pyramidPoly(regularBase(3, rho), [0, 0, clampH(h, rho * 1.7)]);
    const O: V3 = [0, 0, 0];
    const ctx = drawPoly(svg, poly, { extraPts: [O], highlight: [[0, 3]] });
    const P = poly.verts.map(ctx.pt);
    svg.line(ctx.pt(O), P[3]!, dashed);
    svg.dot(ctx.pt(O), 2);
    svg.text([ctx.pt(O)[0] + 9, ctx.pt(O)[1] + 8], 'O', { size: 12, bold: true });
    segLabel(svg, P[0]!, P[3]!, String(l), ctx.center);
    const mh = along(ctx.pt(O), P[3]!, 0.5);
    svg.text([mh[0] + 10, mh[1]], String(h), { size: 12, color: ACCENT, bold: true });
    const fig = figureOf(
      svg,
      L(
        `Muntazam uchburchakli piramida SABC: yon qirra ${l}, balandlik SO = ${h}.`,
        `Правильная треугольная пирамида SABC: боковое ребро ${l}, высота SO = ${h}.`,
        `Durıs úshmúyeshli piramida SABC: jan qabırǵa ${l}, biyiklik SO = ${h}.`,
        `Regular triangular pyramid SABC: lateral edge ${l}, height SO = ${h}.`,
      ),
    );

    const texts = (lang: Lang): Texts => ({
      stem: L(
        `Muntazam uchburchakli piramidaning yon qirrasi $${l}$, balandligi $${h}$ ga teng. Piramidaning hajmini toping.`,
        `Боковое ребро правильной треугольной пирамиды равно $${l}$, а высота равна $${h}$. Найдите объём пирамиды.`,
        `Durıs úshmúyeshli piramidanıń jan qabırǵası $${l}$ ge, biyikligi $${h}$ ǵa teń. Piramidanıń kólemin tabıń.`,
        `The lateral edge of a regular triangular pyramid is $${l}$ and its height is $${h}$. Find the volume of the pyramid.`,
      )[lang],
      solution: join(
        L(
          `Balandlik asos markaziga tushadi, shuning uchun asosga tashqi chizilgan aylana radiusi $\\rho=\\sqrt{l^2-h^2}=\\sqrt{${l * l}-${h * h}}=${rho}$.`,
          `Высота падает в центр основания, поэтому радиус описанной около основания окружности $\\rho=\\sqrt{l^2-h^2}=\\sqrt{${l * l}-${h * h}}=${rho}$.`,
          `Biyiklik tiykar orayına túsedi, sonıń ushın tiykarǵa sırttan sızılǵan aylana radiusı $\\rho=\\sqrt{l^2-h^2}=\\sqrt{${l * l}-${h * h}}=${rho}$.`,
          `The height meets the base at its center, so the circumradius of the base is $\\rho=\\sqrt{l^2-h^2}=\\sqrt{${l * l}-${h * h}}=${rho}$.`,
        )[lang],
        L(
          `Muntazam uchburchak tomoni $a=\\rho\\sqrt3=${rho}\\sqrt3$, yuzi $S=\\frac{\\sqrt3}{4}a^2=\\frac{3\\sqrt3}{4}\\rho^2=\\frac{${3 * rho * rho}\\sqrt3}{4}$.`,
          `Сторона правильного треугольника $a=\\rho\\sqrt3=${rho}\\sqrt3$, площадь $S=\\frac{\\sqrt3}{4}a^2=\\frac{3\\sqrt3}{4}\\rho^2=\\frac{${3 * rho * rho}\\sqrt3}{4}$.`,
          `Durıs úshmúyeshliktiń tárepi $a=\\rho\\sqrt3=${rho}\\sqrt3$, maydanı $S=\\frac{\\sqrt3}{4}a^2=\\frac{3\\sqrt3}{4}\\rho^2=\\frac{${3 * rho * rho}\\sqrt3}{4}$.`,
          `The side of the equilateral base is $a=\\rho\\sqrt3=${rho}\\sqrt3$ and its area is $S=\\frac{\\sqrt3}{4}a^2=\\frac{3\\sqrt3}{4}\\rho^2=\\frac{${3 * rho * rho}\\sqrt3}{4}$.`,
        )[lang],
        `$V=\\frac13Sh=\\frac13\\cdot\\frac{${3 * rho * rho}\\sqrt3}{4}\\cdot${h}=${qTex(V)}$.`,
      ),
      mistake: L(
        `Asos uchburchagi tomonini $\\rho$ ga teng deb olish ($a=\\rho\\sqrt3$ ekanini unutish) yoki hajm formulasida $\\frac13$ ni tushirib qoldirish.`,
        `Принять сторону основания равной $\\rho$ (забыв, что $a=\\rho\\sqrt3$) или опустить множитель $\\frac13$ в формуле объёма.`,
        `Tiykar úshmúyeshliginiń tárepin $\\rho$ ǵa teń dep alıw ($a=\\rho\\sqrt3$ ekenin umıtıw) yamasa kólem formulasında $\\frac13$ ti túsirip qaldırıw.`,
        `Taking the side of the base to be $\\rho$ (forgetting $a=\\rho\\sqrt3$) or dropping the factor $\\frac13$ in the volume formula.`,
      )[lang],
    });
    return { spec: y1Spec(c, 87, EST.y1L3, built, texts, fig), facts: { id: 'triPyr', rho, h, l } };
  },
};

/** 89: kesik konus: asos radiuslari va yasovchi -> hajm */
interface FrustumCfg {
  diff: number;
  h: number;
  l: number;
  r2: number;
}
function frustumPool(maxL: number): FrustumCfg[] {
  const out: FrustumCfg[] = [];
  for (const [x, y, l] of TRIPLES) {
    if (l > maxL) continue;
    for (const [diff, h] of [[x, y], [y, x]] as const) for (const r2 of [2, 3, 4, 5]) out.push({ diff, h, l, r2 });
  }
  return out;
}

const frustumCone: Template = {
  id: 'frustumCone',
  build(c) {
    const { diff, h, l, r2 } = pickRound(frustumPool(20), c.round, 'frustumCone');
    const r1 = r2 + diff;
    const sum = r1 * r1 + r1 * r2 + r2 * r2;
    const V = q(frac(h * sum, 3), { pi: true });
    const built = qOptions(V, [q(frac(l * sum, 3), { pi: true }), q(frac(h * (r1 * r1 + r2 * r2), 3), { pi: true }), q(h * sum, { pi: true }), q(frac(h * (r1 + r2) * (r1 + r2), 3), { pi: true }), q(frac(h * r1 * r1, 3), { pi: true })], c.rng);

    const svg = new Svg();
    const s = Math.min(70 / r1, 120 / h);
    const base: P2 = [150, 178];
    const fr = drawFrustum(svg, base, r1 * s, r2 * s, h * s);
    svg.line(fr.c, fr.top, { dash: true, width: 1.2 });
    svg.line(fr.c, [base[0] + r1 * s, base[1]], solid);
    svg.line(fr.top, [fr.top[0] + r2 * s, fr.top[1]], solid);
    svg.dot(fr.c, 2);
    svg.dot(fr.top, 2);
    svg.text([base[0] + (r1 * s) / 2, base[1] + 14], String(r1), { size: 12, color: ACCENT, bold: true });
    svg.text([fr.top[0] + (r2 * s) / 2, fr.top[1] - 8], String(r2), { size: 12, color: ACCENT, bold: true });
    segLabel(svg, [base[0] + r1 * s, base[1]], [fr.top[0] + r2 * s, fr.top[1]], String(l), base, 12);
    const fig = figureOf(
      svg,
      L(
        `Kesik konus: asoslarining radiuslari ${r1} va ${r2}, yasovchisi ${l}.`,
        `Усечённый конус: радиусы оснований ${r1} и ${r2}, образующая ${l}.`,
        `Kesik konus: tiykarlarınıń radiusları ${r1} hám ${r2}, jasawshısı ${l}.`,
        `A truncated cone: base radii ${r1} and ${r2}, slant height ${l}.`,
      ),
    );

    const texts = (lang: Lang): Texts => ({
      stem: L(
        `Kesik konus asoslarining radiuslari $${r1}$ va $${r2}$, yasovchisi $${l}$ ga teng. Kesik konusning hajmini toping.`,
        `Радиусы оснований усечённого конуса равны $${r1}$ и $${r2}$, а образующая равна $${l}$. Найдите объём усечённого конуса.`,
        `Kesik konus tiykarlarınıń radiusları $${r1}$ hám $${r2}$, jasawshısı $${l}$ ge teń. Kesik konustıń kólemin tabıń.`,
        `The base radii of a truncated cone are $${r1}$ and $${r2}$ and its slant height is $${l}$. Find the volume of the truncated cone.`,
      )[lang],
      solution: join(
        L(
          `Balandlikni o'q kesimidagi to'g'ri burchakli uchburchakdan topamiz: katetlari $h$ va $r_1-r_2=${diff}$, gipotenuzasi $l=${l}$. $h=\\sqrt{${l * l}-${diff * diff}}=${h}$.`,
          `Высоту найдём из прямоугольного треугольника в осевом сечении: катеты $h$ и $r_1-r_2=${diff}$, гипотенуза $l=${l}$. $h=\\sqrt{${l * l}-${diff * diff}}=${h}$.`,
          `Biyiklikti kósher kesimdegi tuwrı múyeshli úshmúyeshlikten tabamız: katetleri $h$ hám $r_1-r_2=${diff}$, gipotenuzası $l=${l}$. $h=\\sqrt{${l * l}-${diff * diff}}=${h}$.`,
          `We find the height from the right triangle in the axial section: the legs are $h$ and $r_1-r_2=${diff}$, the hypotenuse is $l=${l}$. $h=\\sqrt{${l * l}-${diff * diff}}=${h}$.`,
        )[lang],
        `$V=\\frac{\\pi h}{3}(r_1^2+r_1r_2+r_2^2)=\\frac{\\pi\\cdot${h}}{3}(${r1 * r1}+${r1 * r2}+${r2 * r2})=${qTex(V)}$.`,
      ),
      mistake: L(
        `Balandlik o'rniga yasovchini qo'yish yoki formulada $r_1r_2$ hadini tushirib qoldirish.`,
        `Подставить вместо высоты образующую или потерять слагаемое $r_1r_2$ в формуле.`,
        `Biyiklik ornına jasawshını qoyıw yamasa formulada $r_1r_2$ ǵarezin túsirip qaldırıw.`,
        `Substituting the slant height for the height, or dropping the term $r_1r_2$ in the formula.`,
      )[lang],
    });
    return { spec: y1Spec(c, 89, EST.y1L3, built, texts, fig), facts: { id: 'frustumCone', r1, r2, l, h } };
  },
};

/** 91: piramidani asosga parallel tekislik bilan kesish -> kesik piramida hajmi */
const parallelSection: Template = {
  id: 'parallelSection',
  build(c) {
    const pool: [number, number, number][] = [];
    for (const [m, n] of [[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2], [1, 4], [4, 1]] as const) for (let t = 1; t <= 4; t++) pool.push([m, n, t]);
    const [m, n, t] = pickRound(pool, c.round, 'parallelSection');
    const s = m + n;
    const V = t * s ** 3;
    const ans = t * (s ** 3 - m ** 3);
    const built = qOptions(q(ans), [q(t * n * s * s), q(t * s * (s * s - m * m)), q(t * m ** 3), q(t * m * m * s), q(t * (s ** 3 - n ** 3))], c.rng);

    const svg = new Svg();
    const poly = pyramidPoly(squareBase(2), [1, 1, 1.8]);
    const O: V3 = [1, 1, 0];
    const ctx = drawPoly(svg, poly, { extraPts: [O] });
    const k = m / s;
    const apex = poly.verts[4]!;
    const Q = [0, 1, 2, 3].map((i) => lerp3(apex, poly.verts[i]!, k));
    const Qp = Q.map(ctx.pt);
    svg.poly(Qp, { fill: SOFT, opacity: 0.5, color: SOFT, width: 0.1 });
    for (let i = 0; i < 4; i++) svg.line(Qp[i]!, Qp[(i + 1) % 4]!, { color: ACCENT, width: 2, dash: !ctx.faceVisible[1 + i] });
    const S = ctx.pt(apex);
    const Oc = ctx.pt(O);
    const K = ctx.pt(lerp3(apex, O, k));
    svg.line(S, Oc, { dash: true, width: 1.3 });
    svg.dot(K, 2);
    const a1 = along(S, K, 0.5);
    const a2 = along(K, Oc, 0.5);
    svg.text([a1[0] + 9, a1[1]], String(m), { size: 13, color: ACCENT, bold: true });
    svg.text([a2[0] + 9, a2[1]], String(n), { size: 13, color: ACCENT, bold: true });
    const fig = figureOf(
      svg,
      L(
        `Piramida va asosga parallel kesim: balandlik uchidan boshlab ${m}:${n} nisbatda bo'lingan.`,
        `Пирамида и сечение, параллельное основанию: высота разделена в отношении ${m}:${n}, считая от вершины.`,
        `Piramida hám tiykarǵa parallel kesim: biyiklik ushınan baslap ${m}:${n} qatnasta bólingen.`,
        `A pyramid with a section parallel to the base: the height is divided in the ratio ${m}:${n} from the apex.`,
      ),
    );

    const texts = (lang: Lang): Texts => ({
      stem: L(
        `Piramidaning hajmi $${V}$ ga teng. Asosiga parallel tekislik piramida balandligini uchidan boshlab $${m}:${n}$ nisbatda bo'ladi. Piramidaning asos va kesim orasidagi qismi (kesik piramida) hajmini toping.`,
        `Объём пирамиды равен $${V}$. Плоскость, параллельная основанию, делит высоту пирамиды в отношении $${m}:${n}$, считая от вершины. Найдите объём части пирамиды между основанием и сечением (усечённой пирамиды).`,
        `Piramidanıń kólemi $${V}$ ge teń. Tiykarına parallel tegislik piramida biyikligin ushınan baslap $${m}:${n}$ qatnasta bóledi. Piramidanıń tiykar menen kesim arasındaǵı bóleginiń (kesik piramidanıń) kólemin tabıń.`,
        `A pyramid has volume $${V}$. A plane parallel to the base divides the height of the pyramid in the ratio $${m}:${n}$, counting from the apex. Find the volume of the part between the base and the section (the frustum).`,
      )[lang],
      solution: join(
        L(
          `Uchi tomondagi kichik piramida berilgan piramidaga o'xshash, o'xshashlik koeffitsiyenti $k=\\frac{${m}}{${s}}$. Hajmlar nisbati $k^3=\\frac{${m ** 3}}{${s ** 3}}$.`,
          `Малая пирамида у вершины подобна данной с коэффициентом $k=\\frac{${m}}{${s}}$. Отношение объёмов равно $k^3=\\frac{${m ** 3}}{${s ** 3}}$.`,
          `Ush jaqtaǵı kishi piramida berilgen piramidaǵa uqsas, uqsaslıq koeffitsiyenti $k=\\frac{${m}}{${s}}$. Kólemler qatnası $k^3=\\frac{${m ** 3}}{${s ** 3}}$.`,
          `The small pyramid at the apex is similar to the given one with ratio $k=\\frac{${m}}{${s}}$, so the ratio of volumes is $k^3=\\frac{${m ** 3}}{${s ** 3}}$.`,
        )[lang],
        `$V_{small}=${V}\\cdot\\frac{${m ** 3}}{${s ** 3}}=${t * m ** 3}$.`,
        `$V_{frustum}=${V}-${t * m ** 3}=${ans}$.`,
      ),
      mistake: L(
        `Hajmlar nisbatini chiziqli nisbat ($k$) yoki yuzlar nisbati ($k^2$) deb olish; kichik piramida hajmini javob sifatida yozish.`,
        `Считать отношение объёмов равным $k$ или $k^2$; записать в ответ объём малой пирамиды вместо усечённой.`,
        `Kólemler qatnasın sızıqlı qatnas ($k$) yamasa maydanlar qatnası ($k^2$) dep alıw; juwap retinde kishi piramida kólemin jazıw.`,
        `Taking the ratio of volumes to be $k$ or $k^2$, or answering with the volume of the small pyramid instead of the frustum.`,
      )[lang],
    });
    return { spec: y1Spec(c, 91, EST.y1L3, built, texts, fig), facts: { id: 'parallelSection', m, n, V } };
  },
};

/** 93: nuqtadan tekislikkacha masofa (koordinatalar) */
const planeDist: Template = {
  id: 'planeDist',
  build(c) {
    const rng = slotRng(c.req, `planeDist${c.round}`);
    const rv = (lo: number, hi: number): V3 => [rng.int(lo, hi), rng.int(lo, hi), rng.int(lo, hi)];
    let found: { A: V3; B: V3; C: V3; D: V3; n: V3; N: number; num: number } | null = null;
    for (let tries = 0; tries < 200000 && !found; tries++) {
      const A = rv(-4, 4);
      const B = rv(-4, 4);
      const C = rv(-4, 4);
      const D = rv(-5, 5);
      const n = cross3(sub3(B, A), sub3(C, A));
      const l2 = dot3(n, n);
      if (l2 === 0 || !isSquare(l2)) continue;
      const N = isqrt(l2);
      if (N > 36) continue;
      const num = Math.abs(dot3(n, sub3(D, A)));
      if (num === 0 || num === N) continue;
      found = { A, B, C, D, n, N, num };
    }
    if (!found) throw new Error('planeDist: mos nuqtalar topilmadi');
    const { A, B, C, D, n, N, num } = found;
    const dist = frac(num, N);
    const built = qOptions(q(dist), [q(num), q(frac(num, N * N)), q(frac(num, Math.abs(n[0]) + Math.abs(n[1]) + Math.abs(n[2]))), q(frac(num, 2 * N)), q(frac(num, 6))], c.rng);
    const u = sub3(B, A);
    const v = sub3(C, A);
    const w = sub3(D, A);
    const vec = (p: V3) => `(${p.join(';\\,')})`;

    const texts = (lang: Lang): Texts => ({
      stem: L(
        `Fazoda $${texPt('A', A)}$, $${texPt('B', B)}$, $${texPt('C', C)}$ va $${texPt('D', D)}$ nuqtalar berilgan. $D$ nuqtadan $ABC$ tekislikkacha masofani toping.`,
        `В пространстве заданы точки $${texPt('A', A)}$, $${texPt('B', B)}$, $${texPt('C', C)}$ и $${texPt('D', D)}$. Найдите расстояние от точки $D$ до плоскости $ABC$.`,
        `Keńislikte $${texPt('A', A)}$, $${texPt('B', B)}$, $${texPt('C', C)}$ hám $${texPt('D', D)}$ noqatları berilgen. $D$ noqatınan $ABC$ tegisligine shekemgi aralıqtı tabıń.`,
        `Points $${texPt('A', A)}$, $${texPt('B', B)}$, $${texPt('C', C)}$ and $${texPt('D', D)}$ are given in space. Find the distance from the point $D$ to the plane $ABC$.`,
      )[lang],
      solution: join(
        `$\\vec{AB}=${vec(u)}$, $\\vec{AC}=${vec(v)}$, $\\vec n=\\vec{AB}\\times\\vec{AC}=${vec(n)}$, $|\\vec n|=\\sqrt{${dot3(n, n)}}=${N}$.`,
        `$\\vec{AD}=${vec(w)}$, $\\vec n\\cdot\\vec{AD}=${dot3(n, w)}$.`,
        `$d=\\frac{|\\vec n\\cdot\\vec{AD}|}{|\\vec n|}=\\frac{${num}}{${N}}=${texFrac(dist)}$.`,
      ),
      mistake: L(
        `Normal vektor uzunligiga bo'lishni unutish yoki kvadratiga bo'lish; skalyar ko'paytma modulini olmaslik.`,
        `Забыть разделить на длину нормали (или поделить на её квадрат); не взять модуль скалярного произведения.`,
        `Normal vektor uzınlıǵına bóliwdi umıtıw yamasa kvadratına bóliw; skalyar kóbeyme modulin almaw.`,
        `Forgetting to divide by the length of the normal (or dividing by its square), or omitting the absolute value.`,
      )[lang],
    });
    return { spec: y1Spec(c, 93, EST.y1L3, built, texts), facts: { id: 'planeDist', A, B, C, D } };
  },
};

/** 85: to'g'ri prizma: diagonal va asos orasidagi burchak -> hajm */
const prismAngle: Template = {
  id: 'prismAngle',
  build(c) {
    const pool: [30 | 45 | 60, number][] = [];
    for (const al of [45, 60, 30] as const) for (const qd of [2, 4, 6, 8, 10]) pool.push([al, qd]);
    const [al, qd] = pickRound(pool, c.round, 'prismAngle');
    const t = tanOf(al);
    const hq: Qty = { c: fMul(frac(qd), t.c), sq: t.sq };
    const V: Qty = { c: fMul(frac(qd ** 3, 2), t.c), sq: t.sq };
    const co = tanOf(al === 45 ? 45 : al === 60 ? 30 : 60);
    const built = qOptions(V, [{ c: fMul(frac(qd ** 3, 1), t.c), sq: t.sq }, { c: fMul(frac(qd ** 3, 2), co.c), sq: co.sq }, qMul(V, frac(1, 3)), qMul(V, frac(2)), qMul(V, frac(3))], c.rng);
    const a = qd / Math.SQRT2;
    const h = qd * (al === 45 ? 1 : al === 60 ? Math.sqrt(3) : 1 / Math.sqrt(3));

    const svg = new Svg();
    const poly = boxPoly(a, a, h);
    const ctx = drawPoly(svg, poly);
    const P = poly.verts.map(ctx.pt);
    svg.line(P[0]!, P[2]!, dashed);
    svg.line(P[0]!, P[6]!, solid);
    svg.text([(P[0]![0] + P[2]![0]) / 2 + 2, (P[0]![1] + P[2]![1]) / 2 + 14], String(qd), { size: 12, color: ACCENT, bold: true });
    svg.text([P[0]![0] + 34, P[0]![1] - 8], `${al}°`, { size: 12, color: ACCENT, bold: true });
    const fig = figureOf(
      svg,
      L(
        `Muntazam to'rtburchakli prizma: asosining diagonali ${qd}, prizma diagonali asos bilan ${al} gradus burchak hosil qiladi.`,
        `Правильная четырёхугольная призма: диагональ основания ${qd}, диагональ призмы наклонена к основанию под углом ${al} градусов.`,
        `Durıs tórtmúyeshli prizma: tiykarınıń diagonalı ${qd}, prizma diagonalı tiykar menen ${al} gradus múyesh jasaydı.`,
        `Regular square prism: the base diagonal is ${qd}, the diagonal of the prism makes an angle of ${al} degrees with the base.`,
      ),
    );

    const texts = (lang: Lang): Texts => ({
      stem: L(
        `Muntazam to'rtburchakli prizma asosining diagonali $${qd}$ ga teng, prizmaning diagonali asos tekisligi bilan $${al}^{\\circ}$ burchak tashkil qiladi. Prizmaning hajmini toping.`,
        `Диагональ основания правильной четырёхугольной призмы равна $${qd}$, а диагональ призмы образует с плоскостью основания угол $${al}^{\\circ}$. Найдите объём призмы.`,
        `Durıs tórtmúyeshli prizma tiykarınıń diagonalı $${qd}$ ge teń, prizmanıń diagonalı tiykar tegisligi menen $${al}^{\\circ}$ múyesh jasaydı. Prizmanıń kólemin tabıń.`,
        `The diagonal of the base of a regular square prism equals $${qd}$, and the diagonal of the prism makes an angle of $${al}^{\\circ}$ with the plane of the base. Find the volume of the prism.`,
      )[lang],
      solution: join(
        L(
          `Prizma diagonali, asos diagonali va yon qirra to'g'ri burchakli uchburchak hosil qiladi: $h=${qd}\\cdot\\tan${al}^{\\circ}=${qTex(hq)}$.`,
          `Диагональ призмы, диагональ основания и боковое ребро образуют прямоугольный треугольник: $h=${qd}\\cdot\\tan${al}^{\\circ}=${qTex(hq)}$.`,
          `Prizma diagonalı, tiykar diagonalı hám jan qabırǵa tuwrı múyeshli úshmúyeshlik payda etedi: $h=${qd}\\cdot\\tan${al}^{\\circ}=${qTex(hq)}$.`,
          `The diagonal of the prism, the diagonal of the base and a lateral edge form a right triangle: $h=${qd}\\cdot\\tan${al}^{\\circ}=${qTex(hq)}$.`,
        )[lang],
        L(
          `Kvadrat yuzi diagonali orqali: $S=\\frac{d^2}{2}=\\frac{${qd * qd}}{2}=${(qd * qd) / 2}$.`,
          `Площадь квадрата через диагональ: $S=\\frac{d^2}{2}=\\frac{${qd * qd}}{2}=${(qd * qd) / 2}$.`,
          `Kvadrat maydanı diagonalı arqalı: $S=\\frac{d^2}{2}=\\frac{${qd * qd}}{2}=${(qd * qd) / 2}$.`,
          `The area of a square from its diagonal: $S=\\frac{d^2}{2}=\\frac{${qd * qd}}{2}=${(qd * qd) / 2}$.`,
        )[lang],
        `$V=Sh=${(qd * qd) / 2}\\cdot${qTex(hq)}=${qTex(V)}$.`,
      ),
      mistake: L(
        `Kvadrat yuzini $d^2$ deb olish (yarmini unutish) yoki burchak tangensini noto'g'ri qiymat bilan almashtirish.`,
        `Принять площадь квадрата равной $d^2$ (забыв деление на 2) или перепутать значения тангенса.`,
        `Kvadrat maydanın $d^2$ dep alıw (yarımın umıtıw) yamasa tangenstiń mánisin qáte almastırıw.`,
        `Taking the area of the square as $d^2$ (forgetting the factor $\\frac12$) or mixing up the tangent values.`,
      )[lang],
    });
    return { spec: y1Spec(c, 85, EST.y1L3, built, texts, fig), facts: { id: 'prismAngle', d: qd, alpha: al } };
  },
};

const Y1_L3: Template[] = [coneInSphere, triPyr, parallelSection, frustumCone, planeDist, prismAngle];

// ============================ Y-2 (moslashtirish) shablonlari ============================

interface Body {
  text: L10n;
  value: Qty;
  mistakes: Qty[];
}

/** Yaroqli (qiymatlari noyob) parametrlar havzasi: deterministik */
function genPool<T>(key: string, sample: (rng: Rng) => T, valid: (t: T) => boolean, count = 24): T[] {
  const out: T[] = [];
  for (let i = 0; i < 400 && out.length < count; i++) {
    const t = sample(makeRng(`y2pool|${key}|${i}`));
    if (valid(t)) out.push(t);
  }
  return out;
}

const distinctNums = (vals: readonly Qty[]): boolean => {
  const n = vals.map(qNum);
  return n.every((v, i) => n.every((w, j) => i === j || Math.abs(v - w) > 1e-9));
};

function y2Spec(
  c: Ctx,
  topic: number,
  bodies: Body[],
  stem: L10n,
  intro: L10n,
  calc: string[],
  mistake: L10n,
  figure: FigureFn | undefined,
  facts: StereoFacts,
): StereoInstance {
  const built = y2Options(
    bodies.map((b) => b.value),
    bodies.flatMap((b) => b.mistakes),
    c.rng,
  );
  if (!built) throw new Error('y2: variantlar tuzilmadi');
  const match = bodies.map((_, i) => `${i + 1} → ${built.pairs[String(i + 1)]}`).join(';  ');
  return {
    spec: {
      topic,
      difficulty: c.req.difficulty,
      estSeconds: EST.y2,
      key: { pairs: built.pairs },
      content: (lang) => ({
        stem_md: stem[lang],
        solution_md: join(intro[lang], ...calc, match),
        mistake_note_md: mistake[lang],
        payload: {
          options: built.options,
          items: bodies.map((b, i) => ({ id: String(i + 1), text_md: b.text[lang] })),
          ...(figure ? { figure: figure(lang) } : {}),
        },
      }),
    },
    facts: { ...facts, pairs: built.pairs },
  };
}

/** Uch aylanish jismi (silindr, konus, shar) yonma-yon, 1-2-3 raqamlari bilan */
function roundTrioFigure(): FigureFn {
  const svg = new Svg();
  drawCylinder(svg, [58, 160], 28, 74);
  drawCone(svg, [160, 160], 32, 90);
  drawSphere(svg, [264, 124], 38);
  [58, 160, 264].forEach((x, i) => svg.text([x, 200], String(i + 1), { size: 16, color: ACCENT, bold: true }));
  return figureOf(
    svg,
    L(
      `Uchta jism: 1 — silindr, 2 — konus, 3 — shar.`,
      `Три тела: 1 — цилиндр, 2 — конус, 3 — шар.`,
      `Úsh dene: 1 — cilindr, 2 — konus, 3 — shar.`, // kaa: tekshirilsin
      `Three solids: 1 is a cylinder, 2 is a cone, 3 is a ball.`,
    ),
  );
}

const polyTrioFigure: () => FigureFn = () => {
  const svg = new Svg();
  const cube = boxPoly(1, 1, 1);
  drawPoly(svg, cube, { box: { x: 10, y: 34, w: 92, h: 120 }, labels: false });
  const pyr = pyramidPoly(squareBase(1), [0.5, 0.5, 1.1]);
  drawPoly(svg, pyr, { box: { x: 114, y: 34, w: 92, h: 120 }, labels: false });
  const pr = prismPoly(regularBase(3, 0.62), 1.2);
  drawPoly(svg, pr, { box: { x: 218, y: 34, w: 92, h: 120 }, labels: false });
  [56, 160, 264].forEach((x, i) => svg.text([x, 196], String(i + 1), { size: 16, color: ACCENT, bold: true }));
  return figureOf(
    svg,
    L(
      `Uchta ko'pyoqlik: 1 — kub, 2 — muntazam to'rtburchakli piramida, 3 — muntazam uchburchakli prizma.`,
      `Три многогранника: 1 — куб, 2 — правильная четырёхугольная пирамида, 3 — правильная треугольная призма.`,
      `Úsh kópjaqlı: 1 — kub, 2 — durıs tórtmúyeshli piramida, 3 — durıs úshmúyeshli prizma.`,
      `Three polyhedra: 1 is a cube, 2 is a regular square pyramid, 3 is a regular triangular prism.`,
    ),
  );
};

/** 88-90: aylanish jismlarini hajmlari bilan moslash */
const y2VolRound: Template = {
  id: 'y2VolRound',
  build(c) {
    type S = { R1: number; h1: number; R2: number; h2: number; R3: number };
    const pool = genPool<S>(
      'volRound',
      (r) => ({ R1: r.int(2, 6), h1: r.int(2, 9), R2: r.int(3, 9), h2: r.int(2, 9), R3: r.int(2, 7) }),
      (s) => distinctNums([q(s.R1 ** 2 * s.h1, { pi: true }), q(frac(s.R2 ** 2 * s.h2, 3), { pi: true }), q(frac(4 * s.R3 ** 3, 3), { pi: true })]),
    );
    const { R1, h1, R2, h2, R3 } = pickRound(pool, c.round, 'y2VolRound');
    const cyl = q(R1 ** 2 * h1, { pi: true });
    const cone = q(frac(R2 ** 2 * h2, 3), { pi: true });
    const ball = q(frac(4 * R3 ** 3, 3), { pi: true });
    const bodies: Body[] = [
      {
        text: L(`Asosining radiusi $${R1}$, balandligi $${h1}$ bo'lgan silindr`, `Цилиндр с радиусом основания $${R1}$ и высотой $${h1}$`, `Tiykarınıń radiusı $${R1}$, biyikligi $${h1}$ bolǵan cilindr`, `A cylinder with base radius $${R1}$ and height $${h1}$`),
        value: cyl,
        mistakes: [q(R1 * h1 * h1, { pi: true }), q(2 * R1 * h1, { pi: true })],
      },
      {
        text: L(`Asosining radiusi $${R2}$, balandligi $${h2}$ bo'lgan konus`, `Конус с радиусом основания $${R2}$ и высотой $${h2}$`, `Tiykarınıń radiusı $${R2}$, biyikligi $${h2}$ bolǵan konus`, `A cone with base radius $${R2}$ and height $${h2}$`),
        value: cone,
        mistakes: [q(R2 ** 2 * h2, { pi: true }), q(frac(R2 * h2 * h2, 3), { pi: true })],
      },
      {
        text: L(`Radiusi $${R3}$ bo'lgan shar`, `Шар радиуса $${R3}$`, `Radiusı $${R3}$ bolǵan shar`, `A ball of radius $${R3}$`),
        value: ball,
        mistakes: [q(4 * R3 ** 3, { pi: true }), q(4 * R3 ** 2, { pi: true })],
      },
    ];
    return y2Spec(
      c,
      89,
      bodies,
      L(
        `Jismlarni (chizmada raqamlar bilan belgilangan) ularning hajmlari bilan moslang.`,
        `Установите соответствие между телами (на рисунке они пронумерованы) и их объёмами.`,
        `Denelerdi (súwrette nomerlengen) olardıń kólemleri menen sáykes qoyıń.`,
        `Match each solid (numbered in the figure) with its volume.`,
      ),
      L(`Hajm formulalari: $V=\\pi R^2h$, $V=\\frac13\\pi R^2h$, $V=\\frac43\\pi R^3$.`, `Формулы объёма: $V=\\pi R^2h$, $V=\\frac13\\pi R^2h$, $V=\\frac43\\pi R^3$.`, `Kólem formulaları: $V=\\pi R^2h$, $V=\\frac13\\pi R^2h$, $V=\\frac43\\pi R^3$.`, `Volume formulas: $V=\\pi R^2h$, $V=\\frac13\\pi R^2h$, $V=\\frac43\\pi R^3$.`),
      [`$V_1=\\pi\\cdot${R1}^2\\cdot${h1}=${qTex(cyl)}$`, `$V_2=\\frac13\\pi\\cdot${R2}^2\\cdot${h2}=${qTex(cone)}$`, `$V_3=\\frac43\\pi\\cdot${R3}^3=${qTex(ball)}$`],
      L(
        `Konus va shar formulalaridagi $\\frac13$ va $\\frac43$ ko'paytuvchilarini tushirib qoldirish; shar hajmi o'rniga sirt yuzi formulasini olish.`,
        `Потеря множителей $\\frac13$ и $\\frac43$ в формулах конуса и шара; использование формулы площади поверхности вместо объёма шара.`,
        `Konus hám shar formulalarındaǵı $\\frac13$ hám $\\frac43$ kóbeytiwshilerin túsirip qaldırıw; shar kólemi ornına bet maydanı formulasın alıw.`,
        `Dropping the factors $\\frac13$ and $\\frac43$ in the cone and ball formulas, or using the surface area formula for the ball.`,
      ),
      roundTrioFigure(),
      { id: 'y2VolRound', R1, h1, R2, h2, R3 },
    );
  },
};

/** 85-87: ko'pyoqliklarni hajmlari bilan moslash */
const y2VolPoly: Template = {
  id: 'y2VolPoly',
  build(c) {
    type S = { a1: number; a2: number; h2: number; a3: number; h3: number };
    const vals = (s: S): Qty[] => [q(s.a1 ** 3), q(frac(s.a2 ** 2 * s.h2, 3)), { c: frac(s.a3 ** 2 * s.h3, 4), sq: 3 }];
    const pool = genPool<S>('volPoly', (r) => ({ a1: r.int(2, 6), a2: r.int(3, 8), h2: r.int(3, 9), a3: r.int(2, 8), h3: r.int(2, 9) }), (s) => distinctNums(vals(s)));
    const s = pickRound(pool, c.round, 'y2VolPoly');
    const [v1, v2, v3] = vals(s) as [Qty, Qty, Qty];
    const bodies: Body[] = [
      {
        text: L(`Qirrasi $${s.a1}$ bo'lgan kub`, `Куб с ребром $${s.a1}$`, `Qabırǵası $${s.a1}$ bolǵan kub`, `A cube with edge $${s.a1}$`),
        value: v1,
        mistakes: [q(6 * s.a1 ** 2), q(s.a1 ** 2)],
      },
      {
        text: L(
          `Asosining tomoni $${s.a2}$, balandligi $${s.h2}$ bo'lgan muntazam to'rtburchakli piramida`,
          `Правильная четырёхугольная пирамида со стороной основания $${s.a2}$ и высотой $${s.h2}$`,
          `Tiykarınıń tárepi $${s.a2}$, biyikligi $${s.h2}$ bolǵan durıs tórtmúyeshli piramida`,
          `A regular square pyramid with base side $${s.a2}$ and height $${s.h2}$`,
        ),
        value: v2,
        mistakes: [q(s.a2 ** 2 * s.h2), q(frac(s.a2 ** 2 * s.h2, 2))],
      },
      {
        text: L(
          `Asosining tomoni $${s.a3}$, balandligi $${s.h3}$ bo'lgan muntazam uchburchakli prizma`,
          `Правильная треугольная призма со стороной основания $${s.a3}$ и высотой $${s.h3}$`,
          `Tiykarınıń tárepi $${s.a3}$, biyikligi $${s.h3}$ bolǵan durıs úshmúyeshli prizma`,
          `A regular triangular prism with base side $${s.a3}$ and height $${s.h3}$`,
        ),
        value: v3,
        mistakes: [{ c: frac(s.a3 ** 2 * s.h3, 2), sq: 3 }, q(frac(s.a3 ** 2 * s.h3, 4))],
      },
    ];
    return y2Spec(
      c,
      86,
      bodies,
      L(
        `Ko'pyoqliklarni (chizmada raqamlar bilan belgilangan) ularning hajmlari bilan moslang.`,
        `Установите соответствие между многогранниками (на рисунке они пронумерованы) и их объёмами.`,
        `Kópjaqlılardı (súwrette nomerlengen) olardıń kólemleri menen sáykes qoyıń.`,
        `Match each polyhedron (numbered in the figure) with its volume.`,
      ),
      L(
        `Formulalar: kub $V=a^3$, piramida $V=\\frac13Sh$, prizma $V=Sh$; muntazam uchburchak yuzi $S=\\frac{\\sqrt3}{4}a^2$.`,
        `Формулы: куб $V=a^3$, пирамида $V=\\frac13Sh$, призма $V=Sh$; площадь правильного треугольника $S=\\frac{\\sqrt3}{4}a^2$.`,
        `Formulalar: kub $V=a^3$, piramida $V=\\frac13Sh$, prizma $V=Sh$; durıs úshmúyeshlik maydanı $S=\\frac{\\sqrt3}{4}a^2$.`,
        `Formulas: cube $V=a^3$, pyramid $V=\\frac13Sh$, prism $V=Sh$; area of an equilateral triangle $S=\\frac{\\sqrt3}{4}a^2$.`,
      ),
      [`$V_1=${s.a1}^3=${qTex(v1)}$`, `$V_2=\\frac13\\cdot${s.a2}^2\\cdot${s.h2}=${qTex(v2)}$`, `$V_3=\\frac{\\sqrt3}{4}\\cdot${s.a3}^2\\cdot${s.h3}=${qTex(v3)}$`],
      L(
        `Piramida hajmida $\\frac13$ ni tushirib qoldirish; uchburchak yuzi formulasida $\\frac14$ o'rniga $\\frac12$ olish; kub hajmi o'rniga sirt yuzini hisoblash.`,
        `Потеря множителя $\\frac13$ в объёме пирамиды; $\\frac12$ вместо $\\frac14$ в формуле площади треугольника; площадь поверхности вместо объёма куба.`,
        `Piramida kóleminde $\\frac13$ ti túsirip qaldırıw; úshmúyeshlik maydanı formulasında $\\frac14$ ornına $\\frac12$ alıw; kub kólemi ornına bet maydanın esaplaw.`,
        `Dropping $\\frac13$ in the pyramid volume; using $\\frac12$ instead of $\\frac14$ in the triangle area formula; computing the surface area of the cube instead of its volume.`,
      ),
      polyTrioFigure(),
      { id: 'y2VolPoly', ...s },
    );
  },
};

/** 88-90: aylanish jismlarini to'liq sirt yuzlari bilan moslash */
const y2AreaRound: Template = {
  id: 'y2AreaRound',
  build(c) {
    type S = { R1: number; h1: number; r: number; h2: number; l: number; R3: number };
    const vals = (s: S): Qty[] => [q(2 * s.R1 * (s.R1 + s.h1), { pi: true }), q(s.r * (s.r + s.l), { pi: true }), q(4 * s.R3 ** 2, { pi: true })];
    const triples = TRIPLES.filter((t) => t[2] <= 25);
    const pool = genPool<S>(
      'areaRound',
      (rg) => {
        const [x, y, l] = rg.pick(triples);
        const [r, h2] = rg.chance(0.5) ? [x, y] : [y, x];
        return { R1: rg.int(2, 6), h1: rg.int(2, 9), r, h2, l, R3: rg.int(2, 8) };
      },
      (s) => distinctNums(vals(s)),
    );
    const s = pickRound(pool, c.round, 'y2AreaRound');
    const [a1, a2, a3] = vals(s) as [Qty, Qty, Qty];
    const bodies: Body[] = [
      {
        text: L(`Asosining radiusi $${s.R1}$, balandligi $${s.h1}$ bo'lgan silindr`, `Цилиндр с радиусом основания $${s.R1}$ и высотой $${s.h1}$`, `Tiykarınıń radiusı $${s.R1}$, biyikligi $${s.h1}$ bolǵan cilindr`, `A cylinder with base radius $${s.R1}$ and height $${s.h1}$`),
        value: a1,
        mistakes: [q(2 * s.R1 * s.h1, { pi: true }), q(2 * s.R1 ** 2, { pi: true })],
      },
      {
        text: L(`Asosining radiusi $${s.r}$, balandligi $${s.h2}$ bo'lgan konus`, `Конус с радиусом основания $${s.r}$ и высотой $${s.h2}$`, `Tiykarınıń radiusı $${s.r}$, biyikligi $${s.h2}$ bolǵan konus`, `A cone with base radius $${s.r}$ and height $${s.h2}$`),
        value: a2,
        mistakes: [q(s.r * s.l, { pi: true }), q(s.r ** 2, { pi: true })],
      },
      {
        text: L(`Radiusi $${s.R3}$ bo'lgan shar`, `Шар радиуса $${s.R3}$`, `Radiusı $${s.R3}$ bolǵan shar`, `A ball of radius $${s.R3}$`),
        value: a3,
        mistakes: [q(s.R3 ** 2, { pi: true }), q(frac(4 * s.R3 ** 3, 3), { pi: true })],
      },
    ];
    return y2Spec(
      c,
      88,
      bodies,
      L(
        `Jismlarni (chizmada raqamlar bilan belgilangan) ularning to'liq sirt yuzlari bilan moslang.`,
        `Установите соответствие между телами (на рисунке они пронумерованы) и площадями их полных поверхностей.`,
        `Denelerdi (súwrette nomerlengen) olardıń tolıq bet maydanları menen sáykes qoyıń.`,
        `Match each solid (numbered in the figure) with its total surface area.`,
      ),
      L(
        `Formulalar: silindr $S=2\\pi R(R+h)$, konus $S=\\pi r(r+l)$, shar $S=4\\pi R^2$.`,
        `Формулы: цилиндр $S=2\\pi R(R+h)$, конус $S=\\pi r(r+l)$, шар $S=4\\pi R^2$.`,
        `Formulalar: cilindr $S=2\\pi R(R+h)$, konus $S=\\pi r(r+l)$, shar $S=4\\pi R^2$.`,
        `Formulas: cylinder $S=2\\pi R(R+h)$, cone $S=\\pi r(r+l)$, ball $S=4\\pi R^2$.`,
      ),
      [
        `$S_1=2\\pi\\cdot${s.R1}(${s.R1}+${s.h1})=${qTex(a1)}$`,
        `$l=\\sqrt{${s.r}^2+${s.h2}^2}=${s.l}$, $S_2=\\pi\\cdot${s.r}(${s.r}+${s.l})=${qTex(a2)}$`,
        `$S_3=4\\pi\\cdot${s.R3}^2=${qTex(a3)}$`,
      ],
      L(
        `Faqat yon sirtni hisoblash (to'liq sirt emas); konusda yasovchi o'rniga balandlikni olish.`,
        `Вычислить только боковую поверхность вместо полной; взять в конусе высоту вместо образующей.`,
        `Tek jan betti esaplaw (tolıq bet emes); konusta jasawshı ornına biyiklikti alıw.`,
        `Computing only the lateral surface instead of the total one, or using the height instead of the slant height in the cone.`,
      ),
      roundTrioFigure(),
      { id: 'y2AreaRound', ...s },
    );
  },
};

/** 93: koordinatalar va vektorlarni qiymatlari bilan moslash */
const y2Coords: Template = {
  id: 'y2Coords',
  build(c) {
    type S = { a: V3; b: V3; P: V3; Q: V3; D1: number; D2: number };
    const quads = QUADS.filter((x) => x[3] <= 15);
    const pool = genPool<S>(
      'coords',
      (rg) => {
        const sg = (v: readonly number[]): V3 => rg.shuffle(v).map((x) => (rg.chance(0.5) ? -x : x)) as unknown as V3;
        const [a1, a2, a3, D1] = rg.pick(quads);
        const [b1, b2, b3, D2] = rg.pick(quads);
        const P: V3 = [rg.int(-3, 3), rg.int(-3, 3), rg.int(-3, 3)];
        const d = sg([b1, b2, b3]);
        return { a: sg([a1, a2, a3]), b: [rg.int(-5, 5), rg.int(-5, 5), rg.int(-5, 5)], P, Q: [P[0] + d[0], P[1] + d[1], P[2] + d[2]], D1, D2 };
      },
      (s) => {
        const dp = dot3(s.a, s.b);
        return dp !== 0 && distinctNums([q(s.D1), q(dp), q(s.D2)]);
      },
    );
    const s = pickRound(pool, c.round, 'y2Coords');
    const dp = dot3(s.a, s.b);
    const vec = (p: V3) => `(${p.join(';\\,')})`;
    const bodies: Body[] = [
      {
        text: L(`$\\vec a=${vec(s.a)}$ vektorning uzunligi`, `Длина вектора $\\vec a=${vec(s.a)}$`, `$\\vec a=${vec(s.a)}$ vektordıń uzınlıǵı`, `The length of the vector $\\vec a=${vec(s.a)}$`),
        value: q(s.D1),
        mistakes: [q(s.D1 * s.D1), q(Math.abs(s.a[0]) + Math.abs(s.a[1]) + Math.abs(s.a[2]))],
      },
      {
        text: L(
          `$\\vec a=${vec(s.a)}$ va $\\vec b=${vec(s.b)}$ vektorlarning skalyar ko'paytmasi`,
          `Скалярное произведение векторов $\\vec a=${vec(s.a)}$ и $\\vec b=${vec(s.b)}$`,
          `$\\vec a=${vec(s.a)}$ hám $\\vec b=${vec(s.b)}$ vektorlardıń skalyar kóbeymesi`,
          `The dot product of the vectors $\\vec a=${vec(s.a)}$ and $\\vec b=${vec(s.b)}$`,
        ),
        value: q(dp),
        mistakes: [q(s.a[0] * s.b[0] + s.a[1] * s.b[1] - s.a[2] * s.b[2]), q(s.a[0] + s.a[1] + s.a[2] + s.b[0] + s.b[1] + s.b[2])],
      },
      {
        text: L(
          `$${texPt('P', s.P)}$ va $${texPt('Q', s.Q)}$ nuqtalar orasidagi masofa`,
          `Расстояние между точками $${texPt('P', s.P)}$ и $${texPt('Q', s.Q)}$`,
          `$${texPt('P', s.P)}$ hám $${texPt('Q', s.Q)}$ noqatları arasındaǵı aralıq`,
          `The distance between the points $${texPt('P', s.P)}$ and $${texPt('Q', s.Q)}$`,
        ),
        value: q(s.D2),
        mistakes: [q(s.D2 * s.D2), q(Math.abs(s.Q[0] - s.P[0]) + Math.abs(s.Q[1] - s.P[1]) + Math.abs(s.Q[2] - s.P[2]))],
      },
    ];
    return y2Spec(
      c,
      93,
      bodies,
      L(
        `Kattaliklarni ularning qiymatlari bilan moslang.`,
        `Установите соответствие между величинами и их значениями.`,
        `Shamalardı olardıń mánisleri menen sáykes qoyıń.`,
        `Match each quantity with its value.`,
      ),
      L(
        `Formulalar: $|\\vec a|=\\sqrt{x^2+y^2+z^2}$, $\\vec a\\cdot\\vec b=x_1x_2+y_1y_2+z_1z_2$, $|PQ|=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2+(z_2-z_1)^2}$.`,
        `Формулы: $|\\vec a|=\\sqrt{x^2+y^2+z^2}$, $\\vec a\\cdot\\vec b=x_1x_2+y_1y_2+z_1z_2$, $|PQ|=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2+(z_2-z_1)^2}$.`,
        `Formulalar: $|\\vec a|=\\sqrt{x^2+y^2+z^2}$, $\\vec a\\cdot\\vec b=x_1x_2+y_1y_2+z_1z_2$, $|PQ|=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2+(z_2-z_1)^2}$.`,
        `Formulas: $|\\vec a|=\\sqrt{x^2+y^2+z^2}$, $\\vec a\\cdot\\vec b=x_1x_2+y_1y_2+z_1z_2$, $|PQ|=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2+(z_2-z_1)^2}$.`,
      ),
      [
        `$|\\vec a|=\\sqrt{${s.a.map((v) => v * v).join('+')}}=${s.D1}$`,
        `$\\vec a\\cdot\\vec b=${s.a.map((v, i) => `${v < 0 ? `(${v})` : v}\\cdot${s.b[i]! < 0 ? `(${s.b[i]})` : s.b[i]}`).join('+')}=${dp}$`,
        `$|PQ|=\\sqrt{${s.Q.map((v, i) => (v - s.P[i]!) ** 2).join('+')}}=${s.D2}$`,
      ],
      L(
        `Uzunlik o'rniga uning kvadratini yoki koordinatalar yig'indisini yozish; skalyar ko'paytmada ishorani adashtirish.`,
        `Записать вместо длины её квадрат или сумму координат; ошибиться со знаком в скалярном произведении.`,
        `Uzınlıq ornına onıń kvadratın yamasa koordinatalar qosındısın jazıw; skalyar kóbeymede belgini qáte qoyıw.`,
        `Writing the square of the length or the sum of coordinates instead of the length, or making a sign error in the dot product.`,
      ),
      undefined,
      { id: 'y2Coords', a: s.a, b: s.b, P: s.P, Q: s.Q },
    );
  },
};

const Y2_L3: Template[] = [y2VolRound, y2Coords, y2VolPoly, y2AreaRound];

// ============================ Ochiq (O) shablonlari ============================

const keyOf = (f: Frac): string[] => keyForms(f);

/** Kesik piramida: asoslar kvadrat (tomonlari a va b), yuqori asos markazlashgan */
function frustumPoly(a: number, b: number, h: number): Poly {
  const o = (a - b) / 2;
  return {
    verts: [
      [0, 0, 0],
      [a, 0, 0],
      [a, a, 0],
      [0, a, 0],
      [o, o, h],
      [o + b, o, h],
      [o + b, o + b, h],
      [o, o + b, h],
    ],
    faces: [
      [0, 1, 2, 3],
      [4, 5, 6, 7],
      ...[0, 1, 2, 3].map((i) => [i, (i + 1) % 4, 4 + ((i + 1) % 4), 4 + i]),
    ],
    names: ['A', 'B', 'C', 'D', 'A1', 'B1', 'C1', 'D1'],
  };
}

/** 87: muntazam to'rtburchakli piramida: asos tomoni va yon qirra -> balandlik, hajm */
const oPyramid: Template = {
  id: 'oPyramid',
  build(c) {
    const pool: { p: number; h: number; l: number }[] = [];
    for (let p = 2; p <= 12; p++) for (let h = 1; h <= 24; h++) if (isSquare(h * h + 2 * p * p) && isqrt(h * h + 2 * p * p) <= 30) pool.push({ p, h, l: isqrt(h * h + 2 * p * p) });
    const { p, h, l } = pickRound(pool, c.round, 'oPyramid');
    const a = 2 * p;
    const V = frac(a * a * h, 3);

    const svg = new Svg();
    const poly = pyramidPoly(squareBase(a), [a / 2, a / 2, clampH(h, a)]);
    const O: V3 = [a / 2, a / 2, 0];
    const ctx = drawPoly(svg, poly, { extraPts: [O], highlight: [[0, 4]] });
    const P = poly.verts.map(ctx.pt);
    svg.line(ctx.pt(O), P[4]!, dashed);
    svg.dot(ctx.pt(O), 2);
    svg.text([ctx.pt(O)[0] + 9, ctx.pt(O)[1] + 8], 'O', { size: 12, bold: true });
    segLabel(svg, P[0]!, P[1]!, String(a), ctx.center);
    segLabel(svg, P[0]!, P[4]!, String(l), ctx.center);
    const fig = figureOf(
      svg,
      L(
        `Muntazam to'rtburchakli piramida SABCD: asos tomoni ${a}, yon qirrasi ${l}.`,
        `Правильная четырёхугольная пирамида SABCD: сторона основания ${a}, боковое ребро ${l}.`,
        `Durıs tórtmúyeshli piramida SABCD: tiykar tárepi ${a}, jan qabırǵası ${l}.`,
        `Regular square pyramid SABCD: base side ${a}, lateral edge ${l}.`,
      ),
    );
    return {
      spec: oSpec(
        c,
        87,
        {
          a: { prompt: L(`Piramidaning balandligini toping.`, `Найдите высоту пирамиды.`, `Piramidanıń biyikligin tabıń.`, `Find the height of the pyramid.`), forms: [String(h)] },
          b: { prompt: L(`Piramidaning hajmini toping.`, `Найдите объём пирамиды.`, `Piramidanıń kólemin tabıń.`, `Find the volume of the pyramid.`), forms: keyOf(V) },
        },
        L(
          `Muntazam to'rtburchakli piramidaning asosi tomoni $${a}$, yon qirrasi $${l}$ ga teng.`,
          `Сторона основания правильной четырёхугольной пирамиды равна $${a}$, боковое ребро равно $${l}$.`,
          `Durıs tórtmúyeshli piramidanıń tiykarınıń tárepi $${a}$ ǵa, jan qabırǵası $${l}$ ge teń.`,
          `The base of a regular square pyramid has side $${a}$ and the lateral edge is $${l}$.`,
        ),
        L(
          `a) Asos diagonalining yarmi $\\frac{a\\sqrt2}{2}$, yon qirra va balandlik bilan to'g'ri burchakli uchburchak hosil qiladi: $h^2=l^2-\\frac{a^2}{2}=${l * l}-${(a * a) / 2}=${h * h}$, $h=${h}$.\n\nb) $V=\\frac13a^2h=\\frac13\\cdot${a * a}\\cdot${h}=${texFrac(V)}$.`,
          `а) Половина диагонали основания $\\frac{a\\sqrt2}{2}$, боковое ребро и высота образуют прямоугольный треугольник: $h^2=l^2-\\frac{a^2}{2}=${l * l}-${(a * a) / 2}=${h * h}$, $h=${h}$.\n\nб) $V=\\frac13a^2h=\\frac13\\cdot${a * a}\\cdot${h}=${texFrac(V)}$.`,
          `a) Tiykar diagonalınıń yarımı $\\frac{a\\sqrt2}{2}$, jan qabırǵa hám biyiklik menen tuwrı múyeshli úshmúyeshlik payda etedi: $h^2=l^2-\\frac{a^2}{2}=${l * l}-${(a * a) / 2}=${h * h}$, $h=${h}$.\n\nb) $V=\\frac13a^2h=\\frac13\\cdot${a * a}\\cdot${h}=${texFrac(V)}$.`,
          `a) Half of the base diagonal $\\frac{a\\sqrt2}{2}$, the lateral edge and the height form a right triangle: $h^2=l^2-\\frac{a^2}{2}=${l * l}-${(a * a) / 2}=${h * h}$, $h=${h}$.\n\nb) $V=\\frac13a^2h=\\frac13\\cdot${a * a}\\cdot${h}=${texFrac(V)}$.`,
        ),
        L(
          `Balandlikni topishda asos diagonalining yarmi o'rniga $\\frac a2$ ni olish: bu apofema uchun to'g'ri, yon qirra uchun emas.`,
          `Брать $\\frac a2$ вместо половины диагонали основания: это годится для апофемы, но не для бокового ребра.`,
          `Biyiklikti tabıwda tiykar diagonalınıń yarımı ornına $\\frac a2$ ni alıw: bul apofema ushın durıs, jan qabırǵa ushın emes.`,
          `Using $\\frac a2$ instead of half the base diagonal: that works for the slant height, not for the lateral edge.`,
        ),
        fig,
      ),
      facts: { id: 'oPyramid', a, l },
    };
  },
};

/** 87: kesik piramida: asoslar tomonlari va yon qirra -> balandlik, hajm */
const oFrustumPyr: Template = {
  id: 'oFrustumPyr',
  build(c) {
    const pool: { b: number; d: number; h: number; l: number }[] = [];
    for (let d = 1; d <= 10; d++) for (let h = 1; h <= 20; h++) if (isSquare(h * h + 2 * d * d) && isqrt(h * h + 2 * d * d) <= 30) for (const b of [2, 3, 4, 5]) pool.push({ b, d, h, l: isqrt(h * h + 2 * d * d) });
    const { b, d, h, l } = pickRound(pool, c.round, 'oFrustumPyr');
    const a = b + 2 * d;
    const V = frac(h * (a * a + a * b + b * b), 3);

    const svg = new Svg();
    const poly = frustumPoly(a, b, clampH(h, a * 0.8));
    const ctx = drawPoly(svg, poly, { highlight: [[0, 4]] });
    const P = poly.verts.map(ctx.pt);
    segLabel(svg, P[0]!, P[1]!, String(a), ctx.center);
    segLabel(svg, P[4]!, P[5]!, String(b), ctx.center);
    segLabel(svg, P[0]!, P[4]!, String(l), ctx.center);
    const fig = figureOf(
      svg,
      L(
        `Muntazam kesik to'rtburchakli piramida: asoslar tomonlari ${a} va ${b}, yon qirrasi ${l}.`,
        `Правильная усечённая четырёхугольная пирамида: стороны оснований ${a} и ${b}, боковое ребро ${l}.`,
        `Durıs kesik tórtmúyeshli piramida: tiykarlar tárepleri ${a} hám ${b}, jan qabırǵası ${l}.`,
        `Regular truncated square pyramid: base sides ${a} and ${b}, lateral edge ${l}.`,
      ),
    );
    return {
      spec: oSpec(
        c,
        87,
        {
          a: { prompt: L(`Kesik piramidaning balandligini toping.`, `Найдите высоту усечённой пирамиды.`, `Kesik piramidanıń biyikligin tabıń.`, `Find the height of the frustum.`), forms: [String(h)] },
          b: { prompt: L(`Kesik piramidaning hajmini toping.`, `Найдите объём усечённой пирамиды.`, `Kesik piramidanıń kólemin tabıń.`, `Find the volume of the frustum.`), forms: keyOf(V) },
        },
        L(
          `Muntazam to'rtburchakli kesik piramida asoslarining tomonlari $${a}$ va $${b}$, yon qirrasi $${l}$ ga teng.`,
          `Стороны оснований правильной четырёхугольной усечённой пирамиды равны $${a}$ и $${b}$, боковое ребро равно $${l}$.`,
          `Durıs tórtmúyeshli kesik piramida tiykarlarınıń tárepleri $${a}$ hám $${b}$, jan qabırǵası $${l}$ ge teń.`,
          `The bases of a regular truncated square pyramid have sides $${a}$ and $${b}$, and the lateral edge is $${l}$.`,
        ),
        L(
          `a) Asoslar diagonallari $a\\sqrt2$ va $b\\sqrt2$; ularning yarmlari ayirmasi $\\frac{(a-b)\\sqrt2}{2}$ yon qirra proyeksiyasidir. $h^2=l^2-\\frac{(a-b)^2}{2}=${l * l}-${2 * d * d}=${h * h}$, $h=${h}$.\n\nb) $V=\\frac h3(a^2+ab+b^2)=\\frac{${h}}{3}(${a * a}+${a * b}+${b * b})=${texFrac(V)}$.`,
          `а) Диагонали оснований $a\\sqrt2$ и $b\\sqrt2$; разность их половин $\\frac{(a-b)\\sqrt2}{2}$ — проекция бокового ребра. $h^2=l^2-\\frac{(a-b)^2}{2}=${l * l}-${2 * d * d}=${h * h}$, $h=${h}$.\n\nб) $V=\\frac h3(a^2+ab+b^2)=\\frac{${h}}{3}(${a * a}+${a * b}+${b * b})=${texFrac(V)}$.`,
          `a) Tiykarlar diagonalları $a\\sqrt2$ hám $b\\sqrt2$; olardıń yarımlarınıń ayırması $\\frac{(a-b)\\sqrt2}{2}$ jan qabırǵanıń proekciyası. $h^2=l^2-\\frac{(a-b)^2}{2}=${l * l}-${2 * d * d}=${h * h}$, $h=${h}$.\n\nb) $V=\\frac h3(a^2+ab+b^2)=\\frac{${h}}{3}(${a * a}+${a * b}+${b * b})=${texFrac(V)}$.`,
          `a) The base diagonals are $a\\sqrt2$ and $b\\sqrt2$; the difference of their halves $\\frac{(a-b)\\sqrt2}{2}$ is the projection of the lateral edge. $h^2=l^2-\\frac{(a-b)^2}{2}=${l * l}-${2 * d * d}=${h * h}$, $h=${h}$.\n\nb) $V=\\frac h3(a^2+ab+b^2)=\\frac{${h}}{3}(${a * a}+${a * b}+${b * b})=${texFrac(V)}$.`,
        ),
        L(
          `Yon qirra proyeksiyasini $\\frac{a-b}{2}$ deb olish (u asoslar tomonlari emas, diagonallari yarmlarining ayirmasi); hajm formulasida $ab$ hadini unutish.`,
          `Считать проекцию бокового ребра равной $\\frac{a-b}{2}$ (на деле это разность половин диагоналей); забыть слагаемое $ab$ в формуле объёма.`,
          `Jan qabırǵa proekciyasın $\\frac{a-b}{2}$ dep alıw (ol diagonallar yarımlarınıń ayırması); kólem formulasında $ab$ ǵarezin umıtıw.`,
          `Taking the projection of the lateral edge to be $\\frac{a-b}{2}$ (it is the difference of the half-diagonals), or forgetting the term $ab$ in the volume formula.`,
        ),
        fig,
      ),
      facts: { id: 'oFrustumPyr', a, b, l },
    };
  },
};

/** 88/91: silindrni o'qqa parallel tekislik bilan kesish */
const oCylSection: Template = {
  id: 'oCylSection',
  build(c) {
    const pool: { e: number; d: number; R: number; h: number }[] = [];
    for (const [x, y, R] of TRIPLES) {
      if (R > 30) continue;
      for (const [e, d] of [[x, y], [y, x]] as const) for (const h of [5, 7, 9, 12]) pool.push({ e, d, R, h });
    }
    const { e, d, R, h } = pickRound(pool, c.round, 'oCylSection');
    const w = 2 * e;

    const svg = new Svg();
    const s = Math.min(58 / R, 125 / h);
    const base: P2 = [150, 180];
    const hp = Math.min(Math.max(h * s, 0.9 * R * s), 2.2 * R * s);
    const cy = drawCylinder(svg, base, R * s, hp);
    const dy = d * s * 0.3;
    const sec: P2[] = [
      [base[0] - e * s, cy.top[1] + dy],
      [base[0] + e * s, cy.top[1] + dy],
      [base[0] + e * s, base[1] + dy],
      [base[0] - e * s, base[1] + dy],
    ];
    svg.poly(sec, { fill: SOFT, opacity: 0.6, color: ACCENT, width: 2 });
    svg.line(cy.top, [cy.top[0], cy.top[1] + dy], dashed);
    svg.line(cy.top, [cy.top[0] + R * s, cy.top[1]], { dash: true, width: 1.3 });
    svg.dot(cy.top, 2);
    svg.text([cy.top[0] + R * s * 0.55, cy.top[1] - 8], String(R), { size: 12, color: ACCENT, bold: true });
    svg.text([cy.top[0] - 9, cy.top[1] + dy / 2 + 8], String(d), { size: 12, color: ACCENT, bold: true });
    svg.text([base[0] + R * s + 14, base[1] - hp / 2], String(h), { size: 12, color: ACCENT, bold: true });
    const fig = figureOf(
      svg,
      L(
        `Silindr va uni o'qqa parallel kesgan tekislik: radius ${R}, balandlik ${h}, o'qdan masofa ${d}.`,
        `Цилиндр и плоскость, параллельная оси: радиус ${R}, высота ${h}, расстояние от оси ${d}.`,
        `Cilindr hám onı kósherge parallel kesken tegislik: radius ${R}, biyiklik ${h}, kósherden aralıq ${d}.`,
        `A cylinder cut by a plane parallel to its axis: radius ${R}, height ${h}, distance from the axis ${d}.`,
      ),
    );
    return {
      spec: oSpec(
        c,
        91,
        {
          a: {
            prompt: L(`Kesim to'g'ri to'rtburchagining asos tekisligidagi tomoni (vatar) uzunligini toping.`, `Найдите длину стороны прямоугольника сечения, лежащей в плоскости основания (хорды).`, `Kesim tuwrı tórtmúyeshliginiń tiykar tegisligindegi tárepiniń (xordanıń) uzınlıǵın tabıń.`, `Find the length of the side of the section rectangle lying in the base plane (the chord).`),
            forms: [String(w)],
          },
          b: { prompt: L(`Kesimning yuzini toping.`, `Найдите площадь сечения.`, `Kesimniń maydanın tabıń.`, `Find the area of the section.`), forms: [String(w * h)] },
        },
        L(
          `Silindr asosining radiusi $${R}$, balandligi $${h}$. Silindrning o'qiga parallel tekislik o'qdan $${d}$ masofada o'tadi va silindrni to'g'ri to'rtburchak bo'ylab kesadi.`,
          `Радиус основания цилиндра равен $${R}$, высота равна $${h}$. Плоскость, параллельная оси цилиндра, проходит на расстоянии $${d}$ от оси и пересекает цилиндр по прямоугольнику.`,
          `Cilindr tiykarınıń radiusı $${R}$, biyikligi $${h}$. Cilindrdiń kósherine parallel tegislik kósherden $${d}$ aralıqtan ótip, cilindrdi tuwrı tórtmúyeshlik boyınsha kesedi.`,
          `A cylinder has base radius $${R}$ and height $${h}$. A plane parallel to the axis passes at distance $${d}$ from the axis and cuts the cylinder in a rectangle.`,
        ),
        L(
          `a) Asos doirasida vatarning yarmi $e$, markazdan vatargacha masofa $${d}$ va radius $${R}$ to'g'ri burchakli uchburchak hosil qiladi: $e=\\sqrt{${R}^2-${d}^2}=${e}$, vatar $2e=${w}$.\n\nb) Kesim — tomonlari $${w}$ va $${h}$ bo'lgan to'g'ri to'rtburchak: $S=${w}\\cdot${h}=${w * h}$.`,
          `а) В круге основания половина хорды $e$, расстояние от центра до хорды $${d}$ и радиус $${R}$ образуют прямоугольный треугольник: $e=\\sqrt{${R}^2-${d}^2}=${e}$, хорда $2e=${w}$.\n\nб) Сечение — прямоугольник со сторонами $${w}$ и $${h}$: $S=${w}\\cdot${h}=${w * h}$.`,
          `a) Tiykar dóńgeleginde xordanıń yarımı $e$, oraydan xordaǵa shekemgi aralıq $${d}$ hám radius $${R}$ tuwrı múyeshli úshmúyeshlik payda etedi: $e=\\sqrt{${R}^2-${d}^2}=${e}$, xorda $2e=${w}$.\n\nb) Kesim — tárepleri $${w}$ hám $${h}$ bolǵan tuwrı tórtmúyeshlik: $S=${w}\\cdot${h}=${w * h}$.`,
          `a) In the base disk, half the chord $e$, the distance $${d}$ from the center to the chord and the radius $${R}$ form a right triangle: $e=\\sqrt{${R}^2-${d}^2}=${e}$, so the chord is $2e=${w}$.\n\nb) The section is a rectangle with sides $${w}$ and $${h}$: $S=${w}\\cdot${h}=${w * h}$.`,
        ),
        L(
          `Vatar uzunligi o'rniga uning yarmini ($e$) yozish; kesim yuzini asos radiusi bilan balandlik ko'paytmasi deb hisoblash.`,
          `Записать в ответ половину хорды $e$ вместо хорды; считать площадь сечения как произведение радиуса на высоту.`,
          `Xorda uzınlıǵı ornına onıń yarımın ($e$) jazıw; kesim maydanın radius penen biyiklik kóbeymesi dep esaplaw.`,
          `Giving half the chord $e$ instead of the chord, or computing the section area as radius times height.`,
        ),
        fig,
      ),
      facts: { id: 'oCylSection', R, d, h },
    };
  },
};

/** 90: shar va markazning ikki tomonidagi ikkita parallel kesim */
const oSphereTwo: Template = {
  id: 'oSphereTwo',
  build(c) {
    const pool: { R: number; d1: number; r1: number; d2: number; r2: number }[] = [];
    for (let R = 5; R <= 30; R++) {
      const dec: [number, number][] = [];
      for (let d = 1; d < R; d++) if (isSquare(R * R - d * d) && isqrt(R * R - d * d) >= 2) dec.push([d, isqrt(R * R - d * d)]);
      for (let i = 0; i < dec.length; i++) for (let j = i + 1; j < dec.length; j++) pool.push({ R, d1: dec[i]![0], r1: dec[i]![1], d2: dec[j]![0], r2: dec[j]![1] });
    }
    const { R, d1, r1, d2, r2 } = pickRound(pool, c.round, 'oSphereTwo');
    const t = d1 + d2;
    const Vpi = frac(4 * R ** 3, 3);

    const svg = new Svg();
    const O: P2 = [150, 112];
    const Rp = 80;
    const k = Rp / R;
    drawSphere(svg, O, Rp);
    const U: P2 = [O[0], O[1] - d1 * k];
    const W: P2 = [O[0], O[1] + d2 * k];
    svg.ellipse(U, r1 * k, r1 * k * 0.3, { color: ACCENT, width: 2 });
    svg.ellipse(W, r2 * k, r2 * k * 0.3, { color: ACCENT, width: 2 });
    svg.line(U, W, { dash: true, color: ACCENT, width: 1.4 });
    svg.line(U, [U[0] + r1 * k, U[1]], solid);
    svg.line(W, [W[0] + r2 * k, W[1]], solid);
    svg.dot(O, 2.2);
    svg.text([O[0] - 9, O[1] + 1], 'O', { size: 12, bold: true });
    svg.text([U[0] + (r1 * k) / 2, U[1] - 9], String(r1), { size: 12, color: ACCENT, bold: true });
    svg.text([W[0] + (r2 * k) / 2, W[1] + 13], String(r2), { size: 12, color: ACCENT, bold: true });
    svg.text([O[0] + 14, O[1] - 2], String(t), { size: 12, color: ACCENT, bold: true });
    const fig = figureOf(
      svg,
      L(
        `Shar va markazning ikki tomonidagi parallel kesimlar: radiuslari ${r1} va ${r2}, orasidagi masofa ${t}.`,
        `Шар и два параллельных сечения по разные стороны от центра: радиусы ${r1} и ${r2}, расстояние между плоскостями ${t}.`,
        `Shar hám orayınıń eki tárepindegi parallel kesimler: radiusları ${r1} hám ${r2}, aralarındaǵı aralıq ${t}.`,
        `A ball with two parallel sections on opposite sides of the center: radii ${r1} and ${r2}, distance between the planes ${t}.`,
      ),
    );
    return {
      spec: oSpec(
        c,
        90,
        {
          a: { prompt: L(`Shar radiusini toping.`, `Найдите радиус шара.`, `Shar radiusın tabıń.`, `Find the radius of the ball.`), forms: [String(R)] },
          b: {
            prompt: L(`Shar hajmini $\\pi$ ga bo'lib, hosil bo'lgan sonni toping.`, `Найдите объём шара, делённый на $\\pi$.`, `Shar kólemin $\\pi$ ge bólip, payda bolǵan sandı tabıń.`, `Divide the volume of the ball by $\\pi$ and find the resulting number.`),
            forms: keyOf(Vpi),
          },
        },
        L(
          `Shar markazining ikki tomonida joylashgan ikkita parallel tekislik sharni radiuslari $${r1}$ va $${r2}$ bo'lgan doiralar bo'yicha kesadi. Tekisliklar orasidagi masofa $${t}$ ga teng.`,
          `Две параллельные плоскости, расположенные по разные стороны от центра шара, пересекают шар по кругам радиусов $${r1}$ и $${r2}$. Расстояние между плоскостями равно $${t}$.`,
          `Shar orayınıń eki tárepinde jaylasqan eki parallel tegislik sharni radiusları $${r1}$ hám $${r2}$ bolǵan dóńgelekler boyınsha kesedi. Tegisliklar arasındaǵı aralıq $${t}$ ǵa teń.`,
          `Two parallel planes on opposite sides of the center of a ball cut it in disks of radii $${r1}$ and $${r2}$. The distance between the planes is $${t}$.`,
        ),
        L(
          `a) Markazdan tekisliklargacha masofalar $x$ va $${t}-x$. $R^2=${r1}^2+x^2=${r2}^2+(${t}-x)^2$, bundan $x=\\frac{${t}^2+${r2}^2-${r1}^2}{2\\cdot${t}}=${d1}$. $R^2=${r1 * r1}+${d1 * d1}=${R * R}$, $R=${R}$.\n\nb) $\\frac V\\pi=\\frac43R^3=\\frac43\\cdot${R ** 3}=${texFrac(Vpi)}$.`,
          `а) Расстояния от центра до плоскостей $x$ и $${t}-x$. $R^2=${r1}^2+x^2=${r2}^2+(${t}-x)^2$, откуда $x=\\frac{${t}^2+${r2}^2-${r1}^2}{2\\cdot${t}}=${d1}$. $R^2=${r1 * r1}+${d1 * d1}=${R * R}$, $R=${R}$.\n\nб) $\\frac V\\pi=\\frac43R^3=\\frac43\\cdot${R ** 3}=${texFrac(Vpi)}$.`,
          `a) Oraydan tegisliklerge shekemgi aralıqlar $x$ hám $${t}-x$. $R^2=${r1}^2+x^2=${r2}^2+(${t}-x)^2$, bunnan $x=\\frac{${t}^2+${r2}^2-${r1}^2}{2\\cdot${t}}=${d1}$. $R^2=${r1 * r1}+${d1 * d1}=${R * R}$, $R=${R}$.\n\nb) $\\frac V\\pi=\\frac43R^3=\\frac43\\cdot${R ** 3}=${texFrac(Vpi)}$.`,
          `a) The distances from the center to the planes are $x$ and $${t}-x$. $R^2=${r1}^2+x^2=${r2}^2+(${t}-x)^2$, so $x=\\frac{${t}^2+${r2}^2-${r1}^2}{2\\cdot${t}}=${d1}$. $R^2=${r1 * r1}+${d1 * d1}=${R * R}$, $R=${R}$.\n\nb) $\\frac V\\pi=\\frac43R^3=\\frac43\\cdot${R ** 3}=${texFrac(Vpi)}$.`,
        ),
        L(
          `Tekisliklar orasidagi masofani markazdan bir tekislikkacha masofa deb olish; $R=r_1+r_2$ yoki $R=\\frac t2$ deb taxmin qilish.`,
          `Принять расстояние между плоскостями за расстояние от центра до одной из них; считать $R=r_1+r_2$ или $R=\\frac t2$.`,
          `Tegisliklar arasındaǵı aralıqtı oraydan bir tegislikke shekemgi aralıq dep alıw; $R=r_1+r_2$ yamasa $R=\\frac t2$ dep boljaw.`,
          `Taking the distance between the planes as the distance from the center to one of them, or guessing $R=r_1+r_2$ or $R=\\frac t2$.`,
        ),
        fig,
      ),
      facts: { id: 'oSphereTwo', r1, r2, t },
    };
  },
};

/** 93: fazoda koordinatalar: skalyar ko'paytma va burchak kosinusi */
const oCoords: Template = {
  id: 'oCoords',
  build(c) {
    type S = { A: V3; u: V3; v: V3; lu: number; lv: number };
    const vecs: V3[] = [];
    for (let x = -6; x <= 6; x++) for (let y = -6; y <= 6; y++) for (let z = -6; z <= 6; z++) if ((x || y || z) && isSquare(x * x + y * y + z * z) && x * x + y * y + z * z <= 121) vecs.push([x, y, z]);
    const pool = genPool<S>(
      'oCoords',
      (rg) => {
        const u = rg.pick(vecs);
        const v = rg.pick(vecs);
        return { A: [rg.int(-3, 3), rg.int(-3, 3), rg.int(-3, 3)], u, v, lu: isqrt(dot3(u, u)), lv: isqrt(dot3(v, v)) };
      },
      (s) => {
        const dp = dot3(s.u, s.v);
        const cr = cross3(s.u, s.v);
        return dp !== 0 && norm3(cr) > 0.5 && s.lu >= 3 && s.lv >= 3;
      },
      30,
    );
    const s = pickRound(pool, c.round, 'oCoords');
    const add = (p: V3, w: V3): V3 => [p[0] + w[0], p[1] + w[1], p[2] + w[2]];
    const B = add(s.A, s.u);
    const C = add(s.A, s.v);
    const dp = dot3(s.u, s.v);
    const cosv = frac(dp, s.lu * s.lv);
    const vec = (p: V3) => `(${p.join(';\\,')})`;
    return {
      spec: oSpec(
        c,
        93,
        {
          a: { prompt: L(`$\\vec{AB}\\cdot\\vec{AC}$ skalyar ko'paytmani toping.`, `Найдите скалярное произведение $\\vec{AB}\\cdot\\vec{AC}$.`, `$\\vec{AB}\\cdot\\vec{AC}$ skalyar kóbeymesin tabıń.`, `Find the dot product $\\vec{AB}\\cdot\\vec{AC}$.`), forms: [String(dp)] },
          b: { prompt: L(`$\\angle BAC$ ning kosinusini toping.`, `Найдите косинус угла $\\angle BAC$.`, `$\\angle BAC$ múyeshiniń kosinusın tabıń.`, `Find the cosine of the angle $\\angle BAC$.`), forms: keyOf(cosv) },
        },
        L(
          `Fazoda $${texPt('A', s.A)}$, $${texPt('B', B)}$ va $${texPt('C', C)}$ nuqtalar berilgan.`,
          `В пространстве заданы точки $${texPt('A', s.A)}$, $${texPt('B', B)}$ и $${texPt('C', C)}$.`,
          `Keńislikte $${texPt('A', s.A)}$, $${texPt('B', B)}$ hám $${texPt('C', C)}$ noqatları berilgen.`,
          `Points $${texPt('A', s.A)}$, $${texPt('B', B)}$ and $${texPt('C', C)}$ are given in space.`,
        ),
        L(
          `a) $\\vec{AB}=${vec(s.u)}$, $\\vec{AC}=${vec(s.v)}$, $\\vec{AB}\\cdot\\vec{AC}=${dp}$.\n\nb) $|\\vec{AB}|=\\sqrt{${dot3(s.u, s.u)}}=${s.lu}$, $|\\vec{AC}|=\\sqrt{${dot3(s.v, s.v)}}=${s.lv}$, $\\cos\\angle BAC=\\frac{${dp}}{${s.lu}\\cdot${s.lv}}=${texFrac(cosv)}$.`,
          `а) $\\vec{AB}=${vec(s.u)}$, $\\vec{AC}=${vec(s.v)}$, $\\vec{AB}\\cdot\\vec{AC}=${dp}$.\n\nб) $|\\vec{AB}|=\\sqrt{${dot3(s.u, s.u)}}=${s.lu}$, $|\\vec{AC}|=\\sqrt{${dot3(s.v, s.v)}}=${s.lv}$, $\\cos\\angle BAC=\\frac{${dp}}{${s.lu}\\cdot${s.lv}}=${texFrac(cosv)}$.`,
          `a) $\\vec{AB}=${vec(s.u)}$, $\\vec{AC}=${vec(s.v)}$, $\\vec{AB}\\cdot\\vec{AC}=${dp}$.\n\nb) $|\\vec{AB}|=\\sqrt{${dot3(s.u, s.u)}}=${s.lu}$, $|\\vec{AC}|=\\sqrt{${dot3(s.v, s.v)}}=${s.lv}$, $\\cos\\angle BAC=\\frac{${dp}}{${s.lu}\\cdot${s.lv}}=${texFrac(cosv)}$.`,
          `a) $\\vec{AB}=${vec(s.u)}$, $\\vec{AC}=${vec(s.v)}$, $\\vec{AB}\\cdot\\vec{AC}=${dp}$.\n\nb) $|\\vec{AB}|=\\sqrt{${dot3(s.u, s.u)}}=${s.lu}$, $|\\vec{AC}|=\\sqrt{${dot3(s.v, s.v)}}=${s.lv}$, $\\cos\\angle BAC=\\frac{${dp}}{${s.lu}\\cdot${s.lv}}=${texFrac(cosv)}$.`,
        ),
        L(
          `Vektor koordinatalarini nuqta koordinatalari bilan adashtirish (ayirmani olmaslik); kosinusda uzunliklar ko'paytmasiga bo'lishni unutish.`,
          `Путать координаты вектора с координатами точки (не вычитать); забыть делить на произведение длин при вычислении косинуса.`,
          `Vektor koordinataların noqat koordinatalarına shatastırıw (ayırmanı almaw); kosinusta uzınlıqlar kóbeymesine bóliwdi umıtıw.`,
          `Confusing vector coordinates with point coordinates (not subtracting), or forgetting to divide by the product of lengths in the cosine.`,
        ),
      ),
      facts: { id: 'oCoords', A: s.A, B, C },
    };
  },
};

const O_L3: Template[] = [oPyramid, oSphereTwo, oCylSection, oCoords, oFrustumPyr];

// ============================ Tarqatuvchi ============================

const TEMPLATES: Record<string, Template[]> = {
  'y1|L2': Y1_L2,
  'y1|L3': Y1_L3,
  'y2|L3': Y2_L3,
  'o|L3': O_L3,
};

/** Shu (tur, qiyinlik) guruhida stereometriya slotlari soni va so'rovning tartib raqami */
function groupPosition(req: SlotRequest): { k: number; size: number } {
  const slots = LAYOUT.filter((s) => s.block === 'geometriya' && s.type === req.type && s.difficulty === req.difficulty && s.index % 2 === 1);
  const k = slots.findIndex((s) => s.index === req.index);
  if (k < 0) throw new Error(`stereometriya: ${req.type}/${req.difficulty} index ${req.index} topilmadi`);
  return { k, size: slots.length };
}

export function stereoInstance(req: SlotRequest): StereoInstance {
  if (req.block !== 'geometriya') throw new Error(`stereometriya generatori faqat geometriya blokiga: ${req.block}`);
  if (req.index % 2 !== 1) throw new Error(`stereometriya faqat toq index uchun (index=${req.index})`);
  const list = TEMPLATES[`${req.type}|${req.difficulty}`];
  if (!list) throw new Error(`stereometriya: ${req.type}/${req.difficulty} uchun shablon yo'q`);
  const { k, size } = groupPosition(req);
  const n = req.variant * size + k;
  const tpl = list[n % list.length]!;
  const round = Math.floor(n / list.length);
  return tpl.build({ req, round, rng: slotRng(req, tpl.id) });
}

export const generateGeometryStereo: BlockGenerator = (req) => stereoInstance(req).spec;
