'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';

/**
 * Sahifa kontentini ekranga sig'dirish: navbar va footer orasidagi bo'sh joyga sig'maguncha kontent bir tekis kichraytiriladi (CSS `zoom`),
 * shunda har qanday ekranda (kichik telefonlar, past laptoplar) scroll hosil bo'lmaydi. Sig'sa, o'zgarmaydi (zoom 1).
 * Kontent ichidagi ikkinchi darajali elementlarni juda past ekranlarda CSS (`max-height` media) bilan yashirish mumkin.
 */
export function FitPage({ children, min = 0.5, className = '' }: { children: ReactNode; min?: number; className?: string }) {
  const inner = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const i = inner.current;
    if (!i) return;
    const header = document.querySelector('body header') as HTMLElement | null;
    const footer = document.querySelector('body footer') as HTMLElement | null;

    const available = () => window.innerHeight - (header?.getBoundingClientRect().height ?? 0) - (footer?.getBoundingClientRect().height ?? 0);
    const height = () => i.getBoundingClientRect().height;

    const fit = () => {
      i.style.zoom = '1';
      const avail = available();
      if (height() <= avail) return;
      let lo = min;
      let hi = 1;
      for (let k = 0; k < 9; k++) {
        const mid = (lo + hi) / 2;
        i.style.zoom = String(mid);
        if (height() <= avail) lo = mid;
        else hi = mid;
      }
      i.style.zoom = String(Math.floor(lo * 100) / 100);
    };

    fit();
    window.addEventListener('resize', fit);
    const ro = new ResizeObserver(fit);
    if (footer) ro.observe(footer);
    const fonts = document.fonts;
    void fonts?.ready.then(fit);
    fonts?.addEventListener('loadingdone', fit);
    return () => {
      window.removeEventListener('resize', fit);
      ro.disconnect();
      fonts?.removeEventListener('loadingdone', fit);
    };
  }, [min]);

  return (
    <div ref={inner} className={className}>
      {children}
    </div>
  );
}
