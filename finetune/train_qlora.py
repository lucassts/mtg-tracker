"""
Fine-tuning QLoRA do Gemma para extração de dados de partidas de MTG.
Usa Unsloth para caber em GPUs de 6GB.

Requisitos:
  pip install unsloth datasets sentencepiece protobuf safetensors huggingface_hub

Uso:
  python train_qlora.py

Saída:
  ./output/   — adapter LoRA + checkpoints
"""

import unsloth  # deve ser importado antes de trl/transformers/peft
import os
import torch
from datasets import load_dataset
from trl import SFTTrainer, SFTConfig
from unsloth import FastLanguageModel

from config import (
    MODEL_ID, LORA_R, LORA_ALPHA, LORA_DROPOUT, TARGET_MODULES,
    MAX_SEQ_LEN, BATCH_SIZE, GRAD_ACCUM, LR, EPOCHS,
    SAVE_STEPS, EVAL_STEPS, OUTPUT_DIR,
    DATASET_TRAIN_PATH, DATASET_EVAL_PATH,
)

# ── 1. Dataset ─────────────────────────────────────────────────────────────────

def load_jsonl(path: str):
    return load_dataset("json", data_files=path, split="train")


def format_example(tokenizer, example: dict) -> str:
    messages = list(example["messages"])
    # Gemma 2 não suporta role "system" — funde com a primeira mensagem do usuário
    if messages and messages[0]["role"] == "system":
        system_text = messages[0]["content"]
        if len(messages) > 1 and messages[1]["role"] == "user":
            messages[1] = {
                "role": "user",
                "content": f"{system_text}\n\n{messages[1]['content']}",
            }
        messages = messages[1:]  # remove o item system
    return tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=False,
    )


# ── 2. Main ────────────────────────────────────────────────────────────────────

def main():
    print(f"▶ Carregando modelo base: {MODEL_ID}")

    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=MODEL_ID,
        max_seq_length=MAX_SEQ_LEN,
        dtype=None,          # detecta automaticamente (bf16 em Ampere+, fp16 nos demais)
        load_in_4bit=True,   # QLoRA 4-bit
    )

    model = FastLanguageModel.get_peft_model(
        model,
        r=LORA_R,
        target_modules=TARGET_MODULES,
        lora_alpha=LORA_ALPHA,
        lora_dropout=LORA_DROPOUT,
        bias="none",
        use_gradient_checkpointing="unsloth",  # implementação própria, 30% menos VRAM
        random_state=42,
    )

    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total     = sum(p.numel() for p in model.parameters())
    print(f"   Parâmetros treináveis: {trainable:,} / {total:,} "
          f"({100 * trainable / total:.2f}%)")

    print("▶ Carregando datasets...")
    train_ds = load_jsonl(DATASET_TRAIN_PATH)
    eval_ds  = load_jsonl(DATASET_EVAL_PATH)

    def preprocess(example):
        return {"text": format_example(tokenizer, example)}

    train_ds = train_ds.map(preprocess, remove_columns=train_ds.column_names)
    eval_ds  = eval_ds.map(preprocess,  remove_columns=eval_ds.column_names)
    print(f"   Treino: {len(train_ds)} | Avaliação: {len(eval_ds)}")

    # SFTConfig combina TrainingArguments + parâmetros SFT (TRL >= 1.0)
    sft_config = SFTConfig(
        output_dir=OUTPUT_DIR,
        num_train_epochs=EPOCHS,
        per_device_train_batch_size=BATCH_SIZE,
        per_device_eval_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=GRAD_ACCUM,
        learning_rate=LR,
        warmup_steps=50,
        lr_scheduler_type="cosine",
        optim="adamw_8bit",
        bf16=torch.cuda.is_bf16_supported(),
        fp16=not torch.cuda.is_bf16_supported(),
        logging_steps=10,
        save_steps=SAVE_STEPS,
        eval_steps=EVAL_STEPS,
        eval_strategy="steps",
        save_total_limit=3,
        load_best_model_at_end=True,
        report_to="none",
        dataloader_num_workers=2,
        remove_unused_columns=False,
        dataset_text_field="text",
    )

    print("▶ Configurando trainer...")
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=train_ds,
        eval_dataset=eval_ds,
        args=sft_config,
    )

    print("▶ Iniciando treinamento...")
    trainer.train()

    print(f"▶ Salvando adapter LoRA em {OUTPUT_DIR}/final")
    model.save_pretrained(os.path.join(OUTPUT_DIR, "final"))
    tokenizer.save_pretrained(os.path.join(OUTPUT_DIR, "final"))
    print("✓ Treino concluído!")


if __name__ == "__main__":
    main()
