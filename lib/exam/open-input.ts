// Ochiq javob (O) maydoni uchun ekran klaviaturasi: matnni kursor o'rniga tahrirlash (sof funksiyalar).

export interface InputEdit {
  text: string;
  caret: number;
}

/** [start, end) oralig'i o'rniga `ch` qo'yadi (oraliq bo'sh bo'lsa kursor o'rniga). */
export function insertAt(text: string, start: number, end: number, ch: string): InputEdit {
  const s = Math.max(0, Math.min(start, text.length));
  const e = Math.max(s, Math.min(end, text.length));
  return { text: text.slice(0, s) + ch + text.slice(e), caret: s + ch.length };
}

/** Tanlangan oraliqni, bo'lmasa kursordan oldingi belgini o'chiradi. */
export function backspaceAt(text: string, start: number, end: number): InputEdit {
  const s = Math.max(0, Math.min(start, text.length));
  const e = Math.max(s, Math.min(end, text.length));
  if (e > s) return { text: text.slice(0, s) + text.slice(e), caret: s };
  if (s === 0) return { text, caret: 0 };
  return { text: text.slice(0, s - 1) + text.slice(e), caret: s - 1 };
}
