/**
 * Ro'yxatdan o'tgach qayerga yo'naltirish. Ochiq redirect'dan himoya: faqat ilova ichidagi yo'l.
 * Ko'rsatilmasa yoki bosh sahifa ('/') bo'lsa imtihonlar ro'yxatiga o'tadi.
 */
export function safeNext(v: unknown): string {
  return typeof v === 'string' && v.startsWith('/') && v !== '/' && !v.startsWith('//') && !v.startsWith('/start') ? v : '/exams';
}
