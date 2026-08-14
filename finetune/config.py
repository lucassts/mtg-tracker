"""
Configuração central do pipeline de fine-tuning.
Ajuste MODEL_ID para o Gemma que você baixou do HuggingFace/Kaggle.
"""

# ── Modelo base ───────────────────────────────────────────────────────────────
# Troque pelo ID exato do HuggingFace (ex: "google/gemma-3n-e2b-it")
MODEL_ID = "google/gemma-2-2b-it"

# Nome do adapter LoRA treinado (salvo em ./output/)
ADAPTER_NAME = "mtg-extractor-lora"

# Caminho final do modelo mesclado (para conversão)
MERGED_MODEL_DIR = "./merged_model"

# Arquivo LiteRT de saída (para o Android)
LITERT_OUTPUT_PATH = "./mtg_extractor.bin"

# ── Dataset ───────────────────────────────────────────────────────────────────
DATASET_TRAIN_PATH = "./dataset_train.jsonl"
DATASET_EVAL_PATH  = "./dataset_eval.jsonl"

# ── QLoRA ─────────────────────────────────────────────────────────────────────
LORA_R           = 8         # rank reduzido para caber em 6 GB VRAM
LORA_ALPHA       = 16        # deve ser 2x o rank
LORA_DROPOUT     = 0         # 0 ativa o fast-path do Unsloth (menos VRAM)
TARGET_MODULES   = [         # módulos a adaptar — cobre MHA + FFN para Gemma
    "q_proj", "k_proj", "v_proj", "o_proj",
    "gate_proj", "up_proj", "down_proj",
]

# ── Treino ────────────────────────────────────────────────────────────────────
MAX_SEQ_LEN      = 256       # reduzido: descrições de partidas cabem em 256 tokens
BATCH_SIZE       = 1         # 1 por GPU — máxima economia de VRAM
GRAD_ACCUM       = 16        # batch efetivo = 16 (mesmo que antes)
LR               = 2e-4
WARMUP_RATIO     = 0.05
EPOCHS           = 3
SAVE_STEPS       = 100
EVAL_STEPS       = 100
OUTPUT_DIR       = "./output"

# ── System prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = (
    "You are a Magic: The Gathering match data extractor. "
    "Given a natural language match description (in any language), "
    "extract structured data as JSON.\n\n"
    "Fields:\n"
    "- won: boolean — true if the match was won\n"
    "- drew: boolean — true if it was a draw (won must be false)\n"
    "- myDeck: string|null — the player's deck name\n"
    "- oppDeck: string|null — the opponent's deck name\n"
    "- format: \"Commander\"|\"Modern\"|\"Standard\"|\"Pioneer\"|"
              "\"Legacy\"|\"Pauper\"|\"Other\"|null\n"
    "- onPlay: boolean|null — true=went first (on the play), "
              "false=went second (on the draw)\n"
    "- archetype: \"Aggro\"|\"Midrange\"|\"Control\"|\"Combo\"|\"Stax\"|null "
                "— opponent's archetype\n\n"
    "Rules:\n"
    "- Use null for any field not mentioned or unclear.\n"
    "- drew defaults to false unless a draw is explicitly stated.\n"
    "- If drew is true, won must be false.\n"
    "- Respond with ONLY valid JSON. No explanation, no markdown."
)

