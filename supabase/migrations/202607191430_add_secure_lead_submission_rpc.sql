create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.lead_submission_limits (
  fingerprint text primary key,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  updated_at timestamptz not null default now()
);
revoke all on table private.lead_submission_limits from public, anon, authenticated;

create or replace function public.submit_commercial_lead(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  v_headers jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  v_forwarded_for text;
  v_user_agent text;
  v_fingerprint text;
  v_attempts integer;
  v_id uuid;
  v_source text;
  v_product_interest text;
  v_person_name text;
  v_business_name text;
  v_city text;
  v_state text;
  v_business_segment text;
  v_preferred_contact text;
  v_contact_value text;
  v_current_tool text;
  v_main_problem text;
  v_desired_result text;
  v_acceptable_price_range text;
  v_consent_contact boolean;
  v_consent_news boolean;
  v_commercial_interest text[] := '{}'::text[];
  v_metadata jsonb := '{}'::jsonb;
  v_details jsonb := '{}'::jsonb;
  v_unknown_keys jsonb;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then raise exception using errcode='22023', message='INVALID_PAYLOAD'; end if;
  if octet_length(payload::text) > 16000 then raise exception using errcode='22023', message='PAYLOAD_TOO_LARGE'; end if;

  v_unknown_keys := payload - array[
    'source','product_interest','person_name','business_name','city','state',
    'business_segment','preferred_contact','contact_value','current_tool',
    'main_problem','desired_result','commercial_interest','acceptable_price_range',
    'consent_contact','consent_news','details','utm_source','utm_medium',
    'utm_campaign','utm_content','utm_term','website'
  ]::text[];
  if v_unknown_keys <> '{}'::jsonb then raise exception using errcode='22023', message='UNKNOWN_FIELDS'; end if;
  if coalesce(trim(payload->>'website'), '') <> '' then raise exception using errcode='P0001', message='SPAM_DETECTED'; end if;
  if payload::text ~* '"(cpf|senha|password|token|cartao|cartão|card_number|bank_account|prontuario|prontuário|health_data|dados_saude)"\s*:' then raise exception using errcode='22023', message='SENSITIVE_FIELD_REJECTED'; end if;

  v_source := lower(coalesce(nullif(trim(payload->>'source'), ''), 'site'));
  v_product_interest := lower(coalesce(nullif(trim(payload->>'product_interest'), ''), 'indefinido'));
  v_person_name := trim(coalesce(payload->>'person_name', ''));
  v_business_name := trim(coalesce(payload->>'business_name', ''));
  v_city := trim(coalesce(payload->>'city', ''));
  v_state := upper(trim(coalesce(payload->>'state', '')));
  v_business_segment := trim(coalesce(payload->>'business_segment', ''));
  v_preferred_contact := lower(trim(coalesce(payload->>'preferred_contact', '')));
  v_contact_value := trim(coalesce(payload->>'contact_value', ''));
  v_current_tool := nullif(trim(coalesce(payload->>'current_tool', '')), '');
  v_main_problem := trim(coalesce(payload->>'main_problem', ''));
  v_desired_result := nullif(trim(coalesce(payload->>'desired_result', '')), '');
  v_acceptable_price_range := nullif(lower(trim(coalesce(payload->>'acceptable_price_range', ''))), '');
  v_consent_contact := coalesce((payload->>'consent_contact')::boolean, false);
  v_consent_news := coalesce((payload->>'consent_news')::boolean, false);

  if v_source not in ('site','home','atendimento','pet','market','direto') then raise exception using errcode='22023', message='INVALID_SOURCE'; end if;
  if v_product_interest not in ('atendimento','pet','market','indefinido') then raise exception using errcode='22023', message='INVALID_PRODUCT'; end if;
  if char_length(v_person_name) not between 2 and 120 then raise exception using errcode='22023', message='INVALID_PERSON_NAME'; end if;
  if char_length(v_business_name) not between 2 and 160 then raise exception using errcode='22023', message='INVALID_BUSINESS_NAME'; end if;
  if char_length(v_city) not between 2 and 120 then raise exception using errcode='22023', message='INVALID_CITY'; end if;
  if v_state !~ '^[A-Z]{2}$' then raise exception using errcode='22023', message='INVALID_STATE'; end if;
  if char_length(v_business_segment) not between 2 and 120 then raise exception using errcode='22023', message='INVALID_SEGMENT'; end if;
  if v_preferred_contact not in ('email','whatsapp') then raise exception using errcode='22023', message='INVALID_CONTACT_METHOD'; end if;
  if v_preferred_contact='email' and v_contact_value !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then raise exception using errcode='22023', message='INVALID_EMAIL'; end if;
  if v_preferred_contact='whatsapp' and regexp_replace(v_contact_value, '\D', '', 'g') !~ '^\d{10,15}$' then raise exception using errcode='22023', message='INVALID_WHATSAPP'; end if;
  if v_current_tool is not null and char_length(v_current_tool) > 180 then raise exception using errcode='22023', message='INVALID_CURRENT_TOOL'; end if;
  if char_length(v_main_problem) not between 2 and 1000 then raise exception using errcode='22023', message='INVALID_MAIN_PROBLEM'; end if;
  if v_desired_result is not null and char_length(v_desired_result) > 500 then raise exception using errcode='22023', message='INVALID_DESIRED_RESULT'; end if;
  if v_acceptable_price_range is not null and v_acceptable_price_range not in ('ate_49','50_99','100_199','200_399','400_mais','apos_demo') then raise exception using errcode='22023', message='INVALID_PRICE_RANGE'; end if;
  if not v_consent_contact then raise exception using errcode='22023', message='CONSENT_REQUIRED'; end if;

  if payload ? 'commercial_interest' then
    if jsonb_typeof(payload->'commercial_interest') <> 'array' or jsonb_array_length(payload->'commercial_interest') > 5 then raise exception using errcode='22023', message='INVALID_COMMERCIAL_INTEREST'; end if;
    select coalesce(array_agg(value order by value), '{}'::text[])
      into v_commercial_interest
      from jsonb_array_elements_text(payload->'commercial_interest') item(value)
      where value in ('novidades','entrevista','demonstracao','piloto','proposta');
    if cardinality(v_commercial_interest) <> jsonb_array_length(payload->'commercial_interest') then raise exception using errcode='22023', message='INVALID_COMMERCIAL_INTEREST'; end if;
  end if;

  if payload ? 'details' then
    if jsonb_typeof(payload->'details') <> 'object' or octet_length((payload->'details')::text) > 4000 then raise exception using errcode='22023', message='INVALID_DETAILS'; end if;
    v_details := payload->'details';
  end if;

  v_metadata := jsonb_strip_nulls(jsonb_build_object(
    'utm_source', nullif(trim(payload->>'utm_source'), ''),
    'utm_medium', nullif(trim(payload->>'utm_medium'), ''),
    'utm_campaign', nullif(trim(payload->>'utm_campaign'), ''),
    'utm_content', nullif(trim(payload->>'utm_content'), ''),
    'utm_term', nullif(trim(payload->>'utm_term'), ''),
    'details', v_details
  ));
  if octet_length(v_metadata::text) > 6000 then raise exception using errcode='22023', message='INVALID_METADATA'; end if;

  v_forwarded_for := split_part(coalesce(nullif(v_headers->>'cf-connecting-ip',''), nullif(v_headers->>'x-real-ip',''), nullif(v_headers->>'x-forwarded-for',''), 'unknown'), ',', 1);
  v_user_agent := left(coalesce(v_headers->>'user-agent','unknown'), 300);
  v_fingerprint := encode(digest(trim(v_forwarded_for) || '|' || v_user_agent || '|predixai-leads-v1', 'sha256'), 'hex');

  insert into private.lead_submission_limits as limits (fingerprint, window_started_at, attempts, updated_at)
  values (v_fingerprint, now(), 1, now())
  on conflict (fingerprint) do update
  set attempts = case when limits.window_started_at < now() - interval '1 hour' then 1 else limits.attempts + 1 end,
      window_started_at = case when limits.window_started_at < now() - interval '1 hour' then now() else limits.window_started_at end,
      updated_at = now()
  returning attempts into v_attempts;
  if v_attempts > 5 then raise exception using errcode='P0001', message='RATE_LIMIT'; end if;

  insert into public.commercial_leads (
    source, product_interest, person_name, business_name, city, state,
    business_segment, preferred_contact, contact_value, current_tool,
    main_problem, desired_result, commercial_interest, acceptable_price_range,
    consent_contact, consent_news, status, metadata
  ) values (
    v_source, v_product_interest, v_person_name, v_business_name, v_city, v_state,
    v_business_segment, v_preferred_contact, v_contact_value, v_current_tool,
    v_main_problem, v_desired_result, v_commercial_interest, v_acceptable_price_range,
    v_consent_contact, v_consent_news, 'novo', v_metadata
  ) returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_commercial_lead(jsonb) from public;
grant execute on function public.submit_commercial_lead(jsonb) to anon;
comment on function public.submit_commercial_lead(jsonb) is 'Endpoint RPC de inserção validada, limitada e sem leitura pública para o formulário PredixAI BR.';
