// Admin uchun namunaviy import fayli: har tur bo'yicha bittadan savol (tarjimalar bilan).
export const SAMPLE_IMPORT = [
  {
    external_id: 'namuna-y1',
    type: 'y1',
    block: 'sonlar',
    topic: 3,
    difficulty: 'L1',
    est_seconds: 60,
    stem_md: '$12$ va $18$ sonlarining eng katta umumiy bo\'luvchisini toping.',
    payload: { options: { A: '$3$', B: '$6$', C: '$9$', D: '$36$' } },
    key: { correct: 'B' },
    solution_md: '$12=2^2\\cdot 3$, $18=2\\cdot 3^2$. Umumiy ko\'paytuvchilar: $2\\cdot 3=6$.',
    mistake_note_md: 'EKUBni EKUK bilan adashtirmang: EKUK $36$.',
    i18n: {
      ru: {
        stem_md: 'Найдите наибольший общий делитель чисел $12$ и $18$.',
        payload: { options: { A: '$3$', B: '$6$', C: '$9$', D: '$36$' } },
        solution_md: '$12=2^2\\cdot 3$, $18=2\\cdot 3^2$. Общие множители: $2\\cdot 3=6$.',
      },
    },
  },
  {
    external_id: 'namuna-y2',
    type: 'y2',
    block: 'geometriya',
    topic: 70,
    difficulty: 'L2',
    stem_md: 'To\'g\'ri burchakli uchburchakning katetlari berilgan. Gipotenuzani mos qiymat bilan moslang.',
    payload: {
      options: { A: '$5$', B: '$10$', C: '$13$', D: '$15$' },
      items: [
        { id: '1', text_md: '$a=3,\\ b=4$' },
        { id: '2', text_md: '$a=5,\\ b=12$' },
        { id: '3', text_md: '$a=6,\\ b=8$' },
      ],
    },
    key: { pairs: { '1': 'A', '2': 'C', '3': 'B' } },
    solution_md: 'Pifagor teoremasi: $c=\\sqrt{a^2+b^2}$.',
  },
  {
    external_id: 'namuna-o',
    type: 'o',
    block: 'tenglama',
    topic: 29,
    difficulty: 'L2',
    stem_md: '$4x^2-3x=0$ tenglama berilgan.',
    payload: {
      parts: {
        a: { prompt_md: 'Noldan farqli ildizni toping.' },
        b: { prompt_md: 'Ildizlar yig\'indisini toping.', hint: 'Kasr yoki o\'nli ko\'rinishda yozing' },
      },
    },
    key: { a: ['3/4', '0.75'], b: ['3/4', '0.75'] },
    solution_md: '$x(4x-3)=0$, demak $x=0$ yoki $x=\\frac{3}{4}$.',
  },
];
