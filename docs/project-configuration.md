# ⚙️ Project Configuration

The project has been configured to use the following tools:

## ESLint

ESLint is a linting tool for JavaScript. By providing specific configuration defined in the`.eslintrc.js` file it prevents developers from making silly mistakes in their code and enforces consistency in the codebase.

[ESLint Configuration Example Code](../.eslintrc.js)

## Prettier

This is a great tool for formatting code. It enforces a consistent code style across your entire codebase. By utilizing the "format on save" feature in your IDE you can automatically format the code based on the configuration provided in the `.prettierrc` file. It will also give you good feedback when something is wrong with the code. If the auto-format doesn't work, something is wrong with the code.

[Prettier Configuration Example Code](../.prettierrc)

## TypeScript

ESLint is great for catching some of the bugs related to the language, but since JavaScript is a dynamic language ESLint cannot check data that run through the applications, which can lead to bugs, especially on larger projects. That is why TypeScript should be used. It is very useful during large refactors because it reports any issues you might miss otherwise. When refactoring, change the type declaration first, then fix all the TypeScript errors throughout the project and you are done. One thing you should keep in mind is that TypeScript does not protect your application from failing during runtime, it only does type checking during build time, but it increases development confidence drastically anyways.

## Absolute imports

Absolute imports should always be configured and used because it makes it easier to move files around and avoid messy import paths such as `../../../Component`. Wherever you move the file, all the imports will remain intact. Here is how to configure it:

For TypeScript (`tsconfig.json`) projects:

```json
"compilerOptions": {
		"strict": true,
		"baseUrl": ".",
		"paths": {
			"@/*": ["./*"]
		}
	}
```

[Configuration Example Code](../tsconfig.json)

## Supabase Profiles (SQL)

Add this table and policies in your Supabase project:

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  age int,
  avatar_url text,
  region_id int references public.regions(id),
  role text check (role in ('participant','organizer','both')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owners" on public.profiles
  for select using (auth.uid() = id);

create policy "Profiles can be upserted by owners" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Profiles can be updated by owners" on public.profiles
  for update using (auth.uid() = id);

create or replace function public.handle_profiles_updated()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profiles_updated on public.profiles;
create trigger on_profiles_updated
  before update on public.profiles
  for each row execute function public.handle_profiles_updated();
```

Create a public storage bucket and allow authenticated uploads:

```sql
insert into storage.buckets (id, name, public) values ('public', 'public', true)
  on conflict (id) do nothing;

-- Allow users to read public files
create policy "Public read" on storage.objects
  for select using (bucket_id = 'public');

-- Allow owners to upload/update their own avatar files
create policy "Authenticated can upload to public" on storage.objects
  for insert with check (bucket_id = 'public' and auth.role() = 'authenticated');
create policy "Authenticated can update own files" on storage.objects
  for update using (bucket_id = 'public' and auth.role() = 'authenticated');
```

Create regions table and seed French regions:

```sql
create table if not exists public.regions (
  id serial primary key,
  code text unique,
  name text not null
);

insert into public.regions (code, name) values
  ('84','Auvergne-Rhône-Alpes'),
  ('27','Bourgogne-Franche-Comté'),
  ('53','Bretagne'),
  ('24','Centre-Val de Loire'),
  ('94','Corse'),
  ('44','Grand Est'),
  ('32','Hauts-de-France'),
  ('11','Île-de-France'),
  ('28','Normandie'),
  ('75','Nouvelle-Aquitaine'),
  ('76','Occitanie'),
  ('52','Pays de la Loire'),
  ('93','Provence-Alpes-Côte d\'Azur'),
  ('01','Guadeloupe'),
  ('02','Martinique'),
  ('03','Guyane'),
  ('04','La Réunion'),
  ('06','Mayotte')
on conflict (code) do nothing;
```

Create sports tables and seed (with emoji):

```sql
create table if not exists public.sports (
  id serial primary key,
  code text unique,
  name text not null,
  emoji text
);

create table if not exists public.user_sports (
  user_id uuid references auth.users(id) on delete cascade,
  sport_id int references public.sports(id) on delete cascade,
  primary key (user_id, sport_id)
);

alter table public.user_sports enable row level security;

create policy "user can select own sports" on public.user_sports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Seed sports with emojis
insert into public.sports (code, name, emoji) values
  ('running','Course à pied','🏃'),
  ('cycling','Cyclisme','🚴'),
  ('swimming','Natation','🏊'),
  ('football','Football','⚽'),
  ('basketball','Basketball','🏀'),
  ('tennis','Tennis','🎾'),
  ('badminton','Badminton','🏸'),
  ('yoga','Yoga','🧘'),
  ('gym','Musculation/Fitness','🏋️'),
  ('volleyball','Volleyball','🏐'),
  ('rugby','Rugby','🏉'),
  ('handball','Handball','🤾'),
  ('boxing','Boxe','🥊'),
  ('mma','MMA','🥊'),
  ('karate','Karaté','🥋'),
  ('judo','Judo','🥋'),
  ('dance','Danse','💃'),
  ('escalade','Escalade','🧗'),
  ('ski','Ski','🎿'),
  ('surf','Surf','🏄'),
  ('skateboard','Skateboard','🛹'),
  ('golf','Golf','⛳'),
  ('table_tennis','Tennis de table','🏓'),
  ('hiking','Randonnée','🥾'),
  ('climbing','Escalade','🧗'),
  ('e_sport','E-sport','🎮')
on conflict (code) do nothing;
```

Create events table and policies:

```sql
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text,
  start_at timestamptz,
  level text check (level in ('beginner','intermediate','advanced','all')) default 'all',
  capacity int check (capacity between 1 and 100),
  sport_id int references public.sports(id),
  city text,
  address_text text,
  place_id text,
  latitude double precision,
  longitude double precision,
  cover_url text,
  created_at timestamptz default now()
);

-- Registrations
create table if not exists public.event_registrations (
  event_id uuid references public.events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (event_id, user_id)
);

alter table public.event_registrations enable row level security;

create policy "users can manage their registrations" on public.event_registrations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Registration workflow with status & capacity enforcement
alter table public.event_registrations
  add column if not exists status text
    check (status in ('pending','approved','rejected')) default 'pending',
  add column if not exists approved_at timestamptz;

create policy "owner can update registration status" on public.event_registrations
  for update using (
    exists (
      select 1 from public.events e
      where e.id = event_registrations.event_id and e.owner_id = auth.uid()
    )
  );

create policy "owner can view registrations" on public.event_registrations
  for select using (
    exists (
      select 1 from public.events e
      where e.id = event_registrations.event_id and e.owner_id = auth.uid()
    )
  );

create or replace function public.enforce_capacity()
returns trigger as $$
begin
  if NEW.status = 'approved' and (select count(*) from public.event_registrations
    where event_id = NEW.event_id and status = 'approved')
    >= (select capacity from public.events where id = NEW.event_id) then
    raise exception 'Capacity reached';
  end if;
  if NEW.status = 'approved' and (TG_OP = 'UPDATE' and OLD.status is distinct from 'approved') then
    NEW.approved_at := now();
  end if;
  return NEW;
end; $$ language plpgsql;

drop trigger if exists trg_enforce_capacity on public.event_registrations;
create trigger trg_enforce_capacity
before insert or update on public.event_registrations
for each row execute function public.enforce_capacity();

alter table public.events enable row level security;

create policy "events are viewable by all" on public.events
  for select using (true);

create policy "owners can insert events" on public.events
  for insert with check (auth.uid() = owner_id);
  

create policy "owners can update their events" on public.events
  for update using (auth.uid() = owner_id);

create policy "owners can delete their events" on public.events
  for delete using (auth.uid() = owner_id);
```

Messaging (optional): conversations and auto-group on approval

```sql
-- Conversations (group chat per event)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  title text,
  created_at timestamptz default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

-- Policies: members can read/write their conversations/messages
create policy "members can read conversations" on public.conversations
  for select using (
    exists (
      select 1 from public.conversation_members m
      where m.conversation_id = conversations.id and m.user_id = auth.uid()
    )
  );

create policy "members can list/join" on public.conversation_members
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "members can read messages" on public.messages
  for select using (
    exists (
      select 1 from public.conversation_members m
      where m.conversation_id = messages.conversation_id and m.user_id = auth.uid()
    )
  );

create policy "members can send messages" on public.messages
  for insert with check (
    exists (
      select 1 from public.conversation_members m
      where m.conversation_id = messages.conversation_id and m.user_id = auth.uid()
    )
  );

-- Helper: ensure a conversation exists for the event
create or replace function public.ensure_event_conversation(p_event_id uuid)
returns uuid as $$
declare conv_id uuid;
begin
  select id into conv_id from public.conversations where event_id = p_event_id;
  if conv_id is null then
    insert into public.conversations(event_id, title)
    values (p_event_id, 'Conversation de l\'événement')
    returning id into conv_id;
  end if;
  return conv_id;
end; $$ language plpgsql security definer;

-- Trigger: on registration approved, create conversation and add organizer + participant
create or replace function public.handle_registration_approved()
returns trigger as $$
declare conv uuid;
declare org_id uuid;
begin
  if NEW.status = 'approved' and (TG_OP = 'INSERT' or NEW.status is distinct from OLD.status) then
    select owner_id into org_id from public.events where id = NEW.event_id;
    conv := public.ensure_event_conversation(NEW.event_id);
    insert into public.conversation_members(conversation_id, user_id)
      values (conv, NEW.user_id)
      on conflict do nothing;
    if org_id is not null then
      insert into public.conversation_members(conversation_id, user_id)
        values (conv, org_id)
        on conflict do nothing;
    end if;
  end if;
  return NEW;
end; $$ language plpgsql;

drop trigger if exists trg_registration_to_chat on public.event_registrations;
create trigger trg_registration_to_chat
after insert or update on public.event_registrations
for each row execute function public.handle_registration_approved();
```
