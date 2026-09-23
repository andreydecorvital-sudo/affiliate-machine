alter table public.whatsapp_accounts
  add column if not exists pairing_qr_data_url text null,
  add column if not exists pairing_qr_expires_at timestamptz null;

create table if not exists public.whatsapp_send_dedupe (
  idempotency_key text primary key,
  account_id uuid not null references public.whatsapp_accounts(id) on delete cascade,
  group_jid text not null,
  status text not null check (status in ('sending','sent')),
  provider_message_id text null,
  confirmed boolean not null default false,
  ack text null check (ack in ('delivery','read') or ack is null),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.whatsapp_send_dedupe enable row level security;
revoke all on table public.whatsapp_send_dedupe from anon, authenticated;
grant select, insert, update, delete on table public.whatsapp_send_dedupe to service_role;
