import { describe, expect, it } from 'vitest';
import { generateGeometryPlan } from '../../content/gen/geometriya-plan';
import { slotRequests, VARIANT_COUNT } from '../../content/gen/layout';
import { LANGS, type LocalizedContent, type SlotRequest } from '../../content/gen/types';
import { isSafeSvg } from '../../lib/exam/payload';

// Mustaqil sonli tekshiruv: o'zbekcha savol matnidan raqamlarni o'qib, javobni koordinatalar / formulalar bilan
// generator kodidan alohida qayta hisoblaydi va kalitdagi javob bilan solishtiradi.

interface Fig {
  svg: string;
  alt: string;
}
interface Y1P {
  options: Record<string, string>;
  figure?: Fig;
}
interface Y2P {
  options: Record<string, string>;
  items: { id: string; text_md: string }[];
  figure?: Fig;
}
interface Y1Key {
  correct: string;
}
interface Y2Key {
  pairs: Record<string, string>;
}
interface OKey {
  a?: string[];
  b?: string[];
}

interface Item {
  req: SlotRequest;
  uz: LocalizedContent;
  key: unknown;
  topic: number;
}

const items: Item[] = [];
for (let v = 0; v < VARIANT_COUNT; v++) {
  for (const req of slotRequests(v)) {
    if (req.block !== 'geometriya' || req.index % 2 !== 0) continue;
    const spec = generateGeometryPlan(req);
    items.push({ req, uz: spec.content('uz'), key: spec.key, topic: spec.topic });
  }
}

const strip = (s: string) => s.replace(/\$/g, '').trim();
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const toNum = (s: string) => (s.includes('/') ? Number(s.split('/')[0]) / Number(s.split('/')[1]) : Number(s));
const dist = (p: [number, number], q: [number, number]) => Math.hypot(p[0] - q[0], p[1] - q[1]);

/** y1: to'g'ri variantning qiymati; boshqa variantlar to'g'ri javobga teng bo'lmasligi shart. */
function y1Check(it: Item, expected: number): void {
  const p = it.uz.payload as Y1P;
  const k = it.key as Y1Key;
  const vals = Object.entries(p.options).map(([l, t]) => [l, Number(strip(t))] as const);
  const chosen = vals.find(([l]) => l === k.correct)!;
  expect(chosen[1], `${it.uz.stem_md.slice(0, 70)}`).toBeCloseTo(expected, 6);
  for (const [l, v] of vals) if (l !== k.correct) expect(near(v, expected), `${l} variant to'g'ri javobga teng`).toBe(false);
}

function openCheck(it: Item, part: 'a' | 'b', expected: number): void {
  const forms = (it.key as OKey)[part]!;
  expect(forms.length).toBeGreaterThan(0);
  for (const f of forms) expect(toNum(f), `${part}) ${f}`).toBeCloseTo(expected, 6);
}

function y2Pairs(it: Item): Record<string, number | string> {
  const p = it.uz.payload as Y2P;
  const k = it.key as Y2Key;
  const out: Record<string, string> = {};
  for (const [id, letter] of Object.entries(k.pairs)) out[id] = strip(p.options[letter]!);
  return out;
}

const D = (n: number) => `${Math.round(n * 100) / 100}`;

interface Verifier {
  id: string;
  test: RegExp;
  run: (m: RegExpMatchArray, it: Item) => void;
}

const num = (m: RegExpMatchArray, i: number) => Number(m[i]);

const VERIFIERS: Verifier[] = [
  {
    id: 'y1-romb',
    test: /rombning diagonallari \$(\d+)\$ sm va \$(\d+)\$ sm/,
    run: (m, it) => {
      // Romb tomoni: uchlari (+-d1/2, 0), (0, +-d2/2) bo'lgan nuqtalar orasidagi masofa
      const side = dist([num(m, 1) / 2, 0], [0, num(m, 2) / 2]);
      y1Check(it, 4 * side);
    },
  },
  {
    id: 'y1-teng-yonli-trapetsiya',
    test: /trapetsiyaning asoslari \$BC=(\d+)\$ sm va \$AD=(\d+)\$ sm, yon tomoni \$AB=(\d+)\$/,
    run: (m, it) => {
      const [b, a, leg] = [num(m, 1), num(m, 2), num(m, 3)];
      // koordinatalar: A(0,0), D(a,0), B((a-b)/2, h), |AB| = leg  =>  h
      const dx = (a - b) / 2;
      const h = Math.sqrt(leg * leg - dx * dx);
      const B: [number, number] = [dx, h];
      const C: [number, number] = [dx + b, h];
      expect(dist([0, 0], B)).toBeCloseTo(leg, 9);
      expect(dist([a, 0], C)).toBeCloseTo(leg, 9);
      // yuza: poligon formulasi (Gauss) orqali
      const pts: [number, number][] = [[0, 0], [a, 0], C, B];
      let s = 0;
      for (let i = 0; i < 4; i++) s += pts[i]![0] * pts[(i + 1) % 4]![1] - pts[(i + 1) % 4]![0] * pts[i]![1];
      y1Check(it, Math.abs(s) / 2);
    },
  },
  {
    id: 'y1-urinmalar',
    test: /\$PA\$ va \$PB\$ urinmalar.*\$OP=(\d+)\$/s,
    run: (m, it) => {
      const text = it.uz.stem_md;
      const r = Number(/radiusi \$(\d+)\$ sm/.exec(text)![1]);
      const d = num(m, 1);
      // urinish nuqtasi A: |OA| = r, OA perpendikulyar PA  <=>  (A-O).(A-P) = |OA|^2 - ... yechimni qidirib topamiz
      // A = (r cos t, r sin t); P = (d, 0); (A).(A-P) = 0  =>  r^2 - r d cos t = 0  =>  cos t = r/d
      const t = Math.acos(r / d);
      const A: [number, number] = [r * Math.cos(t), r * Math.sin(t)];
      y1Check(it, 2 * dist(A, [d, 0]));
    },
  },
  {
    id: 'y1-kosinuslar',
    test: /\$AB=(\d+)\$ sm, \$AC=(\d+)\$ sm va \$\\angle BAC=(\d+)\^\{\\circ\}\$/,
    run: (m, it) => {
      const [a, b, g] = [num(m, 1), num(m, 2), (num(m, 3) * Math.PI) / 180];
      const B: [number, number] = [a, 0];
      const C: [number, number] = [b * Math.cos(g), b * Math.sin(g)];
      y1Check(it, dist(B, C));
    },
  },
  {
    id: 'y1-muntazam-kopburchak',
    test: /ichki burchagi \$(\d+)\^\{\\circ\}\$/,
    run: (m, it) => {
      const ang = num(m, 1);
      // tomonlar soni n: n burchakning yig'indisi n*ang = (n-2)*180
      let n = 0;
      for (let k = 3; k <= 200; k++) if (near(k * ang, (k - 2) * 180)) n = k;
      expect(n).toBeGreaterThan(2);
      // diagonallar: barcha juftliklar minus tomonlar
      y1Check(it, (n * (n - 1)) / 2 - n);
    },
  },
  {
    id: 'y1-koordinatalar',
    test: /\$M\((-?\d+);(-?\d+)\)\$, \$A\$ nuqta esa \$\((-?\d+);(-?\d+)\)\$/,
    run: (m, it) => {
      const M: [number, number] = [num(m, 1), num(m, 2)];
      const A: [number, number] = [num(m, 3), num(m, 4)];
      const B: [number, number] = [2 * M[0] - A[0], 2 * M[1] - A[1]];
      expect(dist(A, M)).toBeCloseTo(dist(M, B), 9);
      y1Check(it, dist(A, B));
    },
  },
  {
    id: 'y1-ichki-aylana-yuza',
    test: /gipotenuzasi \$(\d+)\$ sm, unga ichki chizilgan aylananing radiusi \$(\d+)\$ sm/,
    run: (m, it) => {
      const [c, r] = [num(m, 1), num(m, 2)];
      // a+b = c+2r va a^2+b^2 = c^2  =>  ab = ((a+b)^2 - c^2)/2; kataklarni topib, tekshiramiz
      const sum = c + 2 * r;
      const ab = (sum * sum - c * c) / 2;
      const disc = sum * sum - 4 * ab;
      const a = (sum - Math.sqrt(disc)) / 2;
      const b = (sum + Math.sqrt(disc)) / 2;
      expect(Math.hypot(a, b)).toBeCloseTo(c, 9);
      expect((a + b - c) / 2).toBeCloseTo(r, 9);
      y1Check(it, (a * b) / 2);
    },
  },
  {
    id: 'y1-perpendikulyar-diagonalli-trapetsiya',
    test: /asoslari \$AD=(\d+)\$ sm va \$BC=(\d+)\$ sm, diagonallari/,
    run: (m, it) => {
      const [a, b] = [num(m, 1), num(m, 2)];
      // balandlik h ni diagonallar perpendikulyarligidan sonli (bissektsiya) topamiz
      const dot = (h: number) => ((a + b) / 2) * ((a + b) / 2) - h * h; // AC = ((a+b)/2, h), BD = ((a+b)/2, -h)
      let lo = 0;
      let hi = a + b;
      for (let i = 0; i < 80; i++) {
        const mid = (lo + hi) / 2;
        if (dot(mid) > 0) lo = mid;
        else hi = mid;
      }
      y1Check(it, ((a + b) / 2) * lo);
    },
  },
  {
    id: 'y1-bissektrisa',
    test: /\$AB=(\d+)\$ sm, \$AC=(\d+)\$ sm, uchburchakning yuzi \$(\d+)\$ sm²/,
    run: (m, it) => {
      const [mm, nn, S] = [num(m, 1), num(m, 2), num(m, 3)];
      const sinA = (2 * S) / (mm * nn);
      expect(sinA).toBeLessThan(1); // uchburchak mavjud
      const A = Math.asin(sinA);
      const B: [number, number] = [mm, 0];
      const C: [number, number] = [nn * Math.cos(A), nn * Math.sin(A)];
      // bissektrisa yo'nalishi = birlik vektorlar yig'indisi; BC bilan kesishishi
      const ub: [number, number] = [1, 0];
      const uc: [number, number] = [Math.cos(A), Math.sin(A)];
      const dir: [number, number] = [ub[0] + uc[0], ub[1] + uc[1]];
      // B + t (C-B) = s dir
      const ex = C[0] - B[0];
      const ey = C[1] - B[1];
      const det = ex * -dir[1] + ey * dir[0];
      const t = (-B[0] * -dir[1] + B[1] * dir[0]) / det;
      const Dp: [number, number] = [B[0] + t * ex, B[1] + t * ey];
      const area = Math.abs(B[0] * Dp[1] - B[1] * Dp[0]) / 2; // ABD (A = koordinata boshi)
      y1Check(it, area);
    },
  },
  {
    id: 'y1-urinma-kesuvchi',
    test: /\$PT=(\d+)\$ sm, \$AB=(\d+)\$ sm/,
    run: (m, it) => {
      const [tan, y] = [num(m, 1), num(m, 2)];
      // x(x+y) = tan^2 ni bissektsiya bilan yechamiz
      let lo = 0;
      let hi = tan * tan;
      for (let i = 0; i < 100; i++) {
        const mid = (lo + hi) / 2;
        if (mid * (mid + y) < tan * tan) lo = mid;
        else hi = mid;
      }
      y1Check(it, lo);
    },
  },
  {
    id: 'y2-aylana-doira',
    test: /Radiusi \$(\d+)\$ sm bo'lgan aylana va doira/,
    run: (m, it) => {
      const r = num(m, 1);
      const pairs = y2Pairs(it);
      expect(pairs['1']).toBe(`${D(2 * Math.PI * r / Math.PI)}\\pi`);
      expect(pairs['2']).toBe(`${D((Math.PI * r * r) / Math.PI)}\\pi`);
      expect(pairs['3']).toBe(`${D(((120 / 360) * Math.PI * r * r) / Math.PI)}\\pi`);
    },
  },
  {
    id: 'y2-uchburchak-burchaklari',
    test: /nisbati \$(\d+):(\d+):(\d+)\$/,
    run: (m, it) => {
      const parts = [num(m, 1), num(m, 2), num(m, 3)].sort((x, y) => x - y);
      const k = 180 / (parts[0]! + parts[1]! + parts[2]!);
      const angles = parts.map((x) => x * k);
      expect(angles.reduce((s, x) => s + x, 0)).toBeCloseTo(180, 9);
      const pairs = y2Pairs(it);
      expect(pairs['1']).toBe(`${D(Math.min(...angles))}^{\\circ}`);
      expect(pairs['2']).toBe(`${D(Math.max(...angles))}^{\\circ}`);
      expect(pairs['3']).toBe(`${D(180 - Math.min(...angles))}^{\\circ}`);
    },
  },
  {
    id: 'y2-almashtirishlar',
    test: /\$A\((-?\d+);(-?\d+)\)\$ nuqtaga turli/,
    run: (m, it) => {
      const [x, y] = [num(m, 1), num(m, 2)];
      const rot = (deg: number): [number, number] => {
        const t = (deg * Math.PI) / 180;
        return [Math.round(x * Math.cos(t) - y * Math.sin(t)), Math.round(x * Math.sin(t) + y * Math.cos(t))];
      };
      const pairs = y2Pairs(it);
      const p = it.uz.payload as Y2P;
      expect(p.items).toHaveLength(3);
      for (const item of p.items) {
        const t = item.text_md;
        let img: [number, number];
        if (t.startsWith('Ox')) img = [x, -y];
        else if (t.startsWith('Oy')) img = [-x, y];
        else if (t.startsWith('Koordinatalar boshiga')) img = rot(180);
        else if (t.includes('$y=x$')) img = [y, x];
        else if (t.includes('teskari')) img = rot(90);
        else if (t.includes('soat mili bo')) img = rot(-90);
        else throw new Error(`noma'lum almashtirish: ${t}`);
        expect(pairs[item.id]).toBe(`(${img[0]};${img[1]})`);
      }
    },
  },
  {
    id: 'y2-togri-burchakli-uchburchak',
    test: /katetlari \$(\d+)\$ sm va \$(\d+)\$ sm\. Kattaliklarni/,
    run: (m, it) => {
      const [a, b] = [num(m, 1), num(m, 2)];
      const C: [number, number] = [0, 0];
      const B: [number, number] = [a, 0];
      const A: [number, number] = [0, b];
      const hyp = dist(A, B);
      const S = Math.abs(B[0] * A[1] - B[1] * A[0]) / 2;
      // C dan AB to'g'ri chizig'igacha masofa (vektor ko'paytma orqali)
      const alt = Math.abs((B[0] - A[0]) * (A[1] - C[1]) - (A[0] - C[0]) * (B[1] - A[1])) / hyp;
      const pairs = y2Pairs(it);
      expect(Number(pairs['1'])).toBeCloseTo(hyp, 6);
      expect(Number(pairs['2'])).toBeCloseTo(S, 6);
      expect(Number(pairs['3'])).toBeCloseTo(alt, 2);
    },
  },
  {
    id: 'o-koordinatali-uchburchak',
    test: /\$A\((-?\d+);(-?\d+)\)\$, \$B\((-?\d+);(-?\d+)\)\$ va \$C\((-?\d+);(-?\d+)\)\$/,
    run: (m, it) => {
      const A: [number, number] = [num(m, 1), num(m, 2)];
      const B: [number, number] = [num(m, 3), num(m, 4)];
      const C: [number, number] = [num(m, 5), num(m, 6)];
      const S = Math.abs(A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1])) / 2;
      const semi = (dist(A, B) + dist(B, C) + dist(A, C)) / 2;
      // Geron formulasi bilan o'zaro tekshiruv
      const heron = Math.sqrt(semi * (semi - dist(A, B)) * (semi - dist(B, C)) * (semi - dist(A, C)));
      expect(heron).toBeCloseTo(S, 6);
      openCheck(it, 'a', S);
      openCheck(it, 'b', S / semi);
    },
  },
  {
    id: 'o-vatar',
    test: /aylananing radiusi \$(\d+)\$ ga teng, \$AB\$ vatarning uzunligi \$(\d+)\$/,
    run: (m, it) => {
      const [r, len] = [num(m, 1), num(m, 2)];
      // vatarning uchlari aylanada, markazdan masofa d: A=(-len/2, -d), |OA| = r
      const d = Math.sqrt(r * r - (len / 2) * (len / 2));
      const A: [number, number] = [-len / 2, -d];
      const B: [number, number] = [len / 2, -d];
      expect(Math.hypot(A[0], A[1])).toBeCloseTo(r, 9);
      openCheck(it, 'a', d);
      openCheck(it, 'b', Math.abs(A[0] * B[1] - A[1] * B[0]) / 2);
    },
  },
  {
    id: 'o-oxshashlik',
    test: /\$BD=(\d+)\$ sm, \$DA=(\d+)\$ sm, \$AC=(\d+)\$ sm, \$ABC\$ uchburchakning yuzi \$(\d+)\$ sm²/,
    run: (m, it) => {
      const [bd, da, ac, S] = [num(m, 1), num(m, 2), num(m, 3), num(m, 4)];
      // B(0, H), AC asosda: D va E balandlikning bd/(bd+da) qismida; DE = AC * (balandlik nisbati)
      const H = (2 * S) / ac; // B dan AC gacha balandlik
      const level = H * (da / (bd + da)); // DE chizig'ining balandligi (AC dan)
      const de = ac * (1 - level / H);
      const smallArea = (de * (H - level)) / 2; // BDE
      openCheck(it, 'a', de);
      openCheck(it, 'b', S - smallArea);
    },
  },
];

function classify(it: Item): { v: Verifier; m: RegExpMatchArray } {
  const hits = VERIFIERS.map((v) => ({ v, m: it.uz.stem_md.match(v.test) })).filter((h): h is { v: Verifier; m: RegExpMatchArray } => h.m !== null);
  if (hits.length !== 1) throw new Error(`v${it.req.variant} #${it.req.position}: ${hits.length} ta mos tekshiruvchi: ${it.uz.stem_md.slice(0, 80)}`);
  return hits[0]!;
}

describe('geometriya (planimetriya): javoblarni mustaqil hisoblash', () => {
  it('48 ta savol (6 variant x 8 slot) yig\'ildi', () => {
    expect(items).toHaveLength(VARIANT_COUNT * 8);
  });

  it('har bir savol javobi koordinatalar/formulalar bilan qayta hisoblanganda kalitga teng', () => {
    for (const it of items) {
      const { v, m } = classify(it);
      v.run(m, it);
    }
  });

  it('shablon xilma-xilligi: har (tur, qiyinlik) guruhida yetarlicha turli shablon ishlatilgan', () => {
    const groups = new Map<string, Set<string>>();
    for (const it of items) {
      const g = `${it.req.type}-${it.req.difficulty}`;
      const set = groups.get(g) ?? new Set<string>();
      set.add(classify(it).v.id);
      groups.set(g, set);
    }
    const min: Record<string, number> = { 'y1-L2': 3, 'y1-L3': 3, 'y2-L2': 2, 'y2-L3': 2, 'o-L3': 3 };
    for (const [g, need] of Object.entries(min)) expect(groups.get(g)?.size ?? 0, g).toBeGreaterThanOrEqual(need);
  });

  it('bir variantda bir xil shablon ikki marta uchramaydi (bir guruh ichida)', () => {
    for (let v = 0; v < VARIANT_COUNT; v++) {
      const seen = new Set<string>();
      for (const it of items.filter((x) => x.req.variant === v)) {
        const key = `${it.req.type}-${it.req.difficulty}-${classify(it).v.id}`;
        expect(seen.has(key), `v${v}: ${key} takrorlandi`).toBe(false);
        seen.add(key);
      }
    }
  });

  it('chizmalar: xavfsiz SVG, hajm <= 30 KB, o\'lchamlar matndagi qiymatlarga mos, NaN yo\'q', () => {
    let withFigure = 0;
    for (const it of items) {
      const fig = (it.uz.payload as { figure?: Fig }).figure;
      if (!fig) continue;
      withFigure += 1;
      expect(isSafeSvg(fig.svg)).toBe(true);
      expect(fig.svg.length).toBeLessThanOrEqual(30_000);
      expect(fig.svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 320 220"/);
      expect(fig.svg).not.toMatch(/NaN|undefined|Infinity/);
      expect(fig.alt.length).toBeGreaterThan(10);
      // <text> ichidagi sonlar savol matnida (yoki variantda) bo'lishi kerak
      const itemText = ((it.uz.payload as Y2P).items ?? []).map((x) => x.text_md).join(' ');
      const stemNums = new Set([...`${it.uz.stem_md} ${itemText}`.matchAll(/\d+/g)].map((x) => x[0]));
      const texts = [...fig.svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((x) => x[1]!);
      for (const t of texts) {
        for (const n of t.matchAll(/\d+/g)) {
          if (n[0] === '176') continue; // &#176; (daraja belgisi)
          expect(stemNums.has(n[0]), `chizmadagi "${t}" yozuvi matnda yo'q (${it.uz.stem_md.slice(0, 50)})`).toBe(true);
        }
      }
      // koordinatalar chegarada
      for (const mm of fig.svg.matchAll(/(?:x|y|cx|cy|x1|y1|x2|y2)="(-?[\d.]+)"/g)) {
        const val = Number(mm[1]);
        expect(val).toBeGreaterThanOrEqual(-1);
        expect(val).toBeLessThanOrEqual(321);
      }
    }
    expect(withFigure).toBeGreaterThanOrEqual(Math.ceil(items.length * 0.6)); // ko'pchiligi chizma bilan
  });

  it('tillar: variantlar, band id lari va raqamlar barcha tillarda bir xil', () => {
    const digits = (s: string) => (s.replace(/\\[a-zA-Z]+/g, ' ').match(/-?\d+(?:\.\d+)?/g) ?? []).join(',');
    for (const it of items) {
      const spec = generateGeometryPlan(it.req);
      const base = spec.content('uz');
      for (const lang of LANGS) {
        const c = spec.content(lang);
        expect(digits(c.stem_md), `${lang} v${it.req.variant} #${it.req.position}`).toBe(digits(base.stem_md));
        expect(digits(c.solution_md)).toBe(digits(base.solution_md));
        const a = c.payload as { options?: Record<string, string>; figure?: Fig; items?: { id: string }[]; parts?: Record<string, unknown> };
        const b = base.payload as typeof a;
        expect(a.options).toEqual(b.options);
        expect(a.figure?.svg).toBe(b.figure?.svg);
        expect(a.items?.map((x) => x.id)).toEqual(b.items?.map((x) => x.id));
        expect(Object.keys(a.parts ?? {})).toEqual(Object.keys(b.parts ?? {}));
        expect(c.mistake_note_md?.length ?? 0).toBeGreaterThan(10);
      }
    }
  });

  it('estSeconds oraliqlari: L1 45-90, L2 90-180, L3 150-300 (y1); ochiq 240-480', () => {
    for (const it of items) {
      const spec = generateGeometryPlan(it.req);
      const t = spec.estSeconds!;
      const [lo, hi] = it.req.type === 'o' ? [240, 480] : it.req.type === 'y1' ? (it.req.difficulty === 'L2' ? [90, 180] : [150, 300]) : [60, 480];
      expect(t).toBeGreaterThanOrEqual(lo!);
      expect(t).toBeLessThanOrEqual(hi!);
    }
  });

  it('mavzular 67–82 oralig\'ida va kamida 10 ta turli mavzu qamralgan', () => {
    const topics = new Set(items.map((x) => x.topic));
    for (const t of topics) {
      expect(t).toBeGreaterThanOrEqual(67);
      expect(t).toBeLessThanOrEqual(82);
    }
    expect(topics.size).toBeGreaterThanOrEqual(10);
  });
});
