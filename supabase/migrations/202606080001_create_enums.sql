-- Create enum types required by the app.

do $$
begin
  create type public.fulfillment_type as enum ('pickup', 'delivery');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_method_type as enum ('gcash', 'cod', 'credit');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_status_type as enum ('pending', 'verified', 'rejected', 'completed', 'paid');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.order_status_type as enum (
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'out_for_delivery',
    'completed',
    'cancelled',
    'delivered',
    'paid'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.order_status_type'::regtype
      and enumlabel = 'paid'
  ) then
    alter type public.order_status_type add value 'paid';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.payment_status_type'::regtype
      and enumlabel = 'paid'
  ) then
    alter type public.payment_status_type add value 'paid';
  end if;
end $$;

