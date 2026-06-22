-- Create inventory and expense tables.

create table if not exists public.inventory_batches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid,
  note text,
  batch_code text not null unique,
  supplier_name text,
  receipt_reference text,
  expiry_date date,
  status text not null default 'active'
);

alter table public.inventory_batches add column if not exists created_at timestamptz not null default now();
alter table public.inventory_batches add column if not exists created_by uuid;
alter table public.inventory_batches add column if not exists note text;
alter table public.inventory_batches add column if not exists batch_code text;
alter table public.inventory_batches add column if not exists supplier_name text;
alter table public.inventory_batches add column if not exists receipt_reference text;
alter table public.inventory_batches add column if not exists expiry_date date;
alter table public.inventory_batches add column if not exists status text not null default 'active';

create table if not exists public.inventory_lots (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.inventory_batches(id) on delete cascade,
  product_id uuid not null references public.products(id),
  created_at timestamptz not null default now(),
  qty_received integer not null,
  qty_remaining integer not null,
  unit_cost_cents integer not null
);

alter table public.inventory_lots add column if not exists batch_id uuid;
alter table public.inventory_lots add column if not exists product_id uuid;
alter table public.inventory_lots add column if not exists created_at timestamptz not null default now();
alter table public.inventory_lots add column if not exists qty_received integer;
alter table public.inventory_lots add column if not exists qty_remaining integer;
alter table public.inventory_lots add column if not exists unit_cost_cents integer;

create table if not exists public.order_item_lot_allocations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  lot_id uuid not null references public.inventory_lots(id),
  qty integer not null,
  unit_cost_cents integer not null
);

alter table public.order_item_lot_allocations add column if not exists created_at timestamptz not null default now();
alter table public.order_item_lot_allocations add column if not exists order_id uuid;
alter table public.order_item_lot_allocations add column if not exists product_id uuid;
alter table public.order_item_lot_allocations add column if not exists lot_id uuid;
alter table public.order_item_lot_allocations add column if not exists qty integer;
alter table public.order_item_lot_allocations add column if not exists unit_cost_cents integer;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc'::text, now()),
  description text not null,
  amount numeric not null,
  category text,
  payment_method text,
  reference_no text,
  batch_id uuid references public.inventory_batches(id) on delete set null
);

alter table public.expenses add column if not exists created_at timestamptz not null default timezone('utc'::text, now());
alter table public.expenses add column if not exists description text;
alter table public.expenses add column if not exists amount numeric;
alter table public.expenses add column if not exists category text;
alter table public.expenses add column if not exists payment_method text;
alter table public.expenses add column if not exists reference_no text;
alter table public.expenses add column if not exists batch_id uuid;

create index if not exists idx_inventory_batches_created_at on public.inventory_batches (created_at desc);
create index if not exists idx_inventory_lots_batch_id on public.inventory_lots (batch_id);
create index if not exists idx_inventory_lots_product_remaining on public.inventory_lots (product_id, qty_remaining, created_at);
create index if not exists idx_order_item_lot_allocations_order_id on public.order_item_lot_allocations (order_id);
create index if not exists idx_order_item_lot_allocations_lot_id on public.order_item_lot_allocations (lot_id);
create index if not exists idx_expenses_created_at on public.expenses (created_at desc);
create index if not exists idx_expenses_batch_id on public.expenses (batch_id);

