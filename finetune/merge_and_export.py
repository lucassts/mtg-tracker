"""
Mescla o adapter LoRA com o modelo base e salva o modelo completo.
Deve ser executado APÓS train_qlora.py.

Usa Unsloth para carregar (mesmo cache usado no treino).

Uso:
  python merge_and_export.py

Saída:
  ./merged_model/   — modelo completo em float16 pronto para conversão
"""

import unsloth  # importar antes de transformers
from unsloth import FastLanguageModel
from config import MODEL_ID, MAX_SEQ_LEN, OUTPUT_DIR, MERGED_MODEL_DIR


def main():
    adapter_path = f"{OUTPUT_DIR}/final"

    print(f"▶ Carregando modelo base + adapter: {MODEL_ID}")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=adapter_path,     # carrega direto do adapter (que referencia o base)
        max_seq_length=MAX_SEQ_LEN,
        dtype=None,
        load_in_4bit=True,
    )

    print(f"▶ Salvando modelo mesclado (float16) em: {MERGED_MODEL_DIR}")
    # save_pretrained_merged faz o merge LoRA + converte para float16 num único passo
    model.save_pretrained_merged(
        MERGED_MODEL_DIR,
        tokenizer,
        save_method="merged_16bit",
    )

    total_params = sum(p.numel() for p in model.parameters())
    print(f"✓ Modelo mesclado salvo. Parâmetros: {total_params:,}")
    print(f"  Próximo passo: python convert_to_litert.py")


if __name__ == "__main__":
    main()
