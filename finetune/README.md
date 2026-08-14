# MTG Tracker — Pipeline de Fine-Tuning On-Device

Pipeline completo para treinar e implantar o **Gemma 4 E2B** no Android,
capturando texto ou áudio do usuário e extraindo dados estruturados de partidas de MTG.

---

## Arquitetura alvo (computador novo)

```
Usuário fala ou digita
        │
        ▼
Gemma 4 E2B fine-tuned (MediaPipe)   ←── multimodal: entende texto e áudio
(texto/áudio → JSON estruturado)          ~600 MB INT8 on-device
        │
        ▼
Formulário de partida (pre-filled)
        │
        ▼
Zustand store / MatchForm (confirmação do usuário)
```

O **Gemma 4 E2B** é o modelo alvo definitivo porque:
- Suporta áudio nativo (sem precisar de ASR separado)
- Versão E2B foi projetada para dispositivos móveis
- MediaPipe tasks-genai suporta Gemma 4 oficialmente
- Com VRAM suficiente (≥ 16 GB) o treino completo é viável

---

## Estado atual do projeto (o que foi feito no computador anterior)

### ✅ Concluído
- `generate_dataset.py` — gera ~2000 exemplos em PT/BR, EN, JA a partir de `../database_decks.csv`
- `train_qlora.py` — QLoRA com Unsloth, treinado com `google/gemma-2-2b-it` (VRAM 6 GB)
- `merge_and_export.py` — funde o adapter LoRA no modelo base via Unsloth
- `config.py` — configurações centrais
- Dataset gerado: `dataset_train.jsonl` (1818 ex) + `dataset_eval.jsonl` (202 ex)
- Treino concluído: adapter em `./output/final/`
- Merge concluído: modelo completo em `./merged_model/`

### ⚠️ Pendente (para o computador novo)
- Converter para formato MediaPipe (`.task`) com quantização INT8/INT4
- Criar módulo nativo Kotlin + bridge React Native
- Integrar no app

---

## O que muda no computador novo

### Modelo: Gemma 2 2B → Gemma 4 E2B

No computador anterior usamos `google/gemma-2-2b-it` por limitação de VRAM (6 GB).
No computador novo, use `google/gemma-4-E2B-it` que tem:
- Suporte nativo a áudio (elimina a necessidade do Android SpeechRecognizer)
- Melhor compreensão multilingual
- Formato já otimizado para mobile via MediaPipe

Basta trocar em `config.py`:
```python
MODEL_ID = "google/gemma-4-E2B-it"
```

O dataset e os scripts permanecem os mesmos.

---

## Pré-requisitos (computador novo)

- Python 3.10+
- GPU NVIDIA **≥ 16 GB VRAM** (RTX 3090 / 4090 / A100 / H100)
- CUDA 12.x + cuDNN 9.x
- Conta no HuggingFace com acesso ao Gemma 4

---

## Instalação

```bash
cd finetune/

# Criar virtualenv
python3 -m venv .venv
source .venv/bin/activate   # Linux/Mac
# .venv\Scripts\activate    # Windows

# Instalar dependências
pip install torch --index-url https://download.pytorch.org/whl/cu124
pip install unsloth
pip install datasets sentencepiece protobuf safetensors huggingface_hub
pip install litert-torch tensorflow

# Autenticar no HuggingFace (necessário para Gemma 4)
huggingface-cli login
```

> **Nota WSL2 (Ubuntu):** o pip global é bloqueado. Sempre ative o venv antes.
> Se aparecer `python3-venv not installed`: `sudo apt install python3.12-venv -y`
> Compiladores necessários: `sudo apt install gcc g++ python3.12-dev -y`

---

## Passo 1 — Confirmar MODEL_ID

Abra `config.py` e verifique:

```python
MODEL_ID = "google/gemma-4-E2B-it"   # ID exato no HuggingFace
```

Confirme o ID atual em: https://huggingface.co/google

---

## Passo 2 — Gerar o dataset (se não existir)

Os arquivos `dataset_train.jsonl` e `dataset_eval.jsonl` já existem.
Só rode se quiser regenerar:

```bash
python generate_dataset.py
```

---

## Passo 3 — Fine-tuning QLoRA

```bash
python train_qlora.py
```

**Com ≥ 16 GB VRAM, restaure os valores originais em `config.py`:**
```python
LORA_R      = 16
LORA_ALPHA  = 32
MAX_SEQ_LEN = 512
BATCH_SIZE  = 4
GRAD_ACCUM  = 4
```

- Tempo estimado: **30–60 min** (RTX 4090), **2–3h** (RTX 3090)
- Adapter final em: `./output/final/`

### Monitorar o treino
Métricas impressas a cada 10 steps. Espere `eval_loss` cair para ~0.05–0.15.

---

## Passo 4 — Mesclar adapter com modelo base

```bash
python merge_and_export.py
```

Saída: `./merged_model/` (pesos em float16, safetensors)

---

## Passo 5 — Converter para MediaPipe (.task)

> **ATENÇÃO:** A conversão para o formato MediaPipe LLM Inference (`.task`) requer
> a ferramenta `ai_edge_torch` com suporte a Gemma 4.
> O script atual (`convert_to_litert.py`) converte para TFLite genérico — funciona
> para inferência direta mas não usa a API MediaPipe LLM.

### Opção A — Formato MediaPipe oficial (recomendado)

```bash
# Verificar se ai_edge_torch/litert_torch tem suporte a Gemma 4
python -c "from litert_torch.generative.examples import gemma; print('ok')"
```

Se disponível:
```bash
python convert_to_mediapipe.py   # script a criar — veja seção abaixo
```

### Opção B — GGUF + llama.rn (alternativa mais simples)

```bash
# 1. Instalar llama.cpp
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp && make -j$(nproc)

# 2. Converter para GGUF
python convert_hf_to_gguf.py ~/mtg_tracker/finetune/merged_model \
  --outtype f16 \
  --outfile ~/mtg_tracker/finetune/mtg_extractor_f16.gguf

# 3. Quantizar Q4_K_M (~1.5 GB, boa qualidade)
./llama-quantize \
  ~/mtg_tracker/finetune/mtg_extractor_f16.gguf \
  ~/mtg_tracker/finetune/mtg_extractor_q4km.gguf Q4_K_M
```

No app React Native, usar `llama.rn`:
```bash
cd ~/mtg_tracker
npx expo install llama.rn
```

---

## Passo 6 — Integrar no app Android

### 6.1 Estrutura de pacotes (já gerada via prebuild)
```
android/app/src/main/java/com/mtgtracker/app/
```

### 6.2 Opção A — MediaPipe tasks-genai

`android/app/build.gradle`:
```groovy
dependencies {
    implementation 'com.google.mediapipe:tasks-genai:0.10.22'
}
```

Módulo Kotlin a criar: `MtgExtractorModule.kt`

### 6.3 Opção B — llama.rn (mais simples)

`llama.rn` instala o módulo nativo automaticamente via autolink.

TypeScript:
```typescript
import { initLlama } from 'llama.rn'

const ctx = await initLlama({
  model: modelPath,           // caminho no dispositivo após download
  n_ctx: 512,
  n_gpu_layers: 99,
})

const result = await ctx.completion({
  prompt: buildMtgPrompt(userText),
  n_predict: 200,
  stop: ['<end_of_turn>'],
})
// Parsear result.text como JSON
```

---

## Campos do JSON extraído

```typescript
{
  won:       boolean,         // true se ganhou
  drew:      boolean,         // true se empatou (won deve ser false)
  myDeck:    string | null,   // nome canônico do deck (do database_decks.csv)
  oppDeck:   string | null,   // nome canônico do deck adversário
  format:    "Commander" | "Modern" | "Standard" | "Pioneer" |
             "Legacy" | "Pauper" | "Other" | null,
  onPlay:    boolean | null,  // true = foi primeiro (on the play)
  archetype: "Aggro" | "Midrange" | "Control" | "Combo" | "Stax" | null
}
```

---

## Troubleshooting

**CUDA OOM durante treino:**
```python
BATCH_SIZE  = 1    # config.py
GRAD_ACCUM  = 16
LORA_R      = 8
LORA_DROPOUT = 0
MAX_SEQ_LEN = 256
```

**`externally-managed-environment` (pip bloqueado no Ubuntu):**
```bash
python3 -m venv .venv && source .venv/bin/activate
```

**`DataCollatorForCompletionOnlyLM` ImportError:**
- TRL ≥ 1.0 removeu essa classe. Já tratado em `train_qlora.py` (usa `SFTConfig`).

**`torch.int1` AttributeError (torchao):**
- Precisa torch ≥ 2.6. `pip install "torch>=2.6.0" --index-url https://download.pytorch.org/whl/cu124`

**`System role not supported` (Gemma 2):**
- Gemma 2 não aceita role "system". Já tratado em `train_qlora.py` (funde com o user).

**`No or negligible GPU memory available` (Unsloth):**
- Reduzir BATCH_SIZE/MAX_SEQ_LEN/LORA_R. Ver seção CUDA OOM acima.

**`gcc` / `g++` / `Python.h` não encontrados:**
```bash
sudo apt install gcc g++ python3.12-dev -y
```

**`GenerativeConfig` não encontrado em litert_torch:**
- A API de quantização mudou. Abrir issue em https://github.com/google-ai-edge/litert-torch
- Usar GGUF (Opção B) como alternativa.

**Modelo muito grande (> 2 GB):**
- Usar quantização Q4_K_M via llama.cpp (Opção B)
- Distribuir via download no first-run (não incluir no APK)
