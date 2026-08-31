-- QR Service Forms migration
-- Adds borrowing support, configurable printing pricing, configurable GCash fees,
-- and service QR settings.

-- ============================================================
-- 1. Products: borrowable flag
-- ============================================================
alter table public.products add column if not exists is_borrowable boolean not null default false;
create index if not exists idx_products_is_borrowable on public.products (is_borrowable) where is_active = true;

-- ============================================================
-- 2. Borrowings table
-- ============================================================
create table if not exists public.borrowings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  borrower_name text not null,
  item_id uuid references public.products(id) on delete set null,
  item_name_snapshot text not null,
  quantity integer not null default 1 check (quantity > 0),
  status text not null default 'borrowed' check (status in ('borrowed', 'returned')),
  returned_at timestamptz,
  returned_by uuid,
  admin_notes text
);

alter table public.borrowings add column if not exists created_at timestamptz not null default now();
alter table public.borrowings add column if not exists updated_at timestamptz not null default now();
alter table public.borrowings add column if not exists borrower_name text;
alter table public.borrowings add column if not exists item_id uuid;
alter table public.borrowings add column if not exists item_name_snapshot text;
alter table public.borrowings add column if not exists quantity integer not null default 1;
alter table public.borrowings add column if not exists status text not null default 'borrowed';
alter table public.borrowings add column if not exists returned_at timestamptz;
alter table public.borrowings add column if not exists returned_by uuid;
alter table public.borrowings add column if not exists admin_notes text;

create index if not exists idx_borrowings_created_at on public.borrowings (created_at desc);
create index if not exists idx_borrowings_status on public.borrowings (status);

-- ============================================================
-- 3. Printing pricing snapshot column
-- ============================================================
alter table public.printing_requests add column if not exists pricing_snapshot jsonb;

-- ============================================================
-- 4. GCash reference notes column
-- ============================================================
alter table public.gcash_requests add column if not exists reference_notes text;

-- ============================================================
-- 5. RLS
-- ============================================================
alter table public.borrowings enable row level security;

drop policy if exists "borrowings public insert" on public.borrowings;
create policy "borrowings public insert"
  on public.borrowings
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "borrowings admin all" on public.borrowings;
create policy "borrowings admin all"
  on public.borrowings
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Ensure explicit public insert policies on existing service tables
alter table public.printing_requests enable row level security;
drop policy if exists "printing requests public insert" on public.printing_requests;
create policy "printing requests public insert"
  on public.printing_requests
  for insert
  to anon, authenticated
  with check (true);

alter table public.gcash_requests enable row level security;
drop policy if exists "gcash requests public insert" on public.gcash_requests;
create policy "gcash requests public insert"
  on public.gcash_requests
  for insert
  to anon, authenticated
  with check (true);

-- ============================================================
-- 6. Realtime
-- ============================================================
do $$
declare
  realtime_table_name text;
  realtime_tables text[] := array['borrowings'];
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach realtime_table_name in array realtime_tables loop
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = realtime_table_name
      ) then
        execute format('alter publication supabase_realtime add table public.%I', realtime_table_name);
      end if;
    end loop;
  end if;
end $$;

-- ============================================================
-- 7. App settings seeds (do not overwrite existing values)
-- ============================================================
insert into public.app_settings (key, value) values
  ('print_price_bw', '3'::jsonb),
  ('print_price_color', '5'::jsonb),
  ('print_a4_adjustment', '0'::jsonb),
  ('print_long_adjustment', '0'::jsonb),
  ('print_a3_adjustment', '0'::jsonb),
  ('print_double_sided_adjustment', '0'::jsonb),
  ('gcash_fee_rules', '[{"min_amount":0,"max_amount":999.99,"flat_fee":0,"percentage":3,"min_fee":0,"max_fee":0},{"min_amount":1000,"max_amount":null,"flat_fee":0,"percentage":2,"min_fee":0,"max_fee":0}]'::jsonb),
  ('gcash_account_name', to_jsonb(''::text)),
  ('gcash_account_number', to_jsonb(''::text)),
  ('gcash_qr_url', to_jsonb(''::text)),
  ('site_url', to_jsonb(''::text))
on conflict (key) do nothing;

insert into public.settings_meta (key, section, label, description, input_type, sort_order) values
  ('print_price_bw', 'QR Services', 'B&W print price', 'Base price for black & white printing.', 'number', 10),
  ('print_price_color', 'QR Services', 'Color print price', 'Base price for color printing.', 'number', 20),
  ('print_a4_adjustment', 'QR Services', 'A4 adjustment', 'Price adjustment for A4 paper size (can be negative).', 'number', 30),
  ('print_long_adjustment', 'QR Services', 'Long adjustment', 'Price adjustment for Long paper size.', 'number', 40),
  ('print_a3_adjustment', 'QR Services', 'A3 adjustment', 'Price adjustment for A3 paper size.', 'number', 50),
  ('print_double_sided_adjustment', 'QR Services', 'Double-sided adjustment', 'Price adjustment for double-sided printing.', 'number', 60),
  ('gcash_fee_rules', 'QR Services', 'GCash fee rules', 'JSON array of fee rules. Each rule: min_amount, max_amount, flat_fee, percentage, min_fee, max_fee.', 'json', 70),
  ('gcash_account_name', 'QR Services', 'GCash account name', 'Displayed to customers for Cash In.', 'text', 80),
  ('gcash_account_number', 'QR Services', 'GCash account number', 'Displayed to customers for Cash In.', 'text', 90),
  ('gcash_qr_url', 'QR Services', 'GCash receiving QR URL', 'Image URL of owner GCash receiving QR.', 'text', 95),
  ('site_url', 'QR Services', 'Production site URL', 'Used to generate QR codes. e.g. https://tenpesorun.vercel.app', 'text', 100)
on conflict (key) do nothing;
