-- Workspace-owned billing delivery preferences. Subscription state remains provider-owned.
alter table workspaces
  add column if not exists billing_email text,
  add column if not exists invoice_reference text;
