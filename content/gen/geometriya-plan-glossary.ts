import type { L10n } from './helpers';

// Planimetriya atamalari lug'ati (nominativ shakllar). Savol matnlari gap sifatida to'liq yoziladi,
// bu lug'at esa band yorliqlari, ko'rsatmalar va chizma izohlarida ishlatiladi.
// kaa = qoraqalpoq lotin yozuvi. "// kaa: tekshirilsin" — ona tili egasi tomonidan tekshirilishi kerak.

export const G = {
  triangle: { uz: 'uchburchak', ru: 'треугольник', kaa: 'úshmúyeshlik', en: 'triangle' },
  rightTriangle: { uz: "to'g'ri burchakli uchburchak", ru: 'прямоугольный треугольник', kaa: 'tuwrımúyeshli úshmúyeshlik', en: 'right triangle' }, // kaa: tekshirilsin
  rhombus: { uz: 'romb', ru: 'ромб', kaa: 'romb', en: 'rhombus' },
  trapezoid: { uz: 'trapetsiya', ru: 'трапеция', kaa: 'trapeciya', en: 'trapezoid' }, // kaa: tekshirilsin (trapeciya)
  circumference: { uz: 'Aylana uzunligi', ru: 'Длина окружности', kaa: 'Sheńber uzınlıǵı', en: 'Circumference' }, // kaa: tekshirilsin
  diskArea: { uz: 'Doira yuzi', ru: 'Площадь круга', kaa: 'Dóńgelek maydanı', en: 'Area of the disk' }, // kaa: tekshirilsin
  circleLine: { uz: 'aylana', ru: 'окружность', kaa: 'sheńber', en: 'circle' }, // kaa: tekshirilsin
  disk: { uz: 'doira', ru: 'круг', kaa: 'dóńgelek', en: 'disk' }, // kaa: tekshirilsin
  radius: { uz: 'radius', ru: 'радиус', kaa: 'radius', en: 'radius' },
  chord: { uz: 'vatar', ru: 'хорда', kaa: 'xorda', en: 'chord' }, // kaa: tekshirilsin
  tangent: { uz: 'urinma', ru: 'касательная', kaa: 'urınba', en: 'tangent' }, // kaa: tekshirilsin
  secant: { uz: 'kesuvchi', ru: 'секущая', kaa: 'kesiwshi', en: 'secant' }, // kaa: tekshirilsin
  hypotenuse: { uz: 'gipotenuza', ru: 'гипотенуза', kaa: 'gipotenuza', en: 'hypotenuse' },
  height: { uz: 'balandlik', ru: 'высота', kaa: 'biyiklik', en: 'altitude' }, // kaa: tekshirilsin
  diagonal: { uz: 'diagonal', ru: 'диагональ', kaa: 'diagonal', en: 'diagonal' },
  area: { uz: 'yuza', ru: 'площадь', kaa: 'maydan', en: 'area' }, // kaa: tekshirilsin
  perimeter: { uz: 'perimetr', ru: 'периметр', kaa: 'perimetr', en: 'perimeter' },
  angle: { uz: 'burchak', ru: 'угол', kaa: 'múyesh', en: 'angle' },
  side: { uz: 'tomon', ru: 'сторона', kaa: 'tárep', en: 'side' },
  base: { uz: 'asos', ru: 'основание', kaa: 'tiykar', en: 'base' }, // kaa: tekshirilsin
  bisector: { uz: 'bissektrisa', ru: 'биссектриса', kaa: 'bissektrisa', en: 'angle bisector' },
  median: { uz: 'mediana', ru: 'медиана', kaa: 'mediana', en: 'median' },
  sector: { uz: 'sektor', ru: 'сектор', kaa: 'sektor', en: 'sector' },
  reflection: { uz: 'simmetriya', ru: 'симметрия', kaa: 'simmetriya', en: 'reflection' },
  rotation: { uz: 'burish', ru: 'поворот', kaa: 'burıw', en: 'rotation' }, // kaa: tekshirilsin
} satisfies Record<string, L10n>;

/** Ochiq javob uchun ko'rsatma: javob formati. */
export const HINT_NUM: L10n = {
  uz: "Javobni butun son, oddiy kasr yoki o'nli kasr (nuqta bilan) ko'rinishida yozing.",
  ru: 'Запишите ответ целым числом, обыкновенной или десятичной дробью (через точку).',
  kaa: "Juwaptı pútin san, ápiwayı bólshek yamasa onlıq bólshek (noqat penen) kórinisinde jazıń.", // kaa: tekshirilsin
  en: 'Write the answer as an integer, a common fraction or a decimal (with a point).',
};

export const HINT_NUM_CM: L10n = {
  uz: "Javobni sonda yozing (o'lchov birligisiz): butun yoki o'nli kasr (nuqta bilan).",
  ru: 'Запишите ответ числом (без единиц измерения): целым или десятичной дробью (через точку).',
  kaa: "Juwaptı san menen jazıń (ólshem birliksiz): pútin yamasa onlıq bólshek (noqat penen).", // kaa: tekshirilsin
  en: 'Give the answer as a number (no units): an integer or a decimal (with a point).',
};
