"""
Converte o modelo mesclado para o formato LiteRT (.bin) compatível com
o MediaPipe LLM Inference API no Android.

Requer:
  pip install ai-edge-torch tensorflow

Uso:
  python convert_to_litert.py

Saída:
  ./mtg_extractor.bin   — modelo para empacotar no APK

Referência oficial:
  https://ai.google.dev/edge/litert/models/convert_overview
  https://github.com/google-ai-edge/ai-edge-torch
"""

import torch
import litert_torch
from transformers import AutoTokenizer, AutoModelForCausalLM

from config import MERGED_MODEL_DIR, LITERT_OUTPUT_PATH, MAX_SEQ_LEN


def main():
    print(f"▶ Carregando modelo de: {MERGED_MODEL_DIR}")
    tokenizer = AutoTokenizer.from_pretrained(MERGED_MODEL_DIR)
    model = AutoModelForCausalLM.from_pretrained(
        MERGED_MODEL_DIR,
        dtype=torch.float32,
        device_map="cpu",
    )
    model.config.use_cache = False   # desabilita KV-cache para tracing estático
    model.eval()

    # Wrapper que retorna apenas logits (evita DynamicCache no output)
    class LogitsWrapper(torch.nn.Module):
        def __init__(self, m):
            super().__init__()
            self.m = m
        def forward(self, input_ids, attention_mask):
            return self.m(input_ids=input_ids, attention_mask=attention_mask).logits

    wrapped = LogitsWrapper(model)

    print("▶ Preparando inputs de exemplo para tracing...")
    sample_input = tokenizer(
        "Venci o Burn com Rhinos no Modern.",
        return_tensors="pt",
        max_length=MAX_SEQ_LEN,
        truncation=True,
    )
    input_ids      = sample_input["input_ids"]
    attention_mask = sample_input["attention_mask"]

    print("▶ Convertendo para LiteRT com litert_torch...")
    edge_model = litert_torch.convert(
        wrapped,
        (input_ids, attention_mask),
    )

    print(f"▶ Salvando em: {LITERT_OUTPUT_PATH}")
    edge_model.export(LITERT_OUTPUT_PATH)

    import os
    size_mb = os.path.getsize(LITERT_OUTPUT_PATH) / (1024 * 1024)
    print(f"✓ Conversão concluída! Tamanho: {size_mb:.1f} MB")
    print()
    print("Próximos passos:")
    print("  1. Copie o .bin para: android/app/src/main/assets/")
    print("  2. Implemente o módulo nativo (ver README.md)")
    print("  3. Compile com: npx expo run:android")


if __name__ == "__main__":
    main()


# ── Opção INT4 (menor tamanho, ligeiramente menos preciso) ─────────────────────
# Substitua quant_cfg acima por:
#
# quant_cfg = litert_torch.quantize.quant_config.QuantConfig(
#     generative_config=litert_torch.quantize.quant_config.GenerativeConfig(
#         activation_dtype=litert_torch.quantize.quant_config.QuantDtype.SI8,
#         weight_dtype=litert_torch.quantize.quant_config.QuantDtype.SI4,
#     )
# )
