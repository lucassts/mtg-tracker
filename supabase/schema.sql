-- MTG Tracker — esquema da telemetria anônima
--
-- Rode isto uma vez no SQL Editor do projeto Supabase.
-- Ele cria a tabela que recebe os eventos, tranca a leitura e libera apenas a
-- inserção pela chave `anon` — que é pública por estar embutida no app.
--
-- O que este esquema NÃO guarda, de propósito: nome, e-mail, conta, texto livre,
-- transcrição, data exata da partida, IP, localização.

create table if not exists public.matches_anon (
  -- Sorteado no aparelho. Serve para deduplicar reenvios; é a chave da
  -- idempotência que faz `resolution=ignore-duplicates` funcionar.
  event_id     uuid primary key,

  -- Identifica o aparelho, não a pessoa. Some quando o usuário apaga os dados.
  install_id   uuid not null,

  format       text not null,
  archetype    text not null,
  my_deck      text not null default '',
  opp_deck     text not null default '',
  on_play      boolean not null,
  won          boolean not null,
  drew         boolean not null default false,

  -- Semana ISO (AAAA-Www). Granularidade proposital: dá para ver o meta evoluir
  -- sem saber em que dia e hora a pessoa jogou.
  played_week  text not null,

  app_version  text not null default '',

  -- Carimbo do servidor, útil para medir atraso de fila e para limpeza.
  received_at  timestamptz not null default now(),

  constraint matches_anon_format_ck check (
    format in ('Commander','Modern','Standard','Pioneer','Legacy','Pauper','Draft','Other')
  ),
  constraint matches_anon_archetype_ck check (
    archetype in ('Aggro','Midrange','Control','Combo','Stax')
  ),
  constraint matches_anon_week_ck check (played_week ~ '^\d{4}-W\d{2}$'),
  -- Nome de deck é texto livre digitado pelo usuário: limita para não virar
  -- um campo onde dá para despejar qualquer coisa.
  constraint matches_anon_my_deck_ck check (char_length(my_deck) <= 80),
  constraint matches_anon_opp_deck_ck check (char_length(opp_deck) <= 80)
);

create index if not exists matches_anon_week_idx    on public.matches_anon (played_week);
create index if not exists matches_anon_format_idx  on public.matches_anon (format);
create index if not exists matches_anon_install_idx on public.matches_anon (install_id);

-- ── Row Level Security ──────────────────────────────────────
-- RLS ligada e NENHUMA policy para `anon`: a chave pública não lê, não escreve,
-- não altera e não apaga a tabela diretamente. O único caminho de entrada é a
-- função `ingest_matches` abaixo. Quem quiser analisar usa a service_role no
-- dashboard, que ignora RLS.

alter table public.matches_anon enable row level security;

-- Remove a policy da primeira versão do esquema, que permitia insert direto.
drop policy if exists "anon pode inserir" on public.matches_anon;

-- ── Ingestão idempotente ────────────────────────────────────
--
-- Por que uma função em vez de inserir direto na tabela:
--
-- O caminho óbvio seria POST na tabela com `Prefer: resolution=ignore-duplicates`.
-- Só que isso é um upsert para o PostgREST, e upsert exige permissão de UPDATE.
-- Dar UPDATE ao `anon` deixaria qualquer pessoa sobrescrever linhas alheias.
--
-- Sem o ignore-duplicates, reenviar um lote que na verdade chegou devolve 409 e
-- derruba o lote inteiro — a fila do aparelho travaria para sempre no primeiro
-- reenvio, que é exatamente o caso em que a resposta se perdeu mas o servidor
-- gravou.
--
-- `security definer` + `on conflict do nothing` resolve os dois: reenvio é
-- silenciosamente ignorado e o `anon` nunca ganha UPDATE.

create or replace function public.ingest_matches(events jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted integer;
begin
  if jsonb_typeof(events) <> 'array' then
    raise exception 'events precisa ser um array json';
  end if;

  -- Teto por chamada: o app manda lotes de 50.
  if jsonb_array_length(events) > 100 then
    raise exception 'lote grande demais (max 100)';
  end if;

  insert into public.matches_anon (
    event_id, install_id, format, archetype, my_deck, opp_deck,
    on_play, won, drew, played_week, app_version
  )
  select
    (e ->> 'event_id')::uuid,
    (e ->> 'install_id')::uuid,
    e ->> 'format',
    e ->> 'archetype',
    left(coalesce(e ->> 'my_deck', ''), 80),
    left(coalesce(e ->> 'opp_deck', ''), 80),
    (e ->> 'on_play')::boolean,
    (e ->> 'won')::boolean,
    coalesce((e ->> 'drew')::boolean, false),
    e ->> 'played_week',
    left(coalesce(e ->> 'app_version', ''), 20)
  from jsonb_array_elements(events) as e
  on conflict (event_id) do nothing;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

revoke all on function public.ingest_matches(jsonb) from public;
grant execute on function public.ingest_matches(jsonb) to anon;

-- ── Visões de análise ───────────────────────────────────────
-- Materializar não é necessário no começo; são views simples.

create or replace view public.meta_by_format as
select
  format,
  played_week,
  count(*)                                             as matches,
  count(*) filter (where won and not drew)             as wins,
  count(*) filter (where drew)                         as draws,
  round(
    100.0 * count(*) filter (where won and not drew)
    / nullif(count(*), 0)
  , 1)                                                 as win_rate
from public.matches_anon
group by format, played_week;

create or replace view public.meta_by_deck as
select
  format,
  my_deck,
  count(*)                                             as matches,
  count(distinct install_id)                           as devices,
  round(
    100.0 * count(*) filter (where won and not drew)
    / nullif(count(*), 0)
  , 1)                                                 as win_rate
from public.matches_anon
where my_deck <> ''
group by format, my_deck
-- Corta a cauda longa: um deck jogado por um aparelho só não é sinal de meta,
-- e agrupar pouca gente é justamente o que reidentifica.
having count(distinct install_id) >= 5;
