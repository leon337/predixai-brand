do $migration$
declare
  v_definition text;
  v_updated text;
begin
  select pg_get_functiondef('public.submit_commercial_lead(jsonb)'::regprocedure) into v_definition;
  v_updated := v_definition;
  v_updated := replace(v_updated,$$if v_source not in ('site','home','atendimento','pet','market','direto')$$,$$if v_source not in ('site','home','workforce','atendimento','pet','market','sob_medida','direto')$$);
  v_updated := replace(v_updated,$$if v_product_interest not in ('atendimento','pet','market','indefinido')$$,$$if v_product_interest not in ('workforce','atendimento','pet','market','sob_medida','indefinido')$$);
  v_updated := replace(v_updated,$$jsonb_array_length(payload->'commercial_interest') > 5$$,$$jsonb_array_length(payload->'commercial_interest') > 6$$);
  v_updated := replace(v_updated,$$where value in ('novidades','entrevista','demonstracao','piloto','proposta')$$,$$where value in ('novidades','entrevista','diagnostico','demonstracao','piloto','proposta')$$);
  if v_updated = v_definition then raise exception 'WORKFORCE_RPC_PATCH_NOT_APPLIED'; end if;
  if position($$'workforce'$$ in v_updated)=0 or position($$'sob_medida'$$ in v_updated)=0 or position($$'diagnostico'$$ in v_updated)=0 then raise exception 'WORKFORCE_RPC_CONTRACT_INCOMPLETE'; end if;
  execute v_updated;
end;
$migration$;
revoke execute on function public.submit_commercial_lead(jsonb) from public;
revoke execute on function public.submit_commercial_lead(jsonb) from authenticated;
grant execute on function public.submit_commercial_lead(jsonb) to anon;
comment on function public.submit_commercial_lead(jsonb) is 'Endpoint público controlado para diagnóstico PredixAI: valida payload, aplica rate limit e permite Workforce, Atendimento, Pet, Market e soluções sob medida sem leitura pública.';
