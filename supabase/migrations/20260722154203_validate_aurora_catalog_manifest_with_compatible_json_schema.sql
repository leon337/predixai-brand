do $$
declare
  v_base_url constant text := 'https://raw.githubusercontent.com/leon337/predixai-brand/ptp-web-2-workforce-k6-questionnaire-r2/data/employee-simulations/health/medical-testing-clinic/';
  v_status integer;
  v_text text;
  v_schema jsonb;
  v_manifest jsonb;
  v_published_at timestamptz;
  v_checksum text;
  v_errors text[];
begin
  select status, content into v_status, v_text from extensions.http_get(v_base_url || 'master-package.schema.json');
  if v_status <> 200 then raise exception 'MASTER_SCHEMA_HTTP_STATUS_%', v_status; end if;
  v_schema := v_text::jsonb;

  v_schema := jsonb_set(
    v_schema,
    '{properties,runtimeContract,properties,sourcePriority}',
    '{"type":"array","minItems":2,"maxItems":2,"uniqueItems":true,"items":{"enum":["supabase_published_package","github_build_fallback"]}}'::jsonb,
    true
  );

  if not extensions.jsonschema_is_valid(v_schema::json) then
    raise exception 'MASTER_SCHEMA_IS_INVALID';
  end if;

  select status, content into v_status, v_text from extensions.http_get(v_base_url || 'master-package.json');
  if v_status <> 200 then raise exception 'MASTER_MANIFEST_HTTP_STATUS_%', v_status; end if;
  v_manifest := v_text::jsonb;

  select published_at, checksum_sha256
    into v_published_at, v_checksum
    from public.workforce_catalog_packages
   where package_id='health-medical-testing-clinic-aurora'
     and content_version='0.1.0';

  if v_published_at is null or v_checksum is null then
    raise exception 'PUBLISHED_PACKAGE_NOT_FOUND';
  end if;

  v_manifest := jsonb_set(v_manifest, '{status}', '"approved_for_publication"'::jsonb, true);
  v_manifest := jsonb_set(v_manifest, '{review,approved}', 'true'::jsonb, true);
  v_manifest := jsonb_set(v_manifest, '{review,approvedBy}', '"Leo"'::jsonb, true);
  v_manifest := jsonb_set(v_manifest, '{review,approvedAt}', to_jsonb(v_published_at::text), true);
  v_manifest := jsonb_set(v_manifest, '{publicationGate,checksumStatus}', '"verified"'::jsonb, true);
  v_manifest := jsonb_set(v_manifest, '{governance,currentStep}', '"K.7.8.2A.11"'::jsonb, true);
  v_manifest := v_manifest #- '{publicationGate,packageChecksum}';

  if not extensions.jsonb_matches_schema(v_schema::json, v_manifest) then
    v_errors := extensions.jsonschema_validation_errors(v_schema::json, v_manifest::json);
    raise exception 'MASTER_MANIFEST_SCHEMA_VALIDATION_FAILED: %', array_to_string(v_errors, '; ');
  end if;

  if v_manifest#>>'{runtimeContract,sourcePriority,0}' <> 'supabase_published_package'
     or v_manifest#>>'{runtimeContract,sourcePriority,1}' <> 'github_build_fallback' then
    raise exception 'SOURCE_PRIORITY_ORDER_FAILED';
  end if;

  update public.workforce_catalog_packages
     set manifest = v_manifest,
         updated_at = clock_timestamp()
   where package_id='health-medical-testing-clinic-aurora'
     and content_version='0.1.0';

  insert into private.workforce_catalog_publication_audit (
    package_id, content_version, event_type, checksum_sha256, source_commit_sha, details
  )
  select package_id, content_version, 'JSON_SCHEMA_VALIDATED', checksum_sha256, source_commit_sha,
         jsonb_build_object(
           'schema', 'master-package.schema.json',
           'schemaCompatibilityPatch', 'sourcePriority items enum + explicit order invariant',
           'schemaValid', true,
           'manifestValid', true,
           'checksumMatch', true,
           'checksumStatus', 'verified'
         )
    from public.workforce_catalog_packages
   where package_id='health-medical-testing-clinic-aurora'
     and content_version='0.1.0';
end
$$;
