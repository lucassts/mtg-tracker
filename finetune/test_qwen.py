"""
test_qwen.py
Testa o Qwen2.5-0.5B-Instruct (sem fine-tuning) para extração de dados de partidas MTG.

Uso:
  python test_qwen.py

O modelo é baixado automaticamente na primeira execução (~350 MB).
"""

import json
import os
import urllib.request

# ── Configuração ──────────────────────────────────────────────────────────────

MODEL_URL  = (
    "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/"
    "qwen2.5-0.5b-instruct-q4_k_m.gguf"
)
MODEL_PATH = os.path.expanduser("~/mtg_tracker/finetune/qwen2.5-0.5b-q4km.gguf")

SYSTEM_PROMPT = (
    "You are a Magic: The Gathering match data extractor. "
    "Given a natural language match description (in any language), "
    "extract structured data as JSON.\n\n"
    "Fields:\n"
    "- won: boolean — true if the match was won\n"
    "- drew: boolean — true if it was a draw (won must be false)\n"
    "- myDeck: string|null — the player's deck name\n"
    "- oppDeck: string|null — the opponent's deck name\n"
    '- format: "Commander"|"Modern"|"Standard"|"Pioneer"|"Legacy"|"Pauper"|"Other"|null\n'
    "- onPlay: boolean|null — true=went first (on the play), false=went second\n"
    '- archetype: "Aggro"|"Midrange"|"Control"|"Combo"|"Stax"|null — opponent archetype\n\n'
    "Rules:\n"
    "- Use null for any field not mentioned or unclear.\n"
    "- drew defaults to false unless explicitly stated.\n"
    "- If drew is true, won must be false.\n"
    "- Respond with ONLY valid JSON. No explanation, no markdown."
)

TESTS = [
    # PT-BR
    "Venci o Tron com meu Rhinos no Modern, fui primeiro.",
    "Perdi para Hammer Time no Modern, estava no draw.",
    "Ganhei de Najeela com Blue Farm no cEDH.",
    "Derrota contra Living End, ele foi primeiro, eu estava com Yawgmoth.",
    "Empate bizarro contra Amulet Titan no Modern.",
    # EN
    "Lost to Burn playing Murktide in Modern, was on the draw.",
    "Won with my Humans list against a Control deck in Pioneer.",
    "Beat Edgar Markov with Kinnan in a casual Commander game.",
    # Ambiguous / sparse
    "Venci hoje.",
    "Ganhei de agressivo no Standard.",
]

# ── Download ──────────────────────────────────────────────────────────────────

def download_model():
    if os.path.exists(MODEL_PATH) and os.path.getsize(MODEL_PATH) > 100_000_000:
        print(f"✓ Modelo já existe: {MODEL_PATH}")
        return

    print(f"Baixando Qwen2.5-0.5B-Instruct Q4_K_M (~350 MB)...")
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)

    def progress(count, block_size, total_size):
        pct = count * block_size / total_size * 100
        mb  = count * block_size / 1e6
        tot = total_size / 1e6
        print(f"\r  {pct:.1f}%  {mb:.0f}/{tot:.0f} MB", end="", flush=True)

    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH, reporthook=progress)
    print(f"\n✓ Download concluído: {MODEL_PATH}")

# ── Inferência ────────────────────────────────────────────────────────────────

def run_tests():
    from llama_cpp import Llama

    print("\nCarregando modelo...")
    llm = Llama(
        model_path  = MODEL_PATH,
        n_ctx       = 512,
        n_batch     = 512,
        n_gpu_layers= 0,       # CPU — muda para 99 se tiver GPU CUDA
        verbose     = False,
    )
    print("✓ Modelo carregado.\n")

    results = []
    print("=" * 70)
    print(f"{'TESTE':<45}  {'RESULTADO'}")
    print("=" * 70)

    for text in TESTS:
        response = llm.create_chat_completion(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": text},
            ],
            max_tokens  = 200,
            temperature = 0.1,
            stop        = ["```", "\n\n\n"],
        )
        raw = response["choices"][0]["message"]["content"].strip()

        # Parse defensivo
        try:
            cleaned = raw.replace("```json","").replace("```","").strip()
            parsed  = json.loads(cleaned)
            status  = "✅"
        except json.JSONDecodeError:
            parsed = None
            status = "❌ JSON inválido"

        label = (text[:43] + "…") if len(text) > 44 else text
        print(f"{status}  {label}")
        if parsed:
            key_fields = {k: v for k, v in parsed.items() if v is not None and v is not False}
            print(f"   → {key_fields}")
        else:
            print(f"   → RAW: {raw[:120]}")
        print()
        results.append({"input": text, "output": parsed, "raw": raw})

    # Resumo
    valid = sum(1 for r in results if r["output"] is not None)
    print("=" * 70)
    print(f"JSON válido: {valid}/{len(results)}")

    # Avaliação manual dos campos chave
    print("\n--- Análise de campos ---")
    for r in results:
        o = r["output"]
        if not o:
            continue
        issues = []
        if "won" not in o:        issues.append("won ausente")
        if "format" not in o:     issues.append("format ausente")
        if issues:
            short = r["input"][:40]
            print(f"  ⚠️  '{short}': {', '.join(issues)}")

    print("\nConclusão:")
    if valid == len(results):
        print("  ✅ Todos os outputs são JSON válido — modelo promissor sem fine-tuning!")
    elif valid >= len(results) * 0.8:
        print("  ⚠️  Maioria válida — pode precisar de fine-tuning leve para os casos restantes.")
    else:
        print("  ❌ Muitos erros — fine-tuning provavelmente necessário.")


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    download_model()
    run_tests()
