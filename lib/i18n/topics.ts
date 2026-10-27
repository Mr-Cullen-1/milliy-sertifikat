import type { Lang } from './config';

/**
 * 103 ta ishchi mavzu nomlari (docs/mavzular.md raqami bo'yicha). uz nomi bazada (topics.name_uz);
 * bu yerda boshqa tillar tarjimasi bo'ladi. Tarjimasi yo'q mavzu o'zbekcha nom bilan ko'rsatiladi.
 */
export const TOPIC_NAMES: Record<number, Partial<Record<Exclude<Lang, 'uz'>, string>>> = {
  // 1. Sonlar va amallar
  1: { ru: 'Натуральные числа и действия над ними', kaa: 'Natural sanlar hám olar ústindegi ámeller', en: 'Natural numbers and operations on them' },
  2: { ru: 'Признаки делимости; простые и составные числа', kaa: 'Bóliniw belgileri; tub hám quramalı sanlar', en: 'Divisibility rules; prime and composite numbers' },
  3: { ru: 'НОД и НОК', kaa: 'EKUB hám EKUK', en: 'GCD and LCM' },
  4: { ru: 'Обыкновенные дроби и действия над ними', kaa: 'Ápiwayı bólshekler hám olar ústindegi ámeller', en: 'Common fractions and operations on them' },
  5: { ru: 'Десятичные и периодические дроби', kaa: 'Ondıq hám dawırlı bólshekler', en: 'Decimal and recurring fractions' },
  6: { ru: 'Целые и рациональные числа; модуль числа', kaa: 'Pútin hám ratsional sanlar; sannıń moduli', en: 'Integers and rational numbers; absolute value' },
  7: { ru: 'Отношение и пропорция', kaa: 'Qatnas hám proporciya', en: 'Ratio and proportion' },
  8: { ru: 'Проценты и задачи на проценты', kaa: 'Procent hám procentke tiyisli máseleler', en: 'Percentages and percentage problems' },
  9: { ru: 'Вычисление и сравнение значений числовых выражений', kaa: 'Sanlı ańlatpalardıń mánisin esaplaw hám salıstırıw', en: 'Evaluating and comparing numerical expressions' },
  10: { ru: 'Округление, приближённые вычисления, стандартный вид', kaa: 'Jaqınlastırıw, shama menen esaplawlar, standart kórinis', en: 'Rounding, approximate calculation, standard form' },
  11: { ru: 'Иррациональные и действительные числа', kaa: 'Irratsional hám haqıyqıy sanlar', en: 'Irrational and real numbers' },

  // 2. Algebraik shakl almashtirishlar
  12: { ru: 'Степень с целым показателем и её свойства', kaa: 'Pútin kórsetkishli dáreje hám onıń qásiyetleri', en: 'Integer exponents and their properties' },
  13: { ru: 'Арифметический корень и его свойства', kaa: 'Arifmetikalıq túbir hám onıń qásiyetleri', en: 'Arithmetic roots and their properties' },
  14: { ru: 'Степень с рациональным показателем', kaa: 'Ratsional kórsetkishli dáreje', en: 'Rational exponents' },
  15: { ru: 'Одночлены и многочлены; действия над ними', kaa: 'Birhad hám kópxadlar; olar ústindegi ámeller', en: 'Monomials and polynomials; operations on them' },
  16: { ru: 'Формулы сокращённого умножения', kaa: 'Qısqasha kóbeytiw formulaları', en: 'Special product formulas' },
  17: { ru: 'Способы разложения на множители', kaa: 'Kóbeytiwshilerge ajıratıw usılları', en: 'Methods of factorisation' },
  18: { ru: 'Алгебраические дроби: сокращение и действия', kaa: 'Algebralıq bólshekler: qısqartıw hám ámeller', en: 'Algebraic fractions: simplifying and operations' },
  19: { ru: 'Избавление от иррациональности в знаменателе', kaa: 'Bólshek maxrajındaǵı irratsionallıqtan qutılıw', en: 'Rationalising the denominator' },
  20: { ru: 'Упрощение выражений с корнями', kaa: 'Túbirli ańlatpalardı ápiwayılastırıw', en: 'Simplifying expressions with roots' },
  21: { ru: 'Определение и свойства логарифма; логарифмические выражения', kaa: 'Logarifmniń anıqlaması hám qásiyetleri; logarifmlik ańlatpalar', en: 'Definition and properties of logarithms; logarithmic expressions' },
  22: { ru: 'Основные тригонометрические тождества', kaa: 'Tiykarǵı trigonometriyalıq birdeyliklar', en: 'Basic trigonometric identities' },
  23: { ru: 'Формулы приведения', kaa: 'Keltiriw formulaları', en: 'Reduction formulas' },
  24: { ru: 'Формулы суммы и разности, двойного и половинного угла', kaa: 'Qosındı hám ayırma, eki esse hám yarım múyesh formulaları', en: 'Sum, difference, double-angle and half-angle formulas' },
  25: { ru: 'Формулы преобразования суммы в произведение и произведения в сумму', kaa: 'Qosındını kóbeymege hám kóbeymeni qosındıǵa keltiriw formulaları', en: 'Sum-to-product and product-to-sum formulas' },
  26: { ru: 'Вычисление значений тригонометрических выражений', kaa: 'Trigonometriyalıq ańlatpalardıń mánisin esaplaw', en: 'Evaluating trigonometric expressions' },
  27: { ru: 'Упрощение выражений с модулем', kaa: 'Modulli ańlatpalardı ápiwayılastırıw', en: 'Simplifying expressions with absolute value' },

  // 3. Tenglama va tengsizliklar
  28: { ru: 'Линейные уравнения и неравенства', kaa: 'Sızıqlı teńleme hám teńsizlikler', en: 'Linear equations and inequalities' },
  29: { ru: 'Квадратные уравнения; дискриминант; теорема Виета', kaa: 'Kvadrat teńleme; diskriminant; Viyet teoreması', en: "Quadratic equations; discriminant; Vieta's theorem" },
  30: { ru: 'Квадратные неравенства и метод интервалов', kaa: 'Kvadrat teńsizlikler hám aralıqlar usılı', en: 'Quadratic inequalities and the interval method' },
  31: { ru: 'Уравнения высших степеней и биквадратные; замена переменной', kaa: 'Joqarı dárejeli hám bikvadrat teńlemeler; ózgeriwshini almastırıw', en: 'Higher-degree and biquadratic equations; substitution' },
  32: { ru: 'Дробно-рациональные уравнения и неравенства', kaa: 'Bólshek-ratsional teńleme hám teńsizlikler', en: 'Rational (fractional) equations and inequalities' },
  33: { ru: 'Уравнения и неравенства с модулем', kaa: 'Modulli teńleme hám teńsizlikler', en: 'Equations and inequalities with absolute value' },
  34: { ru: 'Иррациональные уравнения и неравенства', kaa: 'Irratsional teńleme hám teńsizlikler', en: 'Irrational equations and inequalities' },
  35: { ru: 'Системы уравнений (линейные и нелинейные)', kaa: 'Teńlemeler sisteması (sızıqlı hám sızıqlı emes)', en: 'Systems of equations (linear and nonlinear)' },
  36: { ru: 'Системы и совокупности неравенств', kaa: 'Teńsizlikler sisteması hám jıyıntıǵı', en: 'Systems and sets of inequalities' },
  37: { ru: 'Показательные уравнения и неравенства', kaa: 'Kórsetkishli teńleme hám teńsizlikler', en: 'Exponential equations and inequalities' },
  38: { ru: 'Логарифмические уравнения и неравенства', kaa: 'Logarifmlik teńleme hám teńsizlikler', en: 'Logarithmic equations and inequalities' },
  39: { ru: 'Тригонометрические уравнения', kaa: 'Trigonometriyalıq teńlemeler', en: 'Trigonometric equations' },
  40: { ru: 'Тригонометрические неравенства', kaa: 'Trigonometriyalıq teńsizlikler', en: 'Trigonometric inequalities' },
  41: { ru: 'Уравнения и неравенства с параметром', kaa: 'Parametrli teńleme hám teńsizlikler', en: 'Equations and inequalities with a parameter' },
  42: { ru: 'Текстовые задачи: движение, работа, смеси, сплавы', kaa: 'Tekstli máseleler: háreket, jumıs, aralaspa, qorıtpa', en: 'Word problems: motion, work, mixtures, alloys' },

  // 4. Funksiyalar
  43: { ru: 'Понятие функции; область определения и область значений', kaa: 'Funkciya túsinigi; anıqlanıw hám mánisler oblastı', en: 'The concept of a function; domain and range' },
  44: { ru: 'Чётность, нечётность и периодичность функции', kaa: 'Funkciyanıń jup-taqlıǵı hám dáwirliligi', en: 'Even/odd functions and periodicity' },
  45: { ru: 'Монотонность и экстремумы функции', kaa: 'Funkciyanıń monotonlıǵı hám ekstremumları', en: 'Monotonicity and extrema of a function' },
  46: { ru: 'Линейная функция и её график', kaa: 'Sızıqlı funkciya hám onıń grafigi', en: 'Linear function and its graph' },
  47: { ru: 'Квадратичная функция и её график', kaa: 'Kvadrat funkciya hám onıń grafigi', en: 'Quadratic function and its graph' },
  48: { ru: 'Обратная пропорциональность; дробно-линейная функция', kaa: 'Keri proporcionallıq; bólshek-sızıqlı funkciya', en: 'Inverse proportionality; linear-fractional function' },
  49: { ru: 'Степенная функция и функция корня', kaa: 'Dárejelik hám túbir funkciyalar', en: 'Power and root functions' },
  50: { ru: 'Показательная функция', kaa: 'Kórsetkishli funkciya', en: 'Exponential function' },
  51: { ru: 'Логарифмическая функция', kaa: 'Logarifmlik funkciya', en: 'Logarithmic function' },
  52: { ru: 'Тригонометрические функции и их графики', kaa: 'Trigonometriyalıq funkciyalar hám olardıń grafikleri', en: 'Trigonometric functions and their graphs' },
  53: { ru: 'Обратные тригонометрические функции', kaa: 'Keri trigonometriyalıq funkciyalar', en: 'Inverse trigonometric functions' },
  54: { ru: 'Преобразования графиков (сдвиг, растяжение, с модулем)', kaa: 'Grafiklerdi almastırıw (sürıw, sozıw, modul menen)', en: 'Graph transformations (shifts, stretches, with absolute value)' },
  55: { ru: 'Сложная и обратная функция', kaa: 'Quramalı hám keri funkciya', en: 'Composite and inverse functions' },

  // 5. Matematik analiz asoslari
  56: { ru: 'Числовая последовательность и её предел', kaa: 'Sanlı izbe-izlik hám onıń limiti', en: 'Number sequences and their limits' },
  57: { ru: 'Арифметическая прогрессия', kaa: 'Arifmetikalıq progressiya', en: 'Arithmetic progression' },
  58: { ru: 'Геометрическая прогрессия; бесконечно убывающая геометрическая прогрессия', kaa: 'Geometriyalıq progressiya; sheksiz kemeyiwshi geometriyalıq progressiya', en: 'Geometric progression; infinite decreasing geometric progression' },
  59: { ru: 'Предел и непрерывность функции', kaa: 'Funkciyanıń limiti hám úzliksizligi', en: 'Limits and continuity of a function' },
  60: { ru: 'Определение производной и правила вычисления', kaa: 'Tuwındınıń anıqlaması hám esaplaw qaǵıydaları', en: 'Definition of the derivative and rules of differentiation' },
  61: { ru: 'Производная сложной функции', kaa: 'Quramalı funkciyanıń tuwındısı', en: 'Derivative of a composite function' },
  62: { ru: 'Геометрический смысл производной; уравнение касательной', kaa: 'Tuwındınıń geometriyalıq mánisi; urınba teńlemesi', en: 'Geometric meaning of the derivative; tangent line equation' },
  63: { ru: 'Исследование монотонности и экстремумов функции с помощью производной', kaa: 'Funkciyanıń monotonlıǵı hám ekstremumların tuwındı arqalı izertlew', en: 'Using the derivative to study monotonicity and extrema' },
  64: { ru: 'Нахождение наибольшего и наименьшего значений (оптимизация)', kaa: 'Eń úlken hám eń kishi mánisti tabıw (optimallastırıw)', en: 'Finding maximum and minimum values (optimisation)' },
  65: { ru: 'Первообразная', kaa: 'Dáslepki funkciya', en: 'Antiderivative' },
  66: { ru: 'Определённый интеграл и площадь криволинейной трапеции', kaa: 'Anıq integral hám iymek sızıqlı trapeciya maydanı', en: 'Definite integral and the area of a curvilinear trapezoid' },

  // 6. Geometriya
  67: { ru: 'Углы; параллельные и пересекающиеся прямые', kaa: 'Múyeshler; parallel hám kesisiwshi tuwrı sızıqlar', en: 'Angles; parallel and intersecting lines' },
  68: { ru: 'Треугольники: виды, углы, неравенство', kaa: 'Úshmúyeshlikler: túrleri, múyeshleri, teńsizligi', en: 'Triangles: types, angles, inequality' },
  69: { ru: 'Равенство и подобие треугольников', kaa: 'Úshmúyeshliklerdiń teńligi hám uqsaslıǵı', en: 'Congruence and similarity of triangles' },
  70: { ru: 'Прямоугольный треугольник; теорема Пифагора', kaa: 'Tuwrı múyeshli úshmúyeshlik; Pifagor teoreması', en: 'Right triangle; Pythagorean theorem' },
  71: { ru: 'Теоремы синусов и косинусов', kaa: 'Sinuslar hám kosinuslar teoremaları', en: 'Law of sines and law of cosines' },
  72: { ru: 'Медиана, высота, биссектриса и средняя линия треугольника', kaa: 'Úshmúyeshliktiń medianası, biyikligi, bissektrisası, orta sızıǵı', en: 'Median, altitude, angle bisector and midline of a triangle' },
  73: { ru: 'Формулы площади треугольника', kaa: 'Úshmúyeshlik maydanı formulaları', en: 'Triangle area formulas' },
  74: { ru: 'Параллелограмм и ромб', kaa: 'Parallelogramm hám romb', en: 'Parallelogram and rhombus' },
  75: { ru: 'Прямоугольник и квадрат', kaa: 'Tuwrı tórtmúyeshlik hám kvadrat', en: 'Rectangle and square' },
  76: { ru: 'Трапеция', kaa: 'Trapeciya', en: 'Trapezoid' },
  77: { ru: 'Многоугольники (выпуклые и правильные)', kaa: 'Kópmúyeshlikler (qabırǵalı hám durıs)', en: 'Polygons (convex and regular)' },
  78: { ru: 'Окружность и круг: длина, площадь, сектор', kaa: 'Aylana hám dóńgelek: uzınlıq, maydan, sektor', en: 'Circle and disc: circumference, area, sector' },
  79: { ru: 'Углы в окружности; хорда, касательная, секущая', kaa: 'Aylanadaǵı múyeshler; xorda, urınba, kesiwshi', en: 'Angles in a circle; chord, tangent, secant' },
  80: { ru: 'Вписанные и описанные окружности', kaa: 'Ishki hám sırtqı sızılǵan aylanalar', en: 'Inscribed and circumscribed circles' },
  81: { ru: 'Координаты и векторы на плоскости', kaa: 'Tegisliktegi koordinatalar hám vektorlar', en: 'Coordinates and vectors in the plane' },
  82: { ru: 'Геометрические преобразования (симметрия, перенос, поворот, гомотетия)', kaa: 'Geometriyalıq almastırıwlar (simmetriya, kóshiriw, burıw, gomotetiya)', en: 'Geometric transformations (reflection, translation, rotation, homothety)' },
  83: { ru: 'Взаимное расположение прямых и плоскостей в пространстве', kaa: 'Keńislikte tuwrı sızıq hám tegisliklerdiń óz-ara jaylasıwı', en: 'Relative position of lines and planes in space' },
  84: { ru: 'Углы и расстояния в пространстве', kaa: 'Keńislikte múyeshler hám aralıqlar', en: 'Angles and distances in space' },
  85: { ru: 'Призма', kaa: 'Prizma', en: 'Prism' },
  86: { ru: 'Параллелепипед и куб', kaa: 'Parallelepiped hám kub', en: 'Parallelepiped and cube' },
  87: { ru: 'Пирамида и усечённая пирамида', kaa: 'Piramida hám qıyıq piramida', en: 'Pyramid and truncated pyramid' },
  88: { ru: 'Цилиндр', kaa: 'Cilindr', en: 'Cylinder' },
  89: { ru: 'Конус и усечённый конус', kaa: 'Konus hám qıyıq konus', en: 'Cone and truncated cone' },
  90: { ru: 'Шар и сфера', kaa: 'Shar hám sfera', en: 'Ball and sphere' },
  91: { ru: 'Сечения многогранников и тел вращения', kaa: 'Kópjaqlılar hám aylanıw denelerdiń kesimleri', en: 'Cross-sections of polyhedra and solids of revolution' },
  92: { ru: 'Вписанные и описанные тела', kaa: 'Ishki hám sırtqı sızılǵan deneler', en: 'Inscribed and circumscribed solids' },
  93: { ru: 'Координаты и векторы в пространстве', kaa: 'Keńislikte koordinatalar hám vektorlar', en: 'Coordinates and vectors in space' },

  // 7. To'plam, mulohazalar, ma'lumotlar tahlili, kombinatorika, ehtimollar nazariyasi va modellashtirish
  94: { ru: 'Множества и операции над ними (диаграммы Эйлера-Венна)', kaa: 'Kópshilikler hám olar ústindegi ámeller (Eyler-Venn diagrammaları)', en: 'Sets and set operations (Euler-Venn diagrams)' },
  95: { ru: 'Высказывания и логические операции (отрицание, конъюнкция, дизъюнкция, импликация)', kaa: 'Pikirler hám logikalıq ámeller (biykarlaw, konyunkciya, dizyunkciya, implikaciya)', en: 'Statements and logical operations (negation, conjunction, disjunction, implication)' },
  96: { ru: 'Правила комбинаторики (сложения и умножения)', kaa: 'Kombinatorika qaǵıydaları (qosıw hám kóbeytiw)', en: 'Counting rules (addition and multiplication)' },
  97: { ru: 'Перестановки, размещения и сочетания', kaa: 'Orın almastırıw, orınlastırıw hám toparlaw', en: 'Permutations, arrangements and combinations' },
  98: { ru: 'Бином Ньютона', kaa: 'Nyuton binomı', en: "Newton's binomial theorem" },
  99: { ru: 'Классическая вероятность', kaa: 'Klassikalıq itimallıq', en: 'Classical probability' },
  100: { ru: 'Сложение и умножение вероятностей; условная вероятность', kaa: 'Itimallıqlardı qosıw hám kóbeytiw; shártli itimallıq', en: 'Addition and multiplication of probabilities; conditional probability' },
  101: { ru: 'Статистические показатели (среднее, мода, медиана, дисперсия)', kaa: 'Statistikalıq kórsetkishler (ortasha, moda, mediana, dispersiya)', en: 'Statistical measures (mean, mode, median, variance)' },
  102: { ru: 'Анализ данных в таблицах, диаграммах и графиках', kaa: 'Maǵlıwmatlardı keste, diagramma hám grafikte analizlew', en: 'Analysing data in tables, charts and graphs' },
  103: { ru: 'Построение математической модели реальной ситуации', kaa: 'Haqıyqıy jaǵdaydı matematikalıq modelge aylandırıw', en: 'Turning a real situation into a mathematical model' },
};

export const topicName = (id: number, lang: Lang, uzName: string | undefined): string => {
  if (lang !== 'uz') {
    const tr = TOPIC_NAMES[id]?.[lang];
    if (tr) return tr;
  }
  return uzName ?? String(id);
};
