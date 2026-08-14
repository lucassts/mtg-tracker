#!/bin/bash
# =============================================================================
# setup_local.sh — Prepara o WSL Ubuntu para converter o modelo localmente
# =============================================================================
# Execute UMA VEZ para instalar tudo:
#   bash setup_local.sh
# =============================================================================

set -e  # para se qualquer comando falhar

echo "============================================================"
echo "  MTG Tracker — Setup local de conversão GGUF"
echo "============================================================"

# ── 1. Atualizar apt e instalar dependências do sistema ───────────────────────
echo ""
echo "[1/5] Atualizando pacotes do sistema..."
sudo apt-get update -qq
sudo apt-get install -y -qq \
    python3 python3-pip python3-venv \
    git cmake build-essential \
    libgomp1

echo "  ✓ Pacotes do sistema instalados."


# ── 2. Instalar pacotes Python ────────────────────────────────────────────────
echo ""
echo "[2/5] Instalando pacotes Python..."
echo "  (isso pode demorar 5–10 minutos)"

pip3 install --break-system-packages --quiet \
    torch --index-url https://download.pytorch.org/whl/cpu

pip3 install --break-system-packages --quiet \
    unsloth \
    transformers \
    peft \
    accelerate \
    sentencepiece \
    protobuf \
    safetensors \
    huggingface_hub

echo "  ✓ Pacotes Python instalados."


# ── 3. Clonar e compilar llama.cpp ────────────────────────────────────────────
echo ""
echo "[3/5] Configurando llama.cpp..."

LLAMA_DIR="$HOME/llama.cpp"

if [ -d "$LLAMA_DIR" ]; then
    echo "  llama.cpp já existe em $LLAMA_DIR, atualizando..."
    cd "$LLAMA_DIR" && git pull --quiet
else
    echo "  Clonando llama.cpp..."
    git clone --quiet https://github.com/ggerganov/llama.cpp "$LLAMA_DIR"
fi

echo "  Instalando dependências Python do llama.cpp..."
pip3 install --break-system-packages --quiet -r "$LLAMA_DIR/requirements.txt"

echo "  Compilando llama-quantize (pode demorar ~5 minutos)..."
cd "$LLAMA_DIR"
cmake -B build -DLLAMA_CURL=OFF -DGGML_CUDA=OFF -DCMAKE_BUILD_TYPE=Release > /dev/null 2>&1
cmake --build build --config Release -j$(nproc) --target llama-quantize > /dev/null 2>&1
cp build/bin/llama-quantize "$LLAMA_DIR/llama-quantize"

echo "  ✓ llama.cpp compilado: $LLAMA_DIR/llama-quantize"


# ── 4. Verificar HuggingFace login ───────────────────────────────────────────
echo ""
echo "[4/5] Verificando acesso ao HuggingFace..."
echo "  O modelo base Gemma 4 E2B requer que você aceite os termos no HuggingFace."
echo "  Se ainda não fez isso:"
echo "    1. Acesse: https://huggingface.co/unsloth/gemma-4-E2B-it"
echo "    2. Clique em 'Access repository' e aceite os termos"
echo "    3. Gere um token em: https://huggingface.co/settings/tokens"
echo "    4. Execute: huggingface-cli login"
echo ""

if huggingface-cli whoami > /dev/null 2>&1; then
    USER=$(huggingface-cli whoami 2>/dev/null | head -1)
    echo "  ✓ Já logado no HuggingFace como: $USER"
else
    echo "  ⚠️  Não logado no HuggingFace."
    echo "  Execute depois: huggingface-cli login"
fi


# ── 5. Resumo ─────────────────────────────────────────────────────────────────
echo ""
echo "[5/5] Verificando instalação..."

python3 -c "import torch; print(f'  ✓ PyTorch {torch.__version__}')"
python3 -c "import transformers; print(f'  ✓ Transformers {transformers.__version__}')"
python3 -c "import unsloth; print(f'  ✓ Unsloth {unsloth.__version__}')" 2>/dev/null || echo "  ⚠️  Unsloth: instale manualmente se der erro"

echo ""
echo "============================================================"
echo "✅ Setup concluído!"
echo ""
echo "Próximos passos:"
echo ""
echo "  1. Baixe a pasta 'adapter_final' do Google Drive"
echo "     e coloque em ~/Downloads/adapter_final"
echo ""
echo "  2. Execute a conversão:"
echo "     python3 ~/mtg_tracker/finetune/convert_local.py \\"
echo "         --adapter ~/Downloads/adapter_final \\"
echo "         --output  ~/mtg_tracker/finetune/mtg_extractor_q4km.gguf"
echo ""
echo "  O processo usa ~8–10 GB de RAM e ~10 GB de espaço em disco."
echo "  Demora ~15–30 minutos (sem GPU — só CPU)."
echo "============================================================"
