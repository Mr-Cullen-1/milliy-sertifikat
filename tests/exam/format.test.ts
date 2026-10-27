import { describe, expect, it } from 'vitest';
import { formatScore } from '../../lib/format';

describe('formatScore', () => {
  it.each([
    [62.4, '62,4'],
    [70, '70'],
    [0, '0'],
    [41.6, '41,6'],
    [38.904, '38,9'],
    [80.2, '80,2'],
  ])('%d -> %s', (n, text) => {
    expect(formatScore(n)).toBe(text);
  });

  it('en da nuqta, qolganlarida vergul', () => {
    expect(formatScore(62.4, 'en')).toBe('62.4');
    expect(formatScore(62.4, 'ru')).toBe('62,4');
    expect(formatScore(62.4, 'kaa')).toBe('62,4');
  });
});
