// Stereometriya generatorining MUSTAQIL sonli tekshiruvi: javob kaliti generatordagi formulalardan emas,
// jism koordinatalari, sonli integrallash, bissektsiya va determinantlar orqali qayta hisoblanadi.
import { describe, expect, it } from 'vitest';
import { slotRequests, VARIANT_COUNT } from '../../content/gen/layout';
import { buildSolids, stereoInstance, type StereoInstance } from '../../content/gen/geometriya-stereo';
import { polyEdges, type V3 } from '../../content/gen/svg3d';
import type { SlotRequest } from '../../content/gen/types';

// --- Yordamchilar ---

type Num3 = [number, number, number];
const sub = (a: readonly number[], b: readonly number[]): Num3 => [a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!];
const dot = (a: readonly number[], b: readonly number[]): number => a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
const cross = (a: readonly number[], b: readonly number[]): Num3 => [a[1]! * b[2]! - a[2]! * b[1]!, a[2]! * b[0]! - a[0]! * b[2]!, a[0]! * b[1]! - a[1]! * b[0]!];
const len = (a: readonly number[]): number => Math.hypot(a[0]!, a[1]!, a[2]!);
const det3 = (a: readonly number[], b: readonly number[], c: readonly number[]): number => dot(a, cross(b, c));

/** O'rta nuqtalar qoidasi bilan integral */
function integrate(f: (x: number) => number, a: number, b: number, n = 20000): number {
  const h = (b - a) / n;
  let s = 0;
  for (let i = 0; i < n; i++) s += f(a + (i + 0.5) * h);
  return s * h;
}

/** Monoton f uchun f(x) = target ildizini bissektsiya bilan topadi */
function bisect(f: (x: number) => number, target: number, lo: number, hi: number): number {
  const inc = f(hi) > f(lo);
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < target === inc) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** "$\frac{32}{3}\pi$", "$-5$", "$6\sqrt{3}$", "$\pi$" ko'rinishidagi TeX ni songa aylantiradi */
function parseTex(tex: string): number {
  const m = tex.trim().replace(/^\$|\$$/g, '').match(/^(-)?(?:\\frac\{(\d+)\}\{(\d+)\}|(\d+))?(\\pi)?(?:\\sqrt\{(\d+)\})?$/);
  if (!m) throw new Error(`TeX tahlil qilinmadi: ${tex}`);
  let c = 1;
  if (m[2]) c = Number(m[2]) / Number(m[3]);
  else if (m[4]) c = Number(m[4]);
  else if (!m[5] && !m[6]) throw new Error(`bo'sh TeX: ${tex}`);
  if (m[5]) c *= Math.PI;
  if (m[6]) c *= Math.sqrt(Number(m[6]));
  return m[1] ? -c : c;
}

const parseForm = (s: string): number => {
  if (s.includes('/')) {
    const [n, d] = s.split('/');
    return Number(n) / Number(d);
  }
  return Number(s);
};

interface Got {
  inst: StereoInstance;
  payload: Record<string, unknown>;
  key: Record<string, unknown>;
}
const f = (g: Got, name: string): number => g.inst.facts[name] as number;
const fv = (g: Got, name: string): number[] => g.inst.facts[name] as number[];

/** y1: to'g'ri javob harfidagi variantning soni */
const y1Value = (g: Got): number => parseTex((g.payload.options as Record<string, string>)[g.key.correct as string]!);
/** y2: band raqami bo'yicha to'g'ri variantning soni */
const y2Value = (g: Got, id: number): number => {
  const letter = (g.key.pairs as Record<string, string>)[String(id)]!;
  return parseTex((g.payload.options as Record<string, string>)[letter]!);
};
/** o: a/b kalit shakllarining barchasi bir xil songa teng bo'lishi shart */
function oValue(g: Got, part: 'a' | 'b'): number {
  const forms = g.key[part] as string[];
  const vals = forms.map(parseForm);
  for (const v of vals) expect(v).toBeCloseTo(vals[0]!, 9);
  return vals[0]!;
}

const near = (a: number, b: number, rel = 1e-6) => expect(Math.abs(a - b)).toBeLessThanOrEqual(rel * Math.max(1, Math.abs(b)));

// --- Tekshiruvlar (shablon identifikatori bo'yicha) ---

const checks: Record<string, (g: Got) => void> = {
  boxDiag(g) {
    const [a, b, h] = fv(g, 'dims') as [number, number, number];
    const verts: Num3[] = [];
    for (const x of [0, a]) for (const y of [0, b]) for (const z of [0, h]) verts.push([x, y, z]);
    near(len(sub(verts[7]!, verts[0]!)), f(g, 'd')); // fazoviy diagonal koordinatalardan
    near(y1Value(g), Math.abs(det3([a, 0, 0], [0, b, 0], [0, 0, h])));
  },

  pyrLateral(g) {
    const a = f(g, 'a');
    const h = f(g, 'h');
    const base: Num3[] = [[0, 0, 0], [a, 0, 0], [a, a, 0], [0, a, 0]];
    const S: Num3 = [a / 2, a / 2, h];
    let area = 0;
    for (let i = 0; i < 4; i++) area += 0.5 * len(cross(sub(base[i]!, S), sub(base[(i + 1) % 4]!, S)));
    near(y1Value(g), area);
  },

  cylSection(g) {
    const R = f(g, 'R');
    const h = f(g, 'h');
    near(f(g, 'S'), 2 * R * h); // o'q kesimi — 2R x h to'g'ri to'rtburchak
    const crossSection = integrate((x) => 2 * Math.sqrt(Math.max(0, R * R - x * x)), -R, R);
    near(y1Value(g), crossSection * h, 1e-5);
  },

  coneGen(g) {
    const r = f(g, 'r');
    const h = f(g, 'h');
    near(f(g, 'S'), r * h);
    const k = Math.sqrt(1 + (r / h) ** 2);
    near(y1Value(g), integrate((z) => 2 * Math.PI * r * (1 - z / h) * k, 0, h), 1e-6);
  },

  sphereSection(g) {
    const r = f(g, 'r');
    const d = f(g, 'd');
    const R = len([r, 0, d]); // kesim aylanasidagi nuqta shar sirtida yotadi
    near(y1Value(g), integrate((t) => 2 * Math.PI * R * R * Math.sin(t), 0, Math.PI), 1e-6);
  },

  coordVec(g) {
    const A = fv(g, 'A');
    const M = fv(g, 'M');
    const B = M.map((m, i) => 2 * m - A[i]!);
    near(y1Value(g), len(sub(B, A)));
    near(len(sub(M, A)), len(sub(B, M))); // M — haqiqatan o'rta
  },

  skewCount(g) {
    const solid = buildSolids().find((s) => s.id === g.inst.facts.solid)!;
    const edges = polyEdges(solid.poly);
    const e = edges[f(g, 'edge')]!;
    const seg = (ed: readonly [number, number]) => ({ p: solid.poly.verts[ed[0]]! as V3, d: sub(solid.poly.verts[ed[1]]!, solid.poly.verts[ed[0]]!) });
    const e0 = seg(e);
    let count = 0;
    for (const other of edges) {
      if (other === e) continue;
      const o = seg(other);
      // |p0 + s d0 - p1 - t d1| minimal qiymatini normal tenglamalar bilan topamiz
      const w = sub(e0.p, o.p);
      const a = dot(e0.d, e0.d);
      const b = dot(e0.d, o.d);
      const c = dot(o.d, o.d);
      const dd = dot(e0.d, w);
      const ee = dot(o.d, w);
      const den = a * c - b * b;
      let kind: 'parallel' | 'intersect' | 'skew';
      if (Math.abs(den) < 1e-9) kind = 'parallel';
      else {
        const s = (b * ee - c * dd) / den;
        const t = (a * ee - b * dd) / den;
        const gap = len([w[0] + s * e0.d[0] - t * o.d[0], w[1] + s * e0.d[1] - t * o.d[1], w[2] + s * e0.d[2] - t * o.d[2]]);
        kind = gap < 1e-9 ? 'intersect' : 'skew';
      }
      if (kind === g.inst.facts.rel) count++;
    }
    near(y1Value(g), count);
    expect(count).toBe(f(g, 'answer'));
  },

  pyrAngle(g) {
    const a = f(g, 'a');
    const alpha = (f(g, 'alpha') * Math.PI) / 180;
    // yon yoq va asos orasidagi ikki yoqli burchak koordinatalardan: h ni burchak bo'yicha bissektsiya bilan topamiz
    const dihedral = (h: number) => {
      const A: Num3 = [0, 0, 0];
      const B: Num3 = [a, 0, 0];
      const S: Num3 = [a / 2, a / 2, h];
      const n = cross(sub(B, A), sub(S, A)); // old yoq normali
      return Math.acos(Math.abs(n[2]) / len(n));
    };
    const h = bisect(dihedral, alpha, 1e-6, 100 * a);
    near(y1Value(g), integrate((z) => a * a * (1 - z / h) ** 2, 0, h), 1e-6);
  },

  coneInSphere(g) {
    const m = f(g, 'm');
    const R = 2 * m;
    const ballV = integrate((z) => Math.PI * (R * R - z * z), -R, R);
    near(ballV, (32 * m ** 3 * Math.PI) / 3);
    // uchi (0,0,R); asos aylanasi z=-R/2 da va shar sirtida: rho^2 = R^2 - R^2/4
    const z0 = -R / 2;
    const rho = Math.sqrt(R * R - z0 * z0);
    const slant = Math.hypot(rho, R - z0);
    near(slant, 2 * rho); // o'q kesimi teng tomonli: yon tomon = asos (2 rho)
    near(y1Value(g), integrate((z) => Math.PI * (rho * (R - z) / (R - z0)) ** 2, z0, R), 1e-6);
  },

  triPyr(g) {
    const rho = f(g, 'rho');
    const h = f(g, 'h');
    const l = f(g, 'l');
    const base: Num3[] = [0, 1, 2].map((i) => [rho * Math.cos(Math.PI / 2 + (2 * Math.PI * i) / 3), rho * Math.sin(Math.PI / 2 + (2 * Math.PI * i) / 3), 0]) as Num3[];
    const S: Num3 = [0, 0, h];
    near(len(sub(S, base[0]!)), l); // yon qirra
    near(len(sub(base[0]!, base[1]!)), len(sub(base[1]!, base[2]!))); // asos muntazam
    near(y1Value(g), Math.abs(det3(sub(base[1]!, base[0]!), sub(base[2]!, base[0]!), sub(S, base[0]!))) / 6);
  },

  frustumCone(g) {
    const r1 = f(g, 'r1');
    const r2 = f(g, 'r2');
    const l = f(g, 'l');
    const h = f(g, 'h');
    near(Math.hypot(h, r1 - r2), l);
    near(y1Value(g), integrate((z) => Math.PI * (r1 + ((r2 - r1) * z) / h) ** 2, 0, h), 1e-6);
  },

  parallelSection(g) {
    const m = f(g, 'm');
    const n = f(g, 'n');
    const V = f(g, 'V');
    // piramida balandligi H, asos yuzi B: V = B H / 3; kesim z0 = H * n/(m+n) balandlikda (asosdan hisoblaganda)
    const H = 1;
    const B = (3 * V) / H;
    const z0 = H * (n / (m + n)); // asosdan kesimgacha masofa
    const frustum = integrate((z) => B * (1 - z / H) ** 2, 0, z0);
    near(y1Value(g), frustum, 1e-6);
  },

  planeDist(g) {
    const [A, B, C, D] = ['A', 'B', 'C', 'D'].map((k) => g.inst.facts[k] as number[]) as [number[], number[], number[], number[]];
    const volume = Math.abs(det3(sub(B, A), sub(C, A), sub(D, A))) / 6;
    const area = 0.5 * len(cross(sub(B, A), sub(C, A)));
    near(y1Value(g), (3 * volume) / area);
  },

  prismAngle(g) {
    const d = f(g, 'd');
    const alpha = (f(g, 'alpha') * Math.PI) / 180;
    const a = d / Math.SQRT2;
    const A: Num3 = [0, 0, 0];
    const C: Num3 = [a, a, 0];
    near(len(sub(C, A)), d);
    const h = bisect((hh) => Math.atan2(hh, len(sub(C, A))), alpha, 1e-6, 1000); // C1 = (a,a,h): AC1 va AC orasidagi burchak
    near(y1Value(g), Math.abs(det3([a, 0, 0], [0, a, 0], [0, 0, h])), 1e-6);
  },

  y2VolRound(g) {
    const { R1, h1, R2, h2, R3 } = g.inst.facts as unknown as Record<string, number>;
    near(y2Value(g, 1), integrate(() => Math.PI * R1! * R1!, 0, h1!), 1e-6);
    near(y2Value(g, 2), integrate((z) => Math.PI * (R2! * (1 - z / h2!)) ** 2, 0, h2!), 1e-6);
    near(y2Value(g, 3), integrate((z) => Math.PI * (R3! * R3! - z * z), -R3!, R3!), 1e-6);
  },

  y2VolPoly(g) {
    const { a1, a2, h2, a3, h3 } = g.inst.facts as unknown as Record<string, number>;
    near(y2Value(g, 1), Math.abs(det3([a1!, 0, 0], [0, a1!, 0], [0, 0, a1!])));
    near(y2Value(g, 2), integrate((z) => a2! * a2! * (1 - z / h2!) ** 2, 0, h2!), 1e-6);
    // uchburchak yuzi koordinatalardan: tomoni a3 bo'lgan muntazam uchburchak
    const T: Num3[] = [[0, 0, 0], [a3!, 0, 0], [a3! / 2, (a3! * Math.sqrt(3)) / 2, 0]];
    const area = 0.5 * len(cross(sub(T[1]!, T[0]!), sub(T[2]!, T[0]!)));
    near(y2Value(g, 3), area * h3!, 1e-9);
  },

  y2AreaRound(g) {
    const { R1, h1, r, h2, l, R3 } = g.inst.facts as unknown as Record<string, number>;
    near(y2Value(g, 1), integrate(() => 2 * Math.PI * R1!, 0, h1!) + 2 * Math.PI * R1! * R1!, 1e-6);
    near(Math.hypot(r!, h2!), l!);
    const k = Math.sqrt(1 + (r! / h2!) ** 2);
    near(y2Value(g, 2), integrate((z) => 2 * Math.PI * r! * (1 - z / h2!) * k, 0, h2!) + Math.PI * r! * r!, 1e-6);
    near(y2Value(g, 3), integrate((t) => 2 * Math.PI * R3! * R3! * Math.sin(t), 0, Math.PI), 1e-6);
  },

  y2Coords(g) {
    const { a, b, P, Q } = g.inst.facts as unknown as Record<string, number[]>;
    near(y2Value(g, 1), Math.hypot(a![0]!, a![1]!, a![2]!));
    // skalyar ko'paytma: |a||b|cos(theta), burchak 2D hisoblash orqali emas — kosinuslar teoremasi: |a-b|^2 = |a|^2+|b|^2-2ab
    const dotViaLaw = (len(a!) ** 2 + len(b!) ** 2 - len(sub(a!, b!)) ** 2) / 2;
    near(y2Value(g, 2), dotViaLaw);
    near(y2Value(g, 3), len(sub(Q!, P!)));
  },

  oPyramid(g) {
    const a = f(g, 'a');
    const l = f(g, 'l');
    const A: Num3 = [0, 0, 0];
    const h = bisect((hh) => len(sub([a / 2, a / 2, hh], A)), l, 0, 1000);
    near(oValue(g, 'a'), h, 1e-6);
    near(oValue(g, 'b'), integrate((z) => a * a * (1 - z / h) ** 2, 0, h), 1e-6);
  },

  oFrustumPyr(g) {
    const a = f(g, 'a');
    const b = f(g, 'b');
    const l = f(g, 'l');
    const o = (a - b) / 2;
    const h = bisect((hh) => len(sub([o, o, hh], [0, 0, 0])), l, 0, 1000);
    near(oValue(g, 'a'), h, 1e-6);
    near(oValue(g, 'b'), integrate((z) => (a + ((b - a) * z) / h) ** 2, 0, h), 1e-6);
  },

  oCylSection(g) {
    const R = f(g, 'R');
    const d = f(g, 'd');
    const h = f(g, 'h');
    // o'qdan d masofadagi to'g'ri chiziq doira bilan kesishadigan nuqtalar: theta = asin(d/R)
    const theta = Math.asin(d / R);
    const chord = 2 * R * Math.cos(theta);
    near(oValue(g, 'a'), chord, 1e-9);
    near(oValue(g, 'b'), chord * h, 1e-9);
  },

  oSphereTwo(g) {
    const r1 = f(g, 'r1');
    const r2 = f(g, 'r2');
    const t = f(g, 't');
    const R = bisect((RR) => Math.sqrt(RR * RR - r1 * r1) + Math.sqrt(RR * RR - r2 * r2), t, Math.max(r1, r2), 1000);
    near(oValue(g, 'a'), R, 1e-6);
    near(oValue(g, 'b'), integrate((z) => R * R - z * z, -R, R), 1e-6);
  },

  oCoords(g) {
    const [A, B, C] = ['A', 'B', 'C'].map((k) => g.inst.facts[k] as number[]) as [number[], number[], number[]];
    const AB = sub(B, A);
    const AC = sub(C, A);
    near(oValue(g, 'a'), dot(AB, AC));
    // kosinuslar teoremasi: |BC|^2 = |AB|^2 + |AC|^2 - 2|AB||AC|cos
    const cosLaw = (len(AB) ** 2 + len(AC) ** 2 - len(sub(C, B)) ** 2) / (2 * len(AB) * len(AC));
    near(oValue(g, 'b'), cosLaw, 1e-9);
  },
};

function requests(): SlotRequest[] {
  const out: SlotRequest[] = [];
  for (let v = 0; v < VARIANT_COUNT; v++) out.push(...slotRequests(v).filter((r) => r.block === 'geometriya' && r.index % 2 === 1));
  return out;
}

function gotOf(req: SlotRequest): Got {
  const inst = stereoInstance(req);
  const c = inst.spec.content('uz');
  return { inst, payload: c.payload as Record<string, unknown>, key: inst.spec.key as Record<string, unknown> };
}

describe('stereometriya: javoblar mustaqil hisob bilan mos', () => {
  it('har bir savol uchun tekshiruv mavjud va javob to\'g\'ri', () => {
    const missing: string[] = [];
    let n = 0;
    for (const req of requests()) {
      const g = gotOf(req);
      const id = g.inst.facts.id;
      const check = checks[id];
      if (!check) {
        missing.push(id);
        continue;
      }
      try {
        check(g);
        n++;
      } catch (e) {
        throw new Error(`v${req.variant} #${req.position} (${id}): ${(e as Error).message}`);
      }
    }
    expect(missing).toEqual([]);
    expect(n).toBe(requests().length);
  });

  it('tillar bo\'yicha raqamlar va kalit bir xil (faqat matn tarjima qilinadi)', () => {
    const digits = (s: string) => (s.match(/\d+/g) ?? []).join(',');
    for (const req of requests()) {
      const inst = stereoInstance(req);
      const uz = inst.spec.content('uz');
      for (const lang of ['ru', 'kaa', 'en'] as const) {
        const c = inst.spec.content(lang);
        expect(digits(c.stem_md), `v${req.variant} #${req.position} ${lang}`).toBe(digits(uz.stem_md));
        const pu = uz.payload as { options?: unknown; items?: unknown; figure?: { svg: string } };
        const pl = c.payload as typeof pu;
        expect(pl.options).toEqual(pu.options);
        expect(pl.figure?.svg).toBe(pu.figure?.svg);
      }
    }
  });

  it('shablonlar soni: har (tur, qiyinlik) guruhi uchun slotlar sonidan kam emas', () => {
    const byGroup = new Map<string, Set<string>>();
    for (const req of requests()) {
      const k = `${req.type}/${req.difficulty}`;
      byGroup.set(k, (byGroup.get(k) ?? new Set()).add(String(stereoInstance(req).facts.id)));
    }
    const slotsPerVariant = new Map<string, number>();
    for (const r of slotRequests(0).filter((x) => x.block === 'geometriya' && x.index % 2 === 1)) {
      const k = `${r.type}/${r.difficulty}`;
      slotsPerVariant.set(k, (slotsPerVariant.get(k) ?? 0) + 1);
    }
    for (const [k, need] of slotsPerVariant) expect(byGroup.get(k)?.size ?? 0, k).toBeGreaterThanOrEqual(Math.ceil(need * 1.5));
  });

  it('chizmalar xavfsiz SVG va hajmi 30 KB dan kichik', () => {
    for (const req of requests()) {
      const p = gotOf(req).payload as { figure?: { svg: string } };
      if (!p.figure) continue;
      expect(p.figure.svg.length).toBeLessThan(30_000);
      expect(p.figure.svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 320 220"/);
    }
  });
});
