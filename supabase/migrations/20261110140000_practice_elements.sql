-- Mashq rasmiy mazmun elementlari (2.4, 7.3 ...) bo'yicha: elementning mavzulari (topic_elements) orqali savollar tanlanadi.
-- start_practice p_block ga bo'lim kodi yoki element kodi qabul qiladi. Element statistikasi: get_practice_element_stats.
-- Oldingi migratsiyalar: 20261110120000_practice.sql, 20261110130000_content_elements.sql

alter table public.practice_sessions add column element_code text references public.content_elements (code);

create or replace function public.start_practice(p_block text, p_difficulty text, p_mode text, p_count integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_block smallint;
  v_element text := null;
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
  -- Mashq doirasi: bo'lim kodi ("geometriya") yoki rasmiy mazmun elementi ("2.4")
  if p_block ~ '^[1-7].[1-9]$' then
    select ce.block_id into v_block from public.content_elements ce where ce.code = p_block;
    if v_block is null then
      raise exception 'practice_invalid: noma''lum element';
    end if;
    v_element := p_block;
  else
    select id into v_block from public.blocks where code = p_block;
    if v_block is null then
      raise exception 'practice_invalid: noma''lum bo''lim';
    end if;
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
     where q.status = 'published' and q.pool = 'practice'
       and ((v_element is null and q.block_id = v_block)
            or (v_element is not null and exists (
                  select 1 from public.topic_elements te
                   where te.topic_id = q.primary_topic_id and te.element_code = v_element)))
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

  insert into public.practice_sessions (user_id, block_id, difficulty, mode, question_count, deadline_at, element_code)
  values (v_uid, v_block, v_diff, p_mode, v_n, v_deadline, v_element)
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

create or replace function public.get_practice_state(p_session uuid, p_lang text default 'uz') returns jsonb
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
      'id', s.id, 'block_id', s.block_id, 'element_code', s.element_code, 'difficulty', s.difficulty, 'mode', s.mode,
      'question_count', s.question_count, 'started_at', s.started_at, 'deadline_at', s.deadline_at,
      'submitted_at', s.submitted_at, 'status', s.status, 'correct_count', s.correct_count,
      'server_now', now()
    ),
    'items', v_items,
    'answers', v_answers
  );
end $$;

create or replace function public.list_my_practice(p_limit integer default 10) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', s.id, 'block_id', s.block_id, 'element_code', s.element_code, 'difficulty', s.difficulty, 'mode', s.mode,
           'question_count', s.question_count, 'status', s.status, 'correct_count', s.correct_count,
           'started_at', s.started_at, 'submitted_at', s.submitted_at
         ) order by s.started_at desc), '[]'::jsonb)
    from (
      select * from public.practice_sessions where user_id = auth.uid()
       order by started_at desc limit least(greatest(coalesce(p_limit, 10), 1), 50)
    ) s;
$$;

-- Mashq zaxirasidagi savollar soni element va qiyinlik bo'yicha (savol mavzusi bir necha elementga bog'langan bo'lsa, hammasida sanaladi).
create function public.get_practice_element_stats() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('element_code', t.element_code, 'difficulty', t.difficulty, 'n', t.n)
                            order by t.element_code, t.difficulty), '[]'::jsonb)
    from (
      select te.element_code, q.difficulty, count(distinct q.id)::int as n
        from public.questions q
        join public.topic_elements te on te.topic_id = q.primary_topic_id
       where q.status = 'published' and q.pool = 'practice'
       group by te.element_code, q.difficulty
    ) t;
$$;
revoke all on function public.get_practice_element_stats() from public, anon, authenticated;
grant execute on function public.get_practice_element_stats() to authenticated;
