-- Explicit Data API grants for Supabase's public-schema grant behavior.
-- These grants make objects reachable through PostgREST/GraphQL/supabase-js.
-- RLS policies still control which rows/actions are actually allowed.

grant usage on schema public to anon, authenticated;

-- Public storefront and checkout reads.
grant select on table public.products to anon, authenticated;
grant select on table public.app_settings to anon, authenticated;
grant select on table public.featured_products to anon, authenticated;
grant select on table public.offers to anon, authenticated;
grant select on table public.offer_products to anon, authenticated;
grant select on table public.delivery_settings to anon, authenticated;

-- Public checkout and order-success flows.
grant select, insert, update on table public.orders to anon;
grant select, insert on table public.order_items to anon;
grant select, insert, update on table public.payments to anon;
grant insert on table public.order_suggestions to anon;

-- Public service request submission flows.
grant insert on table public.delivery_requests to anon;
grant insert on table public.printing_requests to anon;
grant insert on table public.gcash_requests to anon;

-- Authenticated/admin app access. RLS policies enforce admin-only behavior.
grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.products to authenticated;
grant select, insert, update, delete on table public.orders to authenticated;
grant select, insert, update, delete on table public.order_items to authenticated;
grant select, insert, update, delete on table public.payments to authenticated;
grant select, insert, update, delete on table public.app_settings to authenticated;
grant select, insert, update, delete on table public.settings_meta to authenticated;
grant select, insert, update, delete on table public.featured_products to authenticated;
grant select, insert, update, delete on table public.order_suggestions to authenticated;
grant select, insert, update, delete on table public.inventory_batches to authenticated;
grant select, insert, update, delete on table public.inventory_lots to authenticated;
grant select, insert, update, delete on table public.order_item_lot_allocations to authenticated;
grant select, insert, update, delete on table public.expenses to authenticated;
grant select, insert, update, delete on table public.delivery_settings to authenticated;
grant select, insert, update, delete on table public.delivery_requests to authenticated;
grant select, insert, update, delete on table public.printing_requests to authenticated;
grant select, insert, update, delete on table public.gcash_requests to authenticated;
grant select, insert, update, delete on table public.gcash_transactions to authenticated;
grant select, insert, update, delete on table public.offers to authenticated;
grant select, insert, update, delete on table public.offer_products to authenticated;

-- Admin/reporting views used by the app.
grant select on table public.inventory_batches_admin to authenticated;
grant select on table public.inventory_batch_lines_admin to authenticated;
grant select on table public.daily_profit_pipeline to authenticated;
grant select on table public.daily_profit_realized to authenticated;
grant select on table public.top_products_7d_realized to authenticated;

-- Additional reporting views exposed by the current backend snapshot.
grant select on table public.daily_profit to authenticated;
grant select on table public.batch_profit_realized to authenticated;
grant select on table public.order_profit to authenticated;
grant select on table public.order_profit_realized to authenticated;
grant select on table public.order_status_counts to authenticated;
grant select on table public.order_status_counts_today to authenticated;
grant select on table public.top_products_7d_pipeline to authenticated;
grant select on table public.v_daily_sales to authenticated;
grant select on table public.v_fulfillment_split to authenticated;
grant select on table public.v_payment_split to authenticated;
grant select on table public.v_top_products to authenticated;

-- RPCs used by the app. Signatures were verified against live Supabase metadata.
grant execute on function public.place_order_atomic(
  uuid,
  text,
  text,
  text,
  text,
  public.fulfillment_type,
  text,
  integer,
  text,
  public.payment_method_type,
  public.payment_status_type,
  text,
  jsonb
) to anon, authenticated;

grant execute on function public.place_order_atomic(
  uuid,
  text,
  text,
  text,
  text,
  public.fulfillment_type,
  text,
  integer,
  text,
  public.payment_method_type,
  public.payment_status_type,
  text,
  jsonb,
  text
) to anon, authenticated;

grant execute on function public.submit_order_suggestion(uuid, text) to anon, authenticated;
grant execute on function public.get_payment_status_enum() to anon, authenticated;

grant execute on function public.admin_verify_payment(uuid, text) to authenticated;
grant execute on function public.admin_verify_payment(uuid, public.payment_status_type) to authenticated;
grant execute on function public.receive_inventory_batch_atomic(jsonb, text, text, text, date) to authenticated;
grant execute on function public.admin_bulk_update_products(jsonb) to authenticated;

-- Future public-schema objects created by the migration owner.
-- Do not add broad anon default table privileges.
alter default privileges in schema public
grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
grant execute on functions to authenticated;

