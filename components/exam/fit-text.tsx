'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Kontent o'zgarganda (savol matni, til) qayta moslash uchun */
  contentKey: string;
  /** Eng katta / eng kichik shrift (px); katta ekranda ajratilgan joyga eng katta sig'adigani tanlanadi */
  max: number;
  min?: number;
  id?: string;
  className?: string;
  /** Tashqi quti sinflari (balandlik/joylashuv) */
  boxClassName?: string;
}

/**
 * Matnni ajratilgan joyga moslaydi: katta ekranda (lg+) shrift hajmi binar qidiruv bilan eng kattasi tanlanadi,
 * shunda matn tashqi qutiga scrollsiz sig'adi. Kichik ekranda oddiy oqim (sinfdagi hajm).
 * Tashqi quti aniq balandlikka ega bo'lishi kerak (flex-1/h-full + min-h-0). Matn quti o'rtasida turadi.
 */
export function FitText({ children, contentKey, max, min = 18, id, className = '', boxClassName = '' }: Props) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const wide = window.matchMedia('(min-width: 1024px)');

    // Tashqi qutining ichki bo'sh joyi (padding hisobga olinadi)
    const room = () => {
      const cs = getComputedStyle(o);
      return {
        h: o.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom),
        w: o.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
      };
    };
    const overflows = () => {
      const r = room();
      return i.scrollHeight > r.h - 4 || i.scrollWidth > r.w;
    };
    const fits = (px: number) => {
      i.style.fontSize = `${px}px`;
      i.style.lineHeight = '1.28';
      return !overflows();
    };
    const fit = () => {
      if (!wide.matches) {
        i.style.fontSize = '';
        i.style.lineHeight = '';
        return;
      }
      let lo = min;
      let hi = max;
      if (fits(hi)) return;
      while (hi - lo > 1) {
        const mid = Math.floor((lo + hi) / 2);
        if (fits(mid)) lo = mid;
        else hi = mid;
      }
      // Qator o'tishlari tufayli bog'liqlik monoton emas: yakuniy qiymat albatta sig'ishi shart
      let px = lo;
      while (px > min && !fits(px)) px--;
      if (px === min) fits(px);
    };
    // Matn o'zi o'zgarsa (shrift yuklandi, qator o'tdi) va sig'may qolsa qayta moslaymiz
    const recheck = () => {
      if (wide.matches && overflows()) fit();
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(o);
    const roInner = new ResizeObserver(recheck);
    roInner.observe(i);
    wide.addEventListener('change', fit);
    // KaTeX shriftlari kerak bo'lganda yuklanadi (savol almashganda ham): har yuklanishdan keyin qayta moslaymiz
    const fonts = document.fonts;
    void fonts?.ready.then(fit);
    fonts?.addEventListener('loadingdone', fit);
    return () => {
      ro.disconnect();
      roInner.disconnect();
      wide.removeEventListener('change', fit);
      fonts?.removeEventListener('loadingdone', fit);
    };
  }, [max, min, contentKey]);

  return (
    <div ref={outer} className={`flex min-h-0 min-w-0 flex-col overflow-y-auto ${boxClassName}`}>
      <div ref={inner} id={id} className={`my-auto flow-root w-full ${className}`}>
        {children}
      </div>
    </div>
  );
}
