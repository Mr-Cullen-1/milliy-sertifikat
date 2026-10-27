import { BLOCK_CODES, type BlockCode } from '../../config/topics';

/** blocks jadvalidagi id (1..7) -> blok kodi; id lar docs/mavzular.md tartibida seed qilingan. */
export const blockCodeOf = (blockId: number): BlockCode | undefined => BLOCK_CODES[blockId - 1];
