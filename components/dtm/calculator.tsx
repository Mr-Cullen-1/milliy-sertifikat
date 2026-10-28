'use client';

import { useState } from 'react';
import { useLang, useT } from '@/components/i18n/provider';
import { DTM_MAX, type DtmSubject } from '@/config/dtm';
import { dtmPoints, levelMinScore, LEVELS } from '@/lib/dtm';
import { formatScore } from '@/lib/format';

const SUBJECTS: DtmSubject[] = ['first', 'second', 'mandatory'];

const field = 'w-full rounded-2xl border-2 border-b-[5px] border-line bg-white px-4 py-3.5 text-[19px] font-bold text-ink outline-none focus:border-accent';

export function DtmCalculator({ initialScore, initialLevel }: { initialScore?: number; initialLevel?: string }) {
  const t = useT();
  const lang = useLang();
  const startWithScore = initialScore !== undefined && !initialLevel;
  const [mode, setMode] = useState<'level' | 'score'>(startWithScore ? 'score' : 'level');
  const [level, setLevel] = useState(initialLevel && levelMinScore(initialLevel) !== undefined ? initialLevel : '');
  const [scoreText, setScoreText] = useState(initialScore !== undefined ? String(Math.round(initialScore * 10) / 10) : '');
  const [subject, setSubject] = useState<DtmSubject>('first');

  const parsedScore = scoreText.trim() === '' ? NaN : Number(scoreText.replace(',', '.'));
  const scoreValid = Number.isFinite(parsedScore) && parsedScore >= 0 && parsedScore <= 75;
  const score = mode === 'level' ? (level ? levelMinScore(level) : undefined) : scoreValid ? parsedScore : undefined;
  const result = score === undefined ? null : dtmPoints(subject, score);
  const subjectLabel: Record<DtmSubject, string> = {
    first: t('dtm.subjectFirst'),
    second: t('dtm.subjectSecond'),
    mandatory: t('dtm.subjectMandatory'),
  };

  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
      {initialScore !== undefined && initialLevel && (
        <p className="order-first rounded-2xl bg-accent-soft px-4 py-3 text-[17px] font-bold text-accent lg:col-span-2">
          {t('dtm.fromMock', { score: formatScore(initialScore, lang), level: initialLevel })}
        </p>
      )}

      <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
        <div className="order-1 flex flex-col gap-5 rounded-3xl border-2 border-b-[5px] border-line-strong bg-white p-5 shadow-card sm:p-6">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-[17px] font-extrabold text-ink">{t('dtm.mode')}</legend>
            <div className="flex flex-wrap gap-3">
              {(['level', 'score'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                  className={
                    'rounded-2xl border-2 border-b-[5px] px-4 py-2.5 text-[17px] font-extrabold ' +
                    (mode === m ? 'border-selected bg-accent-soft text-ink' : 'border-line bg-white text-muted hover:bg-surface')
                  }
                >
                  {m === 'level' ? t('dtm.byLevel') : t('dtm.byScore')}
                </button>
              ))}
            </div>
          </fieldset>

          {mode === 'level' ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="dtm-level" className="text-[17px] font-extrabold text-ink">
                {t('dtm.level')}
              </label>
              <select id="dtm-level" value={level} onChange={(e) => setLevel(e.target.value)} className={field}>
                <option value="">{t('dtm.levelPlaceholder')}</option>
                {LEVELS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.code} ({l.min}+)
                  </option>
                ))}
              </select>
              <p className="text-[15px] font-semibold text-muted">{t('dtm.levelBasis')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label htmlFor="dtm-score" className="text-[17px] font-extrabold text-ink">
                {t('dtm.score')}
              </label>
              <input
                id="dtm-score"
                inputMode="decimal"
                value={scoreText}
                onChange={(e) => setScoreText(e.target.value.replace(/[^0-9.,]/g, '').slice(0, 5))}
                placeholder="62.4"
                aria-invalid={scoreText !== '' && !scoreValid}
                className={field}
              />
              {scoreText !== '' && !scoreValid && <p className="text-[15px] font-bold text-danger">{t('dtm.scoreInvalid')}</p>}
            </div>
          )}

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-[17px] font-extrabold text-ink">{t('dtm.subject')}</legend>
            <div className="grid gap-3 min-[480px]:grid-cols-3">
              {SUBJECTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={subject === s}
                  onClick={() => setSubject(s)}
                  className={
                    'flex flex-col items-start gap-0.5 rounded-2xl border-2 border-b-[5px] px-4 py-3 text-left ' +
                    (subject === s ? 'border-selected bg-accent-soft' : 'border-line bg-white hover:bg-surface')
                  }
                >
                  <span className="text-[17px] font-extrabold text-ink">{subjectLabel[s]}</span>
                  <span className="text-[14px] font-bold text-muted">{t('dtm.max', { n: DTM_MAX[s] })}</span>
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <section className="order-4 flex flex-col gap-2 rounded-2xl border-2 border-line-strong bg-white p-5 shadow-card" aria-label={t('dtm.rulesTitle')}>
          <h2 className="font-heading text-[20px] font-semibold text-ink">{t('dtm.rulesTitle')}</h2>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[16px] leading-6 font-semibold text-ink-soft">
            <li>{t('dtm.ruleTop')}</li>
            <li>{t('dtm.ruleProportional')}</li>
            <li>{t('dtm.ruleMandatory')}</li>
          </ul>
          <p className="mt-1 text-[15px] leading-6 font-bold text-brand-ink">{t('dtm.caveat')}</p>
          <p className="text-[14px] leading-5 font-semibold text-muted">{t('dtm.source')}</p>
        </section>
      </div>

      <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
        <section
          aria-live="polite"
          aria-label={t('dtm.result')}
          className="order-2 rounded-[20px] border-2 border-b-[5px] border-success-line bg-success-soft p-5 shadow-card sm:p-6"
        >
          <p className="text-[15px] font-extrabold text-muted">{t('dtm.result')}</p>
          {result === null ? (
            <p className="mt-1 text-[19px] font-bold text-muted">{mode === 'level' ? t('dtm.levelPlaceholder') : t('dtm.score')}</p>
          ) : result.level === null ? (
            <p className="mt-1 text-[19px] font-extrabold text-brand-ink">{t('dtm.none')}</p>
          ) : (
            <>
              <p className="mt-1 flex items-end gap-2 leading-none">
                <span className="text-[56px] font-black text-success-ink">{formatScore(result.points, lang)}</span>
                <span className="pb-1.5 text-[24px] font-extrabold text-muted">/ {result.max}</span>
              </p>
              <p className="mt-2 text-[17px] font-bold text-ink-soft">
                {result.level} · {t('dtm.percent', { pct: formatScore(result.percent, lang) })}
              </p>
            </>
          )}
        </section>

        <section className="order-3 flex flex-col gap-3" aria-label={t('dtm.tableTitle')}>
          <h2 className="font-heading text-[22px] font-semibold text-ink">{t('dtm.tableTitle')}</h2>
          <div className="overflow-x-auto rounded-2xl border-2 border-line bg-white shadow-card">
            <table className="w-full min-w-[420px] border-collapse text-left text-[16px]">
              <thead className="bg-surface text-[14px] font-extrabold text-muted">
                <tr>
                  <th className="px-3 py-2.5">{t('dtm.colLevel')}</th>
                  <th className="px-3 py-2.5">{t('dtm.colScore')}</th>
                  {SUBJECTS.map((s) => (
                    <th key={s} className="px-3 py-2.5">
                      {subjectLabel[s]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-bold text-ink">
                {LEVELS.map((l) => (
                  <tr key={l.code} className="border-t-2 border-line">
                    <td className="px-3 py-2.5 font-extrabold">{l.code}</td>
                    <td className="px-3 py-2.5">{l.min}+</td>
                    {SUBJECTS.map((s) => (
                      <td key={s} className="px-3 py-2.5">
                        {formatScore(dtmPoints(s, l.min).points, lang)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
