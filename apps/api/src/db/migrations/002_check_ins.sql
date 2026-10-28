create table check_ins (
  booking_id uuid not null references bookings (id) on delete cascade,
  attendee_id text not null,
  day date not null,
  checked_in_at timestamptz not null default now(),
  primary key (booking_id, attendee_id, day)
);
