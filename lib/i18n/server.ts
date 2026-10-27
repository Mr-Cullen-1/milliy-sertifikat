import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { DEFAULT_LANG, LANG_COOKIE, isLang, type Lang } from './config';
import { dictionaries, type Dict } from './dictionaries';
import { makeT } from './translate';

/** Joriy so'rovdagi til (cookie). Cookie o'qiydi, shuning uchun <Suspense> ichida chaqiriladi. */
export const getLang = cache(async (): Promise<Lang> => {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(value) ? value : DEFAULT_LANG;
});

export async function getI18n(): Promise<{ lang: Lang; dict: Dict; t: ReturnType<typeof makeT<Dict>> }> {
  const lang = await getLang();
  const dict = dictionaries[lang];
  return { lang, dict, t: makeT(dict) };
}
