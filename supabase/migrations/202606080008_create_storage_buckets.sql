-- Create storage buckets used by the app.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, null, null),
  ('order-proofs', 'order-proofs', true, null, null),
  ('delivery-proofs', 'delivery-proofs', true, null, null),
  ('gcash-proofs', 'gcash-proofs', true, null, null),
  ('printing-pdfs', 'printing-pdfs', true, null, null),
  ('printing-proofs', 'printing-proofs', true, null, null)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

