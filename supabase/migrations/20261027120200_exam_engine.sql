-- 3/4: imtihon dvigateli (taymer DB soatida: now()), nashr tekshiruvi, o'zgarmaslik qoidalari

-- ---------------------------------------------------------------------------
-- O'zgarmaslik: nashr etilgan savol/kalit/mock o'zgarmaydi (yangi versiya yaratiladi).
-- ---------------------------------------------------------------------------
create function public.guard_published_question() returns trigger
language plpgsql as $$
begin
  if old.status = 'published' then
    if new.status not in ('published', 'archived') then
      raise exception 'question_published_immutable: nashr etilgan savolni faqat arxivlash mumkin';
    end if;
    if new.type is distinct from old.type
       or new.block_id is distinct from old.block_id
       or new.primary_topic_id is distinct from old.primary_topic_id
       or new.stem_md is distinct from old.stem_md
       or new.payload is distinct from old.payload
       or new.difficulty is distinct from old.difficulty
       or new.weight is distinct from old.weight then
      raise exception 'question_published_immutable: yangi versiya yarating (supersedes_id)';
    end if;
  end if;
  return new;
end $$;
create trigger questions_guard before update on public.questions
  for each row execute function public.guard_published_question();

create function public.guard_published_key() returns trigger
language plpgsql as $$
declare
  v_status public.question_status;
begin
  select status into v_status from public.questions
   where id = coalesce(new.question_id, old.question_id);
  if v_status = 'published' then
    raise exception 'question_published_immutable: nashr etilgan savol kalitini o''zgartirib bo''lmaydi';
  end if;
  return coalesce(new, old);
end $$;
create trigger question_keys_guard before insert or update or delete on public.question_keys
  for each row execute function public.guard_published_key();

create function public.guard_published_exam_items() returns trigger
language plpgsql as $$
declare
  v_status public.exam_status;
begin
  select status into v_status from public.exams
   where id = coalesce(new.exam_id, old.exam_id);
  if v_status is distinct from 'draft' and v_status is not null then
    raise exception 'exam_published_immutable: nashr etilgan mock tarkibini o''zgartirib bo''lmaydi';
  end if;
  return coalesce(new, old);
end $$;
create trigger exam_items_guard before insert or update or delete on public.exam_items
  for each row execute function public.guard_published_exam_items();

-- ---------------------------------------------------------------------------
-- Nashr: format spetsifikatsiyasiga (bo'limlar diapazoni, blok bo'yicha sonlar) mosligini tekshiradi.
-- ---------------------------------------------------------------------------
create function public.publish_exam(p_exam_id uuid) returns void
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
   where ei.exam_id = p_exam_id and q.status <> 'published';
  if n > 0 then
    problems := problems || format('%s ta savol nashr etilmagan', n);
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

  update public.exams set status = 'published', published_at = now() where id = p_exam_id;
end $$;

-- ---------------------------------------------------------------------------
-- Talaba RPC'lari
-- ---------------------------------------------------------------------------

-- Idempotent: faol attempt bo'lsa o'shani qaytaradi, bo'lmasa deadline = now() + duration_min.
create function public.start_attempt(p_exam_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_minutes integer;
  a public.attempts%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
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

-- p_value: SQL NULL = o'zgartirmaslik, JSON null = javobni tozalash.
create function public.save_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_value jsonb default null,
  p_flagged boolean default null,
  p_time_spent integer default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  a public.attempts%rowtype;
  v_grace integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- for share: close_attempt (for update) tugamaguncha kutadi, shuning uchun yopilgandan keyin yozuv o'tmaydi.
  select * into a from public.attempts
   where id = p_attempt_id and user_id = auth.uid() for share;
  if not found then
    raise exception 'attempt_not_found' using errcode = 'P0002';
  end if;
  if a.status <> 'in_progress' then
    raise exception 'attempt_closed';
  end if;

  select coalesce((f.scoring ->> 'graceSec')::integer, 5) into v_grace
    from public.exams e
    join public.exam_formats f on f.id = e.format_id
   where e.id = a.exam_id;
  if now() > a.deadline_at + make_interval(secs => v_grace) then
    raise exception 'deadline_passed';
  end if;

  if not exists (
    select 1 from public.exam_items where exam_id = a.exam_id and question_id = p_question_id
  ) then
    raise exception 'question_not_in_exam';
  end if;
  if p_value is not null and octet_length(p_value::text) > 2000 then
    raise exception 'value_too_large';
  end if;

  insert into public.answers (attempt_id, question_id, value_json, flagged, time_spent_sec, updated_at)
  values (
    p_attempt_id,
    p_question_id,
    case when p_value = 'null'::jsonb then null else p_value end,
    coalesce(p_flagged, false),
    greatest(coalesce(p_time_spent, 0), 0),
    now()
  )
  on conflict (attempt_id, question_id) do update set
    value_json = case
      when p_value is null then public.answers.value_json
      when p_value = 'null'::jsonb then null
      else p_value
    end,
    flagged = coalesce(p_flagged, public.answers.flagged),
    time_spent_sec = case
      when p_time_spent is null then public.answers.time_spent_sec
      else greatest(p_time_spent, 0)
    end,
    updated_at = now();

  return jsonb_build_object('saved', true, 'server_now', now(), 'deadline_at', a.deadline_at);
end $$;

-- Imtihon ekrani uchun yagona so'rov. Kalit hech qachon qaytmaydi; yechim faqat topshirilgandan keyin.
create function public.get_attempt_state(p_attempt_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  a public.attempts%rowtype;
  v_done boolean;
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
          'stem_md', q.stem_md,
          'payload', q.payload
        ) || case when v_done then jsonb_build_object(
          'solution_md', q.solution_md,
          'mistake_note_md', q.mistake_note_md
        ) else '{}'::jsonb end
        order by ei.position
      ), '[]'::jsonb)
      from public.exam_items ei
      join public.questions q on q.id = ei.question_id
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
-- Faqat server (service_role): yopish va ball yozish.
-- Oqim: close_attempt -> TS javoblar+kalitlarni o'qib hisoblaydi -> store_attempt_score.
-- Yopilgan, lekin ballsiz attempt (raw_score is null) natija sahifasida qayta hisoblanadi.
-- ---------------------------------------------------------------------------

-- p_only_if_expired = true: faqat DB soati bo'yicha muddat o'tgan bo'lsagina yopadi (lazy finalize).
create function public.close_attempt(p_attempt_id uuid, p_only_if_expired boolean default false)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  a public.attempts%rowtype;
  v_expired boolean;
begin
  select * into a from public.attempts where id = p_attempt_id for update;
  if not found then
    raise exception 'attempt_not_found' using errcode = 'P0002';
  end if;

  if a.status = 'in_progress' then
    v_expired := now() > a.deadline_at;
    if v_expired or not p_only_if_expired then
      update public.attempts set
        status = 'submitted',
        submitted_at = case when v_expired then deadline_at else now() end,
        submit_reason = case when v_expired then 'timeout'::public.submit_reason
                             else 'user'::public.submit_reason end
       where id = a.id
      returning * into a;
    end if;
  end if;

  return jsonb_build_object(
    'status', a.status,
    'submitted_at', a.submitted_at,
    'submit_reason', a.submit_reason,
    'scored', a.raw_score is not null,
    'server_now', now()
  );
end $$;

-- p_results: [{question_id, is_correct, score, max_score, parts}]. Idempotent: ikkinchi chaqiruv false qaytaradi.
create function public.store_attempt_score(
  p_attempt_id uuid,
  p_raw numeric,
  p_max numeric,
  p_scaled numeric,
  p_level text,
  p_scoring_version text,
  p_results jsonb
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  a public.attempts%rowtype;
begin
  select * into a from public.attempts where id = p_attempt_id for update;
  if not found then
    raise exception 'attempt_not_found' using errcode = 'P0002';
  end if;
  if a.status <> 'submitted' then
    raise exception 'attempt_not_closed';
  end if;
  if a.raw_score is not null then
    return false;
  end if;

  insert into public.answers (attempt_id, question_id, is_correct, score, max_score, score_part)
  select p_attempt_id,
         (r ->> 'question_id')::uuid,
         (r ->> 'is_correct')::boolean,
         (r ->> 'score')::numeric,
         (r ->> 'max_score')::numeric,
         r -> 'parts'
    from jsonb_array_elements(p_results) as r
   where exists (
     select 1 from public.exam_items ei
      where ei.exam_id = a.exam_id and ei.question_id = (r ->> 'question_id')::uuid
   )
  on conflict (attempt_id, question_id) do update set
    is_correct = excluded.is_correct,
    score = excluded.score,
    max_score = excluded.max_score,
    score_part = excluded.score_part;

  update public.attempts set
    raw_score = p_raw,
    max_raw = p_max,
    scaled_score = p_scaled,
    level = p_level,
    scoring_version = p_scoring_version
   where id = a.id;
  return true;
end $$;

-- ---------------------------------------------------------------------------
-- Funksiya huquqlari
-- ---------------------------------------------------------------------------
revoke all on function public.guard_published_question() from public, anon, authenticated;
revoke all on function public.guard_published_key() from public, anon, authenticated;
revoke all on function public.guard_published_exam_items() from public, anon, authenticated;

revoke all on function public.publish_exam(uuid) from public, anon, authenticated;
revoke all on function public.start_attempt(uuid) from public, anon, authenticated;
revoke all on function public.save_answer(uuid, uuid, jsonb, boolean, integer) from public, anon, authenticated;
revoke all on function public.get_attempt_state(uuid) from public, anon, authenticated;
revoke all on function public.close_attempt(uuid, boolean) from public, anon, authenticated;
revoke all on function public.store_attempt_score(uuid, numeric, numeric, numeric, text, text, jsonb) from public, anon, authenticated;

grant execute on function public.publish_exam(uuid) to authenticated, service_role;
grant execute on function public.start_attempt(uuid) to authenticated;
grant execute on function public.save_answer(uuid, uuid, jsonb, boolean, integer) to authenticated;
grant execute on function public.get_attempt_state(uuid) to authenticated;
grant execute on function public.close_attempt(uuid, boolean) to service_role;
grant execute on function public.store_attempt_score(uuid, numeric, numeric, numeric, text, text, jsonb) to service_role;
