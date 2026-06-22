-- Seed required settings without overwriting current values.

insert into public.app_settings (key, value)
values
  ('delivery_fee_cents', '1500'::jsonb),
  ('enable_gcash', 'true'::jsonb),
  ('enable_cod', 'true'::jsonb),
  ('enable_delivery', 'true'::jsonb),
  ('enable_pickup', 'true'::jsonb),
  ('gcash_enabled', 'true'::jsonb),
  ('gcash_name', to_jsonb(''::text)),
  ('gcash_number', to_jsonb(''::text)),
  ('gcash_instructions', to_jsonb(''::text))
on conflict (key) do nothing;

insert into public.settings_meta (key, section, label, description, input_type, sort_order)
values
  ('delivery_fee_cents', 'Checkout', 'Delivery fee', 'Default delivery fee in cents.', 'number', 10),
  ('enable_gcash', 'Checkout', 'Enable GCash', 'Allow GCash payments at checkout.', 'boolean', 20),
  ('enable_cod', 'Checkout', 'Enable COD', 'Allow cash on delivery payments.', 'boolean', 30),
  ('enable_delivery', 'Checkout', 'Enable delivery', 'Allow delivery fulfillment.', 'boolean', 40),
  ('enable_pickup', 'Checkout', 'Enable pickup', 'Allow pickup fulfillment.', 'boolean', 50),
  ('gcash_enabled', 'GCash', 'GCash enabled', 'Legacy flag for GCash availability.', 'boolean', 60),
  ('gcash_name', 'GCash', 'GCash account name', 'Recipient name displayed at checkout.', 'text', 70),
  ('gcash_number', 'GCash', 'GCash number', 'Recipient number displayed at checkout.', 'text', 80),
  ('gcash_instructions', 'GCash', 'GCash instructions', 'Payment instructions shown to customers.', 'textarea', 90)
on conflict (key) do nothing;

insert into public.delivery_settings (setting_key, setting_value)
values ('default_delivery_fee', '50')
on conflict (setting_key) do nothing;

