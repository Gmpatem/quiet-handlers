-- Create delivery, printing, and GCash service request tables.

create table if not exists public.delivery_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value text,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  updated_by uuid
);

alter table public.delivery_settings add column if not exists setting_key text;
alter table public.delivery_settings add column if not exists setting_value text;
alter table public.delivery_settings add column if not exists updated_at timestamptz not null default timezone('utc'::text, now());
alter table public.delivery_settings add column if not exists updated_by uuid;

create table if not exists public.delivery_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc'::text, now()),
  student_name text not null,
  student_contact text not null,
  item_description text not null,
  store_location text,
  notes text,
  payment_method text not null,
  delivery_fee numeric not null,
  estimated_item_cost numeric,
  total_cost numeric,
  payment_proof_url text,
  status text not null default 'pending',
  payment_status text not null default 'unpaid',
  completed_at timestamptz,
  completed_by uuid,
  admin_notes text
);

alter table public.delivery_requests add column if not exists created_at timestamptz not null default timezone('utc'::text, now());
alter table public.delivery_requests add column if not exists student_name text;
alter table public.delivery_requests add column if not exists student_contact text;
alter table public.delivery_requests add column if not exists item_description text;
alter table public.delivery_requests add column if not exists store_location text;
alter table public.delivery_requests add column if not exists notes text;
alter table public.delivery_requests add column if not exists payment_method text;
alter table public.delivery_requests add column if not exists delivery_fee numeric;
alter table public.delivery_requests add column if not exists estimated_item_cost numeric;
alter table public.delivery_requests add column if not exists total_cost numeric;
alter table public.delivery_requests add column if not exists payment_proof_url text;
alter table public.delivery_requests add column if not exists status text not null default 'pending';
alter table public.delivery_requests add column if not exists payment_status text not null default 'unpaid';
alter table public.delivery_requests add column if not exists completed_at timestamptz;
alter table public.delivery_requests add column if not exists completed_by uuid;
alter table public.delivery_requests add column if not exists admin_notes text;

create table if not exists public.printing_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  student_name text not null,
  service_type text not null,
  pdf_url text,
  color_type text,
  paper_size text,
  pages integer not null,
  copies integer not null default 1,
  sided text,
  binding boolean not null default false,
  special_instructions text,
  payment_method text not null,
  payment_proof_url text,
  total_amount numeric not null,
  payment_status text not null default 'unpaid',
  status text not null default 'pending',
  admin_notes text
);

alter table public.printing_requests add column if not exists created_at timestamptz not null default now();
alter table public.printing_requests add column if not exists updated_at timestamptz not null default now();
alter table public.printing_requests add column if not exists student_name text;
alter table public.printing_requests add column if not exists service_type text;
alter table public.printing_requests add column if not exists pdf_url text;
alter table public.printing_requests add column if not exists color_type text;
alter table public.printing_requests add column if not exists paper_size text;
alter table public.printing_requests add column if not exists pages integer;
alter table public.printing_requests add column if not exists copies integer not null default 1;
alter table public.printing_requests add column if not exists sided text;
alter table public.printing_requests add column if not exists binding boolean not null default false;
alter table public.printing_requests add column if not exists special_instructions text;
alter table public.printing_requests add column if not exists payment_method text;
alter table public.printing_requests add column if not exists payment_proof_url text;
alter table public.printing_requests add column if not exists total_amount numeric;
alter table public.printing_requests add column if not exists payment_status text not null default 'unpaid';
alter table public.printing_requests add column if not exists status text not null default 'pending';
alter table public.printing_requests add column if not exists admin_notes text;

create table if not exists public.gcash_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  student_name text not null,
  student_contact text not null,
  transaction_type text not null,
  amount numeric not null,
  service_fee numeric not null,
  total_amount numeric not null,
  payment_proof_url text,
  status text not null default 'pending',
  admin_notes text
);

alter table public.gcash_requests add column if not exists created_at timestamptz not null default now();
alter table public.gcash_requests add column if not exists updated_at timestamptz not null default now();
alter table public.gcash_requests add column if not exists student_name text;
alter table public.gcash_requests add column if not exists student_contact text;
alter table public.gcash_requests add column if not exists transaction_type text;
alter table public.gcash_requests add column if not exists amount numeric;
alter table public.gcash_requests add column if not exists service_fee numeric;
alter table public.gcash_requests add column if not exists total_amount numeric;
alter table public.gcash_requests add column if not exists payment_proof_url text;
alter table public.gcash_requests add column if not exists status text not null default 'pending';
alter table public.gcash_requests add column if not exists admin_notes text;

create table if not exists public.gcash_transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc'::text, now()),
  transaction_type text not null,
  requested_amount numeric not null,
  service_fee numeric not null,
  total_amount numeric not null,
  status text not null default 'pending',
  completed_at timestamptz,
  completed_by uuid,
  student_name text,
  student_contact text,
  payment_proof_url text,
  notes text
);

alter table public.gcash_transactions add column if not exists created_at timestamptz not null default timezone('utc'::text, now());
alter table public.gcash_transactions add column if not exists transaction_type text;
alter table public.gcash_transactions add column if not exists requested_amount numeric;
alter table public.gcash_transactions add column if not exists service_fee numeric;
alter table public.gcash_transactions add column if not exists total_amount numeric;
alter table public.gcash_transactions add column if not exists status text not null default 'pending';
alter table public.gcash_transactions add column if not exists completed_at timestamptz;
alter table public.gcash_transactions add column if not exists completed_by uuid;
alter table public.gcash_transactions add column if not exists student_name text;
alter table public.gcash_transactions add column if not exists student_contact text;
alter table public.gcash_transactions add column if not exists payment_proof_url text;
alter table public.gcash_transactions add column if not exists notes text;

create index if not exists idx_delivery_requests_created_at on public.delivery_requests (created_at desc);
create index if not exists idx_delivery_requests_status on public.delivery_requests (status);
create index if not exists idx_printing_requests_created_at on public.printing_requests (created_at desc);
create index if not exists idx_printing_requests_status on public.printing_requests (status);
create index if not exists idx_gcash_requests_created_at on public.gcash_requests (created_at desc);
create index if not exists idx_gcash_requests_status on public.gcash_requests (status);
create index if not exists idx_gcash_transactions_created_at on public.gcash_transactions (created_at desc);

