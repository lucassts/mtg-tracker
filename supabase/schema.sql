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
-- Com RLS ligada e apenas uma policy de INSERT, a chave `anon` consegue
-- escrever e nada mais: não lê, não altera, não apaga. Quem quiser analisar
-- usa a service_role no dashboard, que ignora RLS.

alter table public.matches_anon enable row level security;

drop policy if exists "anon pode inserir" on public.matches_anon;
create policy "anon pode inserir"
  on public.matches_anon
  for insert
  to anon
  with check (true);

-- Nenhuma policy de select/update/delete para `anon`: negado por padrão.

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
