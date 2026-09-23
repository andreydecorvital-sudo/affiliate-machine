alter table public.whatsapp_groups
  alter column active set default false,
  alter column accepting_traffic set default false;
