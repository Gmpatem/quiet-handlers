-- Create RPC/database functions expected by the app.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.is_admin
      from public.profiles p
      where p.id = auth.uid()
    ),
    false
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'on_auth_user_created'
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end $$;

create or replace function public.gen_batch_code(ts timestamptz default now())
returns text
language sql
stable
as $$
  select 'BATCH-' || to_char(coalesce(ts, now()) at time zone 'Asia/Manila', 'YYYYMMDD-HH24MISS');
$$;

create or replace function public.get_payment_status_enum()
returns text[]
language sql
stable
as $$
  select array_agg(e.enumlabel::text order by e.enumsortorder)
  from pg_enum e
  join pg_type t on t.oid = e.enumtypid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
    and t.typname = 'payment_status_type';
$$;

create or replace function public.get_checkout_config()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
  from public.app_settings
  where key in (
    'delivery_fee_cents',
    'enable_gcash',
    'enable_cod',
    'enable_delivery',
    'enable_pickup',
    'gcash_enabled',
    'gcash_name',
    'gcash_number',
    'gcash_instructions'
  );
$$;

create or replace function public.admin_bulk_update_products(p_updates jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
  updated_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'admin access required';
  end if;

  if p_updates is null or jsonb_typeof(p_updates) <> 'array' then
    return 0;
  end if;

  for item in
    select *
    from jsonb_to_recordset(p_updates) as x(
      product_id uuid,
      price_cents integer,
      cost_cents integer
    )
  loop
    update public.products
    set
      price_cents = coalesce(item.price_cents, price_cents),
      cost_cents = coalesce(item.cost_cents, cost_cents),
      updated_at = now()
    where id = item.product_id;

    if found then
      updated_count := updated_count + 1;
    end if;
  end loop;

  return updated_count;
end;
$$;

create or replace function public.receive_inventory_batch_atomic(
  p_items jsonb,
  p_note text default null,
  p_supplier text default null,
  p_receipt text default null,
  p_expiry date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
  v_batch_id uuid := gen_random_uuid();
  v_batch_code text := public.gen_batch_code(now()) || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
begin
  if not public.is_admin() then
    raise exception 'admin access required';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items must be a JSON array';
  end if;

  insert into public.inventory_batches (
    id,
    batch_code,
    note,
    supplier_name,
    receipt_reference,
    expiry_date,
    created_by
  )
  values (
    v_batch_id,
    v_batch_code,
    nullif(p_note, ''),
    nullif(p_supplier, ''),
    nullif(p_receipt, ''),
    p_expiry,
    auth.uid()
  );

  for item in
    select *
    from jsonb_to_recordset(p_items) as x(
      product_id uuid,
      qty integer,
      unit_cost_cents integer
    )
  loop
    if item.product_id is null or coalesce(item.qty, 0) <= 0 then
      continue;
    end if;

    insert into public.inventory_lots (
      batch_id,
      product_id,
      qty_received,
      qty_remaining,
      unit_cost_cents
    )
    values (
      v_batch_id,
      item.product_id,
      item.qty,
      item.qty,
      coalesce(item.unit_cost_cents, 0)
    );

    update public.products
    set
      stock_qty = coalesce(stock_qty, 0) + item.qty,
      updated_at = now()
    where id = item.product_id;
  end loop;

  return jsonb_build_object('batch_id', v_batch_id, 'batch_code', v_batch_code);
end;
$$;

create or replace function public.consume_inventory_fifo(
  p_order_id uuid,
  p_product_id uuid,
  p_qty integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  lot record;
  remaining integer := greatest(coalesce(p_qty, 0), 0);
  take_qty integer;
  consumed integer := 0;
begin
  if remaining <= 0 then
    return 0;
  end if;

  for lot in
    select id, qty_remaining, unit_cost_cents
    from public.inventory_lots
    where product_id = p_product_id
      and qty_remaining > 0
    order by created_at asc, id asc
    for update
  loop
    exit when remaining <= 0;

    take_qty := least(remaining, lot.qty_remaining);

    update public.inventory_lots
    set qty_remaining = qty_remaining - take_qty
    where id = lot.id;

    if p_order_id is not null then
      insert into public.order_item_lot_allocations (
        order_id,
        product_id,
        lot_id,
        qty,
        unit_cost_cents
      )
      values (
        p_order_id,
        p_product_id,
        lot.id,
        take_qty,
        lot.unit_cost_cents
      );
    end if;

    remaining := remaining - take_qty;
    consumed := consumed + take_qty;
  end loop;

  return consumed;
end;
$$;

create or replace function public.place_order_atomic(
  p_order_id uuid,
  p_order_code text,
  p_customer_name text,
  p_contact text,
  p_notes text,
  p_fulfillment public.fulfillment_type,
  p_pickup_location text,
  p_delivery_fee_cents integer,
  p_delivery_location text,
  p_payment_method public.payment_method_type,
  p_payment_status public.payment_status_type,
  p_payment_ref text,
  p_items jsonb,
  p_suggestion text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
  product_row record;
  v_subtotal_cents integer := 0;
  v_total_cents integer := 0;
  v_payment_id uuid;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items must be a JSON array';
  end if;

  for item in
    select *
    from jsonb_to_recordset(p_items) as x(product_id uuid, qty integer)
  loop
    if item.product_id is null or coalesce(item.qty, 0) <= 0 then
      raise exception 'invalid order item';
    end if;

    select *
    into product_row
    from public.products
    where id = item.product_id
      and is_active = true
    for update;

    if not found then
      raise exception 'product not available: %', item.product_id;
    end if;

    if coalesce(product_row.stock_qty, 0) < item.qty then
      raise exception 'insufficient stock for %', product_row.name;
    end if;

    v_subtotal_cents := v_subtotal_cents + (product_row.price_cents * item.qty);
  end loop;

  v_total_cents := v_subtotal_cents + coalesce(p_delivery_fee_cents, 0);

  insert into public.orders (
    id,
    order_code,
    customer_name,
    contact,
    notes,
    fulfillment,
    pickup_location,
    delivery_fee_cents,
    delivery_location,
    payment_method,
    subtotal_cents,
    total_cents,
    status
  )
  values (
    p_order_id,
    p_order_code,
    p_customer_name,
    p_contact,
    nullif(p_notes, ''),
    p_fulfillment,
    nullif(p_pickup_location, ''),
    coalesce(p_delivery_fee_cents, 0),
    nullif(p_delivery_location, ''),
    p_payment_method,
    v_subtotal_cents,
    v_total_cents,
    'pending'
  );

  for item in
    select *
    from jsonb_to_recordset(p_items) as x(product_id uuid, qty integer)
  loop
    select *
    into product_row
    from public.products
    where id = item.product_id
    for update;

    insert into public.order_items (
      order_id,
      product_id,
      name_snapshot,
      category_snapshot,
      unit_price_cents,
      unit_cost_cents,
      qty,
      line_total_cents
    )
    values (
      p_order_id,
      item.product_id,
      product_row.name,
      product_row.category,
      product_row.price_cents,
      coalesce(product_row.cost_cents, 0),
      item.qty,
      product_row.price_cents * item.qty
    );

    update public.products
    set
      stock_qty = stock_qty - item.qty,
      updated_at = now()
    where id = item.product_id;

    perform public.consume_inventory_fifo(p_order_id, item.product_id, item.qty);
  end loop;

  insert into public.payments (
    order_id,
    method,
    amount_cents,
    reference_number,
    gcash_ref,
    status,
    paid_at,
    balance_due_cents
  )
  values (
    p_order_id,
    p_payment_method,
    v_total_cents,
    nullif(p_payment_ref, ''),
    nullif(p_payment_ref, ''),
    p_payment_status,
    case when p_payment_status in ('paid', 'verified', 'completed') then now() else null end,
    case when p_payment_method = 'credit' then v_total_cents else 0 end
  )
  returning id into v_payment_id;

  if nullif(p_suggestion, '') is not null then
    insert into public.order_suggestions (
      order_id,
      order_code,
      customer_name,
      contact,
      message,
      source
    )
    values (
      p_order_id,
      p_order_code,
      p_customer_name,
      p_contact,
      p_suggestion,
      'checkout'
    );
  end if;

  return jsonb_build_object(
    'order_id', p_order_id,
    'order_code', p_order_code,
    'payment_id', v_payment_id,
    'subtotal_cents', v_subtotal_cents,
    'total_cents', v_total_cents
  );
end;
$$;

create or replace function public.place_order_atomic(
  p_order_id uuid,
  p_order_code text,
  p_customer_name text,
  p_contact text,
  p_notes text,
  p_fulfillment public.fulfillment_type,
  p_pickup_location text,
  p_delivery_fee_cents integer,
  p_delivery_location text,
  p_payment_method public.payment_method_type,
  p_payment_status public.payment_status_type,
  p_payment_ref text,
  p_items jsonb
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.place_order_atomic(
    p_order_id,
    p_order_code,
    p_customer_name,
    p_contact,
    p_notes,
    p_fulfillment,
    p_pickup_location,
    p_delivery_fee_cents,
    p_delivery_location,
    p_payment_method,
    p_payment_status,
    p_payment_ref,
    p_items,
    null::text
  );
$$;

create or replace function public.admin_verify_payment(
  p_payment_id uuid,
  p_status public.payment_status_type
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
begin
  if not public.is_admin() then
    raise exception 'admin access required';
  end if;

  update public.payments
  set
    status = p_status,
    paid_at = case when p_status in ('paid', 'verified', 'completed') then coalesce(paid_at, now()) else null end,
    verified_by = auth.uid()
  where id = p_payment_id
  returning order_id into v_order_id;

  if v_order_id is not null and p_status in ('paid', 'verified', 'completed') then
    update public.orders
    set status = 'confirmed', updated_at = now()
    where id = v_order_id
      and status = 'pending';
  end if;
end;
$$;

create or replace function public.admin_verify_payment(
  p_order_id uuid,
  p_status text default 'paid'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.payment_status_type;
begin
  if not public.is_admin() then
    raise exception 'admin access required';
  end if;

  v_status := coalesce(nullif(p_status, ''), 'paid')::public.payment_status_type;

  update public.payments
  set
    status = v_status,
    paid_at = case when v_status in ('paid', 'verified', 'completed') then coalesce(paid_at, now()) else null end,
    verified_by = auth.uid()
  where order_id = p_order_id;

  if v_status in ('paid', 'verified', 'completed') then
    update public.orders
    set status = 'confirmed', updated_at = now()
    where id = p_order_id
      and status = 'pending';
  end if;
end;
$$;

create or replace function public.submit_order_suggestion(
  p_order_id uuid,
  p_suggestion text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o record;
begin
  if nullif(trim(coalesce(p_suggestion, '')), '') is null then
    raise exception 'suggestion is required';
  end if;

  select id, order_code, customer_name, contact
  into o
  from public.orders
  where id = p_order_id;

  if not found then
    raise exception 'order not found';
  end if;

  insert into public.order_suggestions (
    order_id,
    order_code,
    customer_name,
    contact,
    message,
    source
  )
  values (
    o.id,
    o.order_code,
    o.customer_name,
    o.contact,
    trim(p_suggestion),
    'success_page'
  );
end;
$$;

create or replace function public.admin_confirm_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin access required';
  end if;

  update public.orders
  set status = 'confirmed', updated_at = now()
  where id = p_order_id;
end;
$$;

create or replace function public.admin_set_order_status(
  p_order_id uuid,
  p_status public.order_status_type
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin access required';
  end if;

  update public.orders
  set status = p_status, updated_at = now()
  where id = p_order_id;
end;
$$;

create or replace function public.mark_payment_paid(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin access required';
  end if;

  update public.payments
  set status = 'paid', paid_at = coalesce(paid_at, now()), verified_by = auth.uid()
  where order_id = p_order_id;
end;
$$;

create or replace function public.sync_payment_for_order(
  p_order_id uuid,
  p_payment_ref text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o record;
begin
  select *
  into o
  from public.orders
  where id = p_order_id;

  if not found then
    raise exception 'order not found';
  end if;

  insert into public.payments (
    order_id,
    method,
    amount_cents,
    reference_number,
    gcash_ref,
    status,
    balance_due_cents
  )
  values (
    o.id,
    o.payment_method,
    o.total_cents,
    nullif(p_payment_ref, ''),
    nullif(p_payment_ref, ''),
    'pending',
    case when o.payment_method = 'credit' then o.total_cents else 0 end
  )
  on conflict do nothing;
end;
$$;

create or replace function public.verify_gcash_payment(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.mark_payment_paid(p_order_id);
end;
$$;

create or replace function public.admin_verify_gcash_paid(order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.mark_payment_paid(order_id);
end;
$$;

create or replace function public.admin_verify_gcash_paid_v2(
  p_order_id uuid,
  p_reference_number text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin access required';
  end if;

  update public.payments
  set
    reference_number = nullif(p_reference_number, ''),
    gcash_ref = nullif(p_reference_number, ''),
    status = 'paid',
    paid_at = coalesce(paid_at, now()),
    verified_by = auth.uid()
  where order_id = p_order_id;
end;
$$;

create or replace function public.calculate_gcash_fee(amount numeric)
returns numeric
language sql
immutable
as $$
  select round(coalesce(amount, 0) * 0.02, 2);
$$;

create or replace function public.calculate_delivery_total(
  estimated_cost_param numeric,
  delivery_fee_param numeric
)
returns numeric
language sql
immutable
as $$
  select coalesce(estimated_cost_param, 0) + coalesce(delivery_fee_param, 0);
$$;

create or replace function public.get_default_delivery_fee()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select setting_value::numeric
      from public.delivery_settings
      where setting_key = 'default_delivery_fee'
      limit 1
    ),
    50
  );
$$;

create or replace function public.get_pending_delivery_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.delivery_requests
  where status = 'pending';
$$;

create or replace function public.get_daily_delivery_stats(target_date date default current_date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'date', target_date,
    'requests', count(*),
    'completed', count(*) filter (where status = 'completed'),
    'revenue', coalesce(sum(delivery_fee) filter (where status = 'completed'), 0)
  )
  from public.delivery_requests
  where created_at::date = target_date;
$$;

create or replace function public.get_pending_gcash_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.gcash_requests
  where status = 'pending';
$$;

create or replace function public.get_daily_gcash_revenue(target_date date default current_date)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(service_fee) filter (where status = 'completed'), 0)
  from public.gcash_requests
  where created_at::date = target_date;
$$;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.get_payment_status_enum() to anon, authenticated;
grant execute on function public.get_checkout_config() to anon, authenticated;
grant execute on function public.place_order_atomic(uuid, text, text, text, text, public.fulfillment_type, text, integer, text, public.payment_method_type, public.payment_status_type, text, jsonb) to anon, authenticated;
grant execute on function public.place_order_atomic(uuid, text, text, text, text, public.fulfillment_type, text, integer, text, public.payment_method_type, public.payment_status_type, text, jsonb, text) to anon, authenticated;
grant execute on function public.submit_order_suggestion(uuid, text) to anon, authenticated;
grant execute on function public.receive_inventory_batch_atomic(jsonb, text, text, text, date) to authenticated;
grant execute on function public.admin_bulk_update_products(jsonb) to authenticated;
grant execute on function public.admin_verify_payment(uuid, public.payment_status_type) to authenticated;
grant execute on function public.admin_verify_payment(uuid, text) to authenticated;
grant execute on function public.admin_confirm_order(uuid) to authenticated;
grant execute on function public.admin_set_order_status(uuid, public.order_status_type) to authenticated;
grant execute on function public.mark_payment_paid(uuid) to authenticated;
grant execute on function public.consume_inventory_fifo(uuid, uuid, integer) to authenticated;
grant execute on function public.sync_payment_for_order(uuid, text) to authenticated;
grant execute on function public.verify_gcash_payment(uuid) to authenticated;
grant execute on function public.admin_verify_gcash_paid(uuid) to authenticated;
grant execute on function public.admin_verify_gcash_paid_v2(uuid, text) to authenticated;
grant execute on function public.calculate_gcash_fee(numeric) to anon, authenticated;
grant execute on function public.calculate_delivery_total(numeric, numeric) to anon, authenticated;
grant execute on function public.get_default_delivery_fee() to anon, authenticated;
grant execute on function public.get_pending_delivery_count() to authenticated;
grant execute on function public.get_daily_delivery_stats(date) to authenticated;
grant execute on function public.get_pending_gcash_count() to authenticated;
grant execute on function public.get_daily_gcash_revenue(date) to authenticated;
