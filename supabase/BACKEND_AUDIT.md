# Backend Audit - Supabase Discovery and Migration Prep

Date: 2026-06-08
Project ref: `ilbhsfmjbnpkpufnvppq`

## MCP Connection Status

- `codex mcp add supabase --url https://mcp.supabase.com/mcp?project_ref=ilbhsfmjbnpkpufnvppq` succeeded.
- `codex mcp login supabase` succeeded with OAuth.
- `codex mcp list` shows `supabase` as `enabled` with `Auth: OAuth`.
- Supabase Agent Skills were installed into `.agents/skills/supabase` and `.agents/skills/supabase-postgres-best-practices`.
- Limitation: the current running Codex tool surface did not expose Supabase MCP database tools after installation/login. A read-only `codex exec` subprocess workaround was blocked by local CLI/model compatibility. Live backend discovery below used Supabase REST/OpenAPI plus Storage Admin APIs with the local service role key as a fallback.

## Real Database Summary

Live exposed REST definitions found:

- Tables / views exposed: `app_settings`, `batch_profit_realized`, `daily_profit`, `daily_profit_pipeline`, `daily_profit_realized`, `delivery_requests`, `delivery_settings`, `expenses`, `featured_products`, `gcash_requests`, `gcash_transactions`, `inventory_batch_lines_admin`, `inventory_batches`, `inventory_batches_admin`, `inventory_lots`, `offer_products`, `offers`, `order_item_lot_allocations`, `order_items`, `order_profit`, `order_profit_realized`, `order_status_counts`, `order_status_counts_today`, `order_suggestions`, `orders`, `payments`, `printing_requests`, `products`, `profiles`, `settings_meta`, `top_products_7d_pipeline`, `top_products_7d_realized`, `v_daily_sales`, `v_fulfillment_split`, `v_payment_split`, `v_top_products`.
- RPC endpoints exposed: `admin_bulk_update_products`, `admin_confirm_order`, `admin_set_order_status`, `admin_verify_gcash_paid`, `admin_verify_gcash_paid_v2`, `admin_verify_payment`, `calculate_delivery_total`, `calculate_gcash_fee`, `consume_inventory_fifo`, `create_order`, `gen_batch_code`, `get_checkout_config`, `get_daily_delivery_stats`, `get_daily_gcash_revenue`, `get_default_delivery_fee`, `get_payment_status_enum`, `get_pending_delivery_count`, `get_pending_gcash_count`, `is_admin`, `mark_payment_paid`, `place_order_atomic`, `receive_inventory_batch_atomic`, `submit_order_suggestion`, `sync_payment_for_order`, `verify_gcash_payment`.
- Storage buckets found: `product-images`, `gcash-proofs`, `delivery-proofs`, `printing pdfs`, `printing-pdfs`, `printing-proofs`.

## App Database Usage Summary

Tables/views used by the app:

- `app_settings`
- `daily_profit_pipeline`
- `daily_profit_realized`
- `delivery_requests`
- `expenses`
- `gcash_requests`
- `inventory_batch_lines_admin`
- `inventory_batches`
- `inventory_batches_admin`
- `offer_products`
- `offers`
- `order_items`
- `orders`
- `payments`
- `printing_requests`
- `products`
- `profiles`
- `settings_meta`
- `top_products_7d_realized`

Known tables present but not directly used in current code:

- `delivery_settings`
- `featured_products`
- `gcash_transactions`
- `inventory_lots`
- `order_item_lot_allocations`
- `order_suggestions`

RPCs used by the app:

- `admin_bulk_update_products`
- `admin_verify_payment`
- `get_payment_status_enum`
- `place_order_atomic`
- `receive_inventory_batch_atomic`
- `submit_order_suggestion`

Realtime table subscriptions used by the app:

- `orders`
- `payments`
- `order_items`
- `products`
- `delivery_requests`
- `printing_requests`
- `gcash_requests`

Auth/profile usage:

- Admin pages use Supabase Auth sessions and require `profiles.is_admin = true`.
- Client/session helpers use `supabase.auth.getSession()`, `getUser()`, `signInWithPassword()`, and `signOut()`.

Storage buckets used by the app:

- `product-images`
- `order-proofs`
- `delivery-proofs`
- `gcash-proofs`
- `printing-pdfs`
- `printing-proofs`

## Missing or Mismatched Backend Objects

- Missing storage bucket: `order-proofs`.
- Extra storage bucket not referenced by the app: `printing pdfs` (space in name), likely legacy.
- Missing live columns compared with current app code:
  - `offers.product_badge_text`
  - `offers.product_badge_variant`
  - `offers.product_badge_priority`
- Potential RPC signature mismatch:
  - Live OpenAPI marks `place_order_atomic.p_suggestion` as required, while current checkout code does not pass `p_suggestion`. The migration makes that argument optional with a default.

## Enum Types Required

- `fulfillment_type`: `pickup`, `delivery`
- `payment_method_type`: `gcash`, `cod`, `credit`
- `payment_status_type`: `pending`, `verified`, `rejected`, `completed`, `paid`
- `order_status_type`: `pending`, `confirmed`, `preparing`, `ready`, `out_for_delivery`, `completed`, `cancelled`, `delivered`, `paid`

## RLS and Policy Notes

Exact live RLS policy bodies could not be inspected through the currently exposed tools. The migration set enables RLS on app tables and creates conservative policies for:

- public product/offer/settings reads needed by storefront and checkout
- public order/request inserts needed by checkout and service pages
- authenticated profile self-read
- admin access using `profiles.is_admin`
- public read and upload policies for the public storage buckets used by the app

Risk to review manually:

- Public order success pages currently read order/payment/item rows without user ownership, so policies must either allow broad reads or the app must later move order lookup behind a safer token/code-based server route.
- Storage buckets are public because the app stores and displays public URLs.
- Admin authorization depends on `profiles.is_admin`; profile integrity and admin assignment need human-controlled operational process.

## Data API Grants

Migration `202606080011_create_data_api_grants.sql` was added for Supabase's 2026 public-schema Data API grant behavior.

Tables granted to `anon`:

- `products`: `select`
- `app_settings`: `select`
- `featured_products`: `select`
- `offers`: `select`
- `offer_products`: `select`
- `delivery_settings`: `select`
- `orders`: `select`, `insert`, `update`
- `order_items`: `select`, `insert`
- `payments`: `select`, `insert`, `update`
- `order_suggestions`: `insert`
- `delivery_requests`: `insert`
- `printing_requests`: `insert`
- `gcash_requests`: `insert`

Tables granted to `authenticated`:

- `profiles`: `select`, `insert`, `update`
- `products`, `orders`, `order_items`, `payments`, `app_settings`, `settings_meta`, `featured_products`, `order_suggestions`, `inventory_batches`, `inventory_lots`, `order_item_lot_allocations`, `expenses`, `delivery_settings`, `delivery_requests`, `printing_requests`, `gcash_requests`, `gcash_transactions`, `offers`, `offer_products`: `select`, `insert`, `update`, `delete`

Views granted:

- Required app views to `authenticated`: `inventory_batches_admin`, `inventory_batch_lines_admin`, `daily_profit_pipeline`, `daily_profit_realized`, `top_products_7d_realized`
- Additional exposed reporting views to `authenticated`: `daily_profit`, `batch_profit_realized`, `order_profit`, `order_profit_realized`, `order_status_counts`, `order_status_counts_today`, `top_products_7d_pipeline`, `v_daily_sales`, `v_fulfillment_split`, `v_payment_split`, `v_top_products`

RPC functions granted:

- `place_order_atomic(uuid, text, text, text, text, fulfillment_type, text, integer, text, payment_method_type, payment_status_type, text, jsonb)` to `anon`, `authenticated`
- `place_order_atomic(uuid, text, text, text, text, fulfillment_type, text, integer, text, payment_method_type, payment_status_type, text, jsonb, text)` to `anon`, `authenticated`
- `submit_order_suggestion(uuid, text)` to `anon`, `authenticated`
- `get_payment_status_enum()` to `anon`, `authenticated`
- `admin_verify_payment(uuid, text)` to `authenticated`
- `admin_verify_payment(uuid, payment_status_type)` to `authenticated`
- `receive_inventory_batch_atomic(jsonb, text, text, text, date)` to `authenticated`
- `admin_bulk_update_products(jsonb)` to `authenticated`

Tables private from `anon` at the grant layer:

- `profiles`
- `settings_meta`
- `inventory_batches`
- `inventory_lots`
- `order_item_lot_allocations`
- `expenses`
- `gcash_transactions`

Permissions controlled further by RLS:

- All table grants are reachability grants only. RLS policies still decide row/action access.
- Admin-only behavior relies on authenticated users passing `public.is_admin()`.
- Public `orders` and `payments` `update` grants need human review because the current checkout client updates order/payment rows after order placement. A later backend-only flow would allow these grants and RLS policies to be tightened.

## Unsafe or Destructive SQL

The prepared migrations intentionally avoid:

- `drop table`
- `truncate`
- data-wiping `delete from`
- remote apply commands
- database reset commands against production
