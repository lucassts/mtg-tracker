-- MTG Tracker — oponentes, locais e partidas verificadas (RFC 001, fases 1 e 2)
--
-- Rode DEPOIS de schema.sql, no SQL Editor do projeto.
--
-- Princípios que o esquema precisa sustentar sozinho, sem depender do cliente:
--   · a base de meta não guarda quem jogou contra quem;
--   · local do tipo "casa" nunca chega aqui — fica no aparelho;
--   · a chave pública não lê nem escreve tabela direta: só chama função.

-- pg_trgm: semelhança de nome, usada para deduplicar locais.
create extension if not exists pg_trgm;

-- ─── Jogadores ──────────────────────────────────────────────
-- Uma linha por conta anônima. `display_name` é o apelido que a pessoa escolhe
-- para si; é o que aparece para quem a vincular.

create table if not exists public.players (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at   timestamptz not null default now(),
  constraint players_name_len check (char_length(display_name) <= 40)
);

alter table public.players enable row level security;

drop policy if exists "le o proprio jogador" on public.players;
create policy "le o proprio jogador" on public.players
  for select to authenticated using (id = auth.uid());

drop policy if exists "escreve o proprio jogador" on public.players;
create policy "escreve o proprio jogador" on public.players
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ─── Vínculos ───────────────────────────────────────────────
-- Guardado uma vez por par, sempre ordenado, para não existirem duas linhas
-- descrevendo a mesma relação.

create table if not exists public.player_links (
  low_id     uuid not null references public.players(id) on delete cascade,
  high_id    uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (low_id, high_id),
  constraint player_links_ordered check (low_id < high_id)
);

alter table public.player_links enable row level security;

drop policy if exists "le os proprios vinculos" on public.player_links;
create policy "le os proprios vinculos" on public.player_links
  for select to authenticated using (low_id = auth.uid() or high_id = auth.uid());

-- ─── Convites ───────────────────────────────────────────────

create table if not exists public.invites (
  code       text primary key,
  inviter_id uuid not null references public.players(id) on delete cascade,
  expires_at timestamptz not null,
  used_at    timestamptz,
  used_by    uuid references public.players(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists invites_inviter_idx on public.invites (inviter_id);

alter table public.invites enable row level security;
-- Nenhuma policy: o convite só é lido e escrito pelas funções abaixo, que
-- rodam como dono. Ler a tabela direto permitiria varrer códigos alheios.

-- ─── Reivindicações de partida ──────────────────────────────
-- O payload é o mesmo evento anônimo de sempre. Fica aqui até o oponente
-- confirmar; só então vira linha em matches_anon, com verified = true.

do $$ begin
  create type public.claim_status as enum ('pending', 'confirmed', 'disputed', 'expired');
exception when duplicate_object then null;
end $$;

create table if not exists public.match_claims (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.players(id) on delete cascade,
  opponent_id  uuid not null references public.players(id) on delete cascade,
  payload      jsonb not null,
  status       public.claim_status not null default 'pending',
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  constraint match_claims_not_self check (reporter_id <> opponent_id)
);

create index if not exists match_claims_opponent_idx
  on public.match_claims (opponent_id, status);
create index if not exists match_claims_reporter_idx
  on public.match_claims (reporter_id, status);

alter table public.match_claims enable row level security;

drop policy if exists "le as proprias reivindicacoes" on public.match_claims;
create policy "le as proprias reivindicacoes" on public.match_claims
  for select to authenticated
  using (reporter_id = auth.uid() or opponent_id = auth.uid());

-- ─── Locais ─────────────────────────────────────────────────
-- Só local público. Casa de alguém não chega até aqui: o app não envia, e a
-- constraint garante que um cliente com defeito também não consiga.

create table if not exists public.venues (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  kind       text not null,
  city       text not null default '',
  country    text not null default '',
  created_by uuid references public.players(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint venues_kind_ck check (kind in ('loja', 'evento', 'online')),
  constraint venues_name_len check (char_length(name) between 2 and 80),
  constraint venues_city_len check (char_length(city) <= 60)
);

/**
 * Chave de comparação de nome: minúsculas, sem acento, espaços colapsados.
 *
 * pg_trgm já ignora caixa, mas não acento — e "Loja do Zé" contra "Loja do Ze"
 * fica na fronteira do corte de similaridade. Nome de loja em português é
 * cheio de acento; sem normalizar, a base duplica exatamente onde não pode.
 *
 * `unaccent` faria isso, mas é extensão e o Supabase a instala em `extensions`,
 * fora do search_path fixo das funções abaixo. `translate` resolve sem isso.
 */
create or replace function public.venue_key(p text)
returns text
language sql
immutable
as $$
  select lower(translate(
    trim(regexp_replace(coalesce(p, ''), '\s+', ' ', 'g')),
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn'
  ));
$$;

create index if not exists venues_key_trgm_idx
  on public.venues using gin (public.venue_key(name) gin_trgm_ops);
create index if not exists venues_city_idx on public.venues (public.venue_key(city));

alter table public.venues enable row level security;

-- Qualquer pessoa autenticada lê a lista de locais: é uma base pública, e é
-- exatamente isso que evita cada um criar o seu.
drop policy if exists "todos leem locais" on public.venues;
create policy "todos leem locais" on public.venues
  for select to authenticated using (true);

-- Escrita só pela função, que deduplica antes de inserir.

-- ─── matches_anon ganha verified ────────────────────────────

alter table public.matches_anon
  add column if not exists verified boolean not null default false;

create index if not exists matches_anon_verified_idx
  on public.matches_anon (verified);

-- Local da partida, para ler o meta por loja. Guardado por id, nunca por
-- endereço, e nulo quando a partida foi em casa.
alter table public.matches_anon
  add column if not exists venue_id uuid references public.venues(id) on delete set null;

create index if not exists matches_anon_venue_idx on public.matches_anon (venue_id);

-- ─── Funções ────────────────────────────────────────────────

/**
 * Garante que a linha de players existe para o usuário autenticado.
 * Chamada no primeiro uso de qualquer função social.
 */
create or replace function public.ensure_player(p_display_name text default '')
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  me public.players;
begin
  if auth.uid() is null then
    raise exception 'precisa estar autenticado';
  end if;

  insert into public.players (id, display_name)
  values (auth.uid(), left(coalesce(p_display_name, ''), 40))
  on conflict (id) do update
    set display_name = case
      when excluded.display_name <> '' then excluded.display_name
      else public.players.display_name
    end
  returning * into me;

  return me;
end;
$$;

/**
 * Cria um convite de uso único, válido por 24 h.
 * O código é curto o bastante para caber num QR denso e legível.
 */
create or replace function public.create_invite()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
begin
  perform public.ensure_player();

  -- 12 hexadecimais de um uuid sorteado: ~2,8e14 combinações.
  --
  -- Sortear com `gen_random_bytes` seria mais direto, mas ela vem do pgcrypto,
  -- que no Supabase é instalado no schema `extensions` — fora do `search_path`
  -- fixo desta função. `gen_random_uuid` é nativa e resolve sem depender disso.
  new_code := upper(replace(substr(gen_random_uuid()::text, 1, 13), '-', ''));

  insert into public.invites (code, inviter_id, expires_at)
  values (new_code, auth.uid(), now() + interval '24 hours');

  return new_code;
end;
$$;

/**
 * Aceita um convite e cria o vínculo mútuo.
 * Devolve o apelido de quem convidou, para a outra ponta saber quem é.
 */
create or replace function public.redeem_invite(p_code text)
returns table (inviter_id uuid, inviter_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invites;
  me  uuid := auth.uid();
begin
  perform public.ensure_player();

  select * into inv from public.invites
  where code = upper(trim(p_code)) for update;

  if inv is null then raise exception 'convite não encontrado'; end if;
  if inv.used_at is not null then raise exception 'convite já usado'; end if;
  if inv.expires_at < now() then raise exception 'convite expirado'; end if;
  if inv.inviter_id = me then raise exception 'não dá para vincular consigo mesmo'; end if;

  update public.invites
    set used_at = now(), used_by = me
  where code = inv.code;

  insert into public.player_links (low_id, high_id)
  values (least(inv.inviter_id, me), greatest(inv.inviter_id, me))
  on conflict do nothing;

  return query
    select p.id, p.display_name from public.players p where p.id = inv.inviter_id;
end;
$$;

/**
 * Registra uma partida para o oponente confirmar.
 * Só vale entre jogadores já vinculados.
 */
create or replace function public.submit_claim(p_opponent uuid, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me       uuid := auth.uid();
  claim_id uuid;
begin
  perform public.ensure_player();

  if not exists (
    select 1 from public.player_links
    where low_id = least(me, p_opponent) and high_id = greatest(me, p_opponent)
  ) then
    raise exception 'sem vínculo com esse oponente';
  end if;

  insert into public.match_claims (reporter_id, opponent_id, payload)
  values (me, p_opponent, p_payload)
  returning id into claim_id;

  return claim_id;
end;
$$;

/**
 * Confirma ou contesta uma reivindicação. Só o oponente pode.
 * Confirmar promove o payload para matches_anon com verified = true.
 */
create or replace function public.resolve_claim(p_claim uuid, p_accept boolean)
returns public.claim_status
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.match_claims;
begin
  select * into c from public.match_claims where id = p_claim for update;

  if c is null then raise exception 'reivindicação não encontrada'; end if;
  if c.opponent_id <> auth.uid() then raise exception 'só o oponente resolve'; end if;
  if c.status <> 'pending' then raise exception 'já resolvida'; end if;

  update public.match_claims
    set status = case when p_accept then 'confirmed' else 'disputed' end::public.claim_status,
        resolved_at = now()
  where id = p_claim;

  if p_accept then
    -- Repare no que não é copiado: reporter_id e opponent_id ficam para trás.
    -- A base de meta registra que a partida foi verificada, não por quem.
    insert into public.matches_anon (
      event_id, install_id, format, archetype, my_deck, opp_deck,
      on_play, won, drew, played_week, app_version, verified, venue_id
    )
    select
      (c.payload ->> 'event_id')::uuid,
      (c.payload ->> 'install_id')::uuid,
      c.payload ->> 'format',
      c.payload ->> 'archetype',
      left(coalesce(c.payload ->> 'my_deck', ''), 80),
      left(coalesce(c.payload ->> 'opp_deck', ''), 80),
      (c.payload ->> 'on_play')::boolean,
      (c.payload ->> 'won')::boolean,
      coalesce((c.payload ->> 'drew')::boolean, false),
      c.payload ->> 'played_week',
      left(coalesce(c.payload ->> 'app_version', ''), 20),
      true,
      nullif(c.payload ->> 'venue_id', '')::uuid
    on conflict (event_id) do update set verified = true;
  end if;

  return (select status from public.match_claims where id = p_claim);
end;
$$;

/**
 * Busca de locais. Existe para ser chamada ANTES de criar qualquer local:
 * é ela que evita a base virar dez "Loja do Zé".
 *
 * Ordena por semelhança do nome e privilegia a mesma cidade.
 */
create or replace function public.search_venues(
  p_query text,
  p_city  text default '',
  p_limit int default 12
)
returns table (
  id uuid, name text, kind text, city text, country text, score real
)
language sql
stable
security definer
set search_path = public
as $$
  select v.id, v.name, v.kind, v.city, v.country,
         (similarity(public.venue_key(v.name), public.venue_key(p_query))
          + case
              when p_city <> '' and public.venue_key(v.city) = public.venue_key(p_city)
              then 0.3 else 0
            end
         )::real as score
  from public.venues v
  where p_query <> ''
    and (
      public.venue_key(v.name) like '%' || public.venue_key(p_query) || '%'
      or similarity(public.venue_key(v.name), public.venue_key(p_query)) > 0.2
    )
  order by score desc, v.name
  limit least(greatest(p_limit, 1), 50);
$$;

/**
 * Cria um local — ou devolve o que já existe.
 *
 * A deduplicação é do servidor de propósito: confiar no cliente para checar
 * antes de inserir é confiar que toda versão futura do app vai lembrar disso.
 * Nome parecido na mesma cidade é o mesmo lugar.
 */
create or replace function public.create_venue(
  p_name    text,
  p_kind    text,
  p_city    text default '',
  p_country text default ''
)
returns public.venues
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.venues;
  created  public.venues;
  clean_name text := trim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  clean_city text := trim(coalesce(p_city, ''));
begin
  perform public.ensure_player();

  if p_kind = 'casa' then
    raise exception 'local do tipo casa não vai para a base compartilhada';
  end if;

  select * into existing
  from public.venues v
  where public.venue_key(v.city) = public.venue_key(clean_city)
    and similarity(public.venue_key(v.name), public.venue_key(clean_name)) > 0.6
  order by similarity(public.venue_key(v.name), public.venue_key(clean_name)) desc
  limit 1;

  if existing.id is not null then
    return existing;
  end if;

  insert into public.venues (name, kind, city, country, created_by)
  values (clean_name, p_kind, clean_city, trim(coalesce(p_country, '')), auth.uid())
  returning * into created;

  return created;
end;
$$;

-- ─── Permissões ─────────────────────────────────────────────
-- `anon` (chave pública, sem login) segue só com ingest_matches.
-- O resto exige conta.

-- `venue_key` é pura e sem dado sensível; qualquer papel pode chamar.
grant execute on function public.venue_key(text) to anon, authenticated;

revoke all on function public.ensure_player(text)  from public;
revoke all on function public.create_invite()       from public;
revoke all on function public.redeem_invite(text)   from public;
revoke all on function public.submit_claim(uuid, jsonb) from public;
revoke all on function public.resolve_claim(uuid, boolean) from public;
revoke all on function public.search_venues(text, text, int) from public;
revoke all on function public.create_venue(text, text, text, text) from public;

grant execute on function public.ensure_player(text)  to authenticated;
grant execute on function public.create_invite()       to authenticated;
grant execute on function public.redeem_invite(text)   to authenticated;
grant execute on function public.submit_claim(uuid, jsonb) to authenticated;
grant execute on function public.resolve_claim(uuid, boolean) to authenticated;
grant execute on function public.search_venues(text, text, int) to authenticated;
grant execute on function public.create_venue(text, text, text, text) to authenticated;

-- ─── Views de análise ───────────────────────────────────────

create or replace view public.meta_by_venue as
select
  v.id as venue_id,
  v.name as venue_name,
  v.city,
  m.format,
  count(*)                                   as matches,
  count(*) filter (where m.verified)         as verified_matches,
  count(distinct m.install_id)               as devices,
  round(100.0 * count(*) filter (where m.won and not m.drew)
        / nullif(count(*), 0), 1)            as win_rate
from public.matches_anon m
join public.venues v on v.id = m.venue_id
group by v.id, v.name, v.city, m.format
having count(distinct m.install_id) >= 3;
