-- MTG Tracker — contas por e-mail e amizades
--
-- Rode DEPOIS de schema.sql e schema_social.sql, no SQL Editor do projeto.
--
-- Substitui a conta anônima e o convite por código. O que muda de fato:
--
--   · a identidade passa a ser e-mail + apelido + senha, criados no app;
--   · o apelido é único e é por ele (ou pelo e-mail) que se acha alguém;
--   · vincular deixa de ser "gere um código, mostre o QR, o outro digita" e
--     vira pedido de amizade: mando, a pessoa aceita.
--
-- ATENÇÃO — passo manual no painel do Supabase, sem ele o cadastro não fecha:
--   1. Authentication → Sign In / Providers → Email
--   2. desligar "Confirm email"
--   3. Salvar
-- Com a confirmação ligada, o signUp devolve sessão nula e o app não tem como
-- prosseguir. É decisão consciente: não há verificação de e-mail neste produto.

-- ─── players ganha apelido ──────────────────────────────────
-- O apelido é a identidade pública: é o que o oponente vê e é por ele que se
-- procura alguém. Guardado em minúsculas porque `citext` mora no schema
-- `extensions` do Supabase, fora do search_path fixo das funções abaixo —
-- mesma armadilha do pgcrypto. Normalizar na escrita custa menos que depender
-- de um schema que estas funções não enxergam.

alter table public.players
  add column if not exists handle text;

update public.players set handle = 'jogador_' || left(id::text, 8)
where handle is null or handle = '';

alter table public.players
  alter column handle set not null;

do $$ begin
  alter table public.players
    add constraint players_handle_format
    check (handle ~ '^[a-z0-9_]{3,20}$');
exception when duplicate_object then null;
end $$;

create unique index if not exists players_handle_key on public.players (handle);

-- `display_name` continua existindo para não quebrar quem já leu a coluna,
-- mas espelha o apelido. A identidade é uma só.
update public.players set display_name = handle where display_name = '';

-- ─── Pedidos de amizade ─────────────────────────────────────

do $$ begin
  create type public.friend_status as enum ('pending', 'accepted', 'declined');
exception when duplicate_object then null;
end $$;

create table if not exists public.friend_requests (
  id          uuid primary key default gen_random_uuid(),
  from_id     uuid not null references public.players(id) on delete cascade,
  to_id       uuid not null references public.players(id) on delete cascade,
  status      public.friend_status not null default 'pending',
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  constraint friend_requests_not_self check (from_id <> to_id)
);

-- Um pedido pendente por par e por direção. Parcial de propósito: depois de
-- recusado, a pessoa pode tentar de novo — o que não pode é acumular dez
-- pendentes e virar spam na tela do outro.
create unique index if not exists friend_requests_pending_key
  on public.friend_requests (from_id, to_id)
  where status = 'pending';

create index if not exists friend_requests_to_idx
  on public.friend_requests (to_id, status);
create index if not exists friend_requests_from_idx
  on public.friend_requests (from_id, status);

alter table public.friend_requests enable row level security;

drop policy if exists "le os proprios pedidos" on public.friend_requests;
create policy "le os proprios pedidos" on public.friend_requests
  for select to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());

-- Escrita só pelas funções: quem cria o pedido precisa resolver o destinatário
-- a partir de e-mail ou apelido, e isso não pode passar pelo cliente.

-- ─── Funções ────────────────────────────────────────────────

/**
 * Cria ou atualiza a linha de players do usuário autenticado.
 *
 * Substitui `ensure_player`. O apelido é obrigatório e único; a colisão sobe
 * como erro próprio para a tela conseguir dizer "esse apelido já existe" em
 * vez de despejar a violação de índice.
 */
create or replace function public.register_player(p_handle text)
returns table (id uuid, handle text)
language plpgsql
security definer
set search_path = public
as $$
declare
  me    uuid := auth.uid();
  clean text := lower(trim(coalesce(p_handle, '')));
begin
  if me is null then
    raise exception 'precisa estar autenticado';
  end if;

  if clean !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'apelido inválido' using errcode = '22023';
  end if;

  if exists (select 1 from public.players p where p.handle = clean and p.id <> me) then
    raise exception 'apelido já em uso' using errcode = '23505';
  end if;

  insert into public.players (id, handle, display_name)
  values (me, clean, clean)
  on conflict (id) do update
    set handle = excluded.handle, display_name = excluded.handle;

  return query select p.id, p.handle from public.players p where p.id = me;
end;
$$;

/**
 * Acha alguém por apelido ou e-mail.
 *
 * Casamento exato, nunca parcial, e o e-mail nunca volta na resposta. As duas
 * coisas juntas são o que impede a função de virar um varredor de base: só
 * acha quem já sabe exatamente por quem está procurando, e o que recebe de
 * volta é o apelido, que já é público.
 */
create or replace function public.find_player(p_query text)
returns table (id uuid, handle text)
language plpgsql
security definer
set search_path = public
as $$
declare
  q text := lower(trim(coalesce(p_query, '')));
begin
  if auth.uid() is null then
    raise exception 'precisa estar autenticado';
  end if;
  if q = '' then
    return;
  end if;

  if position('@' in q) > 0 then
    return query
      select p.id, p.handle
      from public.players p
      join auth.users u on u.id = p.id
      where lower(u.email) = q
      limit 1;
  else
    return query
      select p.id, p.handle
      from public.players p
      where p.handle = ltrim(q, '@')
      limit 1;
  end if;
end;
$$;

/**
 * Manda pedido de amizade para um apelido ou e-mail.
 *
 * Se a outra pessoa já tinha mandado um pedido para você, aceita os dois de
 * uma vez em vez de criar um segundo pendente — dois pedidos cruzados são a
 * mesma intenção duas vezes, e obrigar alguém a aceitar depois de já ter
 * pedido seria burocracia sem função.
 */
create or replace function public.send_friend_request(p_query text)
returns table (request_id uuid, target_id uuid, target_handle text, already_friends boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  me     uuid := auth.uid();
  target record;
  crossed public.friend_requests;
  new_id uuid;
begin
  if me is null then raise exception 'precisa estar autenticado'; end if;

  select f.id, f.handle into target from public.find_player(p_query) f;
  if target.id is null then
    raise exception 'não achei ninguém com esse apelido ou e-mail' using errcode = 'P0002';
  end if;
  if target.id = me then
    raise exception 'esse é você' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.player_links
    where low_id = least(me, target.id) and high_id = greatest(me, target.id)
  ) then
    return query select null::uuid, target.id, target.handle, true;
    return;
  end if;

  -- Pedido cruzado: aceita na hora.
  select * into crossed from public.friend_requests
  where from_id = target.id and to_id = me and status = 'pending'
  for update;

  if crossed.id is not null then
    update public.friend_requests
      set status = 'accepted', resolved_at = now()
    where id = crossed.id;

    insert into public.player_links (low_id, high_id)
    values (least(me, target.id), greatest(me, target.id))
    on conflict do nothing;

    return query select crossed.id, target.id, target.handle, true;
    return;
  end if;

  insert into public.friend_requests (from_id, to_id)
  values (me, target.id)
  on conflict (from_id, to_id) where status = 'pending' do nothing
  returning id into new_id;

  if new_id is null then
    select fr.id into new_id from public.friend_requests fr
    where fr.from_id = me and fr.to_id = target.id and fr.status = 'pending';
  end if;

  return query select new_id, target.id, target.handle, false;
end;
$$;

/**
 * Aceita ou recusa um pedido. Só quem recebeu pode.
 * Aceitar cria o vínculo, que é o que libera confirmar partida.
 */
create or replace function public.resolve_friend_request(p_id uuid, p_accept boolean)
returns table (other_id uuid, other_handle text, status public.friend_status)
language plpgsql
security definer
set search_path = public
as $$
declare
  fr public.friend_requests;
  me uuid := auth.uid();
begin
  select * into fr from public.friend_requests where id = p_id for update;

  if fr.id is null then raise exception 'pedido não encontrado'; end if;
  if fr.to_id <> me then raise exception 'só quem recebeu pode responder'; end if;
  if fr.status <> 'pending' then raise exception 'pedido já respondido'; end if;

  update public.friend_requests
    set status = case when p_accept then 'accepted' else 'declined' end::public.friend_status,
        resolved_at = now()
  where id = p_id;

  if p_accept then
    insert into public.player_links (low_id, high_id)
    values (least(me, fr.from_id), greatest(me, fr.from_id))
    on conflict do nothing;
  end if;

  return query
    select p.id, p.handle,
           (case when p_accept then 'accepted' else 'declined' end)::public.friend_status
    from public.players p where p.id = fr.from_id;
end;
$$;

/** Pedidos pendentes nos dois sentidos, com o apelido do outro lado. */
create or replace function public.list_friend_requests()
returns table (
  id uuid, direction text, other_id uuid, other_handle text, created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select fr.id,
         case when fr.from_id = auth.uid() then 'out' else 'in' end,
         case when fr.from_id = auth.uid() then fr.to_id else fr.from_id end,
         p.handle,
         fr.created_at
  from public.friend_requests fr
  join public.players p
    on p.id = case when fr.from_id = auth.uid() then fr.to_id else fr.from_id end
  where fr.status = 'pending'
    and (fr.from_id = auth.uid() or fr.to_id = auth.uid())
  order by fr.created_at desc;
$$;

/** Quem já é amigo. É a lista que o app espelha em oponentes vinculados. */
create or replace function public.list_friends()
returns table (id uuid, handle text, since timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.handle, l.created_at
  from public.player_links l
  join public.players p
    on p.id = case when l.low_id = auth.uid() then l.high_id else l.low_id end
  where l.low_id = auth.uid() or l.high_id = auth.uid()
  order by p.handle;
$$;

/** Desfaz a amizade. Qualquer um dos dois lados pode. */
create or replace function public.remove_friend(p_other uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'precisa estar autenticado'; end if;
  delete from public.player_links
  where low_id = least(me, p_other) and high_id = greatest(me, p_other);
end;
$$;

-- ─── Permissões ─────────────────────────────────────────────

revoke all on function public.register_player(text)                from public;
revoke all on function public.find_player(text)                    from public;
revoke all on function public.send_friend_request(text)            from public;
revoke all on function public.resolve_friend_request(uuid, boolean) from public;
revoke all on function public.list_friend_requests()               from public;
revoke all on function public.list_friends()                       from public;
revoke all on function public.remove_friend(uuid)                  from public;

grant execute on function public.register_player(text)                to authenticated;
grant execute on function public.find_player(text)                    to authenticated;
grant execute on function public.send_friend_request(text)            to authenticated;
grant execute on function public.resolve_friend_request(uuid, boolean) to authenticated;
grant execute on function public.list_friend_requests()               to authenticated;
grant execute on function public.list_friends()                       to authenticated;
grant execute on function public.remove_friend(uuid)                  to authenticated;

-- ─── Aposentadoria dos convites ─────────────────────────────
-- O caminho por código deixa de existir. As funções saem antes da tabela para
-- não deixar rotina órfã chamável.

drop function if exists public.create_invite();
drop function if exists public.redeem_invite(text);
drop function if exists public.invite_status(text);
drop table if exists public.invites;

-- `ensure_player` sai junto: quem cria conta agora é `register_player`, e
-- deixar as duas convivendo permitiria criar jogador sem apelido.
drop function if exists public.ensure_player(text);

/**
 * As funções que chamavam `ensure_player` passam a exigir que a conta já
 * exista — o que é verdade desde o cadastro, que é o único caminho de entrada.
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
  if me is null then raise exception 'precisa estar autenticado'; end if;

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
  if auth.uid() is null then raise exception 'precisa estar autenticado'; end if;

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

grant execute on function public.submit_claim(uuid, jsonb) to authenticated;
grant execute on function public.create_venue(text, text, text, text) to authenticated;
