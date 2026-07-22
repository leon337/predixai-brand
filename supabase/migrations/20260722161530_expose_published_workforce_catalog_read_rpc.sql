create or replace function public.get_published_workforce_catalog(
  p_package_id text,
  p_content_version text
)
returns table (
  package_id text,
  content_version text,
  status text,
  fictional boolean,
  manifest jsonb,
  payload jsonb,
  inventory jsonb,
  checksum_sha256 text,
  source_repository text,
  source_branch text,
  source_commit_sha text,
  source_pr integer,
  published_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p.package_id,
    p.content_version,
    p.status,
    p.fictional,
    p.manifest,
    p.payload,
    p.inventory,
    p.checksum_sha256,
    p.source_repository,
    p.source_branch,
    p.source_commit_sha,
    p.source_pr,
    p.published_at,
    p.updated_at
  from public.workforce_catalog_packages as p
  where p.package_id = btrim(p_package_id)
    and p.content_version = btrim(p_content_version)
    and p.status = 'published'
    and p.fictional is true
  order by p.updated_at desc
  limit 1;
$$;

revoke all on function public.get_published_workforce_catalog(text, text) from public;
grant execute on function public.get_published_workforce_catalog(text, text) to anon, authenticated, service_role;

comment on function public.get_published_workforce_catalog(text, text) is
  'Read-only delivery contract for published fictional Workforce packages. Intended for the Vercel API layer; direct table access remains blocked by RLS.';
