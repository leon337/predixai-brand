-- PTP-WEB.2.8.3K — expand-contract comercial K6
-- Mantém submit_commercial_lead(payload) para o fluxo J e adiciona
-- submit_commercial_lead_k6(payload) para o schema 2.0.

alter table public.commercial_leads
  drop constraint if exists commercial_leads_product_interest_check;

alter table public.commercial_leads
  add constraint commercial_leads_product_interest_check
  check (product_interest in ('workforce','atendimento','pet','market','sob_medida','indefinido'));

alter table public.commercial_leads
  add column if not exists schema_version text not null default '1.0',
  add column if not exists submission_attempt_id text,
  add column if not exists idempotency_key text,
  add column if not exists payload_hash text,
  add column if not exists selected_technical_scope text[] not null default '{}',
  add column if not exists readiness_summary jsonb not null default '[]'::jsonb,
  add column if not exists consent_version text,
  add column if not exists privacy_notice_version text;

alter table public.commercial_leads
  drop constraint if exists commercial_leads_readiness_summary_array;

alter table public.commercial_leads
  add constraint commercial_leads_readiness_summary_array
  check (jsonb_typeof(readiness_summary) = 'array');

create unique index if not exists commercial_leads_idempotency_key_unique
  on public.commercial_leads (idempotency_key)
  where idempotency_key is not null;

create or replace function public.submit_commercial_lead_k6(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  v_headers jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  v_fingerprint text;
  v_forwarded_for text;
  v_user_agent text;
  v_attempts integer;
  v_existing public.commercial_leads%rowtype;
  v_id uuid;
  v_unknown_keys jsonb;
  v_source text;
  v_product text;
  v_person text;
  v_business text;
  v_city text;
  v_state text;
  v_segment text;
  v_contact_method text;
  v_contact_value text;
  v_problem text;
  v_result text;
  v_submission_attempt text;
  v_idempotency_key text;
  v_payload_hash text;
  v_scope text[];
  v_readiness jsonb;
  v_consent_version text;
  v_privacy_version text;
  v_interest text[];
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception using errcode='22023', message='INVALID_PAYLOAD';
  end if;

  if octet_length(payload::text) > 20000 then
    raise exception using errcode='22023', message='PAYLOAD_TOO_LARGE';
  end if;

  v_unknown_keys := payload - array[
    'schema_version','submission_attempt_id','idempotency_key','payload_hash',
    'source','product_interest','person_name','business_name','city','state',
    'business_segment','preferred_contact','contact_value','current_tool',
    'main_problem','desired_result','commercial_interest','acceptable_price_range',
    'consent_contact','consent_news','selected_technical_scope','readiness_summary',
    'consent_version','privacy_notice_version','website'
  ]::text[];

  if v_unknown_keys <> '{}'::jsonb then
    raise exception using errcode='22023', message='UNKNOWN_FIELDS';
  end if;

  if coalesce(trim(payload->>'website'),'') <> '' then
    raise exception using errcode='P0001', message='SPAM_DETECTED';
  end if;

  if payload::text ~* '\"(cpf|senha|password|token|cartao|cartão|card_number|bank_account|prontuario|prontuário|health_data|dados_saude)\"\s*:' then
    raise exception using errcode='22023', message='SENSITIVE_FIELD_REJECTED';
  end if;

  if coalesce(payload->>'schema_version','') <> '2.0' then
    raise exception using errcode='22023', message='INVALID_SCHEMA_VERSION';
  end if;

  v_submission_attempt := trim(coalesce(payload->>'submission_attempt_id',''));
  v_idempotency_key := trim(coalesce(payload->>'idempotency_key',''));
  v_payload_hash := lower(trim(coalesce(payload->>'payload_hash','')));

  if char_length(v_submission_attempt) not between 8 and 160 then
    raise exception using errcode='22023', message='INVALID_SUBMISSION_ATTEMPT';
  end if;
  if char_length(v_idempotency_key) not between 8 and 160 then
    raise exception using errcode='22023', message='INVALID_IDEMPOTENCY_KEY';
  end if;
  if v_payload_hash !~ '^[0-9a-f]{8}$' and v_payload_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='22023', message='INVALID_PAYLOAD_HASH';
  end if;

  select * into v_existing
  from public.commercial_leads
  where idempotency_key = v_idempotency_key;

  if found then
    if v_existing.payload_hash is distinct from v_payload_hash then
      raise exception using errcode='P0001', message='IDEMPOTENCY_CONFLICT';
    end if;
    return v_existing.id;
  end if;

  v_source := lower(coalesce(nullif(trim(payload->>'source'),''),'workforce_k6'));
  v_product := lower(coalesce(nullif(trim(payload->>'product_interest'),''),'workforce'));
  v_person := trim(coalesce(payload->>'person_name',''));
  v_business := coalesce(nullif(trim(payload->>'business_name'),''),'Profissional autônomo');
  v_city := trim(coalesce(payload->>'city',''));
  v_state := upper(trim(coalesce(payload->>'state','')));
  v_segment := trim(coalesce(payload->>'business_segment',''));
  v_contact_method := lower(trim(coalesce(payload->>'preferred_contact','')));
  v_contact_value := trim(coalesce(payload->>'contact_value',''));
  v_problem := trim(coalesce(payload->>'main_problem',''));
  v_result := nullif(trim(coalesce(payload->>'desired_result','')),'');
  v_consent_version := coalesce(nullif(trim(payload->>'consent_version'),''),'1.0');
  v_privacy_version := coalesce(nullif(trim(payload->>'privacy_notice_version'),''),'4.0');

  if v_source not in ('workforce_k6','workforce','site','home','direto') then
    raise exception using errcode='22023', message='INVALID_SOURCE';
  end if;
  if v_product <> 'workforce' then
    raise exception using errcode='22023', message='INVALID_PRODUCT';
  end if;
  if char_length(v_person) not between 2 and 120 then
    raise exception using errcode='22023', message='INVALID_PERSON_NAME';
  end if;
  if char_length(v_business) not between 2 and 160 then
    raise exception using errcode='22023', message='INVALID_BUSINESS_NAME';
  end if;
  if char_length(v_city) not between 2 and 120 then
    raise exception using errcode='22023', message='INVALID_CITY';
  end if;
  if v_state !~ '^[A-Z]{2}$' then
    raise exception using errcode='22023', message='INVALID_STATE';
  end if;
  if char_length(v_segment) not between 2 and 120 then
    raise exception using errcode='22023', message='INVALID_SEGMENT';
  end if;
  if v_contact_method not in ('email','whatsapp') then
    raise exception using errcode='22023', message='INVALID_CONTACT_METHOD';
  end if;
  if v_contact_method='email' and v_contact_value !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception using errcode='22023', message='INVALID_EMAIL';
  end if;
  if v_contact_method='whatsapp' and regexp_replace(v_contact_value,'\D','','g') !~ '^\d{10,15}$' then
    raise exception using errcode='22023', message='INVALID_WHATSAPP';
  end if;
  if char_length(v_problem) not between 2 and 1000 then
    raise exception using errcode='22023', message='INVALID_MAIN_PROBLEM';
  end if;
  if coalesce((payload->>'consent_contact')::boolean,false) is not true then
    raise exception using errcode='22023', message='CONSENT_REQUIRED';
  end if;

  if jsonb_typeof(payload->'selected_technical_scope') <> 'array'
     or jsonb_array_length(payload->'selected_technical_scope') not between 1 and 6 then
    raise exception using errcode='22023', message='INVALID_TECHNICAL_SCOPE';
  end if;

  select array_agg(value order by value) into v_scope
  from jsonb_array_elements_text(payload->'selected_technical_scope') as item(value)
  where value in ('channel-integration','agenda-system','request-registration','business-content');

  if coalesce(cardinality(v_scope),0) <> jsonb_array_length(payload->'selected_technical_scope') then
    raise exception using errcode='22023', message='INVALID_TECHNICAL_SCOPE';
  end if;

  v_readiness := coalesce(payload->'readiness_summary','[]'::jsonb);
  if jsonb_typeof(v_readiness) <> 'array' or jsonb_array_length(v_readiness) > 12 then
    raise exception using errcode='22023', message='INVALID_READINESS_SUMMARY';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(v_readiness) item
    where jsonb_typeof(item) <> 'object'
       or item->>'classification' not in (
         'NEEDS_TECHNICAL_EVALUATION',
         'NEEDS_BUSINESS_CONTENT',
         'READY_FOR_MANUAL_TEST'
       )
       or coalesce(item->>'capabilityId','') = ''
  ) then
    raise exception using errcode='22023', message='INVALID_READINESS_SUMMARY';
  end if;

  select array_agg(value order by value) into v_interest
  from jsonb_array_elements_text(coalesce(payload->'commercial_interest','[]'::jsonb)) as item(value)
  where value in ('diagnostico','demonstracao','piloto','proposta','entrevista','novidades');

  if coalesce(cardinality(v_interest),0) < 1 then
    raise exception using errcode='22023', message='INVALID_COMMERCIAL_INTEREST';
  end if;

  v_forwarded_for := split_part(coalesce(
    nullif(v_headers->>'cf-connecting-ip',''),
    nullif(v_headers->>'x-real-ip',''),
    nullif(v_headers->>'x-forwarded-for',''),
    'unknown'
  ),',',1);
  v_user_agent := left(coalesce(v_headers->>'user-agent','unknown'),300);
  v_fingerprint := case
    when coalesce(v_headers->>'x-predixai-fingerprint','') ~ '^[0-9a-f]{64}$'
      then v_headers->>'x-predixai-fingerprint'
    else encode(digest(trim(v_forwarded_for)||'|'||v_user_agent||'|predixai-leads-k6','sha256'),'hex')
  end;

  insert into private.lead_submission_limits as limits
    (fingerprint, window_started_at, attempts, updated_at)
  values (v_fingerprint, now(), 1, now())
  on conflict (fingerprint) do update
  set attempts = case
      when limits.window_started_at < now() - interval '1 hour' then 1
      else limits.attempts + 1
    end,
    window_started_at = case
      when limits.window_started_at < now() - interval '1 hour' then now()
      else limits.window_started_at
    end,
    updated_at = now()
  returning attempts into v_attempts;

  if v_attempts > 5 then
    raise exception using errcode='P0001', message='RATE_LIMIT';
  end if;

  begin
    insert into public.commercial_leads (
      source, product_interest, person_name, business_name, city, state,
      business_segment, preferred_contact, contact_value, current_tool,
      main_problem, desired_result, commercial_interest, acceptable_price_range,
      consent_contact, consent_news, status, metadata,
      schema_version, submission_attempt_id, idempotency_key, payload_hash,
      selected_technical_scope, readiness_summary, consent_version, privacy_notice_version
    ) values (
      v_source, v_product, v_person, v_business, v_city, v_state,
      v_segment, v_contact_method, v_contact_value,
      nullif(trim(coalesce(payload->>'current_tool','')),''),
      v_problem, v_result, v_interest,
      nullif(lower(trim(coalesce(payload->>'acceptable_price_range',''))),''),
      true, coalesce((payload->>'consent_news')::boolean,false), 'novo',
      jsonb_build_object('contract','K6','submission_attempt_id',v_submission_attempt),
      '2.0', v_submission_attempt, v_idempotency_key, v_payload_hash,
      v_scope, v_readiness, v_consent_version, v_privacy_version
    ) returning id into v_id;
  exception when unique_violation then
    select * into v_existing
    from public.commercial_leads
    where idempotency_key = v_idempotency_key;

    if not found or v_existing.payload_hash is distinct from v_payload_hash then
      raise exception using errcode='P0001', message='IDEMPOTENCY_CONFLICT';
    end if;
    return v_existing.id;
  end;

  return v_id;
end;
$$;

revoke all on function public.submit_commercial_lead_k6(jsonb) from public;
revoke all on function public.submit_commercial_lead_k6(jsonb) from authenticated;
grant execute on function public.submit_commercial_lead_k6(jsonb) to anon;

comment on function public.submit_commercial_lead_k6(jsonb)
is 'Contrato comercial K6 com allowlist, rate limit e idempotência durável.';
