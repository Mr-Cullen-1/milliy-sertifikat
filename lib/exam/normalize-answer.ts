export interface Rational {
  n: bigint;
  d: bigint;
}

const DECIMAL = /^(\d+([.,]\d+)?|[.,]\d+)$/;

function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

function unsignedDecimal(s: string): Rational | null {
  if (!DECIMAL.test(s)) return null;
  const [int = '', frac = ''] = s.replace(',', '.').split('.');
  return { n: BigInt((int || '0') + frac), d: 10n ** BigInt(frac.length) };
}

function reduce(n: bigint, d: bigint): Rational {
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const g = gcd(n < 0n ? -n : n, d) || 1n;
  return { n: n / g, d: d / g };
}

/** "3/4", "-0,75", "0.75", "−2" -> aniq ratsional son; tushunarsiz bo'lsa null. */
export function parseNumeric(input: string): Rational | null {
  let s = input.replace(/[\s ]/g, '').replace(/[−–]/g, '-');
  let sign = 1n;
  if (s.startsWith('-')) {
    sign = -1n;
    s = s.slice(1);
  }
  const parts = s.split('/');
  if (parts.length > 2) return null;
  const num = unsignedDecimal(parts[0] ?? '');
  if (!num) return null;
  if (parts.length === 1) return reduce(sign * num.n, num.d);
  const den = unsignedDecimal(parts[1] ?? '');
  if (!den || den.n === 0n) return null;
  return reduce(sign * num.n * den.d, num.d * den.n);
}

export function numericEquals(a: string, b: string): boolean {
  const x = parseNumeric(a);
  const y = parseNumeric(b);
  return x !== null && y !== null && x.n === y.n && x.d === y.d;
}

/** Talaba javobi qabul qilinadigan shakllardan biriga son jihatidan teng bo'lsa true. */
export function matchesAny(answer: string | undefined, accepted: readonly string[] | undefined): boolean {
  if (!answer || !accepted) return false;
  return accepted.some((key) => numericEquals(answer, key));
}
