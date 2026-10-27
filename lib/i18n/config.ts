export const LANGS = ['uz', 'ru', 'kaa', 'en'] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = 'uz';
export const LANG_COOKIE = 'lang';

/** Til nomlari har doim o'z tilida ko'rsatiladi. */
export const LANG_LABELS: Record<Lang, string> = {
  uz: "O'zbekcha",
  ru: 'Русский',
  kaa: 'Qaraqalpaqsha',
  en: 'English',
};

export const isLang = (v: unknown): v is Lang => typeof v === 'string' && (LANGS as readonly string[]).includes(v);
