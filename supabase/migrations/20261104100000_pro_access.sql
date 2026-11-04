-- Pro huquqi: admin berganda ishtirokchi nashr etilmagan (qoralama) variantlarni ham ochib topshira oladi.
-- Savollar nashr qilinmaydi va muzlatilmaydi: huquq faqat shu foydalanuvchiga tegishli.

-- `authenticated` rolida bu ustunga UPDATE huquqi yo'q (faqat name/phone/grade/consent_at/lang), demak foydalanuvchi o'zi qo'ya olmaydi.
alter table public.profiles add column is_pro boolean not null default false;

create function public.has_pro() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_pro from public.profiles p where p.id = auth.uid()), false);
$$;
revoke all on function public.has_pro() from public, anon, authenticated;
grant execute on function public.has_pro() to authenticated;

-- Mocklarni o'qish: nashr etilganlar hammaga, qoralamalar faqat Pro huquqi borga (arxiv hech kimga).
drop policy exams_published_read on public.exams;
create policy exams_published_read on public.exams for select to authenticated
  using (status = 'published' or (status = 'draft' and public.has_pro()));

drop policy exam_items_published_read on public.exam_items;
create policy exam_items_published_read on public.exam_items for select to authenticated
  using (exists (
    select 1 from public.exams e
     where e.id = exam_id and (e.status = 'published' or (e.status = 'draft' and public.has_pro()))
  ));

-- Urinishni boshlash: Pro huquqi borga qoralama mock ham mumkin.
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
   where e.id = p_exam_id and (e.status = 'published' or (e.status = 'draft' and public.has_pro()));
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

-- Admin ro'yxati: Pro holati ham chiqadi.
create or replace function public.admin_participants(
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
             'created_at', p.created_at, 'consent_at', p.consent_at, 'is_pro', p.is_pro,
             'is_tester', exists (select 1 from auth.users u where u.id = p.id and u.email like '%@tester.invalid'),
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
