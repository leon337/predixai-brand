create table if not exists public.workforce_catalog_packages (
  package_id text not null,
  content_version text not null,
  category_id text not null,
  segment_id text not null,
  subsegment_id text not null,
  status text not null check (status in ('published', 'archived')),
  fictional boolean not null default true check (fictional = true),
  manifest jsonb not null,
  payload jsonb not null,
  inventory jsonb not null,
  checksum_sha256 text not null check (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  source_repository text not null,
  source_branch text not null,
  source_commit_sha text not null,
  source_pr integer,
  approved_by text not null,
  approval_reference text not null,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (package_id, content_version)
);

create index if not exists workforce_catalog_packages_lookup_idx
  on public.workforce_catalog_packages (package_id, status, updated_at desc);

alter table public.workforce_catalog_packages enable row level security;
revoke all on table public.workforce_catalog_packages from anon, authenticated;
grant select on table public.workforce_catalog_packages to service_role;

create table if not exists private.workforce_catalog_publication_audit (
  id uuid primary key default gen_random_uuid(),
  package_id text not null,
  content_version text not null,
  event_type text not null,
  checksum_sha256 text,
  source_commit_sha text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

revoke all on table private.workforce_catalog_publication_audit from anon, authenticated;
grant select on table private.workforce_catalog_publication_audit to service_role;

do $$
declare
  v_base_url constant text := 'https://raw.githubusercontent.com/leon337/predixai-brand/ptp-web-2-workforce-k6-questionnaire-r2/data/employee-simulations/health/medical-testing-clinic/';
  v_repository constant text := 'leon337/predixai-brand';
  v_branch constant text := 'ptp-web-2-workforce-k6-questionnaire-r2';
  v_source_commit constant text := '86a9ce55ec82938fd8c383e6f8227aeb76a06dd9';
  v_source_pr constant integer := 9;
  v_approved_by constant text := 'Leo';
  v_approval_reference constant text := 'APROVO A K.7.8.2A.11 — CONTRATO JSON MESTRE';
  v_status integer;
  v_text text;
  v_master jsonb;
  v_business_profile jsonb;
  v_questionnaire jsonb;
  v_services jsonb;
  v_operations jsonb;
  v_scheduling jsonb;
  v_payments jsonb;
  v_faq jsonb;
  v_handoff jsonb;
  v_scenarios jsonb;
  v_prompt text;
  v_payload jsonb;
  v_document jsonb;
  v_inventory jsonb;
  v_checksum text;
  v_prompt_sections integer;
  v_duplicate_count integer;
  v_service record;
  v_published_at timestamptz := clock_timestamp();
begin
  select status, content into v_status, v_text from extensions.http_get(v_base_url || 'master-package.json');
  if v_status <> 200 then raise exception 'MASTER_PACKAGE_HTTP_STATUS_%', v_status; end if;
  v_master := v_text::jsonb;

  select status, content into v_status, v_text from extensions.http_get(v_base_url || 'business-profile.json');
  if v_status <> 200 then raise exception 'BUSINESS_PROFILE_HTTP_STATUS_%', v_status; end if;
  v_business_profile := v_text::jsonb;

  select status, content into v_status, v_text from extensions.http_get(v_base_url || 'questions-and-suggested-answers.json');
  if v_status <> 200 then raise exception 'QUESTIONNAIRE_HTTP_STATUS_%', v_status; end if;
  v_questionnaire := v_text::jsonb;

  select status, content into v_status, v_text from extensions.http_get(v_base_url || 'services-catalog.json');
  if v_status <> 200 then raise exception 'SERVICES_HTTP_STATUS_%', v_status; end if;
  v_services := v_text::jsonb;

  select status, content into v_status, v_text from extensions.http_get(v_base_url || 'units-hours-channels.json');
  if v_status <> 200 then raise exception 'OPERATIONS_HTTP_STATUS_%', v_status; end if;
  v_operations := v_text::jsonb;

  select status, content into v_status, v_text from extensions.http_get(v_base_url || 'scheduling-cancellations.json');
  if v_status <> 200 then raise exception 'SCHEDULING_HTTP_STATUS_%', v_status; end if;
  v_scheduling := v_text::jsonb;

  select status, content into v_status, v_text from extensions.http_get(v_base_url || 'payments-insurance.json');
  if v_status <> 200 then raise exception 'PAYMENTS_HTTP_STATUS_%', v_status; end if;
  v_payments := v_text::jsonb;

  select status, content into v_status, v_text from extensions.http_get(v_base_url || 'faq.json');
  if v_status <> 200 then raise exception 'FAQ_HTTP_STATUS_%', v_status; end if;
  v_faq := v_text::jsonb;

  select status, content into v_status, v_text from extensions.http_get(v_base_url || 'human-handoff.json');
  if v_status <> 200 then raise exception 'HANDOFF_HTTP_STATUS_%', v_status; end if;
  v_handoff := v_text::jsonb;

  select status, content into v_status, v_text from extensions.http_get(v_base_url || 'scenarios-and-expected-responses.json');
  if v_status <> 200 then raise exception 'SCENARIOS_HTTP_STATUS_%', v_status; end if;
  v_scenarios := v_text::jsonb;

  select status, content into v_status, v_prompt from extensions.http_get(v_base_url || 'operational-prompt.md');
  if v_status <> 200 then raise exception 'PROMPT_HTTP_STATUS_%', v_status; end if;

  if v_master->>'packageId' <> 'health-medical-testing-clinic-aurora' then
    raise exception 'INVALID_PACKAGE_ID';
  end if;

  if jsonb_array_length(v_master->'components') <> 10 then
    raise exception 'INVALID_REQUIRED_COMPONENT_COUNT';
  end if;

  if coalesce((v_business_profile->>'fictional')::boolean, false) is not true
     or coalesce((v_questionnaire->>'fictional')::boolean, false) is not true
     or coalesce((v_services->>'fictional')::boolean, false) is not true
     or coalesce((v_operations->>'fictional')::boolean, false) is not true
     or coalesce((v_scheduling->>'fictional')::boolean, false) is not true
     or coalesce((v_payments->>'fictional')::boolean, false) is not true
     or coalesce((v_faq->>'fictional')::boolean, false) is not true
     or coalesce((v_handoff->>'fictional')::boolean, false) is not true
     or coalesce((v_scenarios->>'fictional')::boolean, false) is not true then
    raise exception 'FICTIONAL_INVARIANT_FAILED';
  end if;

  if v_business_profile->>'profileId' <> 'health-medical-testing-clinic-aurora'
     or v_questionnaire->>'profileId' <> 'health-medical-testing-clinic-aurora'
     or v_services->>'profileId' <> 'health-medical-testing-clinic-aurora'
     or v_operations->>'profileId' <> 'health-medical-testing-clinic-aurora'
     or v_scheduling->>'profileId' <> 'health-medical-testing-clinic-aurora'
     or v_payments->>'profileId' <> 'health-medical-testing-clinic-aurora'
     or v_faq->>'profileId' <> 'health-medical-testing-clinic-aurora'
     or v_handoff->>'profileId' <> 'health-medical-testing-clinic-aurora'
     or v_scenarios->>'profileId' <> 'health-medical-testing-clinic-aurora' then
    raise exception 'PROFILE_ID_ALIGNMENT_FAILED';
  end if;

  if jsonb_array_length(v_services->'categories') <> 4
     or jsonb_array_length(v_services->'services') <> 12
     or jsonb_array_length(v_operations->'units') <> 2
     or jsonb_array_length(v_operations->'channels') <> 4
     or jsonb_array_length(v_faq->'items') <> 24
     or jsonb_array_length(v_handoff->'priorities') <> 4
     or jsonb_array_length(v_handoff->'queues') <> 9
     or jsonb_array_length(v_handoff->'handoffLifecycle') <> 8
     or jsonb_array_length(v_scenarios->'scenarios') <> 24 then
    raise exception 'EXPECTED_INVENTORY_FAILED';
  end if;

  select count(*) - count(distinct item->>'id') into v_duplicate_count
  from jsonb_array_elements(v_services->'services') item;
  if v_duplicate_count <> 0 then raise exception 'DUPLICATE_SERVICE_IDS'; end if;

  select count(*) - count(distinct item->>'id') into v_duplicate_count
  from jsonb_array_elements(v_operations->'units') item;
  if v_duplicate_count <> 0 then raise exception 'DUPLICATE_UNIT_IDS'; end if;

  select count(*) - count(distinct item->>'id') into v_duplicate_count
  from jsonb_array_elements(v_handoff->'queues') item;
  if v_duplicate_count <> 0 then raise exception 'DUPLICATE_QUEUE_IDS'; end if;

  select count(*) into v_prompt_sections
  from regexp_matches(v_prompt, E'(?m)^##\\s+[0-9]+\\.', 'g');
  if v_prompt_sections <> 13 then raise exception 'PROMPT_SECTION_COUNT_%', v_prompt_sections; end if;

  for v_service in select item->>'name' as name from jsonb_array_elements(v_services->'services') item loop
    if position(lower(v_service.name) in lower(v_prompt)) = 0 then
      raise exception 'PROMPT_MISSING_SERVICE_%', v_service.name;
    end if;
  end loop;

  if coalesce((v_master#>>'{safetyInvariants,administrativeOnly}')::boolean, false) is not true
     or coalesce((v_master#>>'{safetyInvariants,realCustomerDataAllowed}')::boolean, true) is not false
     or coalesce((v_master#>>'{safetyInvariants,realPatientDataAllowed}')::boolean, true) is not false
     or coalesce((v_master#>>'{safetyInvariants,realRecordAccessAllowed}')::boolean, true) is not false
     or coalesce((v_master#>>'{safetyInvariants,realBookingAllowed}')::boolean, true) is not false
     or coalesce((v_master#>>'{safetyInvariants,realPaymentAllowed}')::boolean, true) is not false
     or coalesce((v_master#>>'{safetyInvariants,clinicalAdviceAllowed}')::boolean, true) is not false
     or coalesce((v_master#>>'{safetyInvariants,resultInterpretationAllowed}')::boolean, true) is not false
     or coalesce((v_master#>>'{publicationGate,serviceRoleInBrowserAllowed}')::boolean, true) is not false
     or coalesce((v_master#>>'{publicationGate,directBrowserWriteAllowed}')::boolean, true) is not false then
    raise exception 'SAFETY_INVARIANTS_FAILED';
  end if;

  v_inventory := jsonb_build_object(
    'servicesCategories', jsonb_array_length(v_services->'categories'),
    'services', jsonb_array_length(v_services->'services'),
    'units', jsonb_array_length(v_operations->'units'),
    'channels', jsonb_array_length(v_operations->'channels'),
    'faqItems', jsonb_array_length(v_faq->'items'),
    'handoffPriorities', jsonb_array_length(v_handoff->'priorities'),
    'handoffQueues', jsonb_array_length(v_handoff->'queues'),
    'handoffLifecycleStates', jsonb_array_length(v_handoff->'handoffLifecycle'),
    'testScenarios', jsonb_array_length(v_scenarios->'scenarios'),
    'promptSections', v_prompt_sections
  );

  v_payload := jsonb_build_object(
    'businessProfile', v_business_profile,
    'questions', v_questionnaire,
    'services', v_services,
    'operations', v_operations,
    'scheduling', v_scheduling,
    'paymentsAndInsurance', v_payments,
    'faq', v_faq,
    'handoffRules', v_handoff,
    'scenarios', v_scenarios,
    'agentTemplate', jsonb_build_object('promptText', v_prompt)
  );

  v_document := jsonb_build_object(
    'packageId', v_master->>'packageId',
    'contentVersion', v_master->>'contentVersion',
    'source', 'supabase_published_package',
    'status', 'READY',
    'payload', v_payload
  );

  v_checksum := encode(digest(convert_to(v_document::text, 'UTF8'), 'sha256'), 'hex');

  v_master := jsonb_set(v_master, '{status}', '"approved_for_publication"'::jsonb, true);
  v_master := jsonb_set(v_master, '{review,approved}', 'true'::jsonb, true);
  v_master := jsonb_set(v_master, '{review,approvedBy}', to_jsonb(v_approved_by), true);
  v_master := jsonb_set(v_master, '{review,approvedAt}', to_jsonb(v_published_at::text), true);
  v_master := jsonb_set(v_master, '{publicationGate,checksumStatus}', '"generated_step_12"'::jsonb, true);
  v_master := jsonb_set(v_master, '{publicationGate,packageChecksum}', to_jsonb(v_checksum), true);
  v_master := jsonb_set(v_master, '{governance,currentStep}', '"K.7.8.2A.12"'::jsonb, true);

  insert into private.workforce_catalog_publication_audit (
    package_id, content_version, event_type, checksum_sha256, source_commit_sha, details
  )
  select package_id, content_version, 'BEFORE_REPUBLISH', checksum_sha256, source_commit_sha,
         jsonb_build_object('status', status, 'updatedAt', updated_at)
  from public.workforce_catalog_packages
  where package_id = v_master->>'packageId'
    and content_version = v_master->>'contentVersion';

  update public.workforce_catalog_packages
     set status = 'archived', updated_at = v_published_at
   where package_id = v_master->>'packageId'
     and content_version <> v_master->>'contentVersion'
     and status = 'published';

  insert into public.workforce_catalog_packages (
    package_id, content_version, category_id, segment_id, subsegment_id,
    status, fictional, manifest, payload, inventory, checksum_sha256,
    source_repository, source_branch, source_commit_sha, source_pr,
    approved_by, approval_reference, published_at, updated_at
  ) values (
    v_master->>'packageId',
    v_master->>'contentVersion',
    v_master#>>'{segment,categoryId}',
    v_master#>>'{segment,segmentId}',
    v_master#>>'{segment,subsegmentId}',
    'published', true, v_master, v_payload, v_inventory, v_checksum,
    v_repository, v_branch, v_source_commit, v_source_pr,
    v_approved_by, v_approval_reference, v_published_at, v_published_at
  )
  on conflict (package_id, content_version) do update set
    category_id = excluded.category_id,
    segment_id = excluded.segment_id,
    subsegment_id = excluded.subsegment_id,
    status = excluded.status,
    fictional = excluded.fictional,
    manifest = excluded.manifest,
    payload = excluded.payload,
    inventory = excluded.inventory,
    checksum_sha256 = excluded.checksum_sha256,
    source_repository = excluded.source_repository,
    source_branch = excluded.source_branch,
    source_commit_sha = excluded.source_commit_sha,
    source_pr = excluded.source_pr,
    approved_by = excluded.approved_by,
    approval_reference = excluded.approval_reference,
    published_at = excluded.published_at,
    updated_at = excluded.updated_at;

  insert into private.workforce_catalog_publication_audit (
    package_id, content_version, event_type, checksum_sha256, source_commit_sha, details
  ) values (
    v_master->>'packageId', v_master->>'contentVersion', 'PUBLISHED', v_checksum, v_source_commit,
    jsonb_build_object(
      'inventory', v_inventory,
      'sourceBranch', v_branch,
      'sourcePr', v_source_pr,
      'approvalReference', v_approval_reference,
      'directBrowserRead', false,
      'directBrowserWrite', false
    )
  );
end
$$;
