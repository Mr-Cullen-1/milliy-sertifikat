-- 5: ishtirokchi (o'quvchi) ma'lumotlari. Login/email yo'q: o'quvchi anonim sessiya bilan ism, telefon, sinfni kiritadi.
-- Majburiylik DB darajasida ham tekshiriladi: to'liq profilsiz imtihon boshlanmaydi.

alter table public.profiles
  add column phone text check (phone ~ '^\+998[0-9]{9}$'),
  add column grade text check (char_length(grade) between 1 and 20),
  add constraint profiles_name_len check (char_length(name) <= 100);

grant update (phone, grade) on public.profiles to authenticated;

-- 3-migratsiyadagi start_attempt + profil to'liqligi tekshiruvi (imzo bir xil: huquqlar saqlanadi).
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
     where id = v_uid and btrim(name) <> '' and phone is not null and grade is not null
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
