import type { Figure } from '@/lib/exam/payload';

/**
 * Savol chizmasi. SVG <img> ichida data URI sifatida ko'rsatiladi: skriptlar bajarilmaydi
 * (qo'shimcha ravishda import va payload sxemasi xavfli SVG ni rad etadi).
 */
export function FigureImage({ figure }: { figure: Figure }) {
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(figure.svg)}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG data URI: next/image kerak emas
    <img
      src={src}
      alt={figure.alt}
      draggable={false}
      className="mx-auto max-h-[340px] w-auto max-w-full rounded-2xl border-2 border-line bg-white p-3 shadow-card"
    />
  );
}
