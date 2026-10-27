import type { Lang } from '../config';
import { en } from './en';
import { kaa } from './kaa';
import { ru } from './ru';
import { uz, type Dict } from './uz';

export type { Dict };

export const dictionaries: Record<Lang, Dict> = { uz, ru, kaa, en };
