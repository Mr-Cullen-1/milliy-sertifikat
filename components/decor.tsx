import { Art } from './art';
import type { ArtName } from './art-data';

export interface DecorItem {
  name: ArtName;
  width: number;
  /** joylashuv va burilish: "left-4 bottom-6 -rotate-12" kabi */
  className: string;
}

/**
 * Fon bezaklari (kub, piramida, yaltiroq yulduzchalar...). Faqat katta ekranda; bosishga xalaqit bermaydi,
 * kontentdan orqada. Ota element `relative`, kontent `relative z-10` bo'lishi kerak.
 */
export function Decor({ items }: { items: DecorItem[] }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block">
      {items.map((it, i) => (
        <Art key={i} name={it.name} width={it.width} className={`absolute ${it.className}`} />
      ))}
    </div>
  );
}
