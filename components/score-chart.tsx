import { formatScore } from '@/lib/format';
import type { Lang } from '@/lib/i18n/config';

export interface ChartPoint {
  id: string;
  label: string;
  score: number;
}

const MAX = 75;

interface Layout {
  W: number;
  H: number;
  pad: { l: number; r: number; t: number; b: number };
  axis: number;
  guide: number;
  value: number;
  label: number;
  /** x o'qida ko'pi bilan nechta sana yozuvi (tor ekranda chalkashmasligi uchun) */
  maxLabels: number;
  /** qiymat yozuvlari (har nuqta tepasida) ko'pi bilan nechta nuqtagacha ko'rsatiladi; undan ko'pida faqat oxirgisi */
  maxValues: number;
  dot: number;
}

// Keng ekran: 640x240. Tor ekran: kichik viewBox, shuning uchun yozuvlar (14px) ekranda deyarli asl o'lchamda ko'rinadi.
const WIDE: Layout = { W: 640, H: 240, pad: { l: 40, r: 16, t: 16, b: 32 }, axis: 12, guide: 11, value: 12, label: 11, maxLabels: 12, maxValues: 12, dot: 5.5 };
const NARROW: Layout = { W: 340, H: 250, pad: { l: 34, r: 12, t: 20, b: 34 }, axis: 14, guide: 13, value: 14, label: 13, maxLabels: 5, maxValues: 6, dot: 6 };

function Chart({ points, ariaLabel, lang, L, className }: { points: ChartPoint[]; ariaLabel: string; lang: Lang; L: Layout; className: string }) {
  const { W, H, pad } = L;
  const x = (i: number) => pad.l + (points.length === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (points.length - 1));
  const y = (v: number) => pad.t + (1 - v / MAX) * (H - pad.t - pad.b);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(' ');
  const labelStep = Math.max(1, Math.ceil(points.length / L.maxLabels));
  const showAllValues = points.length <= L.maxValues;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className={`h-auto w-full ${className}`}>
      {[0, 25, 50, 75].map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="#e6e3f2" strokeWidth="1" />
          <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize={L.axis} fontWeight="700" fill="#6f6b8a">
            {v}
          </text>
        </g>
      ))}
      {[46, 65].map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="#2fa84f" strokeWidth="1.5" strokeDasharray="5 5" />
          <text x={W - pad.r} y={y(v) - 4} textAnchor="end" fontSize={L.guide} fontWeight="800" fill="#1c6e33">
            {v}
          </text>
        </g>
      ))}
      {points.length > 1 && <path d={path} fill="none" stroke="#e8590c" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
      {points.map((p, i) => {
        const last = i === points.length - 1;
        return (
          <g key={p.id}>
            <circle cx={x(i)} cy={y(p.score)} r={L.dot} fill="#e8590c" stroke="#fff" strokeWidth="2" />
            {(showAllValues || last) && (
              <text x={x(i)} y={y(p.score) - 11} textAnchor="middle" fontSize={L.value} fontWeight="800" fill="#1e1b39">
                {formatScore(p.score, lang)}
              </text>
            )}
            {(i % labelStep === 0 || last) && (
              <text x={x(i)} y={H - 10} textAnchor={last && points.length > 1 ? 'end' : 'middle'} fontSize={L.label} fontWeight="700" fill="#6f6b8a">
                {p.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Taxminiy ball dinamikasi (0–75): chiziqli grafik, daraja chegaralari (46/65) yo'naltiruvchi chiziq sifatida.
 * Tor ekranda alohida (kichikroq viewBox'li) variant ko'rsatiladi: yozuvlar o'qiladigan hajmda qoladi.
 */
export function ScoreChart({ points, ariaLabel, lang }: { points: ChartPoint[]; ariaLabel: string; lang: Lang }) {
  return (
    <>
      <Chart points={points} ariaLabel={ariaLabel} lang={lang} L={WIDE} className="hidden sm:block" />
      <Chart points={points} ariaLabel={ariaLabel} lang={lang} L={NARROW} className="sm:hidden" />
    </>
  );
}
