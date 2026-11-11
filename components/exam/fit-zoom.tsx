'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';

/** Savol matni uchun saqlanadigan minimal balandlik (px): question-view.tsx dagi min-h sinflari bilan mos (lg+ 88; tor ekranda 64 yoki karta balandligining 28%). */
const STEM_MIN_WIDE = 88;
const STEM_MIN_NARROW = 64;

interface Props {
  children: ReactNode;
  /** Savol almashganda qayta moslash uchun */
  contentKey: string;
  min?: number;
  /** always rejimida tor ekranda (telefon) eng kichik masshtab */
  minNarrow?: number;
  className?: string;
  /** true: har qanday ekranda moslaydi; aks holda faqat lg+ */
  always?: boolean;
}

/**
 * Javoblar bloki (tugmalar, kartalar) unga ajratilgan joyga sig'maguncha bir tekis kichraytiriladi (CSS `zoom`):
 * katta ekranda (lg+) karta chegarasidan toshib ketmaydi va scroll hosil bo'lmaydi.
 * Ajratilgan joy = karta balandligi − sarlavha qatori − savol matni uchun minimal joy.
 * Ota element (section) `flex flex-col` bo'lishi, birinchi bola sarlavha qatori bo'lishi kerak.
 */
export function FitZoom({ children, contentKey, min = 0.5, minNarrow = 0.5, className = '', always = false }: Props) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    const section = o?.parentElement;
    if (!o || !i || !section) return;
    const wide = window.matchMedia('(min-width: 1024px)');
    const active = () => always || wide.matches;

    const available = () => {
      const cs = getComputedStyle(section);
      const gap = parseFloat(cs.rowGap) || 0;
      const head = (section.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0;
      const border = parseFloat(getComputedStyle(o).borderTopWidth) || 0;
      return section.clientHeight - head - gap * 2 - (wide.matches ? STEM_MIN_WIDE : Math.max(STEM_MIN_NARROW, Math.round(section.clientHeight * 0.28))) - border;
    };
    const height = () => i.getBoundingClientRect().height;

    const fit = () => {
      if (!active()) {
        i.style.zoom = '';
        return;
      }
      const avail = available();
      i.style.zoom = '1';
      if (height() <= avail) return;
      let lo = wide.matches ? min : minNarrow;
      let hi = 1;
      for (let k = 0; k < 9; k++) {
        const mid = (lo + hi) / 2;
        i.style.zoom = String(mid);
        if (height() <= avail) lo = mid;
        else hi = mid;
      }
      i.style.zoom = String(Math.floor(lo * 100) / 100);
    };
    const recheck = () => {
      if (active() && height() > available() + 1) fit();
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(section);
    const roInner = new ResizeObserver(recheck);
    roInner.observe(i);
    wide.addEventListener('change', fit);
    const fonts = document.fonts;
    void fonts?.ready.then(fit);
    fonts?.addEventListener('loadingdone', fit);
    return () => {
      ro.disconnect();
      roInner.disconnect();
      wide.removeEventListener('change', fit);
      fonts?.removeEventListener('loadingdone', fit);
    };
  }, [min, minNarrow, contentKey, always]);

  return (
    <div
      ref={outer}
      className={`${always ? 'min-h-0 shrink overflow-hidden border-t-2 border-line' : 'lg:min-h-0 lg:shrink lg:overflow-hidden lg:border-t-2 lg:border-line'} ${className}`}
    >
      <div ref={inner} className={`flex flex-col gap-5 ${always ? 'pt-3 lg:pt-5' : 'lg:pt-5'}`}>
        {children}
      </div>
    </div>
  );
}
