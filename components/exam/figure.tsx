import type { Figure } from '@/lib/exam/payload';

/**
 * Savol chizmasi. SVG <img> ichida data URI sifatida ko'rsatiladi: skriptlar bajarilmaydi
 * (qo'shimcha ravishda import va payload sxemasi xavfli SVG ni rad etadi).
 */
export function FigureImage({ figure, fill = false }: { figure: Figure; fill?: boolean }) {
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(figure.svg)}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG data URI: next/image kerak emas
    <img
      src={src}
      alt={figure.alt}
      draggable={false}
      className={`mx-auto rounded-2xl border-2 border-line bg-white p-3 shadow-card ${
        fill ? 'max-h-[340px] w-auto max-w-full lg:h-full lg:max-h-full lg:w-full lg:max-w-full lg:object-contain' : 'max-h-[340px] w-auto max-w-full'
      }`}
    />
  );
}
