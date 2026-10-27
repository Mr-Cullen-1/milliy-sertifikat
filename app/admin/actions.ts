'use server';

import { createHash } from 'node:crypto';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin';
import { examSortFromCode, validateImportText, type ImportProblem, type ImportSummary } from '@/lib/content/validate';
import { audit } from '@/lib/security/audit';
import { clientKey, rateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';

// --- Kirish / chiqish ---

export interface LoginState {
  error?: string;
}

const GENERIC = "Email yoki parol noto'g'ri";

export async function adminLoginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || password.length < 6 || password.length > 200) return { error: GENERIC };

  // Brute-force'dan himoya: IP va email bo'yicha; baza ishlamasa rad etiladi (failClosed).
  const emailKey = createHash('sha256').update(email).digest('hex').slice(0, 16);
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`alogin:ip:${await clientKey()}`, 20, 900, { failClosed: true }),
    rateLimit(`alogin:em:${emailKey}`, 6, 900, { failClosed: true }),
  ]);
  if (!byIp || !byEmail) return { error: "Juda ko'p urinish. 15 daqiqadan keyin qayta urinib ko'ring." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: GENERIC };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  if (!profile || (profile.role !== 'admin' && profile.role !== 'editor')) {
    // Oddiy foydalanuvchi admin hududiga kira olmaydi; sababi oshkor qilinmaydi.
    await supabase.auth.signOut();
    return { error: GENERIC };
  }

  await audit(data.user.id, 'admin.login');
  redirect('/admin');
}

export async function adminLogoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

// --- Mock holati ---

export interface ActionState {
  ok?: boolean;
  message?: string;
}

const uuid = z.uuid();

const friendly = (m: string) => m.replace(/^exam_blueprint_invalid: /, 'Nashr etib bo\'lmaydi: ').replace(/^exam_not_draft$/, 'Mock qoralama emas');

export async function setExamStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireAdmin({ adminOnly: true });
  const id = String(formData.get('examId') ?? '');
  const to = String(formData.get('to') ?? '');
  if (!uuid.safeParse(id).success || !['publish', 'archive', 'unarchive'].includes(to)) return { ok: false, message: "Noto'g'ri so'rov" };

  const db = createAdminClient();
  if (to === 'publish') {
    const { error } = await db.rpc('publish_exam', { p_exam_id: id });
    if (error) return { ok: false, message: friendly(error.message) };
  } else {
    const [from, status] = to === 'archive' ? (['published', 'archived'] as const) : (['archived', 'published'] as const);
    const { data, error } = await db.from('exams').update({ status }).eq('id', id).eq('status', from).select('id');
    if (error) return { ok: false, message: error.message };
    if (!data?.length) return { ok: false, message: 'Mock holati mos kelmadi (sahifani yangilang)' };
  }

  await audit(actor.id, `exam.${to}`, 'exam', id);
  return { ok: true, message: to === 'publish' ? 'Nashr etildi' : to === 'archive' ? 'Arxivlandi' : 'Qayta ochildi' };
}

// --- JSON import ---

export interface ImportState {
  intent?: 'validate' | 'commit';
  ok?: boolean;
  message?: string;
  problems?: ImportProblem[];
  truncated?: boolean;
  summary?: ImportSummary;
  examId?: string | null;
}

async function readText(formData: FormData): Promise<string> {
  const file = formData.get('file');
  if (file instanceof File && file.size > 0) return file.text();
  return String(formData.get('text') ?? '');
}

export async function importAction(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const actor = await requireAdmin();
  const intent = formData.get('intent') === 'commit' ? 'commit' : 'validate';

  if (!(await rateLimit(`import:${actor.id}`, 30, 600))) return { intent, ok: false, message: "Juda ko'p so'rov. Birozdan keyin qayta urinib ko'ring." };

  const text = (await readText(formData)).trim();
  if (!text) return { intent, ok: false, message: 'JSON fayl yoki matn kiriting' };

  const v = validateImportText(text);
  if (!v.ok) return { intent, ok: false, problems: v.problems, truncated: v.truncated, message: "Fayl xatolari bor: hech narsa yuklanmadi" };
  if (intent === 'validate') return { intent, ok: true, summary: v.summary, message: "Tekshiruvdan o'tdi. Yuklash tugmasi bilan bazaga yozing." };

  const exam = v.file.exam
    ? { title: v.file.exam.title, code: v.file.exam.code ?? null, is_free: v.file.exam.is_free ?? false, sort: examSortFromCode(v.file.exam.code), format: 'math-v1' }
    : undefined;
  const { data, error } = await createAdminClient().rpc('import_questions', {
    p_questions: v.file.questions as unknown as Json,
    p_exam: exam as unknown as Json | undefined,
  });
  if (error) {
    const dup = /duplicate key/.test(error.message) ? ' (exam kodi yoki savol takrorlangan)' : '';
    return { intent, ok: false, summary: v.summary, message: `Bazaga yozib bo'lmadi: ${error.message}${dup}. Hech narsa saqlanmadi.` };
  }

  const r = z.object({ created: z.number(), existing: z.number(), exam_id: z.string().nullable() }).parse(data);
  await audit(actor.id, 'import.commit', 'questions', r.exam_id ?? undefined, { created: r.created, existing: r.existing, exam: v.file.exam?.title ?? null });
  return {
    intent,
    ok: true,
    summary: v.summary,
    examId: r.exam_id,
    message: `Yuklandi: ${r.created} ta yangi savol, ${r.existing} ta oldindan mavjud${r.exam_id ? '; mock qoralama sifatida yaratildi' : ''}.`,
  };
}
