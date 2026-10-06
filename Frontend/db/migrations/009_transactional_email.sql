-- Transactional-email verification and recovery tokens. Only token digests are persisted.
alter table users add column if not exists email_verified_at timestamptz;

create table auth_email_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  purpose text not null check (purpose in ('VERIFY_EMAIL', 'RESET_PASSWORD')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index auth_email_tokens_active_idx on auth_email_tokens(user_id, purpose, expires_at desc)
  where consumed_at is null;
