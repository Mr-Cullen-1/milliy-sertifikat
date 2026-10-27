import type { ReactNode } from 'react';

const tones = {
  accent: 'bg-accent-soft text-accent',
  brand: 'bg-brand-tint text-brand-ink',
  success: 'bg-success-soft text-success-ink',
} as const;

/** Figma B: Chip/section (yorliq, masalan "Dars savoli" binafsha, "Mashq 4 / 6" to'q sariq). */
export function Chip({ children, tone = 'accent' }: { children: ReactNode; tone?: keyof typeof tones }) {
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-[15px] font-extrabold ${tones[tone]}`}>
      {children}
    </span>
  );
}
