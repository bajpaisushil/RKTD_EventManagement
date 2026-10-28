create table inventory (
  stock_key text primary key,
  starting_units integer not null check (starting_units >= 0)
);

create table promo_codes (
  code text primary key,
  rule jsonb not null,
  valid_from timestamptz,
  valid_until timestamptz,
  max_redemptions integer check (max_redemptions >= 0),
  previous_redemptions integer not null default 0
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  idempotency_key text not null unique,
  request_hash text not null,
  status text not null check (status in ('PENDING_PAYMENT', 'CONFIRMED', 'EXPIRED', 'CANCELLED', 'REFUNDED')),
  request jsonb not null,
  quote jsonb not null,
  total_cents integer not null check (total_cents >= 0),
  promo_code text references promo_codes (code),
  booker_email text not null,
  hold_expires_at timestamptz,
  stripe_session_id text unique,
  stripe_checkout_url text,
  stripe_payment_intent_id text,
  email_status text not null default 'NOT_SENT' check (email_status in ('NOT_SENT', 'SENDING', 'SENT', 'FAILED')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index bookings_active_idx on bookings (status, hold_expires_at);
create index bookings_promo_idx on bookings (promo_code) where promo_code is not null;

create table booking_items (
  id bigserial primary key,
  booking_id uuid not null references bookings (id) on delete cascade,
  product_code text not null,
  stock_key text not null references inventory (stock_key),
  quantity integer not null check (quantity > 0),
  day date,
  attendee_id text,
  family_group_id text,
  unit_price_cents integer not null
);

create index booking_items_stock_idx on booking_items (stock_key);
create index booking_items_booking_idx on booking_items (booking_id);
