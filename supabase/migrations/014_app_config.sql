-- App configuration key/value store (superuser-managed settings)
create table if not exists app_config (
  key   text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- Only the service role (Worker) may read/write this table
alter table app_config enable row level security;

-- No RLS policies — service role bypasses RLS entirely

-- Grant to service role (already implicit, but be explicit for clarity)
grant select, insert, update on app_config to service_role;
