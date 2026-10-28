import type { ReactNode } from 'react';
import { Art } from './art';
import { ART, type ArtName } from './art-data';

/** Sahifa sarlavhasi: gradientli karta, o'ngda to'liq mascot (faqat sm dan kattada). Kartaning balandligini matn yoki mascot belgilaydi. */
export function PageHero({ art, artHeight = 116, children }: { art: ArtName; artHeight?: number; children: ReactNode }) {
  const width = Math.round((artHeight * ART[art].w) / ART[art].h);
  return (
    <header className="flex items-center justify-between gap-6 rounded-3xl border-2 border-b-[5px] border-line-strong bg-linear-to-br from-white via-white to-brand-tint p-5 shadow-card sm:px-7 sm:py-4">
      <div className="flex min-w-0 flex-col gap-3 py-1">{children}</div>
      <Art name={art} width={width} className="hidden shrink-0 drop-shadow-[0_8px_8px_rgba(38,24,110,0.16)] sm:block" />
    </header>
  );
}

/** Bo'sh holat: mascot + matn + amal tugmasi bitta kartada. */
export function EmptyState({ art, children }: { art: ArtName; children: ReactNode }) {
  const width = Math.round((112 * ART[art].w) / ART[art].h);
  return (
    <div className="flex flex-col items-center gap-5 rounded-3xl border-2 border-b-[5px] border-line-strong bg-white p-6 text-center shadow-card sm:flex-row sm:text-left">
      <Art name={art} width={width} className="shrink-0" />
      <div className="flex flex-col items-center gap-4 sm:items-start">{children}</div>
    </div>
  );
}
