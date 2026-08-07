create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  full_name text not null,
  email text not null unique,
  phone text,
  bio text,
  avatar_url text,
  joined_at timestamptz not null default now(),
  total_paid numeric(12,2) not null default 0,
  total_owed numeric(12,2) not null default 0,
  total_receivable numeric(12,2) not null default 0,
  groups_joined integer not null default 0,
  groups_created integer not null default 0,
  recent_activity jsonb not null default '[]'::jsonb
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  group_id text not null unique,
  name text not null,
  description text not null default '',
  image_url text,
  currency text not null default 'INR',
  start_date date not null default current_date,
  end_date date,
  month integer not null,
  year integer not null,
  budget_limit numeric(12,2),
  category text,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'moderator', 'member')),
  status text not null default 'approved' check (status in ('approved', 'pending', 'rejected')),
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null,
  description text not null default '',
  amount numeric(12,2) not null check (amount >= 0),
  payer_id uuid not null references public.profiles(id) on delete cascade,
  split_method text not null check (split_method in ('equal', 'percentage', 'custom', 'weighted', 'exact')),
  category text not null,
  tags text[] not null default '{}'::text[],
  notes text,
  expense_date timestamptz not null,
  gps_location text,
  receipt_url text,
  status text not null default 'active' check (status in ('active', 'deleted', 'restored')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  month_key text not null,
  deleted_at timestamptz
);

create table if not exists public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  value numeric(12,2) not null,
  unique (expense_id, user_id)
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  status text not null default 'pending' check (status in ('paid', 'pending', 'partial', 'cancelled')),
  note text,
  proof_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade,
  title text not null,
  description text,
  reminder_at timestamptz not null,
  recurring_rule text,
  attachment_url text,
  enabled boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  details text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references public.expenses(id) on delete cascade,
  reminder_id uuid references public.reminders(id) on delete cascade,
  file_url text not null,
  file_name text not null,
  mime_type text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.export_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  format text not null,
  file_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  id uuid primary key references public.profiles(id) on delete cascade,
  theme text not null default 'system',
  language text not null default 'en',
  app_lock_enabled boolean not null default false,
  pin_hash text,
  biometric_enabled boolean not null default false,
  notifications_enabled boolean not null default true,
  backup_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  invite_code text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.user_deletions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  deleted_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements enable row level security;
alter table public.reminders enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;
alter table public.receipts enable row level security;
alter table public.export_history enable row level security;
alter table public.user_preferences enable row level security;
alter table public.group_invites enable row level security;
alter table public.user_deletions enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, username, full_name, email, joined_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    now()
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.generate_group_code()
returns trigger
language plpgsql
as $$
begin
  if new.group_id is null or new.group_id = '' then
    new.group_id := 'SPLT-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  end if;
  return new;
end;
$$;

create trigger ensure_group_code
before insert on public.groups
for each row execute procedure public.generate_group_code();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger touch_groups_updated_at before update on public.groups for each row execute procedure public.touch_updated_at();
create trigger touch_expenses_updated_at before update on public.expenses for each row execute procedure public.touch_updated_at();
create trigger touch_settlements_updated_at before update on public.settlements for each row execute procedure public.touch_updated_at();
create trigger touch_reminders_updated_at before update on public.reminders for each row execute procedure public.touch_updated_at();
create trigger touch_preferences_updated_at before update on public.user_preferences for each row execute procedure public.touch_updated_at();

create policy "profiles self read" on public.profiles for select using (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "groups member read" on public.groups for select using (
  exists (
    select 1 from public.group_members gm where gm.group_id = groups.id and gm.user_id = auth.uid() and gm.status = 'approved'
  ) or owner_id = auth.uid()
);
create policy "groups owner write" on public.groups for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "members read" on public.group_members for select using (
  user_id = auth.uid() or exists (select 1 from public.groups g where g.id = group_members.group_id and g.owner_id = auth.uid())
);
create policy "members write" on public.group_members for all using (
  exists (select 1 from public.groups g where g.id = group_members.group_id and g.owner_id = auth.uid())
) with check (
  exists (select 1 from public.groups g where g.id = group_members.group_id and g.owner_id = auth.uid())
);
create policy "expenses group access" on public.expenses for all using (
  exists (select 1 from public.group_members gm where gm.group_id = expenses.group_id and gm.user_id = auth.uid() and gm.status = 'approved') or
  exists (select 1 from public.groups g where g.id = expenses.group_id and g.owner_id = auth.uid())
) with check (
  exists (select 1 from public.group_members gm where gm.group_id = expenses.group_id and gm.user_id = auth.uid() and gm.status = 'approved') or
  exists (select 1 from public.groups g where g.id = expenses.group_id and g.owner_id = auth.uid())
);
create policy "expense_splits access" on public.expense_splits for all using (
  exists (select 1 from public.expenses e where e.id = expense_splits.expense_id and (
    exists (select 1 from public.group_members gm where gm.group_id = e.group_id and gm.user_id = auth.uid() and gm.status = 'approved') or
    exists (select 1 from public.groups g where g.id = e.group_id and g.owner_id = auth.uid())
  ))
) with check (
  exists (select 1 from public.expenses e where e.id = expense_splits.expense_id and (
    exists (select 1 from public.group_members gm where gm.group_id = e.group_id and gm.user_id = auth.uid() and gm.status = 'approved') or
    exists (select 1 from public.groups g where g.id = e.group_id and g.owner_id = auth.uid())
  ))
);
create policy "settlements access" on public.settlements for all using (
  exists (select 1 from public.group_members gm where gm.group_id = settlements.group_id and gm.user_id = auth.uid() and gm.status = 'approved') or
  exists (select 1 from public.groups g where g.id = settlements.group_id and g.owner_id = auth.uid())
) with check (
  exists (select 1 from public.group_members gm where gm.group_id = settlements.group_id and gm.user_id = auth.uid() and gm.status = 'approved') or
  exists (select 1 from public.groups g where g.id = settlements.group_id and g.owner_id = auth.uid())
);
create policy "reminders access" on public.reminders for all using (
  created_by = auth.uid() or exists (select 1 from public.groups g where g.id = reminders.group_id and g.owner_id = auth.uid())
) with check (
  created_by = auth.uid() or exists (select 1 from public.groups g where g.id = reminders.group_id and g.owner_id = auth.uid())
);
create policy "notifications owner" on public.notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "activity access" on public.activity_logs for select using (
  actor_id = auth.uid() or exists (select 1 from public.groups g where g.id = activity_logs.group_id and g.owner_id = auth.uid())
);
create policy "receipts access" on public.receipts for all using (
  created_by = auth.uid() or exists (select 1 from public.expenses e where e.id = receipts.expense_id and exists (select 1 from public.groups g where g.id = e.group_id and g.owner_id = auth.uid()))
) with check (
  created_by = auth.uid() or exists (select 1 from public.expenses e where e.id = receipts.expense_id and exists (select 1 from public.groups g where g.id = e.group_id and g.owner_id = auth.uid()))
);
create policy "exports owner" on public.export_history for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "preferences owner" on public.user_preferences for all using (id = auth.uid()) with check (id = auth.uid());
create policy "invites access" on public.group_invites for select using (
  created_by = auth.uid() or exists (select 1 from public.groups g where g.id = group_invites.group_id and g.owner_id = auth.uid())
);
create policy "deletions owner" on public.user_deletions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
