import { describe, expect, it } from 'vitest';
import { dtmPoints, levelMinScore, LEVELS } from '../lib/dtm';

describe('dtmPoints', () => {
  it('A+ va A: maksimal ball', () => {
    expect(dtmPoints('first', 70)).toMatchObject({ points: 93, percent: 100, level: 'A+' });
    expect(dtmPoints('first', 75)).toMatchObject({ points: 93, level: 'A+' });
    expect(dtmPoints('first', 65)).toMatchObject({ points: 93, percent: 100, level: 'A' });
    expect(dtmPoints('second', 69.9)).toMatchObject({ points: 63, level: 'A' });
  });

  it('B+...C: ball / 65 * maksimal (manbadagi misol: B=55 -> 78.69)', () => {
    expect(dtmPoints('first', 55)).toEqual({ points: 78.69, max: 93, percent: 84.6, level: 'B' });
    expect(dtmPoints('first', 60)).toMatchObject({ points: 85.85, level: 'B+' });
    expect(dtmPoints('second', 50)).toMatchObject({ points: 48.46, level: 'C+' });
    expect(dtmPoints('second', 46)).toMatchObject({ points: 44.58, level: 'C' });
  });

  it('majburiy fanda har qanday daraja maksimal ball beradi', () => {
    for (const l of LEVELS) expect(dtmPoints('mandatory', l.min)).toMatchObject({ points: 11, percent: 100, level: l.code });
  });

  it('46 dan past: sertifikat yo\'q, 0 ball (majburiy fanda ham)', () => {
    expect(dtmPoints('first', 45.9)).toEqual({ points: 0, max: 93, percent: 0, level: null });
    expect(dtmPoints('mandatory', 30)).toEqual({ points: 0, max: 11, percent: 0, level: null });
    expect(dtmPoints('second', NaN).points).toBe(0);
    expect(dtmPoints('second', -5).points).toBe(0);
  });

  it('daraja chegarasi aynan o\'tish nuqtasida', () => {
    expect(dtmPoints('first', 59.9).level).toBe('B');
    expect(dtmPoints('first', 60).level).toBe('B+');
    expect(dtmPoints('first', 64.9).points).toBeLessThan(93);
  });

  it('daraja bo\'yicha kiritishda quyi chegara olinadi', () => {
    expect(levelMinScore('B+')).toBe(60);
    expect(levelMinScore('C')).toBe(46);
    expect(levelMinScore('A+')).toBe(70);
    expect(levelMinScore('X')).toBeUndefined();
  });
});
