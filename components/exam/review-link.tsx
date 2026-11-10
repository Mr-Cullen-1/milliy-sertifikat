'use client';

import type { ReactNode } from 'react';
import { buttonClass } from '@/components/ui/button';

/**
 * Natija sahifasida savollar tahliliga tushish tugmasi (mobil). `<a href="#review">` JS siz ham ishlaydi;
 * JS bor bo'lsa silliq o'tadi (foydalanuvchi animatsiyani o'chirgan bo'lsa, darrov).
 */
export function ReviewLink({ children, targetId = 'review' }: { children: ReactNode; targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      onClick={(e) => {
        const el = document.getElementById(targetId);
        if (!el) return;
        e.preventDefault();
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      }}
      className={buttonClass('secondary', 'w-full lg:hidden', 'sm')}
    >
      {children}
    </a>
  );
}
