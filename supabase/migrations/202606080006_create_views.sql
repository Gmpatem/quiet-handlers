-- Create reporting and admin views required by the app.

create or replace view public.inventory_batches_admin
with (security_invoker = true) as
select
  b.id as batch_id,
  b.batch_code,
  b.created_at,
  b.note,
  count(distinct l.product_id)::bigint as distinct_products,
  coalesce(sum(l.qty_received), 0)::bigint as total_units_received,
  coalesce(sum(l.qty_received * l.unit_cost_cents), 0)::bigint as total_cost_cents
from public.inventory_batches b
left join public.inventory_lots l on l.batch_id = b.id
group by b.id, b.batch_code, b.created_at, b.note;

create or replace view public.inventory_batch_lines_admin
with (security_invoker = true) as
select
  l.batch_id,
  b.batch_code,
  l.product_id,
  p.name as product_name,
  l.qty_received,
  l.qty_remaining,
  l.unit_cost_cents,
  (l.qty_received * l.unit_cost_cents)::bigint as line_cost_cents
from public.inventory_lots l
join public.inventory_batches b on b.id = l.batch_id
join public.products p on p.id = l.product_id;

create or replace view public.order_profit
with (security_invoker = true) as
with item_totals as (
  select
    oi.order_id,
    count(*)::bigint as items_count,
    coalesce(sum(oi.line_total_cents), 0)::bigint as items_subtotal_cents,
    coalesce(sum(oi.unit_cost_cents * oi.qty), 0)::bigint as cogs_cents
  from public.order_items oi
  group by oi.order_id
)
select
  o.id as order_id,
  o.order_code,
  o.created_at,
  o.status,
  o.fulfillment,
  o.payment_method,
  o.subtotal_cents,
  o.delivery_fee_cents,
  o.total_cents as revenue_cents,
  coalesce(it.items_count, 0)::bigint as items_count,
  (coalesce(it.items_count, 0) > 0) as has_items,
  (o.subtotal_cents = coalesce(it.items_subtotal_cents, o.subtotal_cents)) as subtotal_matches_items,
  coalesce(it.cogs_cents, 0)::bigint as cogs_cents,
  (o.total_cents - coalesce(it.cogs_cents, 0))::bigint as profit_cents
from public.orders o
left join item_totals it on it.order_id = o.id;

create or replace view public.order_profit_realized
with (security_invoker = true) as
select *
from public.order_profit
where status in ('completed', 'delivered', 'paid');

create or replace view public.daily_profit_pipeline
with (security_invoker = true) as
select
  created_at::date as day,
  count(*)::bigint as orders_count,
  coalesce(sum(revenue_cents), 0)::bigint as revenue_cents,
  coalesce(sum(cogs_cents), 0)::numeric as cogs_cents,
  coalesce(sum(profit_cents), 0)::numeric as profit_cents
from public.order_profit
group by created_at::date
order by day desc;

create or replace view public.daily_profit_realized
with (security_invoker = true) as
select
  created_at::date as day,
  count(*)::bigint as orders_count,
  coalesce(sum(revenue_cents), 0)::bigint as revenue_cents,
  coalesce(sum(cogs_cents), 0)::numeric as cogs_cents,
  coalesce(sum(profit_cents), 0)::numeric as profit_cents
from public.order_profit_realized
group by created_at::date
order by day desc;

create or replace view public.daily_profit
with (security_invoker = true) as
select *
from public.daily_profit_pipeline;

create or replace view public.top_products_7d_pipeline
with (security_invoker = true) as
select
  p.id as product_id,
  p.name as product_name,
  coalesce(sum(oi.qty), 0)::bigint as qty_sold,
  coalesce(sum(oi.line_total_cents), 0)::bigint as revenue_cents,
  coalesce(sum(oi.unit_cost_cents * oi.qty), 0)::bigint as cogs_cents,
  coalesce(sum(oi.line_total_cents - (oi.unit_cost_cents * oi.qty)), 0)::bigint as profit_cents
from public.order_items oi
join public.orders o on o.id = oi.order_id
join public.products p on p.id = oi.product_id
where o.created_at >= now() - interval '7 days'
group by p.id, p.name
order by qty_sold desc, revenue_cents desc;

create or replace view public.top_products_7d_realized
with (security_invoker = true) as
select
  p.id as product_id,
  p.name as product_name,
  coalesce(sum(oi.qty), 0)::bigint as qty_sold,
  coalesce(sum(oi.line_total_cents), 0)::bigint as revenue_cents,
  coalesce(sum(oi.unit_cost_cents * oi.qty), 0)::bigint as cogs_cents,
  coalesce(sum(oi.line_total_cents - (oi.unit_cost_cents * oi.qty)), 0)::bigint as profit_cents
from public.order_items oi
join public.orders o on o.id = oi.order_id
join public.products p on p.id = oi.product_id
where o.created_at >= now() - interval '7 days'
  and o.status in ('completed', 'delivered', 'paid')
group by p.id, p.name
order by qty_sold desc, revenue_cents desc;

create or replace view public.batch_profit_realized
with (security_invoker = true) as
select
  b.id as batch_id,
  b.created_at as batch_created_at,
  b.note,
  o.created_at::date as order_day,
  coalesce(sum(a.qty * a.unit_cost_cents), 0)::bigint as cogs_cents,
  coalesce(sum(oi.unit_price_cents * a.qty), 0)::bigint as revenue_cents,
  coalesce(sum((oi.unit_price_cents - a.unit_cost_cents) * a.qty), 0)::bigint as profit_cents
from public.inventory_batches b
join public.inventory_lots l on l.batch_id = b.id
join public.order_item_lot_allocations a on a.lot_id = l.id
join public.orders o on o.id = a.order_id
join public.order_items oi on oi.order_id = a.order_id and oi.product_id = a.product_id
where o.status in ('completed', 'delivered', 'paid')
group by b.id, b.created_at, b.note, o.created_at::date;

create or replace view public.order_status_counts
with (security_invoker = true) as
select status, count(*)::bigint as count
from public.orders
group by status;

create or replace view public.order_status_counts_today
with (security_invoker = true) as
select status, count(*)::bigint as count
from public.orders
where created_at::date = current_date
group by status;

create or replace view public.v_daily_sales
with (security_invoker = true) as
select
  created_at::date as day,
  count(*)::bigint as orders_count,
  coalesce(sum(subtotal_cents), 0)::bigint as subtotal_cents,
  coalesce(sum(delivery_fee_cents), 0)::bigint as delivery_fee_cents,
  coalesce(sum(total_cents), 0)::bigint as total_cents
from public.orders
group by created_at::date
order by day desc;

create or replace view public.v_fulfillment_split
with (security_invoker = true) as
select fulfillment, count(*)::bigint as count
from public.orders
group by fulfillment;

create or replace view public.v_payment_split
with (security_invoker = true) as
select payment_method, count(*)::bigint as count
from public.orders
group by payment_method;

create or replace view public.v_top_products
with (security_invoker = true) as
select
  p.id as product_id,
  p.name as product_name,
  coalesce(sum(oi.qty), 0)::bigint as qty_sold,
  coalesce(sum(oi.line_total_cents), 0)::bigint as revenue_cents
from public.order_items oi
join public.products p on p.id = oi.product_id
group by p.id, p.name
order by qty_sold desc, revenue_cents desc;

