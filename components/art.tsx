import Image from 'next/image';
import { ART, type ArtName, type IconName } from './art-data';

/**
 * Dekorativ rasm (public/art): shaffof fonli, tozalangan sprite. next/image avtomatik zamonaviy formatga o'giradi.
 * width — CSS pikselda; balandlik asl nisbatdan olinadi. alt bo'sh bo'lsa ekran o'qish dasturlaridan yashiriladi.
 */
export function Art({
  name,
  width,
  className = '',
  priority = false,
  alt = '',
}: {
  name: ArtName;
  width: number;
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  const { w, h } = ART[name];
  return (
    <Image
      src={`/art/${name}.png`}
      alt={alt}
      width={width}
      height={Math.round((width * h) / w)}
      sizes={`${width}px`}
      priority={priority}
      draggable={false}
      aria-hidden={alt === '' ? true : undefined}
      className={`pointer-events-none h-auto select-none ${className}`}
    />
  );
}

/** Toza SVG ikonka (public/art/icons). */
export function ArtIcon({ name, size = 32, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- kichik SVG, optimizatsiya kerak emas
    <img src={`/art/icons/${name}.svg`} alt="" width={size} height={size} aria-hidden draggable={false} className={`select-none ${className}`} />
  );
}

/** Mascot boshi (aylana nishon): navbar va footer logotipi uchun. mascot-waving ning yuqori qismi ko'rsatiladi. */
export function MascotBadge({ size = 44, className = '' }: { size?: number; className?: string }) {
  const imgW = Math.round(size * 1.75);
  const { w, h } = ART['mascot-waving'];
  return (
    <span
      aria-hidden
      className={`relative inline-block shrink-0 overflow-hidden rounded-full border-2 border-brand-soft bg-brand-tint ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/art/mascot-waving.png"
        alt=""
        width={imgW}
        height={Math.round((imgW * h) / w)}
        sizes={`${imgW}px`}
        draggable={false}
        className="pointer-events-none absolute max-w-none select-none"
        style={{ width: imgW, left: -Math.round((imgW - size) / 2), top: Math.round(size * 0.04) }}
      />
    </span>
  );
}
