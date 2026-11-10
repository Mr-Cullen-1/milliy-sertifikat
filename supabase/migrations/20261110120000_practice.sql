-- Mashq rejimi: bo'lim bo'yicha tasodifiy savollar (faqat pool = 'practice' zaxirasidan, mock savollari kirmaydi).
-- Rejimlar: practice (taymersiz, javob darrov), timed (taymer, javob darrov), exam (taymer, javob oxirida).
-- Jadvallarga to'g'ridan-to'g'ri kirish yo'q: faqat funksiyalar orqali (kalit va yechim oldindan ochilib ketmasligi uchun).
-- Javobni tekshirish (kalit bilan solishtirish) TypeScript tomonida (lib/exam/scoring.ts), natija store_practice_result orqali yoziladi.

create table public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  block_id smallint not null references public.blocks (id),
  difficulty public.difficulty,
  mode text not null check (mode in ('practice', 'timed', 'exam')),
  question_count smallint not null check (question_count between 1 and 50),
  started_at timestamptz not null default now(),
  deadline_at timestamptz,
  submitted_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted')),
  correct_count smallint,
  check ((status = 'submitted') = (submitted_at is not null))
);
create index practice_sessions_user_idx on public.practice_sessions (user_id, started_at desc);

create table public.practice_items (
  session_id uuid not null references public.practice_sessions (id) on delete cascade,
  position smallint not null check (position > 0),
  question_id uuid not null references public.questions (id),
  primary key (session_id, position),
  unique (session_id, question_id)
);
create index practice_items_question_idx on public.practice_items (question_id);

create table public.practice_answers (
  session_id uuid not null,
  question_id uuid not null,
  value_json jsonb,
  is_correct boolean,
  parts jsonb,
  answered_at timestamptz not null default now(),
  primary key (session_id, question_id),
  foreign key (session_id, question_id) references public.practice_items (session_id, question_id) on delete cascade
);

alter table public.practice_sessions enable row level security;
alter table public.practice_items enable row level security;
alter table public.practice_answers enable row level security;
revoke all on public.practice_sessions, public.practice_items, public.practice_answers from anon, authenticated;
grant all on public.practice_sessions, public.practice_items, public.practice_answers to service_role;

-- ---------------------------------------------------------------------------
-- Mashqni boshlash. Savollar: nashr etilgan, pool = 'practice', tanlangan bo'lim (va qiyinlik);
-- foydalanuvchi avval ko'rmaganlari birinchi navbatda, qolgani tasodifiy.
-- ---------------------------------------------------------------------------
create function public.start_practice(p_block text, p_difficulty text, p_mode text, p_count integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_block smallint;
  v_diff public.difficulty := null;
  v_n integer;
  v_ids uuid[];
  v_session uuid;
  v_deadline timestamptz;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.profiles
     where id = v_uid and btrim(name) <> '' and phone is not null and grade is not null and consent_at is not null
  ) then
    raise exception 'profile_incomplete';
  end if;

  if p_mode not in ('practice', 'timed', 'exam') then
    raise exception 'practice_invalid: rejim noto''g''ri';
  end if;
  if p_count is null or p_count < 1 or p_count > 30 then
    raise exception 'practice_invalid: savollar soni 1..30 bo''lishi kerak';
  end if;
  select id into v_block from public.blocks where code = p_block;
  if v_block is null then
    raise exception 'practice_invalid: noma''lum bo''lim';
  end if;
  if nullif(p_difficulty, '') is not null then
    v_diff := p_difficulty::public.difficulty;
  end if;

  -- Bir sutkadan oshgan tugatilmagan mashqlar o'zi yopiladi; faol mashqlar soni cheklangan.
  update public.practice_sessions s
     set status = 'submitted', submitted_at = now(),
         correct_count = (select count(*) from public.practice_answers a where a.session_id = s.id and a.is_correct is true)
   where s.user_id = v_uid and s.status = 'in_progress' and s.started_at < now() - interval '1 day';
  if (select count(*) from public.practice_sessions where user_id = v_uid and status = 'in_progress') >= 5 then
    raise exception 'too_many_active';
  end if;

  v_ids := array(
    select q.id
      from public.questions q
     where q.status = 'published' and q.pool = 'practice' and q.block_id = v_block
       and (v_diff is null or q.difficulty = v_diff)
     order by exists (
                select 1 from public.practice_answers pa
                  join public.practice_sessions ps on ps.id = pa.session_id
                 where ps.user_id = v_uid and pa.question_id = q.id
              ),
              random()
     limit p_count
  );
  v_n := coalesce(cardinality(v_ids), 0);
  if v_n = 0 then
    raise exception 'no_questions';
  end if;

  v_deadline := case when p_mode = 'practice' then null else now() + make_interval(secs => v_n * 180) end;

  insert into public.practice_sessions (user_id, block_id, difficulty, mode, question_count, deadline_at)
  values (v_uid, v_block, v_diff, p_mode, v_n, v_deadline)
  returning id into v_session;

  insert into public.practice_items (session_id, position, question_id)
  select v_session, t.ord::smallint, t.id from unnest(v_ids) with ordinality as t (id, ord);

  return jsonb_build_object(
    'session_id', v_session, 'mode', p_mode, 'question_count', v_n,
    'deadline_at', v_deadline, 'server_now', now()
  );
end $$;
revoke all on function public.start_practice(text, text, text, integer) from public, anon, authenticated;
grant execute on function public.start_practice(text, text, text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Holat: savollar (kalitsiz), javoblar; kalit/yechim faqat ruxsat etilganda:
-- practice/timed rejimda javob berib tekshirilgan savollar uchun, exam rejimda esa mashq tugagach.
-- ---------------------------------------------------------------------------
create function public.get_practice_state(p_session uuid, p_lang text default 'uz') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  s public.practice_sessions%rowtype;
  v_lang text := case when p_lang in ('ru', 'kaa', 'en') then p_lang else 'uz' end;
  v_items jsonb;
  v_answers jsonb;
begin
  select * into s from public.practice_sessions where id = p_session and user_id = auth.uid();
  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'position', pi.position,
           'question_id', q.id,
           'type', q.type,
           'difficulty', q.difficulty,
           'block_id', q.block_id,
           'topic_id', q.primary_topic_id,
           'stem_md', coalesce(nullif(q.i18n -> v_lang ->> 'stem_md', ''), q.stem_md),
           'payload', coalesce(q.i18n -> v_lang -> 'payload', q.payload)
         ) order by pi.position), '[]'::jsonb)
    into v_items
    from public.practice_items pi
    join public.questions q on q.id = pi.question_id
   where pi.session_id = s.id;

  select coalesce(jsonb_agg(
           jsonb_build_object('question_id', pa.question_id, 'value', pa.value_json)
           || case
                when (s.mode in ('practice', 'timed') and pa.is_correct is not null) or s.status = 'submitted'
                then jsonb_build_object(
                       'is_correct', pa.is_correct,
                       'parts', pa.parts,
                       'correct_answer', k.key_json,
                       'solution_md', coalesce(nullif(q.i18n -> v_lang ->> 'solution_md', ''), q.solution_md),
                       'mistake_note_md', coalesce(nullif(q.i18n -> v_lang ->> 'mistake_note_md', ''), q.mistake_note_md)
                     )
                else '{}'::jsonb
              end
         ), '[]'::jsonb)
    into v_answers
    from public.practice_answers pa
    join public.questions q on q.id = pa.question_id
    left join public.question_keys k on k.question_id = q.id
   where pa.session_id = s.id;

  return jsonb_build_object(
    'session', jsonb_build_object(
      'id', s.id, 'block_id', s.block_id, 'difficulty', s.difficulty, 'mode', s.mode,
      'question_count', s.question_count, 'started_at', s.started_at, 'deadline_at', s.deadline_at,
      'submitted_at', s.submitted_at, 'status', s.status, 'correct_count', s.correct_count,
      'server_now', now()
    ),
    'items', v_items,
    'answers', v_answers
  );
end $$;
revoke all on function public.get_practice_state(uuid, text) from public, anon, authenticated;
grant execute on function public.get_practice_state(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Javobni saqlash (tekshirmaydi). practice/timed rejimda tekshirilgan javob qulflanadi.
-- ---------------------------------------------------------------------------
create function public.save_practice_answer(p_session uuid, p_question uuid, p_value jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s public.practice_sessions%rowtype;
  v_checked boolean;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select * into s from public.practice_sessions where id = p_session and user_id = auth.uid();
  if not found then
    raise exception 'practice_not_found' using errcode = 'P0002';
  end if;
  if s.status <> 'in_progress' then
    raise exception 'practice_closed';
  end if;
  if s.deadline_at is not null and now() > s.deadline_at + interval '5 seconds' then
    raise exception 'practice_closed';
  end if;
  if not exists (select 1 from public.practice_items where session_id = s.id and question_id = p_question) then
    raise exception 'practice_not_found' using errcode = 'P0002';
  end if;

  select is_correct is not null into v_checked from public.practice_answers where session_id = s.id and question_id = p_question;
  if coalesce(v_checked, false) and s.mode in ('practice', 'timed') then
    raise exception 'already_answered';
  end if;

  insert into public.practice_answers (session_id, question_id, value_json, is_correct, parts, answered_at)
  values (s.id, p_question, p_value, null, null, now())
  on conflict (session_id, question_id)
  do update set value_json = excluded.value_json, is_correct = null, parts = null, answered_at = now();

  return jsonb_build_object('ok', true, 'mode', s.mode, 'server_now', now());
end $$;
revoke all on function public.save_practice_answer(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_practice_answer(uuid, uuid, jsonb) to authenticated;

-- Tekshiruv natijasini yozish: faqat server (service_role).
create function public.store_practice_result(p_session uuid, p_question uuid, p_correct boolean, p_parts jsonb default null) returns void
language sql security definer set search_path = public as $$
  update public.practice_answers set is_correct = p_correct, parts = p_parts
   where session_id = p_session and question_id = p_question;
$$;
revoke all on function public.store_practice_result(uuid, uuid, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.store_practice_result(uuid, uuid, boolean, jsonb) to service_role;

-- Tekshirilmagan javoblar (server yakunlashdan oldin tekshiradi): faqat service_role.
create function public.list_ungraded_practice_answers(p_session uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('question_id', question_id, 'value', value_json)), '[]'::jsonb)
    from public.practice_answers
   where session_id = p_session and is_correct is null and value_json is not null;
$$;
revoke all on function public.list_ungraded_practice_answers(uuid) from public, anon, authenticated;
grant execute on function public.list_ungraded_practice_answers(uuid) to service_role;

-- Mashqni yakunlash (hamma javoblar oldin tekshirilgan bo'lishi kerak: server amali shuni ta'minlaydi).
create function public.finish_practice(p_session uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s public.practice_sessions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select * into s from public.practice_sessions where id = p_session and user_id = auth.uid() for update;
  if not found then
    raise exception 'practice_not_found' using errcode = 'P0002';
  end if;

  if s.status = 'in_progress' then
    update public.practice_sessions ps
       set status = 'submitted', submitted_at = now(),
           correct_count = (select count(*) from public.practice_answers a where a.session_id = ps.id and a.is_correct is true)
     where ps.id = s.id
     returning * into s;
  end if;

  return jsonb_build_object(
    'status', s.status, 'correct_count', s.correct_count, 'question_count', s.question_count,
    'answered', (select count(*) from public.practice_answers where session_id = s.id and value_json is not null)
  );
end $$;
revoke all on function public.finish_practice(uuid) from public, anon, authenticated;
grant execute on function public.finish_practice(uuid) to authenticated;

-- Oxirgi mashqlar ro'yxati.
create function public.list_my_practice(p_limit integer default 10) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', s.id, 'block_id', s.block_id, 'difficulty', s.difficulty, 'mode', s.mode,
           'question_count', s.question_count, 'status', s.status, 'correct_count', s.correct_count,
           'started_at', s.started_at, 'submitted_at', s.submitted_at
         ) order by s.started_at desc), '[]'::jsonb)
    from (
      select * from public.practice_sessions where user_id = auth.uid()
       order by started_at desc limit least(greatest(coalesce(p_limit, 10), 1), 50)
    ) s;
$$;
revoke all on function public.list_my_practice(integer) from public, anon, authenticated;
grant execute on function public.list_my_practice(integer) to authenticated;

-- Mashq zaxirasidagi savollar soni (bo'lim va qiyinlik bo'yicha): sozlash ekrani uchun.
create function public.get_practice_pool_stats() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('block_id', t.block_id, 'difficulty', t.difficulty, 'n', t.n)
                            order by t.block_id, t.difficulty), '[]'::jsonb)
    from (
      select block_id, difficulty, count(*)::int as n
        from public.questions
       where status = 'published' and pool = 'practice'
       group by block_id, difficulty
    ) t;
$$;
revoke all on function public.get_practice_pool_stats() from public, anon, authenticated;
grant execute on function public.get_practice_pool_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- Saqlangan savollar: mashqda ko'rilgan (tugatilgan mashqdagi) savollarni ham saqlash va oxirgi javobni ko'rsatish.
-- ---------------------------------------------------------------------------
create or replace function public.toggle_saved_question(p_question_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if exists (select 1 from public.saved_questions where user_id = v_uid and question_id = p_question_id) then
    delete from public.saved_questions where user_id = v_uid and question_id = p_question_id;
    return false;
  end if;

  if not exists (
    select 1
      from public.answers an
      join public.attempts a on a.id = an.attempt_id
     where a.user_id = v_uid and a.status = 'submitted' and an.question_id = p_question_id
  ) and not exists (
    select 1
      from public.practice_answers pa
      join public.practice_sessions ps on ps.id = pa.session_id
     where ps.user_id = v_uid and ps.status = 'submitted' and pa.question_id = p_question_id
  ) then
    raise exception 'question_not_available' using errcode = 'P0002';
  end if;

  if (select count(*) from public.saved_questions where user_id = v_uid) >= 200 then
    raise exception 'saved_limit';
  end if;

  insert into public.saved_questions (user_id, question_id) values (v_uid, p_question_id)
  on conflict do nothing;
  return true;
end $$;

create or replace function public.get_my_saved(p_lang text default 'uz') returns jsonb
language sql stable security definer set search_path = public as $$
  with lang as (select case when p_lang in ('ru', 'kaa', 'en') then p_lang else 'uz' end as l)
  select coalesce(jsonb_agg(row order by saved_at desc), '[]'::jsonb)
    from (
      select s.created_at as saved_at,
             jsonb_build_object(
               'question_id', q.id,
               'block_id', q.block_id,
               'topic_id', q.primary_topic_id,
               'type', q.type,
               'difficulty', q.difficulty,
               'stem_md', coalesce(nullif(q.i18n -> (select l from lang) ->> 'stem_md', ''), q.stem_md),
               'payload', coalesce(q.i18n -> (select l from lang) -> 'payload', q.payload),
               'solution_md', coalesce(nullif(q.i18n -> (select l from lang) ->> 'solution_md', ''), q.solution_md),
               'mistake_note_md', coalesce(nullif(q.i18n -> (select l from lang) ->> 'mistake_note_md', ''), q.mistake_note_md),
               'correct_answer', k.key_json,
               'last_value', last.value_json,
               'last_correct', last.is_correct,
               'saved_at', s.created_at
             ) as row
        from public.saved_questions s
        join public.questions q on q.id = s.question_id
        left join public.question_keys k on k.question_id = q.id
        left join lateral (
          select u.value_json, u.is_correct
            from (
              select an.value_json, an.is_correct, a.submitted_at as at
                from public.answers an
                join public.attempts a on a.id = an.attempt_id
               where a.user_id = s.user_id and a.status = 'submitted' and an.question_id = s.question_id
              union all
              select pa.value_json, pa.is_correct, ps.submitted_at as at
                from public.practice_answers pa
                join public.practice_sessions ps on ps.id = pa.session_id
               where ps.user_id = s.user_id and ps.status = 'submitted' and pa.question_id = s.question_id
            ) u
           order by u.at desc
           limit 1
        ) last on true
       where s.user_id = auth.uid()
       order by s.created_at desc
       limit 200
    ) t;
$$;
