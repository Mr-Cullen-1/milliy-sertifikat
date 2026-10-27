// Stereometriya chizmalari (kabinet proyeksiyasi) uchun SVG yordamchilari. Barcha chizmalar KOD bilan hosil qilinadi.
// xmlns shart (SVG <img> ichida ko'rinishi uchun); lib/exam/payload.ts isSafeSvg aynan shu nomlar fazosiga ruxsat beradi.

export type P2 = readonly [number, number];
export type V3 = readonly [number, number, number];

export const INK = '#1e1b39';
export const ACCENT = '#4f46e5';
export const SOFT = '#c7d2fe';

const r1 = (x: number): number => Math.round(x * 10) / 10;
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export interface StrokeOpts {
  dash?: boolean;
  color?: string;
  width?: number;
  fill?: string;
  opacity?: number;
}

export interface TextOpts {
  anchor?: 'start' | 'middle' | 'end';
  size?: number;
  color?: string;
  bold?: boolean;
}

export class Svg {
  private parts: string[] = [];

  constructor(
    readonly w = 320,
    readonly h = 220,
  ) {}

  private attrs(o: StrokeOpts): string {
    return (
      `fill="${o.fill ?? 'none'}"${o.opacity !== undefined ? ` fill-opacity="${o.opacity}"` : ''} stroke="${o.color ?? INK}" ` +
      `stroke-width="${o.width ?? 1.6}" stroke-linecap="round" stroke-linejoin="round"${o.dash ? ' stroke-dasharray="5 4"' : ''}`
    );
  }

  line(a: P2, b: P2, o: StrokeOpts = {}): void {
    this.parts.push(`<line x1="${r1(a[0])}" y1="${r1(a[1])}" x2="${r1(b[0])}" y2="${r1(b[1])}" ${this.attrs(o)}/>`);
  }

  poly(pts: readonly P2[], o: StrokeOpts = {}): void {
    this.parts.push(`<polygon points="${pts.map((p) => `${r1(p[0])},${r1(p[1])}`).join(' ')}" ${this.attrs(o)}/>`);
  }

  circle(c: P2, r: number, o: StrokeOpts = {}): void {
    this.parts.push(`<circle cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r1(r)}" ${this.attrs(o)}/>`);
  }

  ellipse(c: P2, rx: number, ry: number, o: StrokeOpts = {}): void {
    this.parts.push(`<ellipse cx="${r1(c[0])}" cy="${r1(c[1])}" rx="${r1(rx)}" ry="${r1(ry)}" ${this.attrs(o)}/>`);
  }

  path(d: string, o: StrokeOpts = {}): void {
    this.parts.push(`<path d="${d}" ${this.attrs(o)}/>`);
  }

  dot(c: P2, r = 2.2, color = INK): void {
    this.parts.push(`<circle cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r}" fill="${color}" stroke="none"/>`);
  }

  text(at: P2, s: string, o: TextOpts = {}): void {
    this.parts.push(
      `<text x="${r1(at[0])}" y="${r1(at[1] + (o.size ?? 13) * 0.35)}" font-family="sans-serif" font-size="${o.size ?? 13}" ` +
        `text-anchor="${o.anchor ?? 'middle'}" fill="${o.color ?? INK}"${o.bold ? ' font-weight="bold"' : ''}>${esc(s)}</text>`,
    );
  }

  toString(): string {
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.w} ${this.h}" width="${this.w}" height="${this.h}">` +
      `<rect x="0" y="0" width="${this.w}" height="${this.h}" fill="#ffffff"/>${this.parts.join('')}</svg>`
    );
  }
}

// --- Vektor yordamchilari ---

export const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const mul3 = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot3 = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross3 = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm3 = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
export const lerp3 = (a: V3, b: V3, t: number): V3 => add3(a, mul3(sub3(b, a), t));
export const mid3 = (a: V3, b: V3): V3 => lerp3(a, b, 0.5);

// --- Kabinet proyeksiyasi: x o'ngga, y chuqurlikka (yuqori-o'ngga), z yuqoriga ---

const KC = Math.SQRT1_2 * 0.5;
export const project = (p: V3): P2 => [p[0] + KC * p[1], p[2] + KC * p[1]];
/** Kuzatuvchiga qarab yo'nalgan vektor (proyeksiya yo'nalishiga parallel) */
const VIEW: V3 = [KC, -1, KC];

export interface Poly {
  verts: V3[];
  /** yoqlar: tepalar indekslari (tartib ixtiyoriy) */
  faces: number[][];
  names: string[];
}

export const boxPoly = (a: number, b: number, c: number): Poly => ({
  verts: [
    [0, 0, 0],
    [a, 0, 0],
    [a, b, 0],
    [0, b, 0],
    [0, 0, c],
    [a, 0, c],
    [a, b, c],
    [0, b, c],
  ],
  faces: [
    [0, 1, 2, 3],
    [4, 5, 6, 7],
    [0, 1, 5, 4],
    [3, 2, 6, 7],
    [0, 3, 7, 4],
    [1, 2, 6, 5],
  ],
  names: ['A', 'B', 'C', 'D', 'A1', 'B1', 'C1', 'D1'],
});

const LETTERS = 'ABCDEFGH';

/** Asosi z=0 tekislikdagi ko'pburchak bo'lgan to'g'ri prizma */
export function prismPoly(base: readonly P2[], h: number): Poly {
  const n = base.length;
  const verts: V3[] = [...base.map((p): V3 => [p[0], p[1], 0]), ...base.map((p): V3 => [p[0], p[1], h])];
  const faces: number[][] = [
    base.map((_, i) => i),
    base.map((_, i) => n + i),
    ...base.map((_, i) => [i, (i + 1) % n, n + ((i + 1) % n), n + i]),
  ];
  const names = [...base.map((_, i) => LETTERS[i]!), ...base.map((_, i) => `${LETTERS[i]!}1`)];
  return { verts, faces, names };
}

/** Asosi z=0 tekislikdagi ko'pburchak va uchi apex bo'lgan piramida (uchi oxirgi tepa, "S") */
export function pyramidPoly(base: readonly P2[], apex: V3): Poly {
  const n = base.length;
  const verts: V3[] = [...base.map((p): V3 => [p[0], p[1], 0]), apex];
  const faces: number[][] = [base.map((_, i) => i), ...base.map((_, i) => [i, (i + 1) % n, n])];
  return { verts, faces, names: [...base.map((_, i) => LETTERS[i]!), 'S'] };
}

export const squareBase = (a: number): P2[] => [
  [0, 0],
  [a, 0],
  [a, a],
  [0, a],
];

export const regularBase = (n: number, R: number): P2[] =>
  Array.from({ length: n }, (_, i): P2 => {
    // A old-chapda, B old-o'ngda (AB gorizontal), keyingilari soat strelkasiga teskari
    const ang = -Math.PI / 2 - Math.PI / n + (2 * Math.PI * i) / n;
    return [R * Math.cos(ang), R * Math.sin(ang)];
  });

export function polyEdges(poly: Poly): [number, number][] {
  const seen = new Set<string>();
  const out: [number, number][] = [];
  for (const f of poly.faces) {
    for (let i = 0; i < f.length; i++) {
      const a = f[i]!;
      const b = f[(i + 1) % f.length]!;
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(a < b ? [a, b] : [b, a]);
      }
    }
  }
  return out;
}

/** Qavariq ko'pyoqlik uchun ko'rinadigan yoqlar (tashqi normal bilan kuzatuv yo'nalishining skalyar ko'paytmasi > 0). */
export function faceVisibility(poly: Poly): boolean[] {
  const c = poly.verts.reduce<V3>((s, v) => add3(s, v), [0, 0, 0]);
  const center = mul3(c, 1 / poly.verts.length);
  return poly.faces.map((f) => {
    const p0 = poly.verts[f[0]!]!;
    let nrm: V3 = [0, 0, 0];
    for (let i = 1; i + 1 < f.length; i++) {
      const cr = cross3(sub3(poly.verts[f[i]!]!, p0), sub3(poly.verts[f[i + 1]!]!, p0));
      if (norm3(cr) > 1e-9) {
        nrm = cr;
        break;
      }
    }
    const fc = mul3(f.reduce<V3>((s, i) => add3(s, poly.verts[i]!), [0, 0, 0]), 1 / f.length);
    if (dot3(nrm, sub3(fc, center)) < 0) nrm = mul3(nrm, -1);
    return dot3(nrm, VIEW) > 1e-9;
  });
}

export interface DrawOpts {
  box?: { x: number; y: number; w: number; h: number };
  /** tepa yorliqlari (poly.names o'rniga); bo'sh satr = yorliqsiz; false = hamma yorliqlar o'chirilgan */
  labels?: readonly string[] | false;
  /** qalin urg'u bilan chiziladigan qirralar (tepa indekslari juftligi) */
  highlight?: readonly (readonly [number, number])[];
  /** qo'shimcha nuqtalar (masalan, balandlik asosi) ham chizma o'lchamiga kiradi */
  extraPts?: readonly V3[];
}

export interface DrawCtx {
  pt: (v: V3) => P2;
  scale: number;
  faceVisible: boolean[];
  hiddenEdge: (a: number, b: number) => boolean;
  center: P2;
}

/** Ko'pyoqlikni chizadi (ko'rinmas qirralar punktir) va keyingi chizmalar uchun proyeksiya funksiyasini qaytaradi. */
export function drawPoly(svg: Svg, poly: Poly, o: DrawOpts = {}): DrawCtx {
  const box = o.box ?? { x: 26, y: 18, w: svg.w - 52, h: svg.h - 36 };
  const all = [...poly.verts, ...(o.extraPts ?? [])].map(project);
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const minx = Math.min(...xs);
  const maxx = Math.max(...xs);
  const miny = Math.min(...ys);
  const maxy = Math.max(...ys);
  const bw = Math.max(maxx - minx, 1e-6);
  const bh = Math.max(maxy - miny, 1e-6);
  const s = Math.min(box.w / bw, box.h / bh);
  const ox = box.x + (box.w - bw * s) / 2;
  const oy = box.y + (box.h - bh * s) / 2;
  const pt = (v: V3): P2 => {
    const p = project(v);
    return [ox + (p[0] - minx) * s, oy + (maxy - p[1]) * s];
  };

  const vis = faceVisibility(poly);
  const edgeVisible = new Map<string, boolean>();
  poly.faces.forEach((f, fi) => {
    for (let i = 0; i < f.length; i++) {
      const a = f[i]!;
      const b = f[(i + 1) % f.length]!;
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      edgeVisible.set(key, (edgeVisible.get(key) ?? false) || vis[fi]!);
    }
  });
  const hiddenEdge = (a: number, b: number): boolean => !edgeVisible.get(a < b ? `${a}-${b}` : `${b}-${a}`);

  const P = poly.verts.map(pt);
  const edges = polyEdges(poly);
  // avval ko'rinmaslar, keyin ko'rinadiganlar
  for (const [a, b] of edges) if (hiddenEdge(a, b)) svg.line(P[a]!, P[b]!, { dash: true, width: 1.3 });
  for (const [a, b] of edges) if (!hiddenEdge(a, b)) svg.line(P[a]!, P[b]!);
  for (const [a, b] of o.highlight ?? []) svg.line(P[a]!, P[b]!, { color: ACCENT, width: 3, dash: hiddenEdge(a, b) });

  const cx = P.reduce((t, p) => t + p[0], 0) / P.length;
  const cy = P.reduce((t, p) => t + p[1], 0) / P.length;
  if (o.labels !== false) {
    const labels = o.labels ?? poly.names;
    P.forEach((p, i) => {
      const lab = labels[i];
      if (!lab) return;
      const dx = p[0] - cx;
      const dy = p[1] - cy;
      const len = Math.hypot(dx, dy) || 1;
      svg.text([p[0] + (dx / len) * 11, p[1] + (dy / len) * 11], lab, { size: 12, bold: true });
    });
  }
  return { pt, scale: s, faceVisible: vis, hiddenEdge, center: [cx, cy] };
}

/** Kesma yorlig'i: o'rtasidan `away` nuqtadan uzoqlashtirib joylashtiriladi. */
export function segLabel(svg: Svg, a: P2, b: P2, text: string, away: P2, dist = 11, color = ACCENT): void {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  let nx = -(b[1] - a[1]);
  let ny = b[0] - a[0];
  const len = Math.hypot(nx, ny) || 1;
  nx /= len;
  ny /= len;
  if ((mx - away[0]) * nx + (my - away[1]) * ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  svg.text([mx + nx * dist, my + ny * dist], text, { size: 12, color, bold: true });
}

// --- Aylanish jismlari (o'q vertikal, asos ellipsi ry = 0.3 rx) ---

const RY = 0.3;

/** Ellipsning yarmi: 'back' = orqa (yuqoridagi yoy), 'front' = old (pastdagi yoy) */
export function ellipseHalf(svg: Svg, c: P2, rx: number, ry: number, half: 'back' | 'front', o: StrokeOpts = {}): void {
  const sweep = half === 'back' ? 1 : 0;
  svg.path(`M ${r1(c[0] - rx)} ${r1(c[1])} A ${r1(rx)} ${r1(ry)} 0 0 ${sweep} ${r1(c[0] + rx)} ${r1(c[1])}`, o);
}

export interface Round {
  /** markaz (asos markazi yoki shar markazi) */
  c: P2;
  top: P2;
  ry: number;
}

export function drawCylinder(svg: Svg, base: P2, rx: number, h: number): Round {
  const ry = rx * RY;
  const top: P2 = [base[0], base[1] - h];
  svg.line([base[0] - rx, base[1]], [top[0] - rx, top[1]]);
  svg.line([base[0] + rx, base[1]], [top[0] + rx, top[1]]);
  ellipseHalf(svg, base, rx, ry, 'front');
  ellipseHalf(svg, base, rx, ry, 'back', { dash: true, width: 1.3 });
  svg.ellipse(top, rx, ry);
  return { c: base, top, ry };
}

export function drawCone(svg: Svg, base: P2, rx: number, h: number): Round {
  const ry = rx * RY;
  const top: P2 = [base[0], base[1] - h];
  svg.line(top, [base[0] - rx, base[1]]);
  svg.line(top, [base[0] + rx, base[1]]);
  ellipseHalf(svg, base, rx, ry, 'front');
  ellipseHalf(svg, base, rx, ry, 'back', { dash: true, width: 1.3 });
  return { c: base, top, ry };
}

export function drawFrustum(svg: Svg, base: P2, rxB: number, rxT: number, h: number): Round {
  const ry = rxB * RY;
  const top: P2 = [base[0], base[1] - h];
  svg.line([base[0] - rxB, base[1]], [top[0] - rxT, top[1]]);
  svg.line([base[0] + rxB, base[1]], [top[0] + rxT, top[1]]);
  ellipseHalf(svg, base, rxB, ry, 'front');
  ellipseHalf(svg, base, rxB, ry, 'back', { dash: true, width: 1.3 });
  svg.ellipse(top, rxT, rxT * RY);
  return { c: base, top, ry };
}

export function drawSphere(svg: Svg, c: P2, R: number): void {
  svg.circle(c, R);
  ellipseHalf(svg, c, R, R * RY, 'front');
  ellipseHalf(svg, c, R, R * RY, 'back', { dash: true, width: 1.3 });
}

/** Kub yoki to'g'ri prizma yonidagi nuqtalar: kesma ustidagi nuqta (t = 0..1) */
export const along = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
