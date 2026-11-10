'use client';

import { useT } from '@/components/i18n/provider';
import type { IconName } from '@/components/art-data';

export type NavKey = 'exams' | 'practice' | 'history' | 'mistakes' | 'dtm';

export interface NavLink {
  key: NavKey;
  href: string;
  label: string;
  icon: IconName;
}

/** Asosiy bo'limlar: kompyuterda navbarda, telefonda pastki navigatsiya panelida (bir xil ro'yxat). */
export function useNavLinks(): NavLink[] {
  const t = useT();
  return [
    { key: 'exams', href: '/exams', label: t('nav.exams'), icon: 'trainer' },
    { key: 'practice', href: '/practice', label: t('nav.practice'), icon: 'unrewarded-practice' },
    { key: 'history', href: '/history', label: t('nav.history'), icon: 'daily-reset' },
    { key: 'mistakes', href: '/mistakes', label: t('nav.mistakes'), icon: 'random-questions' },
    { key: 'dtm', href: '/dtm', label: t('nav.dtm'), icon: 'coin' },
  ];
}
