-- Saqlangan savollar: ishtirokchi o'zi topshirgan imtihondagi savolni keyin qayta ko'rish uchun belgilab qo'yadi.
-- Jadvalga to'g'ridan-to'g'ri kirish yo'q: faqat quyidagi funksiyalar orqali (kalit va yechim oldindan ochilib ketmasligi uchun).

create table public.saved_questions (
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, question_id)
);
create index saved_questions_user_idx on public.saved_questions (user_id, created_at desc);

alter table public.saved_questions enable row level security;
revoke all on public.saved_questions from anon, authenticated;
grant all on public.saved_questions to service_role;

-- Saqlash / olib tashlash (almashtiradi). Qaytaradi: yangi holat (true = saqlangan).
-- Faqat o'zi topshirgan urinishda uchragan savolni saqlash mumkin; foydalanuvchi boshiga 200 ta.
create function public.toggle_saved_question(p_question_id uuid) returns boolean
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
revoke all on function public.toggle_saved_question(uuid) from public, anon, authenticated;
grant execute on function public.toggle_saved_question(uuid) to authenticated;

-- Saqlanganlar ro'yxati (xatolar daftari bilan bir xil shakl + oxirgi javob va saqlangan vaqt).
create function public.get_my_saved(p_lang text default 'uz') returns jsonb
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
          select an.value_json, an.is_correct
            from public.answers an
            join public.attempts a on a.id = an.attempt_id
           where a.user_id = s.user_id and a.status = 'submitted' and an.question_id = s.question_id
           order by a.submitted_at desc
           limit 1
        ) last on true
       where s.user_id = auth.uid()
       order by s.created_at desc
       limit 200
    ) t;
$$;
revoke all on function public.get_my_saved(text) from public, anon, authenticated;
grant execute on function public.get_my_saved(text) to authenticated;

-- Saqlangan savol id lari (natija va xatolar sahifalarida belgini ko'rsatish uchun).
create function public.get_my_saved_ids() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(question_id), '[]'::jsonb) from public.saved_questions where user_id = auth.uid();
$$;
revoke all on function public.get_my_saved_ids() from public, anon, authenticated;
grant execute on function public.get_my_saved_ids() to authenticated;
