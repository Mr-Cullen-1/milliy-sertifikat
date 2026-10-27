// Content-Security-Policy (nonce asosida). Ilova to'liq dinamik, shuning uchun har so'rovga yangi nonce beriladi.

/** ALLOWED_FRAME_ANCESTORS (bo'sh joy bilan ajratilgan https manzillar): ichki platforma iframe'i uchun. Yaroqsizlari tashlanadi. */
export function parseFrameAncestors(env: string | undefined): string {
  const origins = (env ?? '')
    .split(/\s+/)
    .filter((o) => /^https:\/\/[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d{1,5})?$/i.test(o) || /^https:\/\/\*\.[a-z0-9.-]+$/i.test(o));
  return ["'self'", ...origins].join(' ');
}

export function buildCsp(opts: { nonce: string; isDev: boolean; frameAncestors: string }): string {
  const { nonce, isDev, frameAncestors } = opts;
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // style="" atributlari (KaTeX, React) uchun style-src-attr; <style> teglari nonce bilan
    `style-src 'self' 'nonce-${nonce}'`,
    `style-src-attr 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    `connect-src 'self'${isDev ? ' ws: wss:' : ''}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors ${frameAncestors}`,
  ];
  if (!isDev) directives.push('upgrade-insecure-requests');
  return directives.join('; ');
}
