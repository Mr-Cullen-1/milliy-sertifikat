// Qurilgan ilovaga haqiqiy sessiya cookie'lari bilan so'rov yuborib sahifalarni tekshiradi (bir martalik; test foydalanuvchilar o'chiriladi).
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUB = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const admin = createClient(URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const created = [];
const results = [];
const check = (name, ok, extra = '') => {
  results.push(ok);
  console.log(`${ok ? 'OK  ' : 'XATO'} ${name}${extra ? ' | ' + extra : ''}`);
};

async function session(kind) {
  const email = kind === 'guest' ? `g-${randomUUID()}@guest.invalid` : `smoke-${randomUUID().slice(0, 8)}@example.com`;
  const password = randomBytes(24).toString('base64url');
  const c = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  const id = c.data.user.id;
  created.push(id);
  if (kind === 'admin') await admin.from('profiles').update({ role: 'admin' }).eq('id', id);
  const jar = new Map();
  const db = createServerClient(URL, PUB, {
    cookieOptions: kind === 'guest' ? { name: 'sb-participant' } : undefined,
    cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (l) => l.forEach(({ name, value }) => jar.set(name, value)) },
  });
  const s = await db.auth.signInWithPassword({ email, password });
  if (s.error) throw new Error(s.error.message);
  const cookie = () => [...jar].map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; ');
  return { id, db, cookie };
}

const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3122'], { stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
server.stdout.on('data', (d) => (log += d));
server.stderr.on('data', (d) => (log += d));

async function page(path, cookie, extraCookie = '') {
  const r = await fetch('http://localhost:3122' + path, { redirect: 'manual', headers: { cookie: [cookie, extraCookie].filter(Boolean).join('; ') } });
  return { status: r.status, loc: r.headers.get('location') ?? '', body: await r.text() };
}

try {
  for (let i = 0; i < 80 && !/Ready|started server/i.test(log); i++) await new Promise((r) => setTimeout(r, 500));

  // ---------- Ishtirokchi ----------
  const g = await session('guest');
  const exam = (await g.db.from('exams').select('id').eq('code', 'A')).data?.[0];
  await g.db.from('profiles').update({ name: 'Smoke Test', phone: '+998901112233', grade: '11', consent_at: new Date().toISOString() }).eq('id', g.id);

  for (const [path, marker] of [['/', 'Smoke Test'], ['/exams', 'Variant A'], [`/exams/${exam.id}`, 'Variant A'], ['/history', 'Natijalarim'], ['/mistakes', 'Xatolar daftari'], ['/dtm', 'DTM']]) {
    const r = await page(path, g.cookie());
    check(`guest ${path}`, r.status === 200 && r.body.includes(marker), `status ${r.status}`);
  }
  const ru = await page('/exams', g.cookie(), 'lang=ru');
  check('guest /exams (ru)', ru.status === 200 && ru.body.includes('Пробные') || ru.body.includes('экзамен'), `status ${ru.status}`);

  const start = await g.db.rpc('start_attempt', { p_exam_id: exam.id });
  const attemptId = start.data.attempt_id;
  const run = await page(`/attempts/${attemptId}`, g.cookie());
  check('guest /attempts/[id] (imtihon ekrani)', run.status === 200 && run.body.includes('katex') && run.body.includes('Kalkulyator'), `status ${run.status}, ${run.body.length} bayt`);
  const runRu = await page(`/attempts/${attemptId}`, g.cookie(), 'lang=ru');
  check('imtihon ekrani ruscha matn bilan', runRu.status === 200 && runRu.body.includes('Калькулятор'), `status ${runRu.status}`);

  // bir nechta javob, so'ng yopish (ball hisoblash natija sahifasida server tomonida bajariladi)
  const items = (await g.db.rpc('get_attempt_state', { p_attempt_id: attemptId })).data.items;
  const keys = (await admin.from('question_keys').select('question_id, key_json').in('question_id', items.map((i) => i.question_id))).data;
  const keyOf = new Map(keys.map((k) => [k.question_id, k.key_json]));
  for (const it of items.slice(0, 12)) await g.db.rpc('save_answer', { p_attempt_id: attemptId, p_question_id: it.question_id, p_value: it.position <= 8 ? keyOf.get(it.question_id).correct : 'A' });
  await admin.rpc('close_attempt', { p_attempt_id: attemptId, p_only_if_expired: false });

  const res = await page(`/attempts/${attemptId}/result`, g.cookie());
  check('guest result (serverda ball hisoblanadi)', res.status === 200 && res.body.includes('≈') && res.body.includes('taxminiy'), `status ${res.status}`);
  const after = await admin.from('attempts').select('raw_score, scaled_score, level').eq('id', attemptId).single();
  check('ball bazaga yozilgan', after.data.raw_score !== null && after.data.scaled_score !== null, JSON.stringify(after.data));
  const resEn = await page(`/attempts/${attemptId}/result`, g.cookie(), 'lang=en');
  check('result (en) + to\'g\'ri javob/yechim', resEn.status === 200 && resEn.body.includes('Correct answer') && resEn.body.includes('Solution'), `status ${resEn.status}`);
  const hist = await page('/history', g.cookie());
  check('history: grafik va jadval', hist.status === 200 && hist.body.includes('<svg') && hist.body.includes('Variant A'), `status ${hist.status}`);
  const mis = await page('/mistakes', g.cookie());
  check('mistakes: savollar va yechim', mis.status === 200 && mis.body.includes('Yechim') && mis.body.includes('katex'), `status ${mis.status}`);
  const dtm = await page('/dtm?score=62.4&level=B%2B', g.cookie());
  check('dtm: natijadan to\'ldirilgan', dtm.status === 200 && dtm.body.includes('62,4'), `status ${dtm.status}`);

  // CSP nonce: statik qobiq (PPR) nonce olmaydi va brauzer Next skriptlarini bloklaydi; barcha <script> nonce bilan kelishi shart
  for (const p of ['/privacy', '/exams', '/dtm']) {
    const r = await page(p, g.cookie());
    const scripts = r.body.split("<script").slice(1).map((s) => s.slice(0, s.indexOf(">")));
    const bare = scripts.filter((s) => !s.includes("nonce="));
    check(`${p}: barcha <script> nonce bilan (${scripts.length} ta)`, scripts.length > 0 && bare.length === 0, `status ${r.status}${bare.length ? " " + bare[0].slice(0, 80) : ""}`);
  }

  // talaba admin hududiga kira olmaydi
  const forbidden = await page('/admin', g.cookie());
  check('guest /admin: kirish yo\'q', forbidden.status === 307 || forbidden.body.includes('NEXT_REDIRECT') || /admin\/login/.test(forbidden.loc + forbidden.body), `status ${forbidden.status} ${forbidden.loc}`);
  const forbidden2 = await page('/admin/audit', g.cookie());
  check('guest /admin/audit: kirish yo\'q', !forbidden2.body.includes('Audit jurnali'), `status ${forbidden2.status}`);

  // ---------- Admin ----------
  const a = await session('admin');

  // ---------- Sessiyalar ajratilgan: bitta brauzerda ham admin, ham ishtirokchi ----------
  const both = [g.cookie(), a.cookie()].join('; ');
  const draft = (await admin.from('exams').select('code, title').neq('status', 'published').limit(1)).data?.[0];
  const mixedExams = await page('/exams', both);
  check("ikkala sessiya bor: /exams faqat nashr etilganlarni ko'rsatadi",mixedExams.status === 200 && mixedExams.body.includes('Smoke Test') === false && (!draft || !mixedExams.body.includes(draft.title)), `status ${mixedExams.status}${draft ? ', qoralama: ' + draft.title : ''}`);
  const mixedResult = await page(`/attempts/${attemptId}/result`, both);
  check('ikkala sessiya bor: natija sahifasi ishtirokchi sessiyasi bilan ochiladi', mixedResult.status === 200 && mixedResult.body.includes('≈'), `status ${mixedResult.status}`);
  const mixedAdmin = await page('/admin/exams', both);
  check('ikkala sessiya bor: /admin admin sessiyasi bilan ochiladi', mixedAdmin.status === 200 && mixedAdmin.body.includes('Variant A'), `status ${mixedAdmin.status}`);
  const someQ = items[0].question_id;
  const adminPages = [
    ['/admin', 'Boshqaruv paneli'],
    ['/admin/exams', 'Variant A'],
    [`/admin/exams/${exam.id}`, 'Topshiriqlar va haqiqiy natijalar'],
    ['/admin/questions', 'Savollar banki'],
    ['/admin/questions?block=geometriya&type=y2', 'Savollar banki'],
    [`/admin/questions/${someQ}`, "Ko'rinishi"],
    [`/admin/questions/${someQ}?lang=ru`, "Ko'rinishi"],
    ['/admin/import', 'JSON'],
    ['/admin/attempts', 'Natijalar'],
    ['/admin/participants?q=smoke', 'Smoke Test'],
    ['/admin/audit', 'Audit jurnali'],
  ];
  for (const [path, marker] of adminPages) {
    const r = await page(path, a.cookie());
    check(`admin ${path}`, r.status === 200 && r.body.includes(marker), `status ${r.status}${r.status !== 200 ? ' ' + r.loc : ''}`);
  }
  const sample = await page('/admin/import/sample', a.cookie());
  check('admin /admin/import/sample (JSON)', sample.status === 200 && sample.body.includes('namuna-y1'), `status ${sample.status}`);
  const login = await page('/admin/login', a.cookie());
  check('admin /admin/login: kirgan bo\'lsa panelga yo\'naltiriladi', login.status === 307 || login.body.includes('NEXT_REDIRECT') || /\/admin/.test(login.loc), `status ${login.status} ${login.loc}`);
  const att = await page('/admin/attempts', a.cookie());
  check('admin natijalarda urinish ko\'rinadi (ism, telefon, ball)', att.body.includes('Smoke Test') && att.body.includes('+998901112233'));
} catch (e) {
  console.log('XATO (skript):', e.message);
  results.push(false);
} finally {
  server.kill();
  for (const id of created) await admin.auth.admin.deleteUser(id);
  console.log(`\nJami: ${results.filter(Boolean).length}/${results.length} o'tdi; test foydalanuvchilar o'chirildi (${created.length})`);
  process.exit(results.every(Boolean) ? 0 : 1);
}
