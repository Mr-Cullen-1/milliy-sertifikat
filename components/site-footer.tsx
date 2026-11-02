'use client';

import Link from 'next/link';
import { ArtIcon, MascotBadge } from '@/components/art';
import { useT } from '@/components/i18n/provider';

/**
 * Yagona footer (hamma sahifada): chapda mascot va huquqlar, o'rtada "natijalar taxminiy" belgisi (ogohlantiruvchi fonda), o'ngda maxfiylik.
 * Ixcham: viewportga sig'adigan sahifalarni siqmaydi; tor ekranda qatorlarga o'raladi.
 */
export function SiteFooter({ year }: { year: number }) {
  const t = useT();

  return (
    <footer className="shrink-0 border-t-2 border-line bg-white">
      <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2.5 text-[14px] font-bold text-muted sm:px-6">
        <span className="order-1 flex items-center gap-2 sm:order-1">
          <MascotBadge size={26} />
          {t('footer.rights', { year })}
        </span>
        <p className="order-3 flex w-full items-center justify-center gap-2 rounded-xl bg-warn-soft px-3 py-1.5 sm:order-2 sm:w-auto sm:justify-start text-[14px] leading-5 font-bold text-brand-ink">
          <ArtIcon name="point" size={18} />
          {t('footer.disclaimer')}
        </p>
        <Link href="/privacy" className="order-2 font-extrabold sm:order-3 text-accent underline underline-offset-4">
          {t('nav.privacy')}
        </Link>
      </div>
    </footer>
  );
}
