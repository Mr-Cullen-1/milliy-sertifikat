import type { ReactNode } from 'react';
import { Art } from './art';
import type { ArtName } from './art-data';

/** Sahifa sarlavhasi: gradientli karta, o'ngda mascot (faqat sm dan kattada). Matn chapda, mascot kartaning pastki burchagida. */
export function PageHero({ art, artWidth = 128, children }: { art: ArtName; artWidth?: number; children: ReactNode }) {
  return (
    <header className="relative flex min-h-[132px] items-center overflow-hidden rounded-3xl border-2 border-b-[5px] border-line-strong bg-linear-to-br from-white via-white to-brand-tint p-5 shadow-card sm:p-7">
      <div className="relative z-10 flex flex-col gap-3 sm:max-w-[calc(100%-170px)]">{children}</div>
      <Art name={art} width={artWidth} className="absolute right-4 -bottom-2 hidden sm:block" />
    </header>
  );
}

/** Bo'sh holat: mascot + matn + amal tugmasi bitta kartada. */
export function EmptyState({ art, children }: { art: ArtName; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-3xl border-2 border-b-[5px] border-line-strong bg-white p-6 text-center shadow-card sm:flex-row sm:text-left">
      <Art name={art} width={120} className="shrink-0" />
      <div className="flex flex-col items-center gap-4 sm:items-start">{children}</div>
    </div>
  );
}
