-- Enable RLS and create policies for app access patterns.

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.app_settings enable row level security;
alter table public.settings_meta enable row level security;
alter table public.featured_products enable row level security;
alter table public.order_suggestions enable row level security;
alter table public.inventory_batches enable row level security;
alter table public.inventory_lots enable row level security;
alter table public.order_item_lot_allocations enable row level security;
alter table public.expenses enable row level security;
alter table public.delivery_settings enable row level security;
alter table public.delivery_requests enable row level security;
alter table public.printing_requests enable row level security;
alter table public.gcash_requests enable row level security;
alter table public.gcash_transactions enable row level security;
alter table public.offers enable row level security;
alter table public.offer_products enable row level security;

drop policy if exists "profiles select own or admin" on public.profiles;
create policy "profiles select own or admin"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()) or public.is_admin());

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own"
on public.profiles
for insert
to authenticated
with check (id = (select auth.uid()));

drop policy if exists "profiles admin all" on public.profiles;
create policy "profiles admin all"
on public.profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "products public read active" on public.products;
create policy "products public read active"
on public.products
for select
to anon, authenticated
using (is_active = true or public.is_admin());

drop policy if exists "products admin all" on public.products;
create policy "products admin all"
on public.products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "offers public read active" on public.offers;
create policy "offers public read active"
on public.offers
for select
to anon, authenticated
using ((status = 'active' and is_active = true) or public.is_admin());

drop policy if exists "offers admin all" on public.offers;
create policy "offers admin all"
on public.offers
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "offer products public read active offers" on public.offer_products;
create policy "offer products public read active offers"
on public.offer_products
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.offers o
    where o.id = offer_id
      and ((o.status = 'active' and o.is_active = true) or public.is_admin())
  )
);

drop policy if exists "offer products admin all" on public.offer_products;
create policy "offer products admin all"
on public.offer_products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "app settings public read" on public.app_settings;
create policy "app settings public read"
on public.app_settings
for select
to anon, authenticated
using (true);

drop policy if exists "app settings admin all" on public.app_settings;
create policy "app settings admin all"
on public.app_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "settings meta admin read" on public.settings_meta;
create policy "settings meta admin read"
on public.settings_meta
for select
to authenticated
using (public.is_admin());

drop policy if exists "settings meta admin all" on public.settings_meta;
create policy "settings meta admin all"
on public.settings_meta
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "orders public insert" on public.orders;
create policy "orders public insert"
on public.orders
for insert
to anon, authenticated
with check (true);

drop policy if exists "orders public read" on public.orders;
create policy "orders public read"
on public.orders
for select
to anon, authenticated
using (true);

drop policy if exists "orders admin update delete" on public.orders;
create policy "orders admin update delete"
on public.orders
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "order items public insert" on public.order_items;
create policy "order items public insert"
on public.order_items
for insert
to anon, authenticated
with check (true);

drop policy if exists "order items public read" on public.order_items;
create policy "order items public read"
on public.order_items
for select
to anon, authenticated
using (true);

drop policy if exists "order items admin all" on public.order_items;
create policy "order items admin all"
on public.order_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "payments public insert" on public.payments;
create policy "payments public insert"
on public.payments
for insert
to anon, authenticated
with check (true);

drop policy if exists "payments public read" on public.payments;
create policy "payments public read"
on public.payments
for select
to anon, authenticated
using (true);

drop policy if exists "payments admin all" on public.payments;
create policy "payments admin all"
on public.payments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "order suggestions public insert" on public.order_suggestions;
create policy "order suggestions public insert"
on public.order_suggestions
for insert
to anon, authenticated
with check (true);

drop policy if exists "order suggestions admin all" on public.order_suggestions;
create policy "order suggestions admin all"
on public.order_suggestions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "featured products public read" on public.featured_products;
create policy "featured products public read"
on public.featured_products
for select
to anon, authenticated
using (is_active = true or public.is_admin());

drop policy if exists "featured products admin all" on public.featured_products;
create policy "featured products admin all"
on public.featured_products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "inventory admin all batches" on public.inventory_batches;
create policy "inventory admin all batches"
on public.inventory_batches
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "inventory admin all lots" on public.inventory_lots;
create policy "inventory admin all lots"
on public.inventory_lots
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "inventory admin all allocations" on public.order_item_lot_allocations;
create policy "inventory admin all allocations"
on public.order_item_lot_allocations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "expenses admin all" on public.expenses;
create policy "expenses admin all"
on public.expenses
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "delivery settings public read" on public.delivery_settings;
create policy "delivery settings public read"
on public.delivery_settings
for select
to anon, authenticated
using (true);

drop policy if exists "delivery settings admin all" on public.delivery_settings;
create policy "delivery settings admin all"
on public.delivery_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "delivery requests public insert" on public.delivery_requests;
create policy "delivery requests public insert"
on public.delivery_requests
for insert
to anon, authenticated
with check (true);

drop policy if exists "delivery requests admin all" on public.delivery_requests;
create policy "delivery requests admin all"
on public.delivery_requests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "printing requests public insert" on public.printing_requests;
create policy "printing requests public insert"
on public.printing_requests
for insert
to anon, authenticated
with check (true);

drop policy if exists "printing requests admin all" on public.printing_requests;
create policy "printing requests admin all"
on public.printing_requests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "gcash requests public insert" on public.gcash_requests;
create policy "gcash requests public insert"
on public.gcash_requests
for insert
to anon, authenticated
with check (true);

drop policy if exists "gcash requests admin all" on public.gcash_requests;
create policy "gcash requests admin all"
on public.gcash_requests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "gcash transactions admin all" on public.gcash_transactions;
create policy "gcash transactions admin all"
on public.gcash_transactions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "storage public read app buckets" on storage.objects;
create policy "storage public read app buckets"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id in (
    'product-images',
    'order-proofs',
    'delivery-proofs',
    'gcash-proofs',
    'printing-pdfs',
    'printing-proofs'
  )
);

drop policy if exists "storage public upload proof buckets" on storage.objects;
create policy "storage public upload proof buckets"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id in (
    'order-proofs',
    'delivery-proofs',
    'gcash-proofs',
    'printing-pdfs',
    'printing-proofs'
  )
);

drop policy if exists "storage admin manage app buckets" on storage.objects;
create policy "storage admin manage app buckets"
on storage.objects
for all
to authenticated
using (
  public.is_admin()
  and bucket_id in (
    'product-images',
    'order-proofs',
    'delivery-proofs',
    'gcash-proofs',
    'printing-pdfs',
    'printing-proofs'
  )
)
with check (
  public.is_admin()
  and bucket_id in (
    'product-images',
    'order-proofs',
    'delivery-proofs',
    'gcash-proofs',
    'printing-pdfs',
    'printing-proofs'
  )
);

do $$
declare
  realtime_table_name text;
  realtime_tables text[] := array[
    'orders',
    'payments',
    'order_items',
    'products',
    'delivery_requests',
    'printing_requests',
    'gcash_requests'
  ];
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
