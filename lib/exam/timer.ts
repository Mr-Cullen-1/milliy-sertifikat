// Taymer faqat ko'rsatish uchun: haqiqiy muddat serverda (attempts.deadline_at, DB soati).
// Brauzer soati server soatidan farq qilishi mumkin, shuning uchun har server javobidan ofset yangilanadi.

export const WARNING_MS = 5 * 60 * 1000;

/** server - mijoz (ms). Server vaqti javob olingan paytdagi mijoz vaqtiga nisbatan o'lchanadi. */
export const clockOffset = (serverNowIso: string, clientNowMs: number): number => Date.parse(serverNowIso) - clientNowMs;

export const remainingMs = (deadlineIso: string, offsetMs: number, clientNowMs: number): number =>
  Math.max(0, Date.parse(deadlineIso) - (clientNowMs + offsetMs));

const pad = (n: number) => String(n).padStart(2, '0');

/** 1 s dan kam qolsa ham "00:01" (0 faqat muddat tugaganda). */
export function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export type TimerPhase = 'normal' | 'warning' | 'over';

export const timerPhase = (ms: number): TimerPhase => (ms <= 0 ? 'over' : ms <= WARNING_MS ? 'warning' : 'normal');
