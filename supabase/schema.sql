-- ============================================================
-- Sudoku: base de datos en Supabase
-- Pegá TODO este archivo en Supabase → SQL Editor → New query → Run.
-- Se puede correr más de una vez sin romper nada.
-- ============================================================

-- Perfiles (uno por usuario)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_.]{3,20}$'),
  first_name text check (char_length(first_name) <= 40),
  last_name text check (char_length(last_name) <= 40),
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "perfiles visibles" on public.profiles;
create policy "perfiles visibles" on public.profiles
  for select using (true);

drop policy if exists "editar mi perfil" on public.profiles;
create policy "editar mi perfil" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- El perfil se crea solo al registrarse (con los datos del formulario)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, first_name, last_name)
  values (
    new.id,
    lower(new.raw_user_meta_data ->> 'username'),
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Resultados de partidas terminadas
create table if not exists public.results (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  level text not null,
  seconds integer not null check (seconds > 0 and seconds < 86400),
  errors integer not null default 0 check (errors >= 0),
  hints_used integer not null default 0 check (hints_used between 0 and 3),
  created_at timestamptz not null default now()
);

create index if not exists results_level_seconds on public.results (level, seconds);
create index if not exists results_user_level on public.results (user_id, level, seconds);

alter table public.results enable row level security;

drop policy if exists "resultados visibles" on public.results;
create policy "resultados visibles" on public.results
  for select using (true);

drop policy if exists "guardar mis resultados" on public.results;
create policy "guardar mis resultados" on public.results
  for insert with check (auth.uid() = user_id);

-- Ranking global: el mejor tiempo de cada jugador en un nivel
create or replace function public.global_ranking(lvl text, lim integer default 10)
returns table (
  user_id uuid,
  username text,
  first_name text,
  last_name text,
  avatar_url text,
  seconds integer,
  errors integer,
  hints_used integer,
  created_at timestamptz
)
language sql
stable
set search_path = public
as $$
  select b.user_id, p.username, p.first_name, p.last_name, p.avatar_url,
         b.seconds, b.errors, b.hints_used, b.created_at
  from (
    select distinct on (r.user_id) r.*
    from public.results r
    where r.level = lvl
    order by r.user_id, r.seconds, r.errors, r.created_at
  ) b
  join public.profiles p on p.id = b.user_id
  order by b.seconds, b.errors, b.created_at
  limit lim;
$$;

-- Fotos de perfil (bucket público, cada uno escribe solo en su carpeta)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "avatars visibles" on storage.objects;
create policy "avatars visibles" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "subir mi avatar" on storage.objects;
create policy "subir mi avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "cambiar mi avatar" on storage.objects;
create policy "cambiar mi avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "borrar mi avatar" on storage.objects;
create policy "borrar mi avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- La función del trigger no tiene que poder llamarse desde la API
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Niveles válidos
alter table public.results drop constraint if exists results_level_check;
alter table public.results add constraint results_level_check
  check (level in ('principiante', 'facil', 'medio', 'dificil', 'experto', 'maestro'));
