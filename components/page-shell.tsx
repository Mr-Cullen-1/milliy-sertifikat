import type { ReactNode } from 'react';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

/**
 * Umumiy sahifa qobig'i: navbar + kontent + footer.
 * fit: katta ekranda sahifa viewport balandligiga sig'adi (scrollsiz), footer ixcham.
 * minimal: bo'limlar menyusisiz navbar (ro'yxatga olish, maxfiylik kabi sahifalar).
 */
export function PageShell({
  children,
  active,
  minimal = false,
  fit = false,
}: {
  children: ReactNode;
  active?: 'exams' | 'history' | 'mistakes' | 'dtm';
  minimal?: boolean;
  fit?: boolean;
}) {
  return (
    <div className={`flex min-h-dvh flex-col ${fit ? 'lg:h-dvh lg:overflow-hidden' : ''}`}>
      <SiteHeader minimal={minimal} active={active} />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <SiteFooter compact={fit || minimal} />
    </div>
  );
}
