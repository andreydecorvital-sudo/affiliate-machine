create table if not exists public.distribution_timing_metrics (
  niche text not null,
  local_hour smallint not null check (local_hour between 0 and 23),
  period_days integer not null,
  successful_deliveries bigint not null default 0,
  clicks bigint not null default 0,
  conversions bigint not null default 0,
  commission numeric(18,6) not null default 0,
  raw_commission_per_delivery numeric(18,8) null,
  smoothed_commission_per_delivery numeric(18,8) null,
  rpc numeric(18,8) null,
  sample_confidence numeric(8,6) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (niche, local_hour)
);

create table if not exists public.distribution_group_metrics (
  group_id uuid primary key references public.whatsapp_groups(id) on delete cascade,
  period_days integer not null,
  successful_deliveries bigint not null default 0,
  clicks bigint not null default 0,
  conversions bigint not null default 0,
  commission numeric(18,6) not null default 0,
  raw_commission_per_delivery numeric(18,8) null,
  smoothed_commission_per_delivery numeric(18,8) null,
  rpc numeric(18,8) null,
  sample_confidence numeric(8,6) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.distribution_experiments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('timing','group_allocation')),
  niche text null,
  status text not null default 'draft'
    check (status in ('draft','running','paused','completed')),
  treatment_share numeric(6,5) not null default 0.5
    check (treatment_share > 0 and treatment_share < 1),
  min_posts_per_arm integer not null default 30
    check (min_posts_per_arm between 5 and 100000),
  config jsonb not null default '{}'::jsonb,
  starts_at timestamptz null,
  ends_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table if not exists public.distribution_experiment_assignments (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null
    references public.distribution_experiments(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  arm text not null check (arm in ('baseline','treatment')),
  assigned_at timestamptz not null default now(),
  unique(experiment_id, post_id)
);

alter table public.post_deliveries
  add column if not exists eligible_after timestamptz null,
  add column if not exists allocation_experiment_id uuid null
    references public.distribution_experiments(id) on delete set null,
  add column if not exists allocation_arm text null
    check (allocation_arm in ('baseline','treatment')),
  add column if not exists allocation_reason text null,
  add column if not exists timing_experiment_id uuid null
    references public.distribution_experiments(id) on delete set null,
  add column if not exists timing_arm text null
    check (timing_arm in ('baseline','treatment')),
  add column if not exists timing_hour smallint null
    check (timing_hour between 0 and 23);

create index if not exists distribution_timing_metrics_rank_idx
  on public.distribution_timing_metrics(
    niche,
    sample_confidence desc,
    smoothed_commission_per_delivery desc
  );

create index if not exists distribution_group_metrics_rank_idx
  on public.distribution_group_metrics(
    sample_confidence desc,
    smoothed_commission_per_delivery desc
  );

create index if not exists distribution_experiments_active_idx
  on public.distribution_experiments(kind, status, niche, created_at);

create index if not exists distribution_experiment_assignments_post_idx
  on public.distribution_experiment_assignments(post_id, experiment_id);

create index if not exists post_deliveries_eligibility_idx
  on public.post_deliveries(status, eligible_after, next_attempt_at, created_at);

alter table public.distribution_timing_metrics enable row level security;
alter table public.distribution_group_metrics enable row level security;
alter table public.distribution_experiments enable row level security;
alter table public.distribution_experiment_assignments enable row level security;

revoke all on table public.distribution_timing_metrics from anon, authenticated;
revoke all on table public.distribution_group_metrics from anon, authenticated;
revoke all on table public.distribution_experiments from anon, authenticated;
revoke all on table public.distribution_experiment_assignments from anon, authenticated;

grant select, insert, update, delete on table public.distribution_timing_metrics to service_role;
grant select, insert, update, delete on table public.distribution_group_metrics to service_role;
grant select, insert, update, delete on table public.distribution_experiments to service_role;
grant select, insert, update, delete on table public.distribution_experiment_assignments to service_role;

create or replace function public.refresh_distribution_performance(
  p_days integer default 90
)
returns table (
  timing_rows integer,
  group_rows integer,
  global_deliveries bigint,
  global_commission numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_days integer := greatest(7, least(coalesce(p_days, 90), 365));
  since_at timestamptz;
  refresh_started timestamptz := clock_timestamp();
  global_delivery_count bigint := 0;
  global_commission_total numeric := 0;
  global_cpd numeric := 0;
  timing_count integer := 0;
  group_count integer := 0;
  prior_deliveries numeric := 20;
begin
  since_at := now() - make_interval(days => safe_days);

  select count(*)::bigint
  into global_delivery_count
  from public.post_deliveries d
  where d.accepted_at >= since_at
    and d.status in ('accepted','confirmed');

  select
    coalesce(sum(l.amount) filter (where l.status <> 'rejected'), 0)::numeric
  into global_commission_total
  from public.conversion_attributions ca
  join public.post_deliveries d on d.id = ca.delivery_id
  join public.conversions c on c.id = ca.conversion_id
  left join public.commission_ledger l on l.conversion_id = c.id
  where d.accepted_at >= since_at
    and c.purchase_at >= since_at;

  if global_delivery_count > 0 then
    global_cpd := global_commission_total / global_delivery_count::numeric;
  end if;

  with delivery_base as (
    select
      d.id,
      d.short_link_id,
      d.group_id,
      p.niche,
      extract(
        hour from d.accepted_at at time zone 'America/Sao_Paulo'
      )::smallint as local_hour
    from public.post_deliveries d
    join public.posts p on p.id = d.post_id
    where d.accepted_at >= since_at
      and d.status in ('accepted','confirmed')
  ),
  delivery_agg as (
    select niche, local_hour, count(*)::bigint as deliveries
    from delivery_base
    group by niche, local_hour
  ),
  click_agg as (
    select
      db.niche,
      db.local_hour,
      count(ce.id)::bigint as clicks
    from delivery_base db
    join public.click_events ce on ce.short_link_id = db.short_link_id
    where ce.is_bot = false
      and ce.occurred_at >= since_at
    group by db.niche, db.local_hour
  ),
  conversion_agg as (
    select
      db.niche,
      db.local_hour,
      count(distinct ca.conversion_id)::bigint as conversions,
      coalesce(
        sum(l.amount) filter (where l.status <> 'rejected'),
        0
      )::numeric as commission
    from delivery_base db
    join public.conversion_attributions ca on ca.delivery_id = db.id
    join public.conversions c on c.id = ca.conversion_id
    left join public.commission_ledger l on l.conversion_id = c.id
    where c.purchase_at >= since_at
    group by db.niche, db.local_hour
  ),
  combined as (
    select
      da.niche,
      da.local_hour,
      da.deliveries,
      coalesce(cl.clicks, 0)::bigint as clicks,
      coalesce(cv.conversions, 0)::bigint as conversions,
      coalesce(cv.commission, 0)::numeric as commission
    from delivery_agg da
    left join click_agg cl
      on cl.niche = da.niche
     and cl.local_hour = da.local_hour
    left join conversion_agg cv
      on cv.niche = da.niche
     and cv.local_hour = da.local_hour
  )
  insert into public.distribution_timing_metrics(
    niche,
    local_hour,
    period_days,
    successful_deliveries,
    clicks,
    conversions,
    commission,
    raw_commission_per_delivery,
    smoothed_commission_per_delivery,
    rpc,
    sample_confidence,
    updated_at
  )
  select
    niche,
    local_hour,
    safe_days,
    deliveries,
    clicks,
    conversions,
    commission,
    case
      when deliveries > 0 then commission / deliveries::numeric
      else null
    end,
    case
      when deliveries >= 5
      then (
        commission + global_cpd * prior_deliveries
      ) / (deliveries::numeric + prior_deliveries)
      else null
    end,
    case
      when clicks > 0 then commission / clicks::numeric
      else null
    end,
    least(1, deliveries::numeric / 50),
    clock_timestamp()
  from combined
  on conflict (niche, local_hour)
  do update set
    period_days = excluded.period_days,
    successful_deliveries = excluded.successful_deliveries,
    clicks = excluded.clicks,
    conversions = excluded.conversions,
    commission = excluded.commission,
    raw_commission_per_delivery = excluded.raw_commission_per_delivery,
    smoothed_commission_per_delivery = excluded.smoothed_commission_per_delivery,
    rpc = excluded.rpc,
    sample_confidence = excluded.sample_confidence,
    updated_at = excluded.updated_at;

  get diagnostics timing_count = row_count;

  delete from public.distribution_timing_metrics
  where updated_at < refresh_started;

  with delivery_base as (
    select
      d.id,
      d.short_link_id,
      d.group_id
    from public.post_deliveries d
    where d.accepted_at >= since_at
      and d.status in ('accepted','confirmed')
  ),
  delivery_agg as (
    select group_id, count(*)::bigint as deliveries
    from delivery_base
    group by group_id
  ),
  click_agg as (
    select
      db.group_id,
      count(ce.id)::bigint as clicks
    from delivery_base db
    join public.click_events ce on ce.short_link_id = db.short_link_id
    where ce.is_bot = false
      and ce.occurred_at >= since_at
    group by db.group_id
  ),
  conversion_agg as (
    select
      db.group_id,
      count(distinct ca.conversion_id)::bigint as conversions,
      coalesce(
        sum(l.amount) filter (where l.status <> 'rejected'),
        0
      )::numeric as commission
    from delivery_base db
    join public.conversion_attributions ca on ca.delivery_id = db.id
    join public.conversions c on c.id = ca.conversion_id
    left join public.commission_ledger l on l.conversion_id = c.id
    where c.purchase_at >= since_at
    group by db.group_id
  ),
  combined as (
    select
      da.group_id,
      da.deliveries,
      coalesce(cl.clicks, 0)::bigint as clicks,
      coalesce(cv.conversions, 0)::bigint as conversions,
      coalesce(cv.commission, 0)::numeric as commission
    from delivery_agg da
    left join click_agg cl on cl.group_id = da.group_id
    left join conversion_agg cv on cv.group_id = da.group_id
  )
  insert into public.distribution_group_metrics(
    group_id,
    period_days,
    successful_deliveries,
    clicks,
    conversions,
    commission,
    raw_commission_per_delivery,
    smoothed_commission_per_delivery,
    rpc,
    sample_confidence,
    updated_at
  )
  select
    group_id,
    safe_days,
    deliveries,
    clicks,
    conversions,
    commission,
    case
      when deliveries > 0 then commission / deliveries::numeric
      else null
    end,
    case
      when deliveries >= 5
      then (
        commission + global_cpd * prior_deliveries
      ) / (deliveries::numeric + prior_deliveries)
      else null
    end,
    case
      when clicks > 0 then commission / clicks::numeric
      else null
    end,
    least(1, deliveries::numeric / 50),
    clock_timestamp()
  from combined
  on conflict (group_id)
  do update set
    period_days = excluded.period_days,
    successful_deliveries = excluded.successful_deliveries,
    clicks = excluded.clicks,
    conversions = excluded.conversions,
    commission = excluded.commission,
    raw_commission_per_delivery = excluded.raw_commission_per_delivery,
    smoothed_commission_per_delivery = excluded.smoothed_commission_per_delivery,
    rpc = excluded.rpc,
    sample_confidence = excluded.sample_confidence,
    updated_at = excluded.updated_at;

  get diagnostics group_count = row_count;

  delete from public.distribution_group_metrics
  where updated_at < refresh_started;

  return query
  select
    timing_count,
    group_count,
    global_delivery_count,
    global_commission_total;
end;
$$;

create or replace function public.assign_distribution_experiment(
  p_kind text,
  p_post_id uuid,
  p_niche text
)
returns table (
  experiment_id uuid,
  experiment_name text,
  arm text,
  experiment_config jsonb,
  min_posts_per_arm integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing record;
  chosen record;
  assigned_arm text;
  bucket integer;
begin
  if p_kind not in ('timing','group_allocation') then
    raise exception 'Invalid distribution experiment kind: %', p_kind;
  end if;

  select
    dea.experiment_id,
    de.name as experiment_name,
    dea.arm,
    de.config as experiment_config,
    de.min_posts_per_arm
  into existing
  from public.distribution_experiment_assignments dea
  join public.distribution_experiments de on de.id = dea.experiment_id
  where dea.post_id = p_post_id
    and de.kind = p_kind
  order by dea.assigned_at desc
  limit 1;

  if existing.experiment_id is not null then
    return query select
      existing.experiment_id,
      existing.experiment_name,
      existing.arm,
      existing.experiment_config,
      existing.min_posts_per_arm;
    return;
  end if;

  select de.*
  into chosen
  from public.distribution_experiments de
  where de.kind = p_kind
    and de.status = 'running'
    and (de.niche is null or de.niche = p_niche)
    and (de.starts_at is null or de.starts_at <= now())
    and (de.ends_at is null or de.ends_at > now())
  order by
    case when de.niche = p_niche then 0 else 1 end,
    de.created_at asc
  limit 1;

  if chosen.id is null then
    return;
  end if;

  bucket := mod(
    abs(hashtextextended(
      p_post_id::text || '|' || chosen.id::text,
      0
    )),
    10000
  )::integer;

  assigned_arm := case
    when bucket < floor(chosen.treatment_share * 10000)::integer
      then 'treatment'
    else 'baseline'
  end;

  insert into public.distribution_experiment_assignments(
    experiment_id,
    post_id,
    arm
  )
  values(chosen.id, p_post_id, assigned_arm)
  on conflict (experiment_id, post_id) do nothing;

  return query select
    chosen.id,
    chosen.name,
    assigned_arm,
    chosen.config,
    chosen.min_posts_per_arm;
end;
$$;

create or replace function public.learned_delivery_eligible_after(
  p_niche text,
  p_reference timestamptz,
  p_max_delay_hours integer default 6,
  p_min_confidence numeric default 0.25
)
returns timestamptz
language sql
security definer
set search_path = ''
as $$
  with params as (
    select
      coalesce(p_reference, now()) as ref,
      greatest(0, least(coalesce(p_max_delay_hours, 6), 24)) as max_delay,
      greatest(0, least(coalesce(p_min_confidence, 0.25), 1)) as min_conf
  ),
  candidate_slots as (
    select
      gs.offset_hours,
      (
        date_trunc(
          'hour',
          params.ref at time zone 'America/Sao_Paulo'
        ) + make_interval(hours => gs.offset_hours)
      ) as local_slot
    from params
    cross join lateral generate_series(
      0,
      params.max_delay
    ) as gs(offset_hours)
  ),
  ranked as (
    select
      cs.offset_hours,
      cs.local_slot,
      tm.smoothed_commission_per_delivery,
      tm.sample_confidence
    from candidate_slots cs
    join public.distribution_timing_metrics tm
      on tm.niche = p_niche
     and tm.local_hour = extract(hour from cs.local_slot)::smallint
    cross join params
    where tm.sample_confidence >= params.min_conf
      and tm.smoothed_commission_per_delivery is not null
    order by
      tm.smoothed_commission_per_delivery desc,
      tm.sample_confidence desc,
      cs.offset_hours asc
    limit 1
  )
  select coalesce(
    greatest(
      (ranked.local_slot at time zone 'America/Sao_Paulo'),
      params.ref
    ),
    params.ref
  )
  from params
  left join ranked on true;
$$;

create or replace function public.distribution_experiment_performance(
  p_experiment_id uuid
)
returns table (
  arm text,
  assigned_posts bigint,
  successful_deliveries bigint,
  clicks bigint,
  conversions bigint,
  commission numeric,
  commission_per_post numeric,
  commission_per_delivery numeric,
  rpc numeric,
  sample_ready boolean
)
language sql
security definer
set search_path = ''
as $$
  with arms as (
    select 'baseline'::text as arm
    union all
    select 'treatment'::text
  ),
  config as (
    select min_posts_per_arm
    from public.distribution_experiments
    where id = p_experiment_id
  ),
  assigned as (
    select
      dea.arm,
      count(*)::bigint as posts
    from public.distribution_experiment_assignments dea
    where dea.experiment_id = p_experiment_id
    group by dea.arm
  ),
  delivery as (
    select
      dea.arm,
      count(d.id) filter (
        where d.status in ('accepted','confirmed')
      )::bigint as deliveries
    from public.distribution_experiment_assignments dea
    left join public.post_deliveries d on d.post_id = dea.post_id
    where dea.experiment_id = p_experiment_id
    group by dea.arm
  ),
  clicks as (
    select
      dea.arm,
      count(ce.id)::bigint as clicks
    from public.distribution_experiment_assignments dea
    join public.post_deliveries d on d.post_id = dea.post_id
    join public.click_events ce on ce.short_link_id = d.short_link_id
    where dea.experiment_id = p_experiment_id
      and ce.is_bot = false
    group by dea.arm
  ),
  conversion_money as (
    select
      dea.arm,
      count(distinct ca.conversion_id)::bigint as conversions,
      coalesce(
        sum(l.amount) filter (where l.status <> 'rejected'),
        0
      )::numeric as commission
    from public.distribution_experiment_assignments dea
    join public.post_deliveries d on d.post_id = dea.post_id
    join public.conversion_attributions ca on ca.delivery_id = d.id
    join public.conversions c on c.id = ca.conversion_id
    left join public.commission_ledger l on l.conversion_id = c.id
    where dea.experiment_id = p_experiment_id
    group by dea.arm
  )
  select
    arms.arm,
    coalesce(a.posts, 0),
    coalesce(d.deliveries, 0),
    coalesce(cl.clicks, 0),
    coalesce(cm.conversions, 0),
    coalesce(cm.commission, 0),
    case
      when coalesce(a.posts, 0) > 0
      then round(coalesce(cm.commission, 0) / a.posts::numeric, 8)
      else 0
    end,
    case
      when coalesce(d.deliveries, 0) > 0
      then round(coalesce(cm.commission, 0) / d.deliveries::numeric, 8)
      else 0
    end,
    case
      when coalesce(cl.clicks, 0) > 0
      then round(coalesce(cm.commission, 0) / cl.clicks::numeric, 8)
      else 0
    end,
    coalesce(a.posts, 0) >= config.min_posts_per_arm
  from arms
  cross join config
  left join assigned a on a.arm = arms.arm
  left join delivery d on d.arm = arms.arm
  left join clicks cl on cl.arm = arms.arm
  left join conversion_money cm on cm.arm = arms.arm
  order by arms.arm;
$$;

create or replace function public.fanout_post(p_post_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_row record;
  group_row record;
  delivery_key text;
  inserted_count integer := 0;
  affected integer := 0;
  timing_assignment record;
  allocation_assignment record;
  eligible_at timestamptz := now();
  timing_target_hour smallint;
  max_delay_hours integer := 6;
  timing_min_confidence numeric := 0.25;
  max_groups integer := 3;
  exploration_groups integer := 1;
  group_min_confidence numeric := 0.25;
begin
  select id, niche, status, created_at
  into post_row
  from public.posts
  where id = p_post_id;

  if post_row.id is null then
    raise exception 'Post not found: %', p_post_id;
  end if;

  if post_row.status in ('cancelled','sent') then
    return 0;
  end if;

  select *
  into timing_assignment
  from public.assign_distribution_experiment(
    'timing',
    post_row.id,
    post_row.niche
  );

  if timing_assignment.experiment_id is not null
     and timing_assignment.arm = 'treatment' then
    max_delay_hours := greatest(
      0,
      least(
        coalesce(
          nullif(
            timing_assignment.experiment_config->>'maxDelayHours',
            ''
          )::integer,
          6
        ),
        24
      )
    );

    timing_min_confidence := greatest(
      0,
      least(
        coalesce(
          nullif(
            timing_assignment.experiment_config->>'minConfidence',
            ''
          )::numeric,
          0.25
        ),
        1
      )
    );

    eligible_at := public.learned_delivery_eligible_after(
      post_row.niche,
      now(),
      max_delay_hours,
      timing_min_confidence
    );
  end if;

  timing_target_hour := extract(
    hour from eligible_at at time zone 'America/Sao_Paulo'
  )::smallint;

  select *
  into allocation_assignment
  from public.assign_distribution_experiment(
    'group_allocation',
    post_row.id,
    post_row.niche
  );

  if allocation_assignment.experiment_id is not null
     and allocation_assignment.arm = 'treatment' then
    max_groups := greatest(
      1,
      least(
        coalesce(
          nullif(
            allocation_assignment.experiment_config->>'maxGroups',
            ''
          )::integer,
          3
        ),
        50
      )
    );

    exploration_groups := greatest(
      0,
      least(
        coalesce(
          nullif(
            allocation_assignment.experiment_config->>'explorationGroups',
            ''
          )::integer,
          1
        ),
        max_groups
      )
    );

    group_min_confidence := greatest(
      0,
      least(
        coalesce(
          nullif(
            allocation_assignment.experiment_config->>'minConfidence',
            ''
          )::numeric,
          0.25
        ),
        1
      )
    );
  end if;

  for group_row in
    with candidates as (
      select
        g.id,
        g.account_id,
        gm.smoothed_commission_per_delivery,
        coalesce(gm.sample_confidence, 0) as sample_confidence,
        encode(
          digest(
            post_row.id::text || '|' || g.id::text,
            'sha256'
          ),
          'hex'
        ) as exploration_key
      from public.whatsapp_groups g
      join public.whatsapp_accounts a on a.id = g.account_id
      left join public.distribution_group_metrics gm on gm.group_id = g.id
      where g.active = true
        and a.enabled = true
        and (g.niche = post_row.niche or g.niche = 'general')
    ),
    exploit as (
      select c.*
      from candidates c
      where allocation_assignment.experiment_id is not null
        and allocation_assignment.arm = 'treatment'
        and c.sample_confidence >= group_min_confidence
        and c.smoothed_commission_per_delivery is not null
      order by
        c.smoothed_commission_per_delivery desc,
        c.sample_confidence desc,
        c.exploration_key
      limit greatest(0, max_groups - exploration_groups)
    ),
    explore as (
      select c.*
      from candidates c
      where allocation_assignment.experiment_id is not null
        and allocation_assignment.arm = 'treatment'
        and not exists (
          select 1 from exploit x where x.id = c.id
        )
      order by c.exploration_key
      limit exploration_groups
    ),
    treatment_selected as (
      select * from exploit
      union all
      select * from explore
    ),
    final_selected as (
      select c.*
      from candidates c
      where allocation_assignment.experiment_id is null
         or allocation_assignment.arm <> 'treatment'
      union all
      select ts.*
      from treatment_selected ts
      where allocation_assignment.experiment_id is not null
        and allocation_assignment.arm = 'treatment'
    )
    select *
    from final_selected
  loop
    delivery_key := 'delivery:' || encode(
      digest(post_row.id::text || '|' || group_row.id::text, 'sha256'),
      'hex'
    );

    insert into public.post_deliveries(
      post_id,
      group_id,
      account_id,
      idempotency_key,
      status,
      eligible_after,
      allocation_experiment_id,
      allocation_arm,
      allocation_reason,
      timing_experiment_id,
      timing_arm,
      timing_hour
    )
    values (
      post_row.id,
      group_row.id,
      group_row.account_id,
      delivery_key,
      'queued',
      case
        when timing_assignment.experiment_id is not null
         and timing_assignment.arm = 'treatment'
          then eligible_at
        else null
      end,
      allocation_assignment.experiment_id,
      allocation_assignment.arm,
      case
        when allocation_assignment.experiment_id is null then 'baseline:no_experiment'
        when allocation_assignment.arm = 'baseline' then 'baseline:all_groups'
        when group_row.sample_confidence >= group_min_confidence
         and group_row.smoothed_commission_per_delivery is not null
          then 'treatment:learned_or_exploration'
        else 'treatment:exploration'
      end,
      timing_assignment.experiment_id,
      timing_assignment.arm,
      case
        when timing_assignment.experiment_id is not null
          then timing_target_hour
        else null
      end
    )
    on conflict (post_id, group_id) do nothing;

    get diagnostics affected = row_count;
    inserted_count := inserted_count + affected;
  end loop;

  if exists(
    select 1 from public.post_deliveries where post_id = post_row.id
  ) then
    update public.posts
    set status = case when status = 'ready' then 'queued' else status end,
        updated_at = now()
    where id = post_row.id;
  end if;

  return inserted_count;
end;
$$;

create or replace function public.claim_next_delivery()
returns table (
  delivery_id uuid,
  post_id uuid,
  account_id uuid,
  group_id uuid,
  group_jid text,
  content text,
  attempt_count integer,
  idempotency_key text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_id uuid;
  quota record;
begin
  select * into quota from public.distribution_quota_status();

  select d.id into selected_id
  from public.post_deliveries d
  join public.posts p on p.id = d.post_id
  join public.whatsapp_groups g on g.id = d.group_id
  join public.whatsapp_accounts a on a.id = d.account_id
  where d.status in ('queued','failed')
    and (d.next_attempt_at is null or d.next_attempt_at <= now())
    and (d.eligible_after is null or d.eligible_after <= now())
    and p.status not in ('cancelled','sent')
    and (p.scheduled_at is null or p.scheduled_at <= now())
    and g.active = true
    and a.enabled = true
    and (
      p.first_sent_at is not null
      or quota.allowed = true
    )
  order by
    case when p.first_sent_at is not null then 0 else 1 end,
    coalesce(d.next_attempt_at, d.eligible_after, d.created_at),
    d.created_at
  for update of d skip locked
  limit 1;

  if selected_id is null then
    return;
  end if;

  update public.post_deliveries
  set status = 'sending',
      attempt_count = attempt_count + 1,
      last_error = null,
      updated_at = now()
  where id = selected_id;

  return query
  select
    d.id,
    d.post_id,
    d.account_id,
    d.group_id,
    g.group_jid,
    p.content,
    d.attempt_count,
    d.idempotency_key
  from public.post_deliveries d
  join public.posts p on p.id = d.post_id
  join public.whatsapp_groups g on g.id = d.group_id
  where d.id = selected_id;
end;
$$;

revoke all on function public.refresh_distribution_performance(integer)
  from public, anon, authenticated;
revoke all on function public.assign_distribution_experiment(text, uuid, text)
  from public, anon, authenticated;
revoke all on function public.learned_delivery_eligible_after(text, timestamptz, integer, numeric)
  from public, anon, authenticated;
revoke all on function public.distribution_experiment_performance(uuid)
  from public, anon, authenticated;

grant execute on function public.refresh_distribution_performance(integer) to service_role;
grant execute on function public.assign_distribution_experiment(text, uuid, text) to service_role;
grant execute on function public.learned_delivery_eligible_after(text, timestamptz, integer, numeric) to service_role;
grant execute on function public.distribution_experiment_performance(uuid) to service_role;
