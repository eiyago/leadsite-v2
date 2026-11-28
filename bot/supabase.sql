-- Cole tudo isto no Supabase: menu SQL Editor -> New query -> Run.
-- Cria as tabelas onde o robô espelha os leads (o arquivo local continua sendo a fonte principal).

create table if not exists public.leads (
  id          text primary key,
  nome        text,
  categoria   text,
  cidade      text,
  etapa       text,
  canal       text,
  temp        text,
  rating      numeric,
  reviews     integer,
  link_previa text,
  respondeu   boolean default false,
  dados       jsonb not null,
  atualizado  timestamptz default now()
);
create index if not exists leads_etapa_idx on public.leads (etapa);
create index if not exists leads_atualizado_idx on public.leads (atualizado desc);

create table if not exists public.meta (
  chave      text primary key,
  valor      jsonb,
  atualizado timestamptz default now()
);

-- Segurança: ninguém de fora lê nada; só a chave service_role do robô (que ignora RLS).
alter table public.leads enable row level security;
alter table public.meta  enable row level security;
