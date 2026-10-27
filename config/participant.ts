// Ro'yxatga olish (intake) formasidagi sinf ro'yxati. O'zgartirish uchun faqat shu faylni tahrirlang.
export const GRADES = [
  { value: '9', label: '9-sinf' },
  { value: '10', label: '10-sinf' },
  { value: '11', label: '11-sinf' },
  { value: 'bitirgan', label: 'Bitirganman' },
] as const;

export type GradeValue = (typeof GRADES)[number]['value'];
