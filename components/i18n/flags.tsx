import type { Lang } from '@/lib/i18n/config';

/** Til belgisi: kichik SVG bayroq (emoji-bayroqlar Windows'da harf bo'lib ko'rinadi, shuning uchun SVG). */
export const LANG_CODES: Record<Lang, string> = { uz: 'UZ', ru: 'RU', kaa: 'QQ', en: 'EN' };

export function LangFlag({ lang, className = '' }: { lang: Lang; className?: string }) {
  return (
    <svg viewBox="0 0 30 20" width="24" height="16" aria-hidden className={`shrink-0 rounded-[3px] ring-1 ring-black/10 ${className}`}>
      {lang === 'uz' && (
        <>
          <rect width="30" height="20" fill="#fff" />
          <rect width="30" height="6.2" fill="#0099b5" />
          <rect y="13.8" width="30" height="6.2" fill="#1eb53a" />
          <rect y="6.2" width="30" height="0.8" fill="#ce1126" />
          <rect y="13" width="30" height="0.8" fill="#ce1126" />
          <circle cx="5" cy="3.1" r="1.9" fill="#fff" />
          <circle cx="5.8" cy="3.1" r="1.6" fill="#0099b5" />
        </>
      )}
      {lang === 'ru' && (
        <>
          <rect width="30" height="20" fill="#fff" />
          <rect y="6.67" width="30" height="6.67" fill="#0039a6" />
          <rect y="13.33" width="30" height="6.67" fill="#d52b1e" />
        </>
      )}
      {lang === 'en' && (
        <>
          <rect width="30" height="20" fill="#012169" />
          <path d="M0 0 30 20M30 0 0 20" stroke="#fff" strokeWidth="4" />
          <path d="M0 0 30 20M30 0 0 20" stroke="#c8102e" strokeWidth="1.6" />
          <path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth="6" />
          <path d="M15 0v20M0 10h30" stroke="#c8102e" strokeWidth="3.4" />
        </>
      )}
      {lang === 'kaa' && (
        <>
          <rect width="30" height="20" fill="#4aa3df" />
          <circle cx="15" cy="10" r="4.6" fill="#f5c518" />
        </>
      )}
    </svg>
  );
}
