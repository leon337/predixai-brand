do $migration$
declare
  v_definition text;
  v_old text := $old$v_fingerprint := encode(digest(trim(v_forwarded_for) || '|' || v_user_agent || '|predixai-leads-v1', 'sha256'), 'hex');$old$;
  v_new text := $new$v_fingerprint := case
    when coalesce(v_headers->>'x-predixai-fingerprint', '') ~ '^[0-9a-f]{64}$'
      then v_headers->>'x-predixai-fingerprint'
    else encode(digest(trim(v_forwarded_for) || '|' || v_user_agent || '|predixai-leads-v1', 'sha256'), 'hex')
  end;$new$;
begin
  select pg_get_functiondef('public.submit_commercial_lead(jsonb)'::regprocedure)
    into v_definition;

  if position(v_old in v_definition) = 0 then
    raise exception 'FINGERPRINT_ASSIGNMENT_NOT_FOUND';
  end if;

  execute replace(v_definition, v_old, v_new);
end;
$migration$;
