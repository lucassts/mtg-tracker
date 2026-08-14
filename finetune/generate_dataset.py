"""
Gera o dataset de fine-tuning para extração de dados de partidas de MTG.

Lê os 131 decks canônicos de ../database_decks.csv e usa seus nomes EXATOS
como valor de saída no JSON — garantindo que o modelo aprenda a mapear
apelidos/variações para o nome canônico do banco de dados.

Saída: dataset_train.jsonl (~1800 exemplos) + dataset_eval.jsonl (~200 exemplos)
"""

import csv
import json
import random
import os
from config import SYSTEM_PROMPT, DATASET_TRAIN_PATH, DATASET_EVAL_PATH

random.seed(42)

# ── Mapeamento de arquétipos CSV → arquétipos do app ─────────────────────────
# O CSV tem arquétipos detalhados (Tempo, Big Mana, Prison…)
# O app usa apenas 5: Aggro | Midrange | Control | Combo | Stax
ARCHETYPE_MAP: dict[str, str] = {
    "Aggro":              "Aggro",
    "Aggro-Combo":        "Aggro",
    "Aggro-Control":      "Control",
    "Aggro-Prison":       "Stax",
    "Aggro-Stompy":       "Aggro",
    "Aggro-Tempo":        "Aggro",
    "Big Mana":           "Midrange",
    "Big Mana/Combo":     "Combo",
    "Combo":              "Combo",
    "Combo-Aggro":        "Combo",
    "Combo-Control":      "Combo",
    "Combo-Midrange":     "Combo",
    "Combo-Stax":         "Stax",
    "Combo/Big Mana":     "Combo",
    "Control":            "Control",
    "Control-Combo":      "Combo",
    "Control-Tempo":      "Control",
    "Midrange":           "Midrange",
    "Midrange-Combo":     "Combo",
    "Midrange-Control":   "Control",
    "Midrange/Big Mana":  "Midrange",
    "Midrange/Control":   "Control",
    "Midrange/Discard":   "Midrange",
    "Midrange/Tempo":     "Midrange",
    "Prison":             "Stax",
    "Prison/Control":     "Stax",
    "Ramp/Combo":         "Combo",
    "Stax/Aggro":         "Stax",
    "Tax/Aggro":          "Aggro",
    "Tempo":              "Aggro",        # Tempo → Aggro (mais próximo)
    "Tempo-Control":      "Control",
    "Tempo/Spells":       "Aggro",
    "Tempo/Value":        "Midrange",
    "Midrange-Combo":     "Combo",
}

def map_archetype(raw: str) -> str:
    """Converte arquétipo do CSV para o formato do app."""
    return ARCHETYPE_MAP.get(raw.strip(), "Midrange")

# ── Mapeamento de formatos CSV → formatos do app ──────────────────────────────
FORMAT_MAP: dict[str, str] = {
    "Legacy":           "Legacy",
    "Modern":           "Modern",
    "Modern (Banned)":  "Modern",       # ban-list decks → Modern
    "Pioneer":          "Pioneer",
    "Standard":         "Standard",
    "Vintage":          "Other",
    "Pauper":           "Pauper",
    "cEDH":             "Commander",
    "Premodern":        "Other",
}

def map_format(raw: str) -> str:
    return FORMAT_MAP.get(raw.strip(), "Other")

# ── Carregar deck DB do CSV ────────────────────────────────────────────────────
def load_deck_db(csv_path: str) -> list[tuple[str, str, str]]:
    """
    Retorna lista de (nome_canonico, arquétipo_app, formato_app)
    para todos os 131 decks do banco de dados.
    """
    decks = []
    base = os.path.dirname(os.path.abspath(__file__))
    full_path = os.path.join(base, csv_path)
    with open(full_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name      = row["Nome do Deck"].strip()
            archetype = map_archetype(row["Arquétipo"])
            fmt       = map_format(row["Formato"])
            decks.append((name, archetype, fmt))
    return decks

DECK_DB = load_deck_db("../database_decks.csv")

# ── Dicionário de apelidos/aliases ────────────────────────────────────────────
# Chave = apelido coloquial (como um jogador pode dizer)
# Valor = nome canônico EXATO do CSV
#
# O modelo aprende: INPUT com apelido → OUTPUT com nome canônico
ALIASES: dict[str, str] = {
    # Modern
    "Rhinos":               "Crashing Footfalls",
    "Cascade Rhinos":       "Crashing Footfalls",
    "Footfalls":            "Crashing Footfalls",
    "Rinocerontes":         "Crashing Footfalls",
    "Tron":                 "Mono-Green Tron",
    "Green Tron":           "Mono-Green Tron",
    "Tron verde":           "Mono-Green Tron",
    "Eldrazi Tron":         "Eldrazi Tron",
    "E-Tron":               "Eldrazi Tron",
    "Scam":                 "Rakdos Scam",
    "Rakdos Scam":          "Rakdos Scam",
    "Shadow":               "Grixis Shadow",
    "Death Shadow":         "Grixis Shadow",
    "Grixis Shadow":        "Grixis Shadow",
    "Jund Shadow":          "Jund Shadow",
    "Murktide":             "Izzet Murktide",
    "Yawg":                 "Yawgmoth Evolution",
    "Yawgmoth":             "Yawgmoth Evolution",
    "Hammer":               "Hammer Time",
    "Hammertime":           "Hammer Time",
    "Burn":                 "Burn (Boros)",
    "Boros Burn":           "Burn (Boros)",
    "4C Omnath":            "4C Omnath",
    "Omnath":               "4C Omnath",
    "Amulet":               "Amulet Titan",
    "Titan":                "Amulet Titan",
    "Scales":               "Hardened Scales",
    "Affinity":             "Affinity (Classic)",
    "Twin":                 "Splinter Twin (UR)",
    "Splinter Twin":        "Splinter Twin (UR)",
    "Pod":                  "Birthing Pod",
    # Legacy
    "ANT":                  "ANT (Ad Nauseam Tendrils)",
    "Ad Nauseam":           "ANT (Ad Nauseam Tendrils)",
    "TES":                  "TES (The Epic Storm)",
    "Storm":                "TES (The Epic Storm)",
    "Sneak and Show":       "Sneak and Show",
    "SNS":                  "Sneak and Show",
    "Reanimator":           "Reanimator (BR)",
    "BR Reanimator":        "Reanimator (BR)",
    "UB Reanimator":        "Reanimator (UB)",
    "Death and Taxes":      "Death and Taxes",
    "DnT":                  "Death and Taxes",
    "Maverick":             "Maverick (GW)",
    "Elves":                "Elves (Cradle)",
    "Elf":                  "Elves (Cradle)",
    "Elfes":                "Elves (Cradle)",
    "Grixis Delver":        "Grixis Delver",
    "RUG Delver":           "RUG Delver (Temur)",
    "UR Delver":            "UR Delver",
    "Delver":               "Grixis Delver",
    "Depths":               "Turbo Depths",
    "Turbo Depths":         "Turbo Depths",
    "Lands":                "Lands (RG)",
    "8Cast":                "8-Cast",
    "Doomsday":             "Turbo Doomsday",
    "Cloudpost":            "Cloudpost (12-Post)",
    "12 Post":              "Cloudpost (12-Post)",
    "Hogaak":               "Hogaak Depth",
    "Goblins":              "Goblins (Lackey)",
    "Merfolk":              "Merfolk",
    "Painter":              "Painter's Servant (Shortcake)",
    "Painter's Servant":    "Painter's Servant (Shortcake)",
    "Jund":                 "Punishing Jund",
    "Red Prison":           "Mono-Red Prison",
    "Blood Moon":           "Mono-Red Prison",
    # Pioneer
    "Amalia":               "Abzan Greasefang",
    "Greasefang":           "Abzan Greasefang",
    "Mono Green":           "Mono-Green Devotion",
    "Devotion":             "Mono-Green Devotion",
    "Lotus":                "Lotus Field Combo",
    "Lotus Field":          "Lotus Field Combo",
    "Convoke":              "Boros Convoke",
    "Spirits":              "Spirits (Mono U)",
    "Niv":                  "Niv-to-Light (5C)",
    "Niv Mizzet":           "Niv-to-Light (5C)",
    "Humans":               "Humans (Mono W)",
    "Mono White":           "Humans (Mono W)",
    "Izzet Phoenix":        "Izzet Phoenix",
    "Phoenix":              "Izzet Phoenix",
    # Standard (histórico)
    "Caw Blade":            "Caw-Blade (UW)",
    "Caw-Blade":            "Caw-Blade (UW)",
    "Faeries":              "Faeries (UB)",
    "Psychatog":            "Psychatog",
    "Ravager":              "Ravager Affinity",
    "Hazoret":              "Hazoret Red",
    "Hazoret Red":          "Hazoret Red",
    "Temur Energy":         "Temur Energy",
    "Oko":                  "Oko Food",
    "Teferi":               "Teferi Control",
    "Domain":               "Domain Ramp",
    "Valakut":              "Valakut Ramp",
    "Dragonstorm":          "Dragonstorm",
    # cEDH / Commander
    "Blue Farm":            "Blue Farm",
    "Najeela":              "Najeela Tempo",
    "Winota":               "Winota Stax",
    "Kinnan":               "Kinnan Big Mana",
    "Magda":                "Magda Clock",
    "Tivit":                "Tivit Control",
    "Stella Lee":           "Stella Lee Combo",
    # Pauper
    "Bogles":               "Bogles",
    "Kuldotha":             "Kuldotha Red",
    "Izzet Skred":          "Izzet Skred",
    "Caw Gates":            "Caw-Gates",
    # Vintage
    "Shops":                "Ravager Shops",
    "Workshop":             "Ravager Shops",
    "Golos Shops":          "Golos Shops",
    "Paradoxical Outcome":  "Paradoxical Outcome",
    "PO":                   "Paradoxical Outcome",
    "Tinker":               "Tinker Citadel",
    "Oath":                 "Oath of Druids",
    "Dredge":               "Dredge",
    "White Initiative":     "White Initiative",
    # Premodern
    "Trix":                 "Trix (Illusions/Donate)",
    "Donate":               "Trix (Illusions/Donate)",
    "Stasis":               "Stasis",
    "Sligh":                "Sligh",
    "The Rock":             "The Rock (BG)",
    "Survival":             "Survival of the Fittest",
    "Threshold":            "Threshold (UG/W)",
    "Landstill":            "Landstill (UW/UR)",
    "Parfait":              "Parfait",
    "Psychatog Prem":       "Psychatog",
    "Dreadnought":          "Dreadnought (Stifle-Nought)",
    "Stiflenought":         "Stiflenought (UW)",
}

# Mapeamento inverso: nome canônico → lista de apelidos
CANON_TO_ALIASES: dict[str, list[str]] = {}
for alias, canon in ALIASES.items():
    CANON_TO_ALIASES.setdefault(canon, []).append(alias)


def get_input_names(canonical: str) -> list[str]:
    """Retorna o nome canônico + todos os apelidos conhecidos para input."""
    aliases = CANON_TO_ALIASES.get(canonical, [])
    return [canonical] + aliases


# ── Templates de descrição de partidas ───────────────────────────────────────

TEMPLATES = {
    "pt-BR": {
        "win": [
            "Venci o {opp} com meu {my} no {fmt}, {turn}.",
            "Ganhei jogando {my} contra {opp} no {fmt}. {turn_cap}.",
            "Mais uma vitória! {my} passou por cima do {opp}. {fmt}. {turn}.",
            "Venci o {opp}. Joguei {my} no {fmt}, {turn}.",
            "Derrubei o {opp} com {my}, formato {fmt}, {turn}.",
            "W! {my} vs {opp}, {fmt}, {turn}.",
            "Ganhei fácil com {my} contra {opp} no {fmt}. {turn_cap}.",
            "Vitória com {my} no {fmt}, adversário jogava {opp}.",
            "{my} venceu o {opp} no {fmt}. {turn_cap}.",
            "Jogo {my}, venci o {opp} no {fmt}.",
            "Mais um W com {my} contra {opp}, {fmt}, {turn}.",
            "Consegui vencer o {opp} com {my}. {fmt}, {turn_cap}.",
        ],
        "loss": [
            "Perdi pro {opp} com meu {my} no {fmt}, {turn}.",
            "Tomei de {opp} jogando {my}. Formato {fmt}. {turn_cap}.",
            "Derrota. {opp} me eliminou, eu estava com {my} no {fmt}. {turn}.",
            "L pra mim. {my} contra {opp} no {fmt}, {turn}.",
            "Fui eliminado pelo {opp}, joguei {my} no {fmt}. {turn_cap}.",
            "Morri pro {opp} com {my}. {fmt}. {turn}.",
            "Derrota feinha pro {opp}, estava jogando {my} no {fmt}. {turn_cap}.",
            "{opp} me bateu, eu com {my} no {fmt}. {turn}.",
            "Não consegui, {opp} venceu contra meu {my} no {fmt}.",
            "Perdi fácil pro {opp} jogando {my} no {fmt}. {turn_cap}.",
        ],
        "draw": [
            "Empatei com o {opp} jogando {my} no {fmt}.",
            "Deu empate. Joguei {my} contra {opp} no {fmt}.",
            "Partida terminou empatada, {my} vs {opp} no {fmt}.",
            "Empate com {opp}, eu com {my} no {fmt}.",
            "Ficou empatado. {my} vs {opp}, formato {fmt}.",
        ],
        "on_play":  ["comecei", "fui primeiro", "tive a iniciativa", "comecei jogando", "eu comecei"],
        "on_draw":  ["estava sacando", "fui segundo", "ele começou", "puxei primeiro", "adversário começou"],
    },
    "en-US": {
        "win": [
            "Won against {opp} with my {my} in {fmt}, {turn}.",
            "Beat {opp} playing {my} in {fmt}. {turn_cap}.",
            "W! {my} crushed {opp} in {fmt}. {turn}.",
            "Another win with {my} vs {opp}, {fmt}, {turn}.",
            "Took down {opp} with {my} in {fmt}. {turn_cap}.",
            "Victory! {my} over {opp}, {fmt}, {turn}.",
            "Won easily with {my} against {opp} in {fmt}.",
            "{my} beat {opp} in {fmt}. {turn_cap}.",
            "Got the W vs {opp}, playing {my} in {fmt}, {turn}.",
            "Defeated {opp} with {my}, {fmt} format. {turn_cap}.",
        ],
        "loss": [
            "Lost to {opp} with my {my} in {fmt}, {turn}.",
            "Got beaten by {opp} playing {my} in {fmt}. {turn_cap}.",
            "L to {opp}. I was on {my} in {fmt}, {turn}.",
            "Died to {opp} with {my} in {fmt}. {turn_cap}.",
            "Took an L vs {opp}, my {my} in {fmt}, {turn}.",
            "Got demolished by {opp}, playing {my}, {fmt}, {turn}.",
            "{opp} beat me, I was playing {my} in {fmt}. {turn_cap}.",
            "Lost with {my} to {opp} in {fmt}.",
            "{opp} got me. {my}, {fmt}, {turn}.",
        ],
        "loss": [
            "Lost to {opp} with my {my} in {fmt}, {turn}.",
            "Got beaten by {opp} playing {my} in {fmt}. {turn_cap}.",
            "L to {opp}. I was on {my} in {fmt}, {turn}.",
            "Died to {opp} with {my} in {fmt}. {turn_cap}.",
            "Took an L vs {opp}, my {my} in {fmt}, {turn}.",
            "{opp} got me. {my}, {fmt}, {turn}.",
        ],
        "draw": [
            "Drew with {opp} playing {my} in {fmt}.",
            "It was a draw. {my} vs {opp} in {fmt}.",
            "Match ended in a draw, {my} against {opp}, {fmt}.",
            "Tied with {opp}, I had {my} in {fmt}.",
        ],
        "on_play":  ["was on the play", "went first", "had the play", "I went first", "on the play"],
        "on_draw":  ["was on the draw", "went second", "drew first", "they went first", "on the draw"],
    },
    "ja-JP": {
        "win": [
            "{fmt}で{opp}に{my}で勝った。{turn}。",
            "{my}で{opp}に勝ち。{fmt}。{turn_cap}。",
            "勝利！{fmt}、{my}対{opp}。{turn}。",
            "{opp}を{my}で倒した。{fmt}。{turn_cap}。",
            "{my}で{opp}に圧勝。{fmt}、{turn}。",
        ],
        "loss": [
            "{fmt}で{opp}に{my}で負けた。{turn}。",
            "{my}で{opp}に敗北。{fmt}。{turn_cap}。",
            "負けた。{fmt}、{my}対{opp}。{turn}。",
            "{opp}に{my}でやられた。{fmt}。{turn_cap}。",
        ],
        "draw": [
            "{fmt}で{opp}と{my}で引き分けた。",
            "{my}対{opp}、{fmt}で引き分け。",
            "引き分け。{fmt}、{my}対{opp}。",
        ],
        "on_play":  ["先攻だった", "先手を取った", "先攻でした", "私が先攻"],
        "on_draw":  ["後攻だった", "後手でした", "後攻でした", "相手が先攻"],
    },
}

TEMPLATES_NO_TURN = {
    "pt-BR": {
        "win":  ["Venci o {opp} com {my} no {fmt}.", "Ganhei de {opp} jogando {my}. Formato {fmt}.", "{my} bateu {opp} no {fmt}."],
        "loss": ["Perdi pro {opp} com {my} no {fmt}.", "{opp} me bateu jogando {my} no {fmt}.", "Derrota para {opp}, eu estava com {my} no {fmt}."],
        "draw": ["Empatei com {opp}, {my}, {fmt}.", "Empate com {opp} no {fmt}."],
    },
    "en-US": {
        "win":  ["Beat {opp} with {my} in {fmt}.", "Won vs {opp}, playing {my}, {fmt} format.", "{my} beat {opp} in {fmt}."],
        "loss": ["Lost to {opp} with {my} in {fmt}.", "{opp} beat me, I had {my} in {fmt}.", "Took an L to {opp}, was on {my}, {fmt}."],
        "draw": ["Draw with {opp}, {my}, {fmt}.", "Tied vs {opp} in {fmt}."],
    },
    "ja-JP": {
        "win":  ["{fmt}で{my}が{opp}に勝利。", "{opp}に{my}で勝ち、{fmt}。"],
        "loss": ["{fmt}で{my}が{opp}に敗北。", "{opp}に{my}で負けた、{fmt}。"],
        "draw": ["{fmt}で{opp}と引き分け。"],
    },
}

TEMPLATES_NO_FORMAT = {
    "pt-BR": {
        "win":  ["Venci o {opp} com {my}. {turn_cap}.", "Ganhei de {opp} jogando {my}. {turn}.", "Vitória! {my} passou pelo {opp}."],
        "loss": ["Perdi pro {opp} com {my}. {turn_cap}.", "Tomei de {opp}, estava com {my}. {turn}."],
        "draw": ["Empatei com {opp} jogando {my}."],
    },
    "en-US": {
        "win":  ["Beat {opp} with {my}. {turn_cap}.", "Won with {my} against {opp}. {turn}."],
        "loss": ["Lost to {opp} with {my}. {turn_cap}.", "Got beaten by {opp}, had {my}. {turn}."],
        "draw": ["Drew with {opp}, was on {my}."],
    },
    "ja-JP": {
        "win":  ["{my}で{opp}に勝ち。{turn_cap}。"],
        "loss": ["{my}で{opp}に敗北。{turn}。"],
        "draw": ["{opp}と引き分け、{my}使用。"],
    },
}


def make_example(result: str, my_deck: tuple, opp_deck: tuple,
                 lang: str, with_turn: bool, with_format: bool,
                 use_alias_my: bool = False, use_alias_opp: bool = True) -> dict | None:
    """
    Monta um exemplo completo de treino.

    use_alias_opp: se True, usa um apelido do opp_deck no INPUT (mas o OUTPUT
                   sempre tem o nome canônico).
    """
    my_canon, my_arch, my_fmt    = my_deck
    opp_canon, opp_arch, opp_fmt = opp_deck

    fmt = my_fmt or opp_fmt

    # Nome que aparecerá no input (pode ser apelido)
    my_input_candidates  = get_input_names(my_canon)
    opp_input_candidates = get_input_names(opp_canon)
    my_input  = random.choice(my_input_candidates)  if use_alias_my  else my_canon
    opp_input = random.choice(opp_input_candidates) if use_alias_opp else opp_canon

    on_play_val: bool | None = None
    turn_str = ""
    turn_cap_str = ""

    if with_turn:
        on_play_val = random.choice([True, False])
        turns = TEMPLATES[lang]["on_play"] if on_play_val else TEMPLATES[lang]["on_draw"]
        turn_str     = random.choice(turns)
        turn_cap_str = turn_str.capitalize()

    try:
        if with_turn and with_format:
            tmpl = random.choice(TEMPLATES[lang][result])
            text = tmpl.format(my=my_input, opp=opp_input, fmt=fmt,
                               turn=turn_str, turn_cap=turn_cap_str)
        elif with_format and not with_turn:
            pool = TEMPLATES_NO_TURN.get(lang, {}).get(result, [])
            if not pool:
                return None
            text = random.choice(pool).format(my=my_input, opp=opp_input, fmt=fmt)
        elif with_turn and not with_format:
            pool = TEMPLATES_NO_FORMAT.get(lang, {}).get(result, [])
            if not pool:
                return None
            text = random.choice(pool).format(my=my_input, opp=opp_input,
                                              turn=turn_str, turn_cap=turn_cap_str)
        else:
            pool = TEMPLATES_NO_TURN.get(lang, {}).get(result, [])
            if not pool:
                return None
            text = random.choice(pool).format(my=my_input, opp=opp_input, fmt="")
            text = text.replace(", .", ".").replace(",.", ".").strip()
    except (KeyError, IndexError):
        return None

    # JSON de saída usa SEMPRE o nome canônico
    output = {
        "won":       result == "win",
        "drew":      result == "draw",
        "myDeck":    my_canon,
        "oppDeck":   opp_canon,
        "format":    fmt if with_format else None,
        "onPlay":    on_play_val,
        "archetype": opp_arch,
    }

    return {
        "messages": [
            {"role": "system",    "content": SYSTEM_PROMPT},
            {"role": "user",      "content": text},
            {"role": "assistant", "content": json.dumps(output, ensure_ascii=False)},
        ]
    }


def make_edge_cases() -> list[dict]:
    """Exemplos manuais para cobrir casos que os templates não geram."""
    cases = []

    # Sem deck names
    cases += [
        {"messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": "Venci uma partida de Modern hoje, fui o primeiro."}, {"role": "assistant", "content": json.dumps({"won": True, "drew": False, "myDeck": None, "oppDeck": None, "format": "Modern", "onPlay": True, "archetype": None})}]},
        {"messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": "Lost a game of Commander tonight."}, {"role": "assistant", "content": json.dumps({"won": False, "drew": False, "myDeck": None, "oppDeck": None, "format": "Commander", "onPlay": None, "archetype": None})}]},
        {"messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": "コマンダーで勝ちました。"}, {"role": "assistant", "content": json.dumps({"won": True, "drew": False, "myDeck": None, "oppDeck": None, "format": "Commander", "onPlay": None, "archetype": None})}]},
    ]

    # Só meu deck
    cases += [
        {"messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": "Perdi com meu Rhinos no Modern, estava sacando."}, {"role": "assistant", "content": json.dumps({"won": False, "drew": False, "myDeck": "Crashing Footfalls", "oppDeck": None, "format": "Modern", "onPlay": False, "archetype": None})}]},
        {"messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": "Won with my Burn deck, was on the play."}, {"role": "assistant", "content": json.dumps({"won": True, "drew": False, "myDeck": "Burn (Boros)", "oppDeck": None, "format": None, "onPlay": True, "archetype": None})}]},
        {"messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": "Living End で負けました。後攻でした。"}, {"role": "assistant", "content": json.dumps({"won": False, "drew": False, "myDeck": "Living End", "oppDeck": None, "format": None, "onPlay": False, "archetype": None})}]},
    ]

    # Apelidos importantes que o modelo deve aprender
    cases += [
        {"messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": "W vs Tron com Rhinos, Modern, comecei."}, {"role": "assistant", "content": json.dumps({"won": True, "drew": False, "myDeck": "Crashing Footfalls", "oppDeck": "Mono-Green Tron", "format": "Modern", "onPlay": True, "archetype": "Midrange"})}]},
        {"messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": "Lost to Hammer in Modern, on the draw."}, {"role": "assistant", "content": json.dumps({"won": False, "drew": False, "myDeck": None, "oppDeck": "Hammer Time", "format": "Modern", "onPlay": False, "archetype": "Aggro"})}]},
        {"messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": "Venci o Shadow com Yawg no Modern, fui segundo."}, {"role": "assistant", "content": json.dumps({"won": True, "drew": False, "myDeck": "Yawgmoth Evolution", "oppDeck": "Grixis Shadow", "format": "Modern", "onPlay": False, "archetype": "Midrange"})}]},
        {"messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": "Perdi pro ANT no Legacy com Elves. Comecei."}, {"role": "assistant", "content": json.dumps({"won": False, "drew": False, "myDeck": "Elves (Cradle)", "oppDeck": "ANT (Ad Nauseam Tendrils)", "format": "Legacy", "onPlay": True, "archetype": "Combo"})}]},
        {"messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": "Beat Caw Blade with Delver in Legacy, was on the play."}, {"role": "assistant", "content": json.dumps({"won": True, "drew": False, "myDeck": "Grixis Delver", "oppDeck": "Caw-Blade (UW)", "format": "Legacy", "onPlay": True, "archetype": "Control"})}]},
        {"messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": "Ganhei de Najeela com Blue Farm no cEDH."}, {"role": "assistant", "content": json.dumps({"won": True, "drew": False, "myDeck": "Blue Farm", "oppDeck": "Najeela Tempo", "format": "Commander", "onPlay": None, "archetype": "Aggro"})}]},
    ]

    # Empates
    cases += [
        {"messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": "Empatei no Commander hoje à noite."}, {"role": "assistant", "content": json.dumps({"won": False, "drew": True, "myDeck": None, "oppDeck": None, "format": "Commander", "onPlay": None, "archetype": None})}]},
        {"messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": "It was a draw. Modern format, I had Living End."}, {"role": "assistant", "content": json.dumps({"won": False, "drew": True, "myDeck": "Living End", "oppDeck": None, "format": "Modern", "onPlay": None, "archetype": None})}]},
        {"messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": "Deu empate entre Rhinos e Tron no Modern."}, {"role": "assistant", "content": json.dumps({"won": False, "drew": True, "myDeck": "Crashing Footfalls", "oppDeck": "Mono-Green Tron", "format": "Modern", "onPlay": None, "archetype": "Midrange"})}]},
    ]

    # Gíria / muito curto
    cases += [
        {"messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": "W vs Shadow, fui eu primeiro, Modern."}, {"role": "assistant", "content": json.dumps({"won": True, "drew": False, "myDeck": None, "oppDeck": "Grixis Shadow", "format": "Modern", "onPlay": True, "archetype": "Midrange"})}]},
        {"messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": "L to Burn, was on the draw. Modern."}, {"role": "assistant", "content": json.dumps({"won": False, "drew": False, "myDeck": None, "oppDeck": "Burn (Boros)", "format": "Modern", "onPlay": False, "archetype": "Aggro"})}]},
        {"messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": "負け。先攻。Burn。Modern。"}, {"role": "assistant", "content": json.dumps({"won": False, "drew": False, "myDeck": None, "oppDeck": "Burn (Boros)", "format": "Modern", "onPlay": True, "archetype": "Aggro"})}]},
    ]

    # Descrições longas com contexto extra (só os campos válidos)
    cases += [
        {"messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": "Joguei Rhinos no Modern contra Burn hoje. Comecei e consegui fazer o combo no turno 4. Boa partida, adversário jogou bem mas não conseguiu me matar a tempo."}, {"role": "assistant", "content": json.dumps({"won": True, "drew": False, "myDeck": "Crashing Footfalls", "oppDeck": "Burn (Boros)", "format": "Modern", "onPlay": True, "archetype": "Aggro"})}]},
        {"messages": [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": "Really tough game in Commander tonight. I was piloting Blue Farm and went up against Najeela. I went second and just couldn't stop the swing. Lost in like turn 5."}, {"role": "assistant", "content": json.dumps({"won": False, "drew": False, "myDeck": "Blue Farm", "oppDeck": "Najeela Tempo", "format": "Commander", "onPlay": False, "archetype": "Aggro"})}]},
    ]

    return cases


def generate_dataset(target_size: int = 2000) -> list[dict]:
    examples = []
    langs    = ["pt-BR", "en-US", "ja-JP"]
    results  = ["win", "loss", "draw"]
    weights  = [0.45, 0.45, 0.10]

    attempts     = 0
    max_attempts = target_size * 10

    while len(examples) < target_size and attempts < max_attempts:
        attempts += 1
        lang   = random.choice(langs)
        result = random.choices(results, weights=weights)[0]

        my_deck  = random.choice(DECK_DB)
        opp_deck = random.choice(DECK_DB)
        while opp_deck == my_deck:
            opp_deck = random.choice(DECK_DB)

        with_turn   = random.random() < 0.70
        with_format = random.random() < 0.80
        # 50% das vezes usa apelido no oponente (quando existe)
        use_alias = random.random() < 0.50

        ex = make_example(result, my_deck, opp_deck, lang,
                          with_turn, with_format,
                          use_alias_my=use_alias, use_alias_opp=use_alias)
        if ex:
            examples.append(ex)

    examples += make_edge_cases()
    random.shuffle(examples)
    return examples


def write_jsonl(examples: list[dict], path: str):
    with open(path, "w", encoding="utf-8") as f:
        for ex in examples:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")
    print(f"  → {len(examples):,} exemplos em {path}")


if __name__ == "__main__":
    print(f"Decks carregados do CSV: {len(DECK_DB)}")
    print("Gerando dataset...")
    all_examples = generate_dataset(target_size=2000)

    split = int(len(all_examples) * 0.9)
    write_jsonl(all_examples[:split], DATASET_TRAIN_PATH)
    write_jsonl(all_examples[split:],  DATASET_EVAL_PATH)
    print("Pronto.")
