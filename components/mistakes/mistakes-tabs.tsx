import Link from 'next/link';
import { getI18n } from '@/lib/i18n/server';

/** "Xatolar daftari" bo'limining ikki sahifasi orasidagi yorliqlar: Xatolar | Saqlangan. */
export async function MistakesTabs({ current }: { current: 'mistakes' | 'saved' }) {
  const { t } = await getI18n();
  const tabs = [
    { key: 'mistakes' as const, href: '/mistakes', label: t('nav.mistakes') },
    { key: 'saved' as const, href: '/saved', label: t('nav.saved') },
  ];
  return (
    <nav aria-label={t('saved.tabsAria')} className="flex gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={current === tab.key ? 'page' : undefined}
          className={
            'rounded-full border-2 px-4 py-2 text-[16px] font-extrabold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ' +
            (current === tab.key ? 'border-brand-soft bg-brand-tint text-brand-ink' : 'border-line bg-white text-muted hover:bg-surface hover:text-ink')
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
