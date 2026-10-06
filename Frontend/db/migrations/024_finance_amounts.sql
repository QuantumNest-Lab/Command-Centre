alter table finance_records add column if not exists amount numeric(14,2) not null default 0;
alter table finance_records add column if not exists currency text not null default 'INR';
alter table finance_records add column if not exists paid_at timestamptz;