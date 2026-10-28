/** Joriy yil (footer uchun). Sahifalar so'rov vaqtida (dinamik) chiziladi, shuning uchun oddiy hisoblash yetarli. */
export async function currentYear(): Promise<number> {
  return new Date().getFullYear();
}
