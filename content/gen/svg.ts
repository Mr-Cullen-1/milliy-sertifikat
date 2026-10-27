// Planimetriya chizmalari uchun kichik SVG yordamchisi (kod bilan chizish; hech qanday tashqi havola yo'q).
// xmlns="http://www.w3.org/2000/svg" majburiy (SVG <img> ichida ko'rinishi uchun); isSafeSvg uni ruxsat etadi.

export interface Pt {
  x: number;
  y: number;
}

export const pt = (x: number, y: number): Pt => ({ x, y });
export const lerp = (a: Pt, b: Pt, t: number): Pt => pt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
export const polar = (c: Pt, r: number, deg: number): Pt => pt(c.x + r * Math.cos((deg * Math.PI) / 180), c.y + r * Math.sin((deg * Math.PI) / 180));
export const centroidOf = (pts: readonly Pt[]): Pt => pt(pts.reduce((s, p) => s + p.x, 0) / pts.length, pts.reduce((s, p) => s + p.y, 0) / pts.length);

export const INK = '#1e1b39';
export const ACCENT = '#6d28d9';
const SOFT = '#ede9fe';

const f = (n: number): string => String(Math.round(n * 10) / 10);
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/°/g, '&#176;');

export interface LineOpts {
  dash?: boolean;
  color?: string;
  width?: number;
}

export interface SceneOpts {
  w?: number;
  h?: number;
  pad?: number;
  circles?: { c: Pt; r: number }[];
}

const unit = (dx: number, dy: number): Pt => {
  const l = Math.hypot(dx, dy) || 1;
  return pt(dx / l, dy / l);
};

/** Matematik koordinatalarni (y yuqoriga) 320x220 SVG ga moslab joylaydigan "sahna". */
export function scene(points: readonly Pt[], opts: SceneOpts = {}) {
  const W = opts.w ?? 320;
  const H = opts.h ?? 220;
  const pad = opts.pad ?? 32;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  for (const { c, r } of opts.circles ?? []) {
    xs.push(c.x - r, c.x + r);
    ys.push(c.y - r, c.y + r);
  }
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1e-9);
  const spanY = Math.max(maxY - minY, 1e-9);
  const k = Math.min((W - 2 * pad) / spanX, (H - 2 * pad) / spanY);
  const ox = (W - k * spanX) / 2 - k * minX;
  const oy = H - (H - k * spanY) / 2 + k * minY;
  const center = centroidOf(points);

  const T = (p: Pt): Pt => pt(ox + k * p.x, oy - k * p.y);
  const stroke = (o: LineOpts = {}) => `stroke="${o.color ?? INK}" stroke-width="${o.width ?? 1.8}"${o.dash ? ' stroke-dasharray="5 4"' : ''}`;
  const text = (x: number, y: number, s: string, size: number, bold = false) =>
    `<text x="${f(x)}" y="${f(y)}" dy="0.35em" font-size="${size}" font-family="sans-serif" fill="${INK}" stroke="none" text-anchor="middle"${bold ? ' font-weight="bold"' : ''}>${esc(s)}</text>`;

  return {
    T,
    k,
    seg(a: Pt, b: Pt, o?: LineOpts): string {
      const A = T(a);
      const B = T(b);
      return `<line x1="${f(A.x)}" y1="${f(A.y)}" x2="${f(B.x)}" y2="${f(B.y)}" ${stroke(o)}/>`;
    },
    poly(pts: readonly Pt[], o?: LineOpts & { fill?: string }): string {
      const s = pts.map((p) => `${f(T(p).x)},${f(T(p).y)}`).join(' ');
      return `<polygon points="${s}" fill="${o?.fill ?? 'none'}" ${stroke(o)}/>`;
    },
    circle(c: Pt, r: number, o?: LineOpts & { fill?: string }): string {
      const C = T(c);
      return `<circle cx="${f(C.x)}" cy="${f(C.y)}" r="${f(r * k)}" fill="${o?.fill ?? 'none'}" ${stroke(o)}/>`;
    },
    dot(p: Pt): string {
      const P = T(p);
      return `<circle cx="${f(P.x)}" cy="${f(P.y)}" r="2.6" fill="${INK}" stroke="none"/>`;
    },
    /** Uchning nomi: nuqtadan `from` ga qarama-qarshi tomonga siljitib yoziladi. */
    label(p: Pt, s: string, from: Pt = center, dist = 15, size = 16): string {
      const P = T(p);
      const F = T(from);
      const u = unit(P.x - F.x, P.y - F.y);
      return text(P.x + u.x * dist, P.y + u.y * dist, s, size, true);
    },
    /** Kesma yoniga o'lcham yozuvi (kesmaning `from` ga teskari tomoniga). */
    mark(a: Pt, b: Pt, s: string, from: Pt = center, at = 0.5, off = 13): string {
      const A = T(a);
      const B = T(b);
      const m = pt(A.x + (B.x - A.x) * at, A.y + (B.y - A.y) * at);
      let n = unit(-(B.y - A.y), B.x - A.x);
      const F = T(from);
      if (n.x * (m.x - F.x) + n.y * (m.y - F.y) < 0) n = pt(-n.x, -n.y);
      return text(m.x + n.x * off, m.y + n.y * off, s, 14);
    },
    /** Erkin matn (nuqta atrofida) */
    textAt(p: Pt, s: string, size = 14): string {
      const P = T(p);
      return text(P.x, P.y, s, size);
    },
    rightAngle(v: Pt, a: Pt, b: Pt, size = 11): string {
      const V = T(v);
      const ua = unit(T(a).x - V.x, T(a).y - V.y);
      const ub = unit(T(b).x - V.x, T(b).y - V.y);
      const p1 = pt(V.x + ua.x * size, V.y + ua.y * size);
      const p2 = pt(p1.x + ub.x * size, p1.y + ub.y * size);
      const p3 = pt(V.x + ub.x * size, V.y + ub.y * size);
      return `<polyline points="${f(p1.x)},${f(p1.y)} ${f(p2.x)},${f(p2.y)} ${f(p3.x)},${f(p3.y)}" fill="none" ${stroke({ width: 1.4 })}/>`;
    },
    /** v uchidagi burchak yoyi (a va b — burchak tomonlaridagi nuqtalar); matn bo'lsa yoy yonida yoziladi. */
    angle(v: Pt, a: Pt, b: Pt, s?: string, r = 18, color = ACCENT): string {
      const V = T(v);
      const ua = unit(T(a).x - V.x, T(a).y - V.y);
      const ub = unit(T(b).x - V.x, T(b).y - V.y);
      const sweep = ua.x * ub.y - ua.y * ub.x > 0 ? 1 : 0;
      const s0 = pt(V.x + ua.x * r, V.y + ua.y * r);
      const s1 = pt(V.x + ub.x * r, V.y + ub.y * r);
      const arc = `<path d="M ${f(s0.x)} ${f(s0.y)} A ${r} ${r} 0 0 ${sweep} ${f(s1.x)} ${f(s1.y)}" fill="none" stroke="${color}" stroke-width="1.6"/>`;
      if (!s) return arc;
      const bis = unit(ua.x + ub.x, ua.y + ub.y);
      return arc + text(V.x + bis.x * (r + 17), V.y + bis.y * (r + 17), s, 13);
    },
  };
}

export const SOFT_FILL = SOFT;

export function wrapSvg(...parts: string[]): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220" width="320" height="220" fill="none" stroke-linecap="round" stroke-linejoin="round">${parts.join('')}</svg>`;
}
