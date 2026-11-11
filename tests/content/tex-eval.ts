/** Kichik TeX hisoblagich (testlar uchun): \frac, \sqrt{}, \pi, qo'shish/ayirish/ko'paytirish, o'nli vergul {,}, yashirin ko'paytirish. */
export function evalTex(src: string): number {
  let t = src
    .replace(/\$/g, '')
    .replace(/\\[,;! ]/g, '')
    .replace(/\s+/g, '')
    .replace(/\{,\}/g, '.')
    .replace(/\\pi/g, 'PI');
  for (let i = 0; i < 20; i++) {
    const before = t;
    t = t.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))').replace(/\\sqrt\{([^{}]*)\}/g, 'SQRT($1)');
    if (t === before) break;
  }
  t = t.replace(/(\d|\)|PI)(?=[A-Z(])/g, '$1*');
  return new Function('SQRT', 'PI', `return (${t});`)(Math.sqrt, Math.PI) as number;
}

export const near = (a: number, b: number, eps = 1e-9): boolean => Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));
