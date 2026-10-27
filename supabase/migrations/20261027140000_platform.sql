-- 6: platforma: konsent, tillar (savol tarjimalari), mehmon hisoblar, admin statistikasi, audit, rate limit,
-- xatolar daftari, tab almashtirish logi, nashrda savollarni muzlatish.

-- ---------------------------------------------------------------------------
-- Ustunlar
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column consent_at timestamptz,
  add column lang text check (lang in ('uz', 'ru', 'kaa', 'en'));
grant update (consent_at, lang) on public.profiles to authenticated;

-- i18n: {"ru": {"stem_md":..., "payload":..., "solution_md":..., "mistake_note_md":...}, "kaa": {...}, "en": {...}}
-- Asosiy matn (uz) stem_md/payload da. external_id: qayta yuklashda takrorlanmaslik uchun.
alter table public.questions
  add column i18n jsonb not null default '{}' check (jsonb_typeof(i18n) = 'object'),
  add column external_id text unique;

alter table public.exams
  add column code text unique,
  add column sort smallint not null default 0;

alter table public.attempts
  add column tab_switches integer not null default 0 check (tab_switches >= 0);

-- ---------------------------------------------------------------------------
-- Jadvallar: audit va rate limit
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid references auth.users (id) on delete set null,
  action text not null,
  entity text,
  entity_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);

create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count integer not null
);

alter table public.audit_log enable row level security;
alter table public.rate_limits enable row level security;

revoke all on public.audit_log, public.rate_limits from anon, authenticated;
grant select on public.audit_log to authenticated;
create policy audit_log_staff_read on public.audit_log for select to authenticated using (public.is_staff());
grant all on public.audit_log, public.rate_limits to service_role;

-- ---------------------------------------------------------------------------
-- Mock holati: nashr etilgan/arxivlangan mock qoralamaga qaytmaydi
-- ---------------------------------------------------------------------------
create function public.guard_exam_status() returns trigger
language plpgsql as $$
begin
  if old.status in ('published', 'archived') and new.status = 'draft' then
    raise exception 'exam_status_immutable: nashr etilgan mockni qoralamaga qaytarib bo''lmaydi (arxivlang)';
  end if;
  return new;
end $$;
create trigger exams_status_guard before update on public.exams
  for each row execute function public.guard_exam_status();
revoke all on function public.guard_exam_status() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Nashr: mock nashr etilganda uning qoralama savollari ham muzlatiladi (published)
-- ---------------------------------------------------------------------------
create or replace function public.publish_exam(p_exam_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  ex public.exams%rowtype;
  fmt public.exam_formats%rowtype;
  sec jsonb;
  rec record;
  problems text[] := '{}';
  v_total integer := 0;
  v_from integer;
  v_to integer;
  n integer;
begin
  if auth.uid() is not null and not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into ex from public.exams where id = p_exam_id for update;
  if not found then
    raise exception 'exam_not_found' using errcode = 'P0002';
  end if;
  if ex.status <> 'draft' then
    raise exception 'exam_not_draft';
  end if;
  select * into fmt from public.exam_formats where id = ex.format_id;

  for sec in select * from jsonb_array_elements(fmt.spec -> 'sections') loop
    v_from := (sec ->> 'from')::integer;
    v_to := (sec ->> 'to')::integer;
    v_total := v_total + (v_to - v_from + 1);

    select count(*) into n
      from public.exam_items ei
      join public.questions q on q.id = ei.question_id
     where ei.exam_id = p_exam_id
       and ei.position between v_from and v_to
       and ei.section = (sec ->> 'type')::public.question_type
       and q.type = (sec ->> 'type')::public.question_type;
    if n <> v_to - v_from + 1 then
      problems := problems || format('%s bo''limi (%s-%s): %s ta mos topshiriq, kerak %s',
        sec ->> 'type', v_from, v_to, n, v_to - v_from + 1);
    end if;
  end loop;

  select count(*) into n from public.exam_items where exam_id = p_exam_id;
  if n <> v_total then
    problems := problems || format('jami %s topshiriq, kerak %s', n, v_total);
  end if;

  select count(*) into n
    from public.exam_items ei
    join public.questions q on q.id = ei.question_id
   where ei.exam_id = p_exam_id and q.status = 'archived';
  if n > 0 then
    problems := problems || format('%s ta savol arxivlangan', n);
  end if;

  select count(*) into n
    from public.exam_items ei
   where ei.exam_id = p_exam_id
     and not exists (select 1 from public.question_keys k where k.question_id = ei.question_id);
  if n > 0 then
    problems := problems || format('%s ta savolning kaliti yo''q', n);
  end if;

  for rec in
    select b.code as block, t.qt as qtype,
           coalesce((fmt.spec -> 'blueprint' -> b.code ->> t.qt)::integer, 0) as expected,
           (select count(*)
              from public.exam_items ei
              join public.questions q on q.id = ei.question_id
             where ei.exam_id = p_exam_id
               and q.block_id = b.id
               and q.type = t.qt::public.question_type) as actual
      from public.blocks b
     cross join (values ('y1'), ('y2'), ('o')) as t (qt)
  loop
    if rec.expected <> rec.actual then
      problems := problems || format('%s/%s: %s ta, kerak %s', rec.block, rec.qtype, rec.actual, rec.expected);
    end if;
  end loop;

  if cardinality(problems) > 0 then
    raise exception 'exam_blueprint_invalid: %', array_to_string(problems, '; ');
  end if;

  -- Nashr savollarni o'zgarmas qiladi (guard_published_question shu holatdan keyin ishlaydi).
  update public.questions set status = 'published'
   where id in (select question_id from public.exam_items where exam_id = p_exam_id)
     and status in ('draft', 'review');

  update public.exams set status = 'published', published_at = now() where id = p_exam_id;
end $$;

-- ---------------------------------------------------------------------------
-- start_attempt: konsent ham shart
-- ---------------------------------------------------------------------------
create or replace function public.start_attempt(p_exam_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_minutes integer;
  a public.attempts%rowtype;
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

  select f.duration_min into v_minutes
    from public.exams e
    join public.exam_formats f on f.id = e.format_id
   where e.id = p_exam_id and e.status = 'published';
  if not found then
    raise exception 'exam_not_available' using errcode = 'P0002';
  end if;

  select * into a from public.attempts
   where user_id = v_uid and exam_id = p_exam_id and status = 'in_progress';
  if not found then
    insert into public.attempts (user_id, exam_id, deadline_at)
    values (v_uid, p_exam_id, now() + make_interval(mins => v_minutes))
    on conflict (user_id, exam_id) where status = 'in_progress' do nothing
    returning * into a;
    if not found then
      select * into a from public.attempts
       where user_id = v_uid and exam_id = p_exam_id and status = 'in_progress';
    end if;
  end if;

  return jsonb_build_object(
    'attempt_id', a.id,
    'status', a.status,
    'started_at', a.started_at,
    'deadline_at', a.deadline_at,
    'server_now', now()
  );
end $$;

-- ---------------------------------------------------------------------------
-- get_attempt_state: til bo'yicha matn; topshirilgach to'g'ri javob ham
-- ---------------------------------------------------------------------------
drop function public.get_attempt_state(uuid);

create function public.get_attempt_state(p_attempt_id uuid, p_lang text default 'uz') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  a public.attempts%rowtype;
  v_done boolean;
  v_lang text := case when p_lang in ('ru', 'kaa', 'en') then p_lang else 'uz' end;
begin
  select * into a from public.attempts
   where id = p_attempt_id and user_id = auth.uid();
  if not found then
    raise exception 'attempt_not_found' using errcode = 'P0002';
  end if;
  v_done := a.status = 'submitted';

  return jsonb_build_object(
    'server_now', now(),
    'attempt', jsonb_build_object(
      'id', a.id,
      'exam_id', a.exam_id,
      'status', a.status,
      'started_at', a.started_at,
      'deadline_at', a.deadline_at,
      'submitted_at', a.submitted_at,
      'submit_reason', a.submit_reason,
      'raw_score', a.raw_score,
      'max_raw', a.max_raw,
      'scaled_score', a.scaled_score,
      'level', a.level,
      'scoring_version', a.scoring_version,
      'is_estimate', a.is_estimate
    ),
    'items', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'position', ei.position,
          'section', ei.section,
          'question_id', q.id,
          'type', q.type,
          'block_id', q.block_id,
          'topic_id', q.primary_topic_id,
          'difficulty', q.difficulty,
          'stem_md', coalesce(nullif(q.i18n -> v_lang ->> 'stem_md', ''), q.stem_md),
          'payload', coalesce(q.i18n -> v_lang -> 'payload', q.payload)
        ) || case when v_done then jsonb_build_object(
          'solution_md', coalesce(nullif(q.i18n -> v_lang ->> 'solution_md', ''), q.solution_md),
          'mistake_note_md', coalesce(nullif(q.i18n -> v_lang ->> 'mistake_note_md', ''), q.mistake_note_md),
          'correct_answer', k.key_json
        ) else '{}'::jsonb end
        order by ei.position
      ), '[]'::jsonb)
      from public.exam_items ei
      join public.questions q on q.id = ei.question_id
      left join public.question_keys k on k.question_id = q.id and v_done
      where ei.exam_id = a.exam_id
    ),
    'answers', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'question_id', an.question_id,
          'value', an.value_json,
          'flagged', an.flagged,
          'time_spent_sec', an.time_spent_sec
        ) || case when v_done then jsonb_build_object(
          'is_correct', an.is_correct,
          'score', an.score,
          'max_score', an.max_score,
          'parts', an.score_part
        ) else '{}'::jsonb end
      ), '[]'::jsonb)
      from public.answers an
      where an.attempt_id = a.id
    )
  );
end $$;

-- ---------------------------------------------------------------------------
-- Tab almashtirish logi (faqat hisoblagich; jazo emas)
-- ---------------------------------------------------------------------------
create function public.log_tab_switch(p_attempt_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.attempts set tab_switches = tab_switches + 1
   where id = p_attempt_id and user_id = auth.uid() and status = 'in_progress' and tab_switches < 1000;
end $$;

-- ---------------------------------------------------------------------------
-- Xatolar daftari va mavzu statistikasi (faqat o'z topshirilgan attempt'lari bo'yicha)
-- ---------------------------------------------------------------------------
create function public.get_my_mistakes(p_lang text default 'uz') returns jsonb
language sql stable security definer set search_path = public as $$
  with lang as (select case when p_lang in ('ru', 'kaa', 'en') then p_lang else 'uz' end as l),
  mine as (
    select an.question_id, an.attempt_id, an.value_json, an.is_correct, a.submitted_at,
           row_number() over (partition by an.question_id order by a.submitted_at desc) as rn,
           count(*) filter (where an.is_correct is not true) over (partition by an.question_id) as times_wrong,
           count(*) over (partition by an.question_id) as times_seen
      from public.answers an
      join public.attempts a on a.id = an.attempt_id
     where a.user_id = auth.uid() and a.status = 'submitted' and a.raw_score is not null
  )
  select coalesce(jsonb_agg(row order by submitted_at desc), '[]'::jsonb)
    from (
      select m.submitted_at,
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
               'last_value', m.value_json,
               'last_attempt_id', m.attempt_id,
               'times_wrong', m.times_wrong,
               'times_seen', m.times_seen
             ) as row
        from mine m
        join public.questions q on q.id = m.question_id
        left join public.question_keys k on k.question_id = q.id
       where m.rn = 1 and m.is_correct is not true
       order by m.submitted_at desc
       limit 200
    ) t;
$$;

create function public.get_my_topic_stats() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'topic_id', s.topic_id, 'block_id', s.block_id, 'total', s.total, 'correct', s.correct
         ) order by s.topic_id), '[]'::jsonb)
    from (
      select q.primary_topic_id as topic_id, q.block_id,
             count(*) as total,
             count(*) filter (where an.is_correct) as correct
        from public.answers an
        join public.attempts a on a.id = an.attempt_id
        join public.questions q on q.id = an.question_id
       where a.user_id = auth.uid() and a.status = 'submitted' and a.raw_score is not null
       group by q.primary_topic_id, q.block_id
    ) s;
$$;

-- ---------------------------------------------------------------------------
-- Admin: statistika (faqat staff yoki service_role)
-- ---------------------------------------------------------------------------
create function public._assert_staff() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end $$;

create function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  r jsonb;
begin
  perform public._assert_staff();
  select jsonb_build_object(
    'participants', (select count(*) from public.profiles where role = 'student' and btrim(name) <> ''),
    'attempts_active', (select count(*) from public.attempts where status = 'in_progress'),
    'attempts_submitted', (select count(*) from public.attempts where status = 'submitted'),
    'attempts_24h', (select count(*) from public.attempts where started_at > now() - interval '24 hours'),
    'avg_scaled', (select round(avg(scaled_score)::numeric, 1) from public.attempts where status = 'submitted' and scaled_score is not null),
    'levels', (
      select coalesce(jsonb_object_agg(lvl, c), '{}'::jsonb)
        from (select coalesce(level, 'none') as lvl, count(*) as c
                from public.attempts where status = 'submitted' and scaled_score is not null
               group by coalesce(level, 'none')) t
    ),
    'questions', (
      select jsonb_build_object(
        'total', count(*),
        'published', count(*) filter (where status = 'published'),
        'draft', count(*) filter (where status in ('draft', 'review'))
      ) from public.questions
    ),
    'exams', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', e.id, 'code', e.code, 'title', e.title, 'status', e.status, 'published_at', e.published_at,
        'items', (select count(*) from public.exam_items i where i.exam_id = e.id),
        'attempts', (select count(*) from public.attempts a where a.exam_id = e.id),
        'submitted', (select count(*) from public.attempts a where a.exam_id = e.id and a.status = 'submitted'),
        'avg_scaled', (select round(avg(a.scaled_score)::numeric, 1) from public.attempts a
                        where a.exam_id = e.id and a.status = 'submitted' and a.scaled_score is not null)
      ) order by e.sort, e.created_at), '[]'::jsonb)
      from public.exams e
    )
  ) into r;
  return r;
end $$;

create function public.admin_attempts(
  p_limit integer default 50,
  p_offset integer default 0,
  p_exam uuid default null,
  p_status text default null
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  r jsonb;
begin
  perform public._assert_staff();
  select jsonb_build_object(
    'total', (select count(*) from public.attempts a
               where (p_exam is null or a.exam_id = p_exam) and (p_status is null or a.status::text = p_status)),
    'rows', coalesce(jsonb_agg(row order by started_at desc), '[]'::jsonb)
  ) into r
  from (
    select a.started_at,
           jsonb_build_object(
             'id', a.id, 'exam_id', a.exam_id, 'exam_title', e.title, 'exam_code', e.code,
             'user_id', a.user_id, 'name', p.name, 'phone', p.phone, 'grade', p.grade,
             'status', a.status, 'started_at', a.started_at, 'submitted_at', a.submitted_at,
             'submit_reason', a.submit_reason, 'raw_score', a.raw_score, 'max_raw', a.max_raw,
             'scaled_score', a.scaled_score, 'level', a.level, 'tab_switches', a.tab_switches
           ) as row
      from public.attempts a
      join public.exams e on e.id = a.exam_id
      left join public.profiles p on p.id = a.user_id
     where (p_exam is null or a.exam_id = p_exam) and (p_status is null or a.status::text = p_status)
     order by a.started_at desc
     limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0)
  ) t;
  return r;
end $$;

create function public.admin_participants(
  p_limit integer default 50,
  p_offset integer default 0,
  p_search text default null
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  r jsonb;
  v_q text := nullif(btrim(coalesce(p_search, '')), '');
begin
  perform public._assert_staff();
  select jsonb_build_object(
    'total', (select count(*) from public.profiles p
               where p.role = 'student' and btrim(p.name) <> ''
                 and (v_q is null or p.name ilike '%' || v_q || '%' or p.phone ilike '%' || v_q || '%')),
    'rows', coalesce(jsonb_agg(row order by created_at desc), '[]'::jsonb)
  ) into r
  from (
    select p.created_at,
           jsonb_build_object(
             'id', p.id, 'name', p.name, 'phone', p.phone, 'grade', p.grade, 'lang', p.lang,
             'created_at', p.created_at, 'consent_at', p.consent_at,
             'attempts', (select count(*) from public.attempts a where a.user_id = p.id),
             'best_scaled', (select max(a.scaled_score) from public.attempts a where a.user_id = p.id and a.status = 'submitted'),
             'last_attempt_at', (select max(a.started_at) from public.attempts a where a.user_id = p.id)
           ) as row
      from public.profiles p
     where p.role = 'student' and btrim(p.name) <> ''
       and (v_q is null or p.name ilike '%' || v_q || '%' or p.phone ilike '%' || v_q || '%')
     order by p.created_at desc
     limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0)
  ) t;
  return r;
end $$;

-- Savol bo'yicha haqiqiy natijalar: qiyinlikni kalibrovka qilish uchun
create function public.admin_question_stats(p_exam uuid default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  r jsonb;
begin
  perform public._assert_staff();
  select coalesce(jsonb_agg(jsonb_build_object(
           'question_id', q.id, 'external_id', q.external_id, 'block_id', q.block_id, 'type', q.type,
           'difficulty', q.difficulty, 'position', ei.position,
           'answered', s.answered, 'correct', s.correct
         ) order by ei.position nulls last, q.created_at), '[]'::jsonb)
    into r
    from public.questions q
    left join public.exam_items ei on ei.question_id = q.id and (p_exam is null or ei.exam_id = p_exam)
    left join lateral (
      select count(*) filter (where an.value_json is not null) as answered,
             count(*) filter (where an.is_correct) as correct
        from public.answers an
        join public.attempts a on a.id = an.attempt_id
       where an.question_id = q.id and a.status = 'submitted'
    ) s on true
   where (p_exam is null and q.status = 'published') or (p_exam is not null and ei.exam_id = p_exam);
  return r;
end $$;

-- ---------------------------------------------------------------------------
-- Faqat server (service_role): audit, rate limit, tozalash
-- ---------------------------------------------------------------------------
create function public.log_audit(
  p_actor uuid, p_action text, p_entity text default null, p_entity_id text default null, p_details jsonb default '{}'
) returns void
language sql security definer set search_path = public as $$
  insert into public.audit_log (actor, action, entity, entity_id, details)
  values (p_actor, p_action, p_entity, p_entity_id, coalesce(p_details, '{}'));
$$;

-- true = ruxsat, false = limit oshdi
create function public.rate_limit_hit(p_key text, p_limit integer, p_window_sec integer) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    window_start = case when r.window_start <= now() - make_interval(secs => p_window_sec) then now() else r.window_start end,
    count = case when r.window_start <= now() - make_interval(secs => p_window_sec) then 1 else r.count + 1 end
  returning count into v_count;
  return v_count <= p_limit;
end $$;

-- Tashlab ketilgan mehmon/anonim hisoblar (attempt'siz) va eski rate limit yozuvlari
create function public.cleanup_guest_users(p_older_than interval default interval '7 days') returns integer
language plpgsql security definer set search_path = public, auth as $$
declare
  n integer;
begin
  with d as (
    delete from auth.users u
     where (u.is_anonymous or u.email like '%@guest.invalid')
       and u.created_at < now() - p_older_than
       and not exists (select 1 from public.attempts a where a.user_id = u.id)
    returning 1
  )
  select count(*) into n from d;
  delete from public.rate_limits where window_start < now() - interval '1 day';
  return n;
end $$;

-- Har kuni 03:30 (pg_cron mavjud bo'lsa; bo'lmasa qo'lda chaqirish mumkin)
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('cleanup-guest-users', '30 3 * * *', 'select public.cleanup_guest_users()');
exception when others then
  raise notice 'pg_cron sozlanmadi (%): cleanup_guest_users() ni qo''lda yoki boshqa rejalashtirgich bilan chaqiring', sqlerrm;
end $$;

-- ---------------------------------------------------------------------------
-- Funksiya huquqlari
-- ---------------------------------------------------------------------------
revoke all on function public.publish_exam(uuid) from public, anon, authenticated;
revoke all on function public.start_attempt(uuid) from public, anon, authenticated;
revoke all on function public.get_attempt_state(uuid, text) from public, anon, authenticated;
revoke all on function public.log_tab_switch(uuid) from public, anon, authenticated;
revoke all on function public.get_my_mistakes(text) from public, anon, authenticated;
revoke all on function public.get_my_topic_stats() from public, anon, authenticated;
revoke all on function public._assert_staff() from public, anon, authenticated;
revoke all on function public.admin_overview() from public, anon, authenticated;
revoke all on function public.admin_attempts(integer, integer, uuid, text) from public, anon, authenticated;
revoke all on function public.admin_participants(integer, integer, text) from public, anon, authenticated;
revoke all on function public.admin_question_stats(uuid) from public, anon, authenticated;
revoke all on function public.log_audit(uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.cleanup_guest_users(interval) from public, anon, authenticated;

grant execute on function public.publish_exam(uuid) to authenticated, service_role;
grant execute on function public.start_attempt(uuid) to authenticated;
grant execute on function public.get_attempt_state(uuid, text) to authenticated;
grant execute on function public.log_tab_switch(uuid) to authenticated;
grant execute on function public.get_my_mistakes(text) to authenticated;
grant execute on function public.get_my_topic_stats() to authenticated;
grant execute on function public.admin_overview() to authenticated, service_role;
grant execute on function public.admin_attempts(integer, integer, uuid, text) to authenticated, service_role;
grant execute on function public.admin_participants(integer, integer, text) to authenticated, service_role;
grant execute on function public.admin_question_stats(uuid) to authenticated, service_role;
grant execute on function public.log_audit(uuid, text, text, text, jsonb) to service_role;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
grant execute on function public.cleanup_guest_users(interval) to service_role;
