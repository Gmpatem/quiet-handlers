-- Create offers tables.

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  status text not null default 'draft',
  description text,
  badge_text text,
  is_active boolean not null default false,
  start_at timestamptz,
  end_at timestamptz,
  priority integer not null default 0,
  visibility_scope text not null default 'public',
  is_featured boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  product_badge_text text,
  product_badge_variant text,
  product_badge_priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

alter table public.offers add column if not exists name text;
alter table public.offers add column if not exists type text;
alter table public.offers add column if not exists status text not null default 'draft';
alter table public.offers add column if not exists description text;
alter table public.offers add column if not exists badge_text text;
alter table public.offers add column if not exists is_active boolean not null default false;
alter table public.offers add column if not exists start_at timestamptz;
alter table public.offers add column if not exists end_at timestamptz;
alter table public.offers add column if not exists priority integer not null default 0;
alter table public.offers add column if not exists visibility_scope text not null default 'public';
alter table public.offers add column if not exists is_featured boolean not null default false;
alter table public.offers add column if not exists config jsonb not null default '{}'::jsonb;
alter table public.offers add column if not exists product_badge_text text;
alter table public.offers add column if not exists product_badge_variant text;
alter table public.offers add column if not exists product_badge_priority integer not null default 0;
alter table public.offers add column if not exists created_at timestamptz not null default now();
alter table public.offers add column if not exists updated_at timestamptz not null default now();
alter table public.offers add column if not exists created_by uuid;

create table if not exists public.offer_products (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  qty integer not null default 1,
  special_price_cents integer,
  created_at timestamptz not null default now()
);

alter table public.offer_products add column if not exists offer_id uuid;
alter table public.offer_products add column if not exists product_id uuid;
alter table public.offer_products add column if not exists qty integer not null default 1;
alter table public.offer_products add column if not exists special_price_cents integer;
alter table public.offer_products add column if not exists created_at timestamptz not null default now();

create index if not exists idx_offers_public_active on public.offers (status, is_active, is_featured, priority);
create index if not exists idx_offers_product_badge_priority on public.offers (product_badge_priority desc);
create index if not exists idx_offer_products_offer_id on public.offer_products (offer_id);
create index if not exists idx_offer_products_product_id on public.offer_products (product_id);

