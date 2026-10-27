import { formatScore } from '@/lib/format';
import type { Lang } from '@/lib/i18n/config';

export interface ChartPoint {
  id: string;
  label: string;
  score: number;
}

const W = 640;
const H = 240;
const PAD = { l: 40, r: 16, t: 16, b: 32 };
const MAX = 75;

/** Taxminiy ball dinamikasi (0–75): chiziqli grafik, daraja chegaralari (46/55/65) yo'naltiruvchi chiziq sifatida. */
export function ScoreChart({ points, ariaLabel, lang }: { points: ChartPoint[]; ariaLabel: string; lang: Lang }) {
  const x = (i: number) => PAD.l + (points.length === 1 ? (W - PAD.l - PAD.r) / 2 : (i * (W - PAD.l - PAD.r)) / (points.length - 1));
  const y = (v: number) => PAD.t + (1 - v / MAX) * (H - PAD.t - PAD.b);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="h-auto w-full">
      {[0, 25, 50, 75].map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="#e6e3f2" strokeWidth="1" />
          <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" fontSize="12" fontWeight="700" fill="#6f6b8a">
            {v}
          </text>
        </g>
      ))}
      {[46, 65].map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="#2fa84f" strokeWidth="1.5" strokeDasharray="5 5" />
          <text x={W - PAD.r} y={y(v) - 4} textAnchor="end" fontSize="11" fontWeight="800" fill="#1c6e33">
            {v}
          </text>
        </g>
      ))}
      {points.length > 1 && <path d={path} fill="none" stroke="#e8590c" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
      {points.map((p, i) => (
        <g key={p.id}>
          <circle cx={x(i)} cy={y(p.score)} r="5.5" fill="#e8590c" stroke="#fff" strokeWidth="2" />
          <text x={x(i)} y={y(p.score) - 11} textAnchor="middle" fontSize="12" fontWeight="800" fill="#1e1b39">
            {formatScore(p.score, lang)}
          </text>
          <text x={x(i)} y={H - 10} textAnchor="middle" fontSize="11" fontWeight="700" fill="#6f6b8a">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
