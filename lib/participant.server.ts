import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';

export interface Participant {
  id: string;
  fullName: string;
  phone: string | null;
  grade: string | null;
  /** ism, telefon va sinf to'ldirilgan (imtihon boshlash uchun shart) */
  complete: boolean;
  /** Pro huquqi (admin beradi): qoralama variantlar va to'liq tahlil ochiq */
  isPro: boolean;
}

/** Joriy brauzer sessiyasidagi ishtirokchi; sessiya yoki profil bo'lmasa null. */
export async function getParticipant(): Promise<Participant | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims.sub;
  if (!id) return null;

  const { data: profile } = await supabase.from('profiles').select('name, phone, grade, is_pro').eq('id', id).maybeSingle();
  if (!profile) return null;

  return {
    id,
    fullName: profile.name,
    phone: profile.phone,
    grade: profile.grade,
    complete: profile.name.trim() !== '' && !!profile.phone && !!profile.grade,
    isPro: profile.is_pro,
  };
}

/** Brauzerda ishtirokchi sessiyasi bor-yo'qligi (JWT lokal tekshiriladi, bazaga murojaat yo'q). */
export async function hasSession(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return !!data?.claims.sub;
}

/** Ro'yxatga olingan (ism, telefon, sinf to'liq) ishtirokchi; aks holda /start ga yo'naltiradi. */
export async function requireParticipant(next: string): Promise<Participant> {
  const participant = await getParticipant();
  if (!participant?.complete) redirect(`/start?next=${encodeURIComponent(next)}`);
  return participant;
}
