import { fAdd, fDiv, fMul, fSub, frac, texFrac, texParen, type Frac } from './helpers';
import {
  chooseEntry,
  fracChoices,
  fracPart,
  G,
  intChoices,
  M,
  oEntry,
  oSpec,
  pick,
  pickPool,
  range,
  texPoly,
  y1Entry,
  y1Spec,
  type OEntry,
  type Y1Entry,
} from './tf-common';
import type { BlockGenerator } from './types';

// "Funksiyalar" bloki (mavzular 43-55): Y-1 L2 x2, O L2 x1 (har variantda).
// Javoblar parametrlardan kod bilan hisoblanadi; chalg'ituvchilar tipik xatolardan.

const nonZero = (a: number, b: number): number[] => range(a, b).filter((n) => n !== 0);

// ---------------------------------------------------------------------------------------------
// Y-1 shablonlari
// ---------------------------------------------------------------------------------------------

// 1. Aniqlanish sohasidagi butun sonlar soni (43)
type DomainP = { kind: 'A'; n: number; c: number } | { kind: 'B'; a: number; b: number };
const DOMAIN_POOL: DomainP[] = [];
for (const n of range(3, 9)) for (const c of range(1, n)) DOMAIN_POOL.push({ kind: 'A', n, c });
for (const a of range(1, 8)) for (const b of range(1, 8)) DOMAIN_POOL.push({ kind: 'B', a, b });

export const inDomain = (p: DomainP, x: number): boolean =>
  p.kind === 'A' ? p.n * p.n - x * x >= 0 && x * x !== p.c * p.c : x + p.a >= 0 && p.b - x > 0;

const domain = y1Entry<DomainP>({
  id: 'domain',
  topic: 43,
  draw: (req) => pickPool(req, 'domain', DOMAIN_POOL),
  build: (p) => {
    const expr = p.kind === 'A' ? `\\frac{\\sqrt{${p.n * p.n} - x^2}}{x^2 - ${p.c * p.c}}` : `\\sqrt{x + ${p.a}} + \\frac{1}{\\sqrt{${p.b} - x}}`;
    const count = p.kind === 'A' ? 2 * p.n - 1 : p.a + p.b;
    const wrong = p.kind === 'A' ? [2 * p.n + 1, 2 * p.n, 2 * p.n - 2, 2 * p.n + 2] : [p.a + p.b + 1, p.a + p.b - 1, p.a + p.b + 2, p.a + p.b - 2];
    const stem = pick({
      uz: `${M(`f(x) = ${expr}`)} funksiyaning aniqlanish sohasiga nechta butun son tegishli?`,
      ru: `Сколько целых чисел принадлежит области определения функции ${M(`f(x) = ${expr}`)}?`,
      kaa: `${M(`f(x) = ${expr}`)} funkciyasınıń anıqlanıw oblastına neshe pútin san tiyisli?`, // kaa: tekshirilsin
      en: `How many integers belong to the domain of the function ${M(`f(x) = ${expr}`)}?`,
    });
    const conds =
      p.kind === 'A'
        ? { c1: `${p.n * p.n} - x^2 \\ge 0 \\Rightarrow -${p.n} \\le x \\le ${p.n}`, c2: `x^2 \\ne ${p.c * p.c} \\Rightarrow x \\ne \\pm ${p.c}`, set: `[-${p.n};\\ ${p.n}] \\setminus \\{-${p.c};\\ ${p.c}\\}`, calc: `${2 * p.n + 1} - 2 = ${count}` }
        : { c1: `x + ${p.a} \\ge 0 \\Rightarrow x \\ge -${p.a}`, c2: `${p.b} - x > 0 \\Rightarrow x < ${p.b}`, set: `[-${p.a};\\ ${p.b})`, calc: `${p.b} - (-${p.a}) = ${count}` };
    const solution = pick({
      uz: `Ildiz ostidagi ifoda manfiy bo'lmasligi, maxraj esa nolga teng bo'lmasligi (yoki ildiz maxrajda qat'iy musbat) kerak.\n\n${M(conds.c1)}.\n\n${M(conds.c2)}.\n\nAniqlanish sohasi: ${M(conds.set)}. Butun sonlar soni: ${M(conds.calc)}. ${G.answer.uz}: ${M(String(count))}.`,
      ru: `Выражение под корнем должно быть неотрицательным, а знаменатель не должен обращаться в нуль (или быть строго положительным, если в нём корень).\n\n${M(conds.c1)}.\n\n${M(conds.c2)}.\n\nОбласть определения: ${M(conds.set)}. Количество целых чисел: ${M(conds.calc)}. ${G.answer.ru}: ${M(String(count))}.`,
      kaa: `Túbir astındaǵı ańlatpa teris bolmawı, bólim bolsa nolge teń bolmawı (yamasa túbir bólimde qatań oń) kerek.\n\n${M(conds.c1)}.\n\n${M(conds.c2)}.\n\nAnıqlanıw oblastı: ${M(conds.set)}. Pútin sanlar sanı: ${M(conds.calc)}. ${G.answer.kaa}: ${M(String(count))}.`, // kaa: tekshirilsin
      en: `The expression under the root must be non-negative and the denominator must not vanish (or be strictly positive when it contains a root).\n\n${M(conds.c1)}.\n\n${M(conds.c2)}.\n\nThe domain is ${M(conds.set)}. The number of integers is ${M(conds.calc)}. ${G.answer.en}: ${M(String(count))}.`,
    });
    const mistake = pick({
      uz: p.kind === 'A' ? "Maxrajni nolga aylantiradigan nuqtalarni ($x = -c$ va $x = c$) aniqlanish sohasidan chiqarishni unutish." : "Maxrajdagi ildiz ostidagi ifoda qat'iy musbat bo'lishi kerakligini ($x < b$) unutish, ya'ni chegarani ham sanash.",
      ru: p.kind === 'A' ? 'Забывают исключить из области определения точки, обращающие знаменатель в нуль ($x = -c$ и $x = c$).' : 'Забывают, что подкоренное выражение в знаменателе должно быть строго положительным ($x < b$), то есть считают и границу.',
      kaa: p.kind === 'A' ? "Bólimdi nolge aylandıratuǵın noqatlardı ($x = -c$ hám $x = c$) anıqlanıw oblastınan shıǵarıwdı umıtıw." : "Bólimdegi túbir astındaǵı ańlatpa qatań oń bolıwı kerekligin ($x < b$) umıtıw, yaǵnıy shegaranı da sanaw.", // kaa: tekshirilsin
      en: p.kind === 'A' ? 'Forgetting to exclude the points that make the denominator zero ($x = -c$ and $x = c$).' : 'Forgetting that the radicand in the denominator must be strictly positive ($x < b$), i.e. counting the endpoint.',
    });
    return { value: count, ...intChoices(count, wrong), est: 100, stem, solution, mistake };
  },
});

// 2. Juft va toq funksiya (44)
interface EvenOddP {
  a: number;
  p: number;
  q: number;
  al: number;
  be: number;
}
const coefStr = (n: number): string => (n === 1 ? '' : n === -1 ? '-' : String(n));

const evenOdd = y1Entry<EvenOddP>({
  id: 'evenOdd',
  topic: 44,
  draw: (req, rng) => ({ a: rng.int(1, 4), p: rng.pick(nonZero(-6, 8)), q: rng.pick(nonZero(-7, 7)), al: rng.pick([2, 3, 4, 5, -2, -3]), be: rng.pick([2, 3, 4, -2, -3, -4]) }),
  build: (p) => {
    const value = p.al * p.p - p.be * p.q;
    const h = `h(x) = ${coefStr(p.al)}f(x) ${p.be < 0 ? '-' : '+'} ${Math.abs(p.be)}g(x)`;
    const given = `f(${-p.a}) = ${p.p}, \\quad g(${-p.a}) = ${p.q}`;
    const stem = pick({
      uz: `${M('f(x)')} juft, ${M('g(x)')} esa toq funksiya. ${M(given)} va ${M(h)} bo'lsa, ${M(`h(${p.a})`)} ni toping.`,
      ru: `Функция ${M('f(x)')} чётная, а ${M('g(x)')} нечётная. Известно, что ${M(given)}, и ${M(h)}. Найдите ${M(`h(${p.a})`)}.`,
      kaa: `${M('f(x)')} jup, ${M('g(x)')} bolsa taq funkciya. ${M(given)} hám ${M(h)} bolsa, ${M(`h(${p.a})`)} tı tabıń.`, // kaa: tekshirilsin
      en: `The function ${M('f(x)')} is even and ${M('g(x)')} is odd. Given ${M(given)} and ${M(h)}, find ${M(`h(${p.a})`)}.`,
    });
    const vals = `f(${p.a}) = f(${-p.a}) = ${p.p}, \\quad g(${p.a}) = -g(${-p.a}) = ${-p.q}`;
    const calc = `h(${p.a}) = ${p.al}\\cdot ${texParen(p.p)} + ${texParen(p.be)}\\cdot ${texParen(-p.q)} = ${value}`;
    const solution = pick({
      uz: `Juft funksiya uchun ${M('f(-x) = f(x)')}, toq funksiya uchun ${M('g(-x) = -g(x)')}.\n\nShuning uchun ${M(vals)}.\n\nDemak ${M(calc)}. ${G.answer.uz}: ${M(String(value))}.`,
      ru: `Для чётной функции ${M('f(-x) = f(x)')}, для нечётной ${M('g(-x) = -g(x)')}.\n\nПоэтому ${M(vals)}.\n\nЗначит, ${M(calc)}. ${G.answer.ru}: ${M(String(value))}.`,
      kaa: `Jup funkciya ushın ${M('f(-x) = f(x)')}, taq funkciya ushın ${M('g(-x) = -g(x)')}.\n\nSonlıqtan ${M(vals)}.\n\nDemek ${M(calc)}. ${G.answer.kaa}: ${M(String(value))}.`, // kaa: tekshirilsin
      en: `For an even function ${M('f(-x) = f(x)')}, for an odd function ${M('g(-x) = -g(x)')}.\n\nTherefore ${M(vals)}.\n\nHence ${M(calc)}. ${G.answer.en}: ${M(String(value))}.`,
    });
    const mistake = pick({
      uz: "Juft va toq funksiyalarning xossasini almashtirib yuborish: $g(-x) = g(x)$ deb olish yoki $f(-x) = -f(x)$ deb olish.",
      ru: 'Путают свойства чётной и нечётной функций: считают $g(-x) = g(x)$ или $f(-x) = -f(x)$.',
      kaa: "Jup hám taq funkciyalardıń qásiyetin almastırıp jiberiw: $g(-x) = g(x)$ dep alıw yamasa $f(-x) = -f(x)$ dep alıw.", // kaa: tekshirilsin
      en: 'Mixing up the properties of even and odd functions: using $g(-x) = g(x)$ or $f(-x) = -f(x)$.',
    });
    const wrong = [p.al * p.p + p.be * p.q, -p.al * p.p + p.be * p.q, -p.al * p.p - p.be * p.q, p.al * p.p - p.be * p.q + p.al];
    return { value, ...intChoices(value, wrong), est: 110, stem, solution, mistake };
  },
});

// 3. Davriy funksiya (44)
interface PeriodP {
  T: number;
  al: number;
  be: number;
  ga: number;
  k: number;
  r: number;
}
const period = y1Entry<PeriodP>({
  id: 'period',
  topic: 44,
  draw: (req, rng) => {
    const T = rng.int(3, 7);
    return { T, al: rng.pick([1, 2, -1]), be: rng.int(-5, 5), ga: rng.int(-4, 4), k: rng.int(5, 25), r: rng.int(1, T - 1) };
  },
  build: (p) => {
    const f = (x: number) => p.al * x * x + p.be * x + p.ga;
    const N = p.k * p.T + p.r;
    const value = f(p.r);
    const poly = texPoly([p.al, p.be, p.ga]);
    const stem = pick({
      uz: `${M('f(x)')} funksiya davri ${p.T} bo'lgan davriy funksiya va ${M(`x \\in [0;\\ ${p.T})`)} da ${M(`f(x) = ${poly}`)}. ${M(`f(${N})`)} ni toping.`,
      ru: `Функция ${M('f(x)')} периодическая с периодом ${p.T}, и ${M(`f(x) = ${poly}`)} при ${M(`x \\in [0;\\ ${p.T})`)}. Найдите ${M(`f(${N})`)}.`,
      kaa: `${M('f(x)')} funkciyası dáwiri ${p.T} bolǵan dáwirli funkciya hám ${M(`x \\in [0;\\ ${p.T})`)} de ${M(`f(x) = ${poly}`)}. ${M(`f(${N})`)} tı tabıń.`, // kaa: tekshirilsin
      en: `The function ${M('f(x)')} is periodic with period ${p.T}, and ${M(`f(x) = ${poly}`)} for ${M(`x \\in [0;\\ ${p.T})`)}. Find ${M(`f(${N})`)}.`,
    });
    const red = `${N} = ${p.k}\\cdot ${p.T} + ${p.r}, \\quad f(${N}) = f(${p.r})`;
    const calc = `f(${p.r}) = ${p.al}\\cdot ${p.r * p.r} + ${texParen(p.be)}\\cdot ${p.r} + ${texParen(p.ga)} = ${value}`;
    const solution = pick({
      uz: `Davriylik: ${M(`f(x + ${p.T}) = f(x)`)}. ${M(String(N))} ni davrga bo'lib qoldiq olamiz: ${M(red)}.\n\n${M(String(p.r))} oraliqqa tegishli, shuning uchun ${M(calc)}. ${G.answer.uz}: ${M(String(value))}.`,
      ru: `Периодичность: ${M(`f(x + ${p.T}) = f(x)`)}. Делим ${M(String(N))} на период с остатком: ${M(red)}.\n\nТочка ${M(String(p.r))} лежит в промежутке задания, поэтому ${M(calc)}. ${G.answer.ru}: ${M(String(value))}.`,
      kaa: `Dáwirlilik: ${M(`f(x + ${p.T}) = f(x)`)}. ${M(String(N))} di dáwirge bólip qaldıq alamız: ${M(red)}.\n\n${M(String(p.r))} berilgen aralıqqa tiyisli, sonlıqtan ${M(calc)}. ${G.answer.kaa}: ${M(String(value))}.`, // kaa: tekshirilsin
      en: `Periodicity: ${M(`f(x + ${p.T}) = f(x)`)}. Divide ${M(String(N))} by the period with remainder: ${M(red)}.\n\nThe point ${M(String(p.r))} lies in the given interval, so ${M(calc)}. ${G.answer.en}: ${M(String(value))}.`,
    });
    const mistake = pick({
      uz: "Davrga bo'lishda qoldiq o'rniga bo'linmani olish yoki qoldiq o'rniga davrdan qoldiqni ayirib ($T - r$) qo'yish.",
      ru: 'Берут частное вместо остатка при делении на период или подставляют $T - r$ вместо остатка $r$.',
      kaa: "Dáwirge bóliwde qaldıq ornına bólindini alıw yamasa qaldıq $r$ ornına $T - r$ di qoyıw.", // kaa: tekshirilsin
      en: 'Using the quotient instead of the remainder when dividing by the period, or substituting $T - r$ instead of $r$.',
    });
    const wrong = [f(p.T - p.r), f(p.r + 1), f(p.r - 1), f(p.k)];
    return { value, ...intChoices(value, wrong), est: 110, stem, solution, mistake };
  },
});

// 4. Kvadrat funksiya: kesmadagi eng katta/kichik qiymat (47)
interface QuadSegP {
  a: number;
  h: number;
  k: number;
  p: number;
  q: number;
  ask: 'max' | 'min';
}
const quadSegValue = (s: QuadSegP): { value: number; f: (x: number) => number; inside: boolean } => {
  const f = (x: number) => s.a * (x - s.h) * (x - s.h) + s.k;
  const inside = s.p <= s.h && s.h <= s.q;
  const cands = [f(s.p), f(s.q), ...(inside ? [f(s.h)] : [])];
  return { value: s.ask === 'max' ? Math.max(...cands) : Math.min(...cands), f, inside };
};

const quadSeg = y1Entry<QuadSegP>({
  id: 'quadSeg',
  topic: 47,
  draw: (req, rng) => {
    const h = rng.int(-3, 4);
    const p = h + rng.int(-5, 2);
    return { a: rng.pick([-3, -2, -1, 1, 2, 3]), h, k: rng.int(-6, 6), p, q: p + rng.int(3, 7), ask: rng.pick(['max', 'min'] as const) };
  },
  build: (s) => {
    const { value, f, inside } = quadSegValue(s);
    const poly = texPoly([s.a, -2 * s.a * s.h, s.a * s.h * s.h + s.k]);
    const seg = `[${s.p};\\ ${s.q}]`;
    const stem = pick(
      s.ask === 'max'
        ? {
            uz: `${M(`f(x) = ${poly}`)} funksiyaning ${M(seg)} kesmadagi eng katta qiymatini toping.`,
            ru: `Найдите наибольшее значение функции ${M(`f(x) = ${poly}`)} на отрезке ${M(seg)}.`,
            kaa: `${M(`f(x) = ${poly}`)} funkciyasınıń ${M(seg)} kesindisindegi eń úlken mánisin tabıń.`, // kaa: tekshirilsin
            en: `Find the largest value of the function ${M(`f(x) = ${poly}`)} on the segment ${M(seg)}.`,
          }
        : {
            uz: `${M(`f(x) = ${poly}`)} funksiyaning ${M(seg)} kesmadagi eng kichik qiymatini toping.`,
            ru: `Найдите наименьшее значение функции ${M(`f(x) = ${poly}`)} на отрезке ${M(seg)}.`,
            kaa: `${M(`f(x) = ${poly}`)} funkciyasınıń ${M(seg)} kesindisindegi eń kishi mánisin tabıń.`, // kaa: tekshirilsin
            en: `Find the smallest value of the function ${M(`f(x) = ${poly}`)} on the segment ${M(seg)}.`,
          },
    );
    const vertex = `x_0 = -\\frac{b}{2a} = ${s.h}`;
    const vals = `f(${s.p}) = ${f(s.p)}, \\quad f(${s.q}) = ${f(s.q)}${inside ? `, \\quad f(${s.h}) = ${s.k}` : ''}`;
    const solution = pick({
      uz: `Parabola uchining absissasi: ${M(vertex)}. Uch ${inside ? `${M(seg)} kesmaning ichida` : `${M(seg)} kesmadan tashqarida`}, shuning uchun ekstremum ${inside ? 'uchda yoki kesma uchlarida' : 'kesma uchlarida'} bo'ladi.\n\nQiymatlar: ${M(vals)}.\n\n${s.ask === 'max' ? 'Eng katta' : 'Eng kichik'} qiymat: ${M(String(value))}.`,
      ru: `Абсцисса вершины параболы: ${M(vertex)}. Вершина ${inside ? 'лежит внутри отрезка' : 'лежит вне отрезка'} ${M(seg)}, поэтому экстремум достигается ${inside ? 'в вершине или на концах отрезка' : 'на концах отрезка'}.\n\nЗначения: ${M(vals)}.\n\n${s.ask === 'max' ? 'Наибольшее' : 'Наименьшее'} значение: ${M(String(value))}.`,
      kaa: `Parabola ushınıń absissası: ${M(vertex)}. Ush ${M(seg)} kesindiniń ${inside ? 'ishinde' : 'sırtında'}, sonlıqtan ekstremum ${inside ? 'ushta yamasa kesindi ushlarında' : 'kesindi ushlarında'} boladı.\n\nMánisler: ${M(vals)}.\n\n${s.ask === 'max' ? 'Eń úlken' : 'Eń kishi'} mánis: ${M(String(value))}.`, // kaa: tekshirilsin
      en: `The abscissa of the vertex is ${M(vertex)}. The vertex lies ${inside ? 'inside' : 'outside'} the segment ${M(seg)}, so the extremum is attained ${inside ? 'at the vertex or at an endpoint' : 'at an endpoint'}.\n\nValues: ${M(vals)}.\n\nThe ${s.ask === 'max' ? 'largest' : 'smallest'} value is ${M(String(value))}.`,
    });
    const mistake = pick({
      uz: "Parabola uchidagi qiymatni har doim javob deb olish: uch kesmadan tashqarida bo'lsa yoki yo'nalish (a ishorasi) teskari bo'lsa, javob kesma uchlarida bo'ladi.",
      ru: 'Всегда берут значение в вершине: если вершина вне отрезка или направление ветвей противоположно, ответ достигается на концах отрезка.',
      kaa: "Parabola ushındaǵı mánisti hámme waqıt juwap dep alıw: ush kesindiden sırtında bolsa yamasa baǵıt (a nıń belgisi) keri bolsa, juwap kesindi ushlarında boladı.", // kaa: tekshirilsin
      en: 'Always taking the value at the vertex: if the vertex is outside the segment or the branches point the other way, the answer is at an endpoint.',
    });
    const wrong = [s.k, f(s.p), f(s.q), s.ask === 'max' ? Math.min(f(s.p), f(s.q)) : Math.max(f(s.p), f(s.q))];
    return { value, ...intChoices(value, wrong), est: 150, stem, solution, mistake };
  },
});

// 5. Ko'rsatkichli funksiya grafigi (50)
interface ExpFnP {
  a: number;
  k: number;
  p: number;
  d: number;
  r: number;
}
const expFn = y1Entry<ExpFnP>({
  id: 'expFn',
  topic: 50,
  draw: (req, rng) => {
    const a = rng.pick([2, 3]);
    const p = rng.int(0, 3);
    const d = rng.int(1, a === 3 ? 2 : 3);
    return { a, k: rng.pick([1, 2, 3, 5]), p, d, r: rng.pick(range(0, 5).filter((x) => x !== p && x !== p + d)) };
  },
  build: (s) => {
    const q = s.p + s.d;
    const u = s.k * s.a ** s.p;
    const w = s.k * s.a ** q;
    const value = s.k * s.a ** s.r;
    const stem = pick({
      uz: `${M('f(x) = k \\cdot a^{x}')} (${M('a > 1')}) funksiyaning grafigi ${M(`A(${s.p};\\ ${u})`)} va ${M(`B(${q};\\ ${w})`)} nuqtalardan o'tadi. ${M(`f(${s.r})`)} ni toping.`,
      ru: `График функции ${M('f(x) = k \\cdot a^{x}')} (${M('a > 1')}) проходит через точки ${M(`A(${s.p};\\ ${u})`)} и ${M(`B(${q};\\ ${w})`)}. Найдите ${M(`f(${s.r})`)}.`,
      kaa: `${M('f(x) = k \\cdot a^{x}')} (${M('a > 1')}) funkciyasınıń grafigi ${M(`A(${s.p};\\ ${u})`)} hám ${M(`B(${q};\\ ${w})`)} noqatlarınan ótedi. ${M(`f(${s.r})`)} di tabıń.`, // kaa: tekshirilsin
      en: `The graph of ${M('f(x) = k \\cdot a^{x}')} (${M('a > 1')}) passes through the points ${M(`A(${s.p};\\ ${u})`)} and ${M(`B(${q};\\ ${w})`)}. Find ${M(`f(${s.r})`)}.`,
    });
    const ratio = `\\frac{${w}}{${u}} = a^{${q} - ${s.p}} = a^{${s.d}}`;
    const aCalc = `a^{${s.d}} = ${texFrac(frac(w, u))} \\Rightarrow a = ${s.a}`;
    const kCalc = `k = \\frac{${u}}{${s.a}^{${s.p}}} = ${s.k}`;
    const fin = `f(${s.r}) = ${s.k}\\cdot ${s.a}^{${s.r}} = ${value}`;
    const solution = pick({
      uz: `Nuqtalarning ordinatalarini bir-biriga bo'lamiz: ${M(ratio)}.\n\nBundan ${M(aCalc)}. Keyin ${M(kCalc)}.\n\nDemak ${M(fin)}. ${G.answer.uz}: ${M(String(value))}.`,
      ru: `Делим ординаты точек друг на друга: ${M(ratio)}.\n\nОтсюда ${M(aCalc)}. Далее ${M(kCalc)}.\n\nЗначит, ${M(fin)}. ${G.answer.ru}: ${M(String(value))}.`,
      kaa: `Noqatlardıń ordinataların bir-birine bólemiz: ${M(ratio)}.\n\nBunnan ${M(aCalc)}. Keyin ${M(kCalc)}.\n\nDemek ${M(fin)}. ${G.answer.kaa}: ${M(String(value))}.`, // kaa: tekshirilsin
      en: `Divide the ordinates of the points: ${M(ratio)}.\n\nHence ${M(aCalc)}. Then ${M(kCalc)}.\n\nSo ${M(fin)}. ${G.answer.en}: ${M(String(value))}.`,
    });
    const mistake = pick({
      uz: "Ordinatalar nisbatini daraja ko'rsatkichiga $q - p$ olmaslik: a ni topishda ildiz chiqarishni unutish yoki k ni hisobga olmaslik.",
      ru: 'Не учитывают показатель $q - p$ в отношении ординат: забывают извлечь корень при нахождении a или не учитывают множитель k.',
      kaa: "Ordinatalar qatnasın dárejeniń kórsetkishi $q - p$ menen baylanıstırmaw: a nı tabıwda túbir shıǵarıwdı umıtıw yamasa k nı esapqa almaw.", // kaa: tekshirilsin
      en: 'Ignoring the exponent $q - p$ in the ratio of ordinates: forgetting to take the root when finding a, or forgetting the factor k.',
    });
    const wrong = [frac(s.a ** s.r), frac(s.k * s.a ** (s.r + 1)), frac(s.k * s.a ** s.r + s.k), s.r >= 1 ? frac(s.k * s.a ** (s.r - 1)) : frac(s.k * s.a ** (s.r + 2))];
    return { value, ...fracChoices(frac(value), wrong), est: 150, stem, solution, mistake };
  },
});

// 6. Grafikni almashtirish (54)
interface TransformP {
  xp: number;
  k: number;
  b: number;
  n: number;
  al: number;
  q: number;
}
const transform = y1Entry<TransformP>({
  id: 'transform',
  topic: 54,
  draw: (req, rng) => ({ xp: rng.int(-4, 6), k: rng.pick([1, 2, 3]), b: rng.pick(nonZero(-4, 4)), n: rng.int(-5, 6), al: rng.pick([2, 3, -1, -2, -3]), q: rng.pick(nonZero(-5, 5)) }),
  build: (s) => {
    const m = s.k * s.xp - s.b;
    const yp = s.al * s.n + s.q;
    const value = s.xp + yp;
    const arg = texPoly([s.k, -s.b]);
    const g = `y = ${coefStr(s.al)}f(${arg}) ${s.q < 0 ? '-' : '+'} ${Math.abs(s.q)}`;
    const stem = pick({
      uz: `${M('y = f(x)')} funksiyaning grafigi ${M(`(${m};\\ ${s.n})`)} nuqtadan o'tadi. ${M(g)} funksiyaning grafigi o'tadigan nuqta koordinatalari yig'indisini toping.`,
      ru: `График функции ${M('y = f(x)')} проходит через точку ${M(`(${m};\\ ${s.n})`)}. Найдите сумму координат точки, через которую проходит график функции ${M(g)}.`,
      kaa: `${M('y = f(x)')} funkciyasınıń grafigi ${M(`(${m};\\ ${s.n})`)} noqatınan ótedi. ${M(g)} funkciyasınıń grafigi ótetuǵın noqat koordinataları qosındısın tabıń.`, // kaa: tekshirilsin
      en: `The graph of ${M('y = f(x)')} passes through the point ${M(`(${m};\\ ${s.n})`)}. Find the sum of the coordinates of the point on the graph of ${M(g)} that corresponds to it.`,
    });
    const argEq = `${arg} = ${m} \\Rightarrow x = ${s.xp}`;
    const yEq = `y = ${s.al}\\cdot ${texParen(s.n)} + ${texParen(s.q)} = ${yp}`;
    const solution = pick({
      uz: `Berilgan nuqta uchun ${M(`f(${m}) = ${s.n}`)}. Yangi funksiyada argument ${M(String(m))} ga teng bo'lishi kerak: ${M(argEq)}.\n\nShunda ${M(yEq)}. Nuqta: ${M(`(${s.xp};\\ ${yp})`)}, koordinatalar yig'indisi ${M(`${s.xp} + ${texParen(yp)} = ${value}`)}. ${G.answer.uz}: ${M(String(value))}.`,
      ru: `Для заданной точки ${M(`f(${m}) = ${s.n}`)}. В новой функции аргумент должен равняться ${M(String(m))}: ${M(argEq)}.\n\nТогда ${M(yEq)}. Точка ${M(`(${s.xp};\\ ${yp})`)}, сумма координат ${M(`${s.xp} + ${texParen(yp)} = ${value}`)}. ${G.answer.ru}: ${M(String(value))}.`,
      kaa: `Berilgen noqat ushın ${M(`f(${m}) = ${s.n}`)}. Jańa funkciyada argument ${M(String(m))} ge teń bolıwı kerek: ${M(argEq)}.\n\nSonda ${M(yEq)}. Noqat: ${M(`(${s.xp};\\ ${yp})`)}, koordinatalar qosındısı ${M(`${s.xp} + ${texParen(yp)} = ${value}`)}. ${G.answer.kaa}: ${M(String(value))}.`, // kaa: tekshirilsin
      en: `For the given point ${M(`f(${m}) = ${s.n}`)}. In the new function the argument must equal ${M(String(m))}: ${M(argEq)}.\n\nThen ${M(yEq)}. The point is ${M(`(${s.xp};\\ ${yp})`)}, and the sum of coordinates is ${M(`${s.xp} + ${texParen(yp)} = ${value}`)}. ${G.answer.en}: ${M(String(value))}.`,
    });
    const mistake = pick({
      uz: "Argumentdagi almashtirishni teskari yo'nalishda qo'llash: x ni topish uchun argumentni tenglashtirmasdan, siljish va siqilish koeffitsiyentlarini to'g'ridan-to'g'ri qo'llash.",
      ru: 'Преобразование аргумента применяют «в ту же сторону»: вместо решения уравнения для аргумента сразу применяют сдвиг и сжатие к абсциссе.',
      kaa: "Argumenttegi almastırıwdı keri baǵıtta qollanıw: x tı tabıw ushın argumentti teńlestirmey, jılıstırıw hám sıǵıw koefficientlerin tuwrıdan-tuwrı qollanıw.", // kaa: tekshirilsin
      en: 'Applying the argument transformation in the wrong direction: shifting and scaling the abscissa directly instead of solving for the argument.',
    });
    const wrong = [m + s.b + yp, s.xp + s.n + s.q, s.xp + s.al * s.n, m + yp, -s.xp + yp];
    return { value, ...intChoices(value, wrong), est: 150, stem, solution, mistake };
  },
});

// 7. Murakkab va teskari funksiya (55)
interface CompP {
  a: number;
  b: number;
  c: number;
  d: number;
  x0: number;
}
const composite = y1Entry<CompP>({
  id: 'composite',
  topic: 55,
  draw: (req, rng) => ({ a: rng.pick([2, 3, 4, -2, -3]), b: rng.pick(nonZero(-5, 5)), c: rng.pick([1, 2, 3, -1, -2]), d: rng.pick(nonZero(-6, 6)), x0: rng.pick(nonZero(-3, 4)) }),
  build: (s) => {
    const m = s.a * s.x0 + s.b;
    const value = s.c * s.x0 * s.x0 + s.d;
    const fx = texPoly([s.a, s.b]);
    const gx = texPoly([s.c, 0, s.d]);
    const target = `g\\left(f^{-1}(${m})\\right)`;
    const stem = pick({
      uz: `${M(`f(x) = ${fx}`)} va ${M(`g(x) = ${gx}`)} funksiyalar berilgan. ${M(target)} ning qiymatini toping.`,
      ru: `Даны функции ${M(`f(x) = ${fx}`)} и ${M(`g(x) = ${gx}`)}. Найдите значение ${M(target)}.`,
      kaa: `${M(`f(x) = ${fx}`)} hám ${M(`g(x) = ${gx}`)} funkciyaları berilgen. ${M(target)} tiń mánisin tabıń.`, // kaa: tekshirilsin
      en: `The functions ${M(`f(x) = ${fx}`)} and ${M(`g(x) = ${gx}`)} are given. Find the value of ${M(target)}.`,
    });
    const inv = `f^{-1}(${m}) = x \\Leftrightarrow ${fx} = ${m} \\Rightarrow x = ${s.x0}`;
    const calc = `g(${s.x0}) = ${s.c}\\cdot ${texParen(s.x0)}^2 + ${texParen(s.d)} = ${value}`;
    const solution = pick({
      uz: `${M(`f^{-1}(${m})`)} bu ${M(`f(x) = ${m}`)} tenglamaning yechimi: ${M(inv)}.\n\nShunda ${M(calc)}. ${G.answer.uz}: ${M(String(value))}.`,
      ru: `Значение ${M(`f^{-1}(${m})`)} — это решение уравнения ${M(`f(x) = ${m}`)}: ${M(inv)}.\n\nТогда ${M(calc)}. ${G.answer.ru}: ${M(String(value))}.`,
      kaa: `${M(`f^{-1}(${m})`)} bul ${M(`f(x) = ${m}`)} teńlemesiniń sheshimi: ${M(inv)}.\n\nSonda ${M(calc)}. ${G.answer.kaa}: ${M(String(value))}.`, // kaa: tekshirilsin
      en: `The value ${M(`f^{-1}(${m})`)} is the solution of ${M(`f(x) = ${m}`)}: ${M(inv)}.\n\nThen ${M(calc)}. ${G.answer.en}: ${M(String(value))}.`,
    });
    const mistake = pick({
      uz: "Teskari funksiyaning qiymatini topish o'rniga f ning o'zini hisoblash (f(m) ni olish) yoki tenglamani yechishda b ning ishorasini xato qo'yish.",
      ru: 'Вместо значения обратной функции вычисляют саму f (берут f(m)) или ошибаются в знаке b при решении уравнения.',
      kaa: "Keri funkciyanıń mánisin tabıw ornına f tiń ózin esaplaw (f(m) di alıw) yamasa teńlemeni sheshiwde b nıń belgisin qáte qoyıw.", // kaa: tekshirilsin
      en: 'Computing f itself (taking f(m)) instead of the inverse value, or getting the sign of b wrong when solving the equation.',
    });
    const x1 = frac(m + s.b, s.a);
    const gOf = (x: Frac): Frac => fAdd(fMul(frac(s.c), fMul(x, x)), frac(s.d));
    const wrong = [gOf(x1), frac(s.c * m * m + s.d), frac(s.a * value + s.b), gOf(fDiv(frac(m), frac(s.a)))];
    return { value, ...fracChoices(frac(value), wrong), est: 130, stem, solution, mistake };
  },
});

// 8. Trigonometrik funksiyaning qiymatlar to'plami (52)
interface TrigRangeP {
  A: number;
  B: number;
  C: number;
  R: number;
  ask: 'max' | 'min';
}
const TRIPLES: [number, number, number][] = [[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17], [7, 24, 25]];

const trigRange = y1Entry<TrigRangeP>({
  id: 'trigRange',
  topic: 52,
  draw: (req, rng) => {
    const [a, b, R] = rng.pick(TRIPLES);
    return { A: a * rng.pick([1, -1]), B: b * rng.pick([1, -1]), C: rng.pick(nonZero(-5, 6)), R, ask: rng.pick(['max', 'min'] as const) };
  },
  build: (s) => {
    const value = s.ask === 'max' ? s.R + s.C : -s.R + s.C;
    const fn = `y = ${s.A} \\sin x ${s.B < 0 ? '-' : '+'} ${Math.abs(s.B)}\\cos x ${s.C < 0 ? '-' : '+'} ${Math.abs(s.C)}`;
    const stem = pick(
      s.ask === 'max'
        ? {
            uz: `${M(fn)} funksiyaning eng katta qiymatini toping.`,
            ru: `Найдите наибольшее значение функции ${M(fn)}.`,
            kaa: `${M(fn)} funkciyasınıń eń úlken mánisin tabıń.`,
            en: `Find the largest value of the function ${M(fn)}.`,
          }
        : {
            uz: `${M(fn)} funksiyaning eng kichik qiymatini toping.`,
            ru: `Найдите наименьшее значение функции ${M(fn)}.`,
            kaa: `${M(fn)} funkciyasınıń eń kishi mánisin tabıń.`,
            en: `Find the smallest value of the function ${M(fn)}.`,
          },
    );
    const amp = `R = \\sqrt{${s.A * s.A} + ${s.B * s.B}} = ${s.R}`;
    const rangeStr = `${-s.R} \\le ${s.A} \\sin x ${s.B < 0 ? '-' : '+'} ${Math.abs(s.B)}\\cos x \\le ${s.R}`;
    const solution = pick({
      uz: `${M('a\\sin x + b\\cos x')} ifoda ${M('R\\sin(x + \\varphi)')} ko'rinishiga keladi, bu yerda ${M('R = \\sqrt{a^2 + b^2}')}. Bu holda ${M(amp)}.\n\nShuning uchun ${M(rangeStr)}, ${M(String(s.C))} ni qo'shsak, funksiya ${M(`[${-s.R + s.C};\\ ${s.R + s.C}]`)} oraliqda o'zgaradi.\n\n${s.ask === 'max' ? 'Eng katta' : 'Eng kichik'} qiymat: ${M(String(value))}.`,
      ru: `Выражение ${M('a\\sin x + b\\cos x')} приводится к виду ${M('R\\sin(x + \\varphi)')}, где ${M('R = \\sqrt{a^2 + b^2}')}. Здесь ${M(amp)}.\n\nПоэтому ${M(rangeStr)}, а с учётом слагаемого ${M(String(s.C))} функция принимает значения из ${M(`[${-s.R + s.C};\\ ${s.R + s.C}]`)}.\n\n${s.ask === 'max' ? 'Наибольшее' : 'Наименьшее'} значение: ${M(String(value))}.`,
      kaa: `${M('a\\sin x + b\\cos x')} ańlatpası ${M('R\\sin(x + \\varphi)')} kórinisine keledi, bunda ${M('R = \\sqrt{a^2 + b^2}')}. Bul jaǵdayda ${M(amp)}.\n\nSonlıqtan ${M(rangeStr)}, ${M(String(s.C))} di qossaq, funkciya ${M(`[${-s.R + s.C};\\ ${s.R + s.C}]`)} aralıqta ózgeredi.\n\n${s.ask === 'max' ? 'Eń úlken' : 'Eń kishi'} mánis: ${M(String(value))}.`, // kaa: tekshirilsin
      en: `The expression ${M('a\\sin x + b\\cos x')} can be written as ${M('R\\sin(x + \\varphi)')} with ${M('R = \\sqrt{a^2 + b^2}')}. Here ${M(amp)}.\n\nSo ${M(rangeStr)}, and adding ${M(String(s.C))} the function takes values in ${M(`[${-s.R + s.C};\\ ${s.R + s.C}]`)}.\n\nThe ${s.ask === 'max' ? 'largest' : 'smallest'} value is ${M(String(value))}.`,
    });
    const mistake = pick({
      uz: "Amplitudani $|a| + |b|$ deb olish (sin va cos bir vaqtda eng katta qiymatga erishmaydi) yoki ozod hadni qo'shishni unutish.",
      ru: 'Принимают амплитуду равной $|a| + |b|$ (sin и cos не достигают максимума одновременно) или забывают прибавить свободный член.',
      kaa: "Amplitudanı $|a| + |b|$ dep alıw (sin hám cos bir waqıtta eń úlken mánisine erispeydi) yamasa bos hádti qosıwdı umıtıw.", // kaa: tekshirilsin
      en: 'Taking the amplitude as $|a| + |b|$ (sin and cos do not reach their maxima at once), or forgetting to add the constant term.',
    });
    const wrong =
      s.ask === 'max'
        ? [Math.abs(s.A) + Math.abs(s.B) + s.C, -s.R + s.C, s.R, s.R - s.C]
        : [-(Math.abs(s.A) + Math.abs(s.B)) + s.C, s.R + s.C, -s.R, -s.R - s.C];
    return { value, ...intChoices(value, wrong), est: 120, stem, solution, mistake };
  },
});

export const FUNKSIYALAR_Y1: readonly Y1Entry[] = [domain, quadSeg, evenOdd, expFn, transform, period, composite, trigRange];

// ---------------------------------------------------------------------------------------------
// O (ochiq) shablonlari
// ---------------------------------------------------------------------------------------------

// O1. Kvadrat funksiya: uch va ekstremum (47)
interface OQuadP {
  a: number;
  h: number;
  k: number;
}
const OQUAD_POOL: OQuadP[] = [];
for (const a of [-3, -2, -1, 1, 2, 3]) for (const h of nonZero(-4, 5)) for (const k of nonZero(-8, 9)) OQUAD_POOL.push({ a, h, k });

const oQuad = oEntry<OQuadP>({
  id: 'oQuad',
  topic: 47,
  draw: (req) => pickPool(req, 'oQuad', OQUAD_POOL),
  build: (s) => {
    const b = -2 * s.a * s.h;
    const c = s.a * s.h * s.h + s.k;
    const poly = texPoly([s.a, b, c]);
    const up = s.a > 0;
    const stem = pick({
      uz: `${M(`f(x) = ${poly}`)} kvadrat funksiya berilgan. Uning grafigi parabola.`,
      ru: `Дана квадратичная функция ${M(`f(x) = ${poly}`)}. Её график — парабола.`,
      kaa: `${M(`f(x) = ${poly}`)} kvadrat funkciyası berilgen. Onıń grafigi parabola.`, // kaa: tekshirilsin
      en: `The quadratic function ${M(`f(x) = ${poly}`)} is given. Its graph is a parabola.`,
    });
    const x0 = `x_0 = -\\frac{b}{2a} = -\\frac{${texParen(b)}}{2\\cdot ${texParen(s.a)}} = ${s.h}`;
    const y0 = `f(${s.h}) = ${s.k}`;
    const solution = pick({
      uz: `Uchning absissasi: ${M(x0)}.\n\nUchning ordinatasi: ${M(y0)}. ${up ? `${M('a > 0')} bo'lgani uchun shoxlar yuqoriga qaragan, shuning uchun bu eng kichik qiymat` : `${M('a < 0')} bo'lgani uchun shoxlar pastga qaragan, shuning uchun bu eng katta qiymat`}.`,
      ru: `Абсцисса вершины: ${M(x0)}.\n\nОрдината вершины: ${M(y0)}. ${up ? `Так как ${M('a > 0')}, ветви направлены вверх, и это наименьшее значение` : `Так как ${M('a < 0')}, ветви направлены вниз, и это наибольшее значение`}.`,
      kaa: `Ushtıń absissası: ${M(x0)}.\n\nUshtıń ordinatası: ${M(y0)}. ${up ? `${M('a > 0')} bolǵanlıqtan shaqalar joqarıǵa qaragan, sonlıqtan bul eń kishi mánis` : `${M('a < 0')} bolǵanlıqtan shaqalar tómenge qaragan, sonlıqtan bul eń úlken mánis`}.`, // kaa: tekshirilsin
      en: `The abscissa of the vertex: ${M(x0)}.\n\nThe ordinate of the vertex: ${M(y0)}. ${up ? `Since ${M('a > 0')}, the branches point upward and this is the smallest value` : `Since ${M('a < 0')}, the branches point downward and this is the largest value`}.`,
    });
    const mistake = pick({
      uz: "Uchning absissasini $-b/(2a)$ o'rniga $b/(2a)$ deb olish (ishora xatosi) yoki a ning ishorasiga qarab eng katta/eng kichik qiymatni adashtirish.",
      ru: 'Ошибка в знаке при вычислении абсциссы вершины (берут $b/(2a)$ вместо $-b/(2a)$) или путают наибольшее и наименьшее значение при выборе по знаку a.',
      kaa: "Ushtıń absissasın $-b/(2a)$ ornına $b/(2a)$ dep alıw (belgi qátesi) yamasa a nıń belgisine qarap eń úlken/eń kishi mánisti shatastırıw.", // kaa: tekshirilsin
      en: 'A sign error in the vertex abscissa (using $b/(2a)$ instead of $-b/(2a)$), or confusing the largest and smallest value depending on the sign of a.',
    });
    return {
      est: 260,
      stem,
      parts: {
        a: { value: s.h, forms: [String(s.h)], prompt: pick({ uz: 'Parabola uchining absissasini toping.', ru: 'Найдите абсциссу вершины параболы.', kaa: 'Parabola ushınıń absissasın tabıń.', en: 'Find the abscissa of the vertex of the parabola.' }) },
        b: {
          value: s.k,
          forms: [String(s.k)],
          prompt: pick(
            up
              ? { uz: 'Funksiyaning eng kichik qiymatini toping.', ru: 'Найдите наименьшее значение функции.', kaa: 'Funkciyanıń eń kishi mánisin tabıń.', en: 'Find the smallest value of the function.' }
              : { uz: 'Funksiyaning eng katta qiymatini toping.', ru: 'Найдите наибольшее значение функции.', kaa: 'Funkciyanıń eń úlken mánisin tabıń.', en: 'Find the largest value of the function.' },
          ),
        },
      },
      solution,
      mistake,
    };
  },
});

// O2. To'g'ri chiziq: burchak koeffitsiyenti va Ox bilan kesishish (46)
interface OLineP {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
const oLine = oEntry<OLineP>({
  id: 'oLine',
  topic: 46,
  draw: (req, rng) => {
    const x1 = rng.int(-4, 4);
    const x2 = x1 + rng.int(1, 5);
    let y1 = rng.int(-6, 8);
    let y2 = rng.int(-6, 8);
    while (y2 === y1) {
      y1 = rng.int(-6, 8);
      y2 = rng.int(-6, 8);
    }
    return { x1, y1, x2, y2 };
  },
  build: (s) => {
    const k = frac(s.y2 - s.y1, s.x2 - s.x1);
    const zero = fSub(frac(s.x1), fDiv(frac(s.y1), k));
    const stem = pick({
      uz: `To'g'ri chiziq ${M(`A(${s.x1};\\ ${s.y1})`)} va ${M(`B(${s.x2};\\ ${s.y2})`)} nuqtalardan o'tadi. Uning tenglamasi ${M('y = kx + b')} ko'rinishida.`,
      ru: `Прямая проходит через точки ${M(`A(${s.x1};\\ ${s.y1})`)} и ${M(`B(${s.x2};\\ ${s.y2})`)}. Её уравнение имеет вид ${M('y = kx + b')}.`,
      kaa: `Tuwrı sızıq ${M(`A(${s.x1};\\ ${s.y1})`)} hám ${M(`B(${s.x2};\\ ${s.y2})`)} noqatlarınan ótedi. Onıń teńlemesi ${M('y = kx + b')} kórinisinde.`, // kaa: tekshirilsin
      en: `A line passes through the points ${M(`A(${s.x1};\\ ${s.y1})`)} and ${M(`B(${s.x2};\\ ${s.y2})`)}. Its equation has the form ${M('y = kx + b')}.`,
    });
    const kEq = `k = \\frac{${s.y2} - ${texParen(s.y1)}}{${s.x2} - ${texParen(s.x1)}} = ${texFrac(k)}`;
    const bf = fSub(frac(s.y1), fMul(k, frac(s.x1)));
    const bEq = `b = ${s.y1} - ${texFrac(k).includes('frac') ? `\\left(${texFrac(k)}\\right)` : texParen(k.n)}\\cdot ${texParen(s.x1)} = ${texFrac(bf)}`;
    const zEq = `0 = ${texFrac(k)}x + ${texParen0f(bf)} \\Rightarrow x = ${texFrac(zero)}`;
    const solution = pick({
      uz: `Burchak koeffitsiyenti: ${M(kEq)}.\n\nOzod had: ${M(bEq)}.\n\nOx o'qi bilan kesishish nuqtasida ${M('y = 0')}: ${M(zEq)}.`,
      ru: `Угловой коэффициент: ${M(kEq)}.\n\nСвободный член: ${M(bEq)}.\n\nВ точке пересечения с осью Ox ${M('y = 0')}: ${M(zEq)}.`,
      kaa: `Mıyıq koefficienti: ${M(kEq)}.\n\nErkin had: ${M(bEq)}.\n\nOx kósheri menen kesilisiw noqatında ${M('y = 0')}: ${M(zEq)}.`, // kaa: tekshirilsin
      en: `Slope: ${M(kEq)}.\n\nIntercept: ${M(bEq)}.\n\nAt the intersection with the Ox axis ${M('y = 0')}: ${M(zEq)}.`,
    });
    const mistake = pick({
      uz: "Burchak koeffitsiyentida surat va maxrajdagi ayirmalar tartibini aralashtirish (y va x ning tartibi) yoki b ni topishda ishorani xato qo'yish.",
      ru: 'Путают порядок разностей в числителе и знаменателе углового коэффициента или ошибаются в знаке при нахождении b.',
      kaa: "Mıyıq koefficientinde alım hám bólimdegi ayırmalar tártibin aralastırıw yamasa b nı tabıwda belgini qáte qoyıw.", // kaa: tekshirilsin
      en: 'Mixing up the order of the differences in the numerator and denominator of the slope, or a sign error when finding b.',
    });
    return {
      est: 300,
      stem,
      parts: {
        a: fracPart(k, pick({ uz: `Burchak koeffitsiyenti ${M('k')} ni toping.`, ru: `Найдите угловой коэффициент ${M('k')}.`, kaa: `Mıyıq koefficienti ${M('k')} nı tabıń.`, en: `Find the slope ${M('k')}.` }), true),
        b: fracPart(zero, pick({ uz: "To'g'ri chiziqning Ox o'qi bilan kesishish nuqtasi absissasini toping.", ru: 'Найдите абсциссу точки пересечения прямой с осью Ox.', kaa: 'Tuwrı sızıqtıń Ox kósheri menen kesilisiw noqatınıń absissasın tabıń.', en: 'Find the abscissa of the point where the line meets the Ox axis.' }), true),
      },
      solution,
      mistake,
    };
  },
});

/** +b / -b ni qo'shiladigan had sifatida yozish uchun: manfiy bo'lsa qavsga oladi */
function texParen0f(f: Frac): string {
  return f.n < 0 ? `\\left(${texFrac(f)}\\right)` : texFrac(f);
}

// O3. Logarifmik funksiya grafigi (51)
interface OLogP {
  a: number;
  q: number;
  r: number;
  neg: boolean;
}
const OLOG_POOL: OLogP[] = [];
for (const [a, qs] of [[2, [3, 4, 5]], [3, [2, 3]], [4, [2, 3]], [5, [2, 3]]] as const) for (const q of qs) for (const r of [1, 2, 3, 4]) for (const neg of [false, true]) OLOG_POOL.push({ a, q, r, neg });

const oLog = oEntry<OLogP>({
  id: 'oLog',
  topic: 51,
  draw: (req) => pickPool(req, 'oLog', OLOG_POOL),
  build: (s) => {
    const N1 = s.a ** s.q;
    const N2 = s.a ** s.r;
    const arg2 = s.neg ? `\\frac{1}{${N2}}` : String(N2);
    const ans2 = s.neg ? -s.r : s.r;
    const stem = pick({
      uz: `${M('f(x) = \\log_{a} x')} funksiyaning grafigi ${M(`(${N1};\\ ${s.q})`)} nuqtadan o'tadi (${M('a > 0')}, ${M('a \\ne 1')}).`,
      ru: `График функции ${M('f(x) = \\log_{a} x')} проходит через точку ${M(`(${N1};\\ ${s.q})`)} (${M('a > 0')}, ${M('a \\ne 1')}).`,
      kaa: `${M('f(x) = \\log_{a} x')} funkciyasınıń grafigi ${M(`(${N1};\\ ${s.q})`)} noqatınan ótedi (${M('a > 0')}, ${M('a \\ne 1')}).`, // kaa: tekshirilsin
      en: `The graph of ${M('f(x) = \\log_{a} x')} passes through the point ${M(`(${N1};\\ ${s.q})`)} (${M('a > 0')}, ${M('a \\ne 1')}).`,
    });
    const baseEq = `\\log_{a} ${N1} = ${s.q} \\Rightarrow a^{${s.q}} = ${N1} \\Rightarrow a = ${s.a}`;
    const valEq = `f(${arg2}) = \\log_{${s.a}} ${arg2} = \\log_{${s.a}} ${s.a}^{${ans2}} = ${ans2}`;
    const solution = pick({
      uz: `Nuqta grafikda yotgani uchun ${M(baseEq)}.\n\nEndi qiymatni hisoblaymiz: ${M(valEq)}.`,
      ru: `Точка лежит на графике, поэтому ${M(baseEq)}.\n\nТеперь вычислим значение: ${M(valEq)}.`,
      kaa: `Noqat grafikte jatqanlıqtan ${M(baseEq)}.\n\nEndi mánisti esaplaymız: ${M(valEq)}.`, // kaa: tekshirilsin
      en: `The point lies on the graph, so ${M(baseEq)}.\n\nNow compute the value: ${M(valEq)}.`,
    });
    const mistake = pick({
      uz: "Asosni topishda $a = q$ yoki $a = N/q$ deb olish; manfiy darajali argumentda ($1/a^r$) logarifm ishorasini unutish.",
      ru: 'Берут основание $a = q$ или $a = N/q$; забывают знак логарифма для аргумента с отрицательной степенью ($1/a^r$).',
      kaa: "Tiykardı tabıwda $a = q$ yamasa $a = N/q$ dep alıw; teris dárejeli argumentte ($1/a^r$) logarifm belgisin umıtıw.", // kaa: tekshirilsin
      en: 'Taking the base as $a = q$ or $a = N/q$; forgetting the sign of the logarithm for an argument with a negative power ($1/a^r$).',
    });
    return {
      est: 270,
      stem,
      parts: {
        a: { value: s.a, forms: [String(s.a)], prompt: pick({ uz: `Logarifm asosi ${M('a')} ni toping.`, ru: `Найдите основание логарифма ${M('a')}.`, kaa: `Logarifm tiykari ${M('a')} nı tabıń.`, en: `Find the base ${M('a')} of the logarithm.` }) },
        b: { value: ans2, forms: [String(ans2)], prompt: pick({ uz: `${M(`f(${arg2})`)} ning qiymatini toping.`, ru: `Найдите значение ${M(`f(${arg2})`)}.`, kaa: `${M(`f(${arg2})`)} tiń mánisin tabıń.`, en: `Find the value of ${M(`f(${arg2})`)}.` }) },
      },
      solution,
      mistake,
    };
  },
});

// O4. Kasr-chiziqli funksiya (48)
interface OFracFnP {
  a: number;
  b: number;
  c: number;
  d: number;
  x0: number;
  m: number;
}
const oFracFn = oEntry<OFracFnP>({
  id: 'oFracFn',
  topic: 48,
  draw: (req, rng) => {
    for (let i = 0; i < 500; i++) {
      const c = rng.pick([1, 2, 3]);
      const d = rng.int(-4, 4);
      const a = rng.pick(nonZero(-4, 5));
      const x0 = rng.int(-4, 5);
      const m = rng.pick(nonZero(-4, 4));
      if (c * x0 + d === 0) continue;
      const b = m * (c * x0 + d) - a * x0;
      if (a * d - b * c === 0 || Math.abs(b) > 20 || b === 0) continue;
      return { a, b, c, d, x0, m };
    }
    return { a: 2, b: 1, c: 1, d: -3, x0: 4, m: 9 };
  },
  build: (s) => {
    const den = texPoly([s.c, s.d]);
    const num = texPoly([s.a, s.b]);
    const asym = frac(s.a, s.c);
    const stem = pick({
      uz: `${M(`f(x) = \\frac{${num}}{${den}}`)} kasr-chiziqli funksiya berilgan.`,
      ru: `Дана дробно-линейная функция ${M(`f(x) = \\frac{${num}}{${den}}`)}.`,
      kaa: `${M(`f(x) = \\frac{${num}}{${den}}`)} bólshek-sızıqlı funkciyası berilgen.`, // kaa: tekshirilsin
      en: `The linear-fractional function ${M(`f(x) = \\frac{${num}}{${den}}`)} is given.`,
    });
    const eq = `\\frac{${num}}{${den}} = ${s.m} \\Rightarrow ${num} = ${s.m}(${den}) \\Rightarrow x = ${s.x0}`;
    const lim = `\\lim_{x \\to \\infty} f(x) = \\frac{${s.a}}{${s.c}} = ${texFrac(asym)}`;
    const solution = pick({
      uz: `${M(`f(x) = ${s.m}`)} tenglama: ${M(eq)}. Tekshiramiz: maxraj ${M(`${den}`)} ${M(String(s.x0))} da nolga teng emas.\n\nGorizontal asimptota: ${M(lim)}, ya'ni ${M(`y = ${texFrac(asym)}`)}.`,
      ru: `Уравнение ${M(`f(x) = ${s.m}`)}: ${M(eq)}. Проверяем: знаменатель ${M(den)} при ${M(`x = ${s.x0}`)} не равен нулю.\n\nГоризонтальная асимптота: ${M(lim)}, то есть ${M(`y = ${texFrac(asym)}`)}.`,
      kaa: `${M(`f(x) = ${s.m}`)} teńlemesi: ${M(eq)}. Tekseremiz: bólim ${M(den)} ${M(`x = ${s.x0}`)} de nolge teń emes.\n\nGorizontal asimptota: ${M(lim)}, yaǵnıy ${M(`y = ${texFrac(asym)}`)}.`, // kaa: tekshirilsin
      en: `The equation ${M(`f(x) = ${s.m}`)}: ${M(eq)}. Check: the denominator ${M(den)} is not zero at ${M(`x = ${s.x0}`)}.\n\nHorizontal asymptote: ${M(lim)}, that is ${M(`y = ${texFrac(asym)}`)}.`,
    });
    const mistake = pick({
      uz: "Gorizontal asimptotani a/c o'rniga b/d deb olish; tenglamani yechishda maxrajga ko'paytirib, qavsni noto'g'ri ochish.",
      ru: 'Берут горизонтальную асимптоту как b/d вместо a/c; неверно раскрывают скобки при умножении на знаменатель.',
      kaa: "Gorizontal asimptotanı a/c ornına b/d dep alıw; teńlemeni sheshiwde bólimge kóbeytip, qawıstı qáte ashıw.", // kaa: tekshirilsin
      en: 'Taking the horizontal asymptote as b/d instead of a/c; expanding brackets incorrectly after multiplying by the denominator.',
    });
    return {
      est: 300,
      stem,
      parts: {
        a: { value: s.x0, forms: [String(s.x0)], prompt: pick({ uz: `${M(`f(x) = ${s.m}`)} tenglamaning ildizini toping.`, ru: `Найдите корень уравнения ${M(`f(x) = ${s.m}`)}.`, kaa: `${M(`f(x) = ${s.m}`)} teńlemesiniń túbirin tabıń.`, en: `Find the root of the equation ${M(`f(x) = ${s.m}`)}.` }) },
        b: fracPart(
          asym,
          pick({
            uz: `Grafikning gorizontal asimptotasi ${M('y = A')} tenglamaga ega. ${M('A')} ni toping.`,
            ru: `Горизонтальная асимптота графика имеет уравнение ${M('y = A')}. Найдите ${M('A')}.`,
            kaa: `Grafiktiń gorizontal asimptotası ${M('y = A')} teńlemesine iye. ${M('A')} nı tabıń.`, // kaa: tekshirilsin
            en: `The horizontal asymptote of the graph has the equation ${M('y = A')}. Find ${M('A')}.`,
          }),
          true,
        ),
      },
      solution,
      mistake,
    };
  },
});

export const FUNKSIYALAR_O: readonly OEntry[] = [oQuad, oLine, oLog, oFracFn];

// ---------------------------------------------------------------------------------------------

export const generateFunksiyalar: BlockGenerator = (req) => (req.type === 'o' ? oSpec(req, chooseEntry(FUNKSIYALAR_O, req)) : y1Spec(req, chooseEntry(FUNKSIYALAR_Y1, req)));

