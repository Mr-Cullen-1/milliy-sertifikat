-- 7: savollarni (va ixtiyoriy mockni) bitta tranzaksiyada yuklash.
-- Kirish JSON'i TypeScript tomonida lib/content/import-schema.ts bilan tekshiriladi; bu funksiya uni bazaga yozadi.
-- external_id bo'yicha mavjud savol qayta yaratilmaydi (idempotent: qayta yuklash xavfsiz).

create function public.import_questions(p_questions jsonb, p_exam jsonb default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  q jsonb;
  v_id uuid;
  v_ids uuid[] := '{}';
  v_created integer := 0;
  v_existing integer := 0;
  v_exam uuid;
  v_format uuid;
  v_block smallint;
  i integer;
begin
  perform public._assert_staff();
  if jsonb_typeof(p_questions) <> 'array' then
    raise exception 'import_invalid: questions massiv bo''lishi kerak';
  end if;

  for q in select * from jsonb_array_elements(p_questions) loop
    v_id := null;
    if q ->> 'external_id' is not null then
      select id into v_id from public.questions where external_id = q ->> 'external_id';
    end if;

    if v_id is null then
      select id into v_block from public.blocks where code = q ->> 'block';
      if v_block is null then
        raise exception 'import_invalid: noma''lum blok "%"', q ->> 'block';
      end if;

      insert into public.questions (
        type, block_id, primary_topic_id, stem_md, payload, difficulty, weight, solution_md, mistake_note_md,
        est_seconds, status, source, external_id, i18n
      ) values (
        (q ->> 'type')::public.question_type,
        v_block,
        (q ->> 'topic')::smallint,
        q ->> 'stem_md',
        q -> 'payload',
        (q ->> 'difficulty')::public.difficulty,
        nullif(q ->> 'weight', '')::numeric,
        q ->> 'solution_md',
        q ->> 'mistake_note_md',
        nullif(q ->> 'est_seconds', '')::integer,
        'draft',
        q ->> 'source',
        q ->> 'external_id',
        coalesce(q -> 'i18n', '{}'::jsonb)
      ) returning id into v_id;

      insert into public.question_keys (question_id, key_json) values (v_id, q -> 'key');

      insert into public.question_topics (question_id, topic_id)
      select v_id, x::smallint
        from jsonb_array_elements_text(coalesce(q -> 'extra_topics', '[]'::jsonb)) as x
      on conflict do nothing;

      v_created := v_created + 1;
    else
      v_existing := v_existing + 1;
    end if;
    v_ids := v_ids || v_id;
  end loop;

  if p_exam is not null then
    select id into v_format from public.exam_formats where code = coalesce(p_exam ->> 'format', 'math-v1');
    if v_format is null then
      raise exception 'import_invalid: format topilmadi';
    end if;

    insert into public.exams (title, format_id, is_free, code, sort)
    values (
      p_exam ->> 'title',
      v_format,
      coalesce((p_exam ->> 'is_free')::boolean, false),
      nullif(p_exam ->> 'code', ''),
      coalesce((p_exam ->> 'sort')::smallint, 0)
    ) returning id into v_exam;

    for i in 1 .. cardinality(v_ids) loop
      insert into public.exam_items (exam_id, position, question_id, section)
      select v_exam, i, v_ids[i], qq.type from public.questions qq where qq.id = v_ids[i];
    end loop;
  end if;

  return jsonb_build_object(
    'question_ids', to_jsonb(v_ids),
    'created', v_created,
    'existing', v_existing,
    'exam_id', v_exam
  );
end $$;

revoke all on function public.import_questions(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.import_questions(jsonb, jsonb) to service_role;
