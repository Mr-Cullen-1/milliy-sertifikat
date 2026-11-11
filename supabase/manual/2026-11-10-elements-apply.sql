-- 2026-11-10 (2-qism) migratsiyalari (2 ta): SQL editorga BUTUNLAY qo'ying va Run bosing.
-- Tartib: avval 2026-11-10-apply.sql (3 ta) qo'llangan bo'lishi kerak. Bu fayl: rasmiy mazmun elementlari (21 ta), yangi mavzular (104-121),
-- mavzu-element bog'lanishi; mashq elementlar bo'yicha (start_practice, get_practice_element_stats).
-- Keyin: supabase/manual/2026-11-10-elements-record-history.sql ni alohida ishga tushiring.

-- ===========================================================================
-- 20261110130000_content_elements.sql
-- ===========================================================================

-- Rasmiy mazmun elementlari (21 ta), yangi mavzular (104+) va mavzu-element bog'lanishi.
-- Avto-generatsiya: pnpm gen:elements (config/elements.ts dan). Qo'lda tahrirlamang.
-- Manba: Matematika fanidan Milliy sertifikat spetsifikatsiyasi (2023), docs/rasmiy-manbalar.md. Moslashtirish taxminiy, mutaxassis tekshiradi.

create table public.content_elements (
  code text primary key,
  block_id smallint not null references public.blocks (id),
  name_uz text not null,
  sort smallint not null
);

create table public.topic_elements (
  topic_id smallint not null references public.topics (id),
  element_code text not null references public.content_elements (code),
  is_primary boolean not null default false,
  primary key (topic_id, element_code)
);
create index topic_elements_element_idx on public.topic_elements (element_code);

alter table public.content_elements enable row level security;
alter table public.topic_elements enable row level security;
revoke all on public.content_elements, public.topic_elements from anon, authenticated;
grant select on public.content_elements, public.topic_elements to authenticated;
grant all on public.content_elements, public.topic_elements to service_role;
create policy content_elements_read on public.content_elements for select to authenticated using (true);
create policy topic_elements_read on public.topic_elements for select to authenticated using (true);

insert into public.content_elements (code, block_id, name_uz, sort) values
  ('1.1', 1, 'Natural sonlar', 1),
  ('1.2', 1, 'Sonlar ustida amallar', 2),
  ('2.1', 2, 'Daraja va ildiz', 3),
  ('2.2', 2, 'Trigonometriya asoslari', 4),
  ('2.3', 2, 'Ko''rsatkichli va logarifmik funksiyalar', 5),
  ('2.4', 2, 'Ifodalarning shaklini almashtirish', 6),
  ('3.1', 3, 'Tenglamalar', 7),
  ('3.2', 3, 'Tengsizliklar', 8),
  ('4.1', 4, 'Funksiyalar', 9),
  ('5.1', 7, 'To''plam, mulohaza va mantiq', 10),
  ('5.2', 7, 'Ma''lumotlar tahlili', 11),
  ('5.3', 7, 'Kombinatorika', 12),
  ('5.4', 7, 'Ehtimol', 13),
  ('5.5', 7, 'Modellashtirish', 14),
  ('6.1', 5, 'Hosila', 15),
  ('6.2', 5, 'Boshlang''ich funksiya va integral', 16),
  ('7.1', 6, 'Shakl o''lchovlari', 17),
  ('7.2', 6, 'Planimetriya', 18),
  ('7.3', 6, 'Fazoda to''g''ri chiziq va tekislik', 19),
  ('7.4', 6, 'Fazoviy jismlar', 20),
  ('7.5', 6, 'Koordinatalar va vektorlar', 21);

-- Yangi mavzular: rasmiy spetsifikatsiyada bor, 103 ishchi mavzuda yo'q (blok = asosiy elementning rasmiy bo'limi)
insert into public.topics (id, block_id, name_uz) values
  (104, 1, 'Kompleks sonlar'),
  (105, 2, 'Masshtab'),
  (106, 2, 'Sonli tengsizliklar va ularni darajaga ko''tarish'),
  (107, 2, 'Burchakning radian o''lchovi; nuqtani burish'),
  (108, 3, 'Ikki o''zgaruvchili tengsizliklar sistemasi'),
  (109, 3, 'Tenglama va tengsizlikni grafik usulda yechish'),
  (110, 5, 'Hosilaning fizik ma''nosi; normal tenglamasi'),
  (111, 7, 'Mantiq: konversiya, inversiya, kontrapozitsiya, predikat, kvantor'),
  (112, 7, 'Standart chetlanish'),
  (113, 7, 'Modellashtirish: chiziqli, kvadratik, ko''rsatkichli va trigonometrik modellar'),
  (114, 6, 'Fales teoremasi'),
  (115, 6, 'Uch perpendikulyar teoremasi; proyeksiyalar'),
  (116, 6, 'Eyler teoremasi; muntazam ko''pyoqlar'),
  (117, 6, 'Shar segmenti, sektori va qatlami'),
  (118, 6, 'Sfera tenglamasi'),
  (119, 6, 'Kollinear va komplanar vektorlar; bazis bo''yicha yoyish'),
  (120, 6, 'Kesmani berilgan nisbatda bo''lish'),
  (121, 4, 'Funksional bog''liqlik: jadval, grafik va formula');

insert into public.topic_elements (topic_id, element_code, is_primary) values
  (1, '1.1', true),
  (2, '1.1', true),
  (3, '1.1', true),
  (4, '1.2', true),
  (5, '1.2', true),
  (6, '1.2', true),
  (7, '2.4', true),
  (8, '2.4', true),
  (9, '1.2', true),
  (10, '1.2', true),
  (11, '1.2', true),
  (12, '2.1', true),
  (13, '2.1', true),
  (14, '2.1', true),
  (15, '2.4', true),
  (16, '2.4', true),
  (17, '2.4', true),
  (18, '2.4', true),
  (19, '2.1', true),
  (20, '2.1', true),
  (21, '2.3', true),
  (22, '2.2', true),
  (23, '2.2', true),
  (24, '2.2', true),
  (25, '2.2', true),
  (26, '2.2', true),
  (27, '2.4', true),
  (28, '3.1', true),
  (28, '3.2', false),
  (29, '3.1', true),
  (30, '3.2', true),
  (31, '3.1', true),
  (32, '3.1', true),
  (32, '3.2', false),
  (33, '3.1', true),
  (33, '3.2', false),
  (34, '3.1', true),
  (34, '3.2', false),
  (35, '3.1', true),
  (36, '3.2', true),
  (37, '3.1', true),
  (37, '3.2', false),
  (38, '3.1', true),
  (38, '3.2', false),
  (39, '3.1', true),
  (40, '3.2', true),
  (41, '3.1', true),
  (42, '2.4', true),
  (43, '4.1', true),
  (44, '4.1', true),
  (45, '4.1', true),
  (46, '4.1', true),
  (47, '4.1', true),
  (48, '4.1', true),
  (49, '4.1', true),
  (50, '4.1', true),
  (50, '2.3', false),
  (51, '4.1', true),
  (51, '2.3', false),
  (52, '4.1', true),
  (52, '2.2', false),
  (53, '4.1', true),
  (54, '4.1', true),
  (55, '4.1', true),
  (56, '2.4', true),
  (57, '2.4', true),
  (58, '2.4', true),
  (59, '4.1', true),
  (60, '6.1', true),
  (61, '6.1', true),
  (62, '6.1', true),
  (63, '6.1', true),
  (64, '6.1', true),
  (65, '6.2', true),
  (66, '6.2', true),
  (67, '7.2', true),
  (68, '7.2', true),
  (69, '7.2', true),
  (70, '7.2', true),
  (71, '7.2', true),
  (72, '7.2', true),
  (73, '7.2', true),
  (73, '7.1', false),
  (74, '7.2', true),
  (75, '7.2', true),
  (76, '7.2', true),
  (77, '7.2', true),
  (78, '7.2', true),
  (78, '7.1', false),
  (79, '7.2', true),
  (80, '7.2', true),
  (81, '7.5', true),
  (82, '7.2', true),
  (83, '7.3', true),
  (84, '7.3', true),
  (84, '7.1', false),
  (85, '7.4', true),
  (86, '7.4', true),
  (87, '7.4', true),
  (88, '7.4', true),
  (89, '7.4', true),
  (90, '7.4', true),
  (91, '7.4', true),
  (92, '7.4', true),
  (93, '7.5', true),
  (94, '5.1', true),
  (95, '5.1', true),
  (96, '5.3', true),
  (97, '5.3', true),
  (98, '5.3', true),
  (99, '5.4', true),
  (100, '5.4', true),
  (101, '5.2', true),
  (102, '5.2', true),
  (103, '5.5', true),
  (104, '1.2', true),
  (105, '2.4', true),
  (106, '2.1', true),
  (107, '2.2', true),
  (108, '3.2', true),
  (109, '3.1', true),
  (109, '3.2', false),
  (110, '6.1', true),
  (111, '5.1', true),
  (112, '5.2', true),
  (113, '5.5', true),
  (114, '7.3', true),
  (115, '7.3', true),
  (116, '7.4', true),
  (117, '7.4', true),
  (118, '7.5', true),
  (119, '7.5', true),
  (120, '7.5', true),
  (121, '4.1', true);

-- ===========================================================================
-- 20261110140000_practice_elements.sql
-- ===========================================================================

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
