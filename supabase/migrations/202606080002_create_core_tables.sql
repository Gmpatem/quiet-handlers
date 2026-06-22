-- Create core commerce, profile, and settings tables.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  is_admin boolean not null default false,
  role text not null default 'user',
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists created_at timestamptz not null default now();

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Other',
  price_cents integer not null,
  cost_cents integer not null default 0,
  stock_qty integer not null default 0,
  is_active boolean not null default true,
  photo_url text,
  badge_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists category text not null default 'Other';
alter table public.products add column if not exists cost_cents integer not null default 0;
alter table public.products add column if not exists stock_qty integer not null default 0;
alter table public.products add column if not exists is_active boolean not null default true;
alter table public.products add column if not exists photo_url text;
alter table public.products add column if not exists badge_text text;
alter table public.products add column if not exists created_at timestamptz not null default now();
alter table public.products add column if not exists updated_at timestamptz not null default now();

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  customer_name text not null,
  contact text not null,
  notes text,
  fulfillment public.fulfillment_type not null,
  pickup_location text,
  delivery_fee_cents integer not null default 0,
  delivery_location text,
  payment_method public.payment_method_type not null,
  subtotal_cents integer not null,
  total_cents integer not null,
  status public.order_status_type not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders add column if not exists order_code text;
alter table public.orders add column if not exists customer_name text;
alter table public.orders add column if not exists contact text;
alter table public.orders add column if not exists notes text;
alter table public.orders add column if not exists fulfillment public.fulfillment_type;
alter table public.orders add column if not exists pickup_location text;
alter table public.orders add column if not exists delivery_fee_cents integer not null default 0;
alter table public.orders add column if not exists delivery_location text;
alter table public.orders add column if not exists payment_method public.payment_method_type;
alter table public.orders add column if not exists subtotal_cents integer;
alter table public.orders add column if not exists total_cents integer;
alter table public.orders add column if not exists status public.order_status_type not null default 'pending';
alter table public.orders add column if not exists created_at timestamptz not null default now();
alter table public.orders add column if not exists updated_at timestamptz not null default now();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  name_snapshot text not null,
  category_snapshot text,
  unit_price_cents integer not null,
  unit_cost_cents integer not null default 0,
  qty integer not null,
  line_total_cents integer not null,
  created_at timestamptz not null default now()
);

alter table public.order_items add column if not exists order_id uuid;
alter table public.order_items add column if not exists product_id uuid;
alter table public.order_items add column if not exists name_snapshot text;
alter table public.order_items add column if not exists category_snapshot text;
alter table public.order_items add column if not exists unit_price_cents integer;
alter table public.order_items add column if not exists unit_cost_cents integer not null default 0;
alter table public.order_items add column if not exists qty integer;
alter table public.order_items add column if not exists line_total_cents integer;
alter table public.order_items add column if not exists created_at timestamptz not null default now();

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method public.payment_method_type not null,
  amount_cents integer not null,
  reference_number text,
  gcash_ref text,
  proof_url text,
  status public.payment_status_type not null default 'pending',
  paid_at timestamptz,
  verified_by uuid,
  balance_due_cents integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.payments add column if not exists order_id uuid;
alter table public.payments add column if not exists method public.payment_method_type;
alter table public.payments add column if not exists amount_cents integer;
alter table public.payments add column if not exists reference_number text;
alter table public.payments add column if not exists gcash_ref text;
alter table public.payments add column if not exists proof_url text;
alter table public.payments add column if not exists status public.payment_status_type not null default 'pending';
alter table public.payments add column if not exists paid_at timestamptz;
alter table public.payments add column if not exists verified_by uuid;
alter table public.payments add column if not exists balance_due_cents integer not null default 0;
alter table public.payments add column if not exists created_at timestamptz not null default now();

create table if not exists public.app_settings (
  key text primary key,
  value jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_settings add column if not exists value jsonb;
alter table public.app_settings add column if not exists updated_at timestamptz not null default now();

create table if not exists public.settings_meta (
  key text primary key references public.app_settings(key) on delete cascade,
  section text not null default 'General',
  label text not null,
  description text,
  input_type text not null default 'text',
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.settings_meta add column if not exists section text not null default 'General';
alter table public.settings_meta add column if not exists label text;
alter table public.settings_meta add column if not exists description text;
alter table public.settings_meta add column if not exists input_type text not null default 'text';
alter table public.settings_meta add column if not exists sort_order integer not null default 100;
alter table public.settings_meta add column if not exists created_at timestamptz not null default now();
alter table public.settings_meta add column if not exists updated_at timestamptz not null default now();

create table if not exists public.featured_products (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

alter table public.featured_products add column if not exists product_id uuid;
alter table public.featured_products add column if not exists sort_order integer not null default 0;
alter table public.featured_products add column if not exists is_active boolean not null default true;

create table if not exists public.order_suggestions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  order_code text,
  customer_name text,
  contact text,
  message text not null,
  source text not null default 'checkout',
  created_at timestamptz not null default now()
);

alter table public.order_suggestions add column if not exists order_id uuid;
alter table public.order_suggestions add column if not exists order_code text;
alter table public.order_suggestions add column if not exists customer_name text;
alter table public.order_suggestions add column if not exists contact text;
alter table public.order_suggestions add column if not exists message text;
alter table public.order_suggestions add column if not exists source text not null default 'checkout';
alter table public.order_suggestions add column if not exists created_at timestamptz not null default now();

create index if not exists idx_products_active_category on public.products (is_active, category);
create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_orders_order_code on public.orders (order_code);
create index if not exists idx_order_items_order_id on public.order_items (order_id);
create index if not exists idx_order_items_product_id on public.order_items (product_id);
create index if not exists idx_payments_order_id on public.payments (order_id);
create index if not exists idx_payments_status on public.payments (status);

