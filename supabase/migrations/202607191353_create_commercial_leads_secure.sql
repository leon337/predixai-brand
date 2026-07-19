create extension if not exists pgcrypto;

create table if not exists public.commercial_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null default 'site',
  product_interest text not null check (product_interest in ('atendimento','pet','market','indefinido')),
  person_name text not null check (char_length(person_name) between 2 and 120),
  business_name text not null check (char_length(business_name) between 2 and 160),
  city text not null check (char_length(city) between 2 and 120),
  state char(2) not null check (state ~ '^[A-Z]{2}$'),
  business_segment text not null check (char_length(business_segment) between 2 and 120),
  preferred_contact text not null check (preferred_contact in ('email','whatsapp')),
  contact_value text not null check (char_length(contact_value) between 5 and 180),
  current_tool text check (current_tool is null or char_length(current_tool) <= 180),
  main_problem text not null check (char_length(main_problem) between 2 and 1000),
  desired_result text check (desired_result is null or char_length(desired_result) <= 500),
  commercial_interest text[] not null default '{}',
  acceptable_price_range text check (acceptable_price_range is null or acceptable_price_range in ('ate_49','50_99','100_199','200_399','400_mais','apos_demo')),
  consent_contact boolean not null check (consent_contact = true),
  consent_news boolean not null default false,
  status text not null default 'novo' check (status in ('novo','qualificado','entrevista','demo','piloto','proposta','descartado')),
  metadata jsonb not null default '{}'::jsonb,
  constraint commercial_leads_metadata_object check (jsonb_typeof(metadata) = 'object')
);

alter table public.commercial_leads enable row level security;
alter table public.commercial_leads force row level security;
revoke all on table public.commercial_leads from anon, authenticated;
grant usage on schema public to anon, authenticated;

create index if not exists commercial_leads_created_at_idx on public.commercial_leads (created_at desc);
create index if not exists commercial_leads_product_interest_idx on public.commercial_leads (product_interest);
create index if not exists commercial_leads_status_idx on public.commercial_leads (status);
