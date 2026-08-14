"""
Conversão local: adapter LoRA → GGUF Q4_K_M
============================================

Roda no WSL (Ubuntu) com CPU + RAM. Não precisa de GPU.

Pré-requisitos (execute setup_local.sh primeiro):
  - Python 3.10+
  - llama.cpp compilado em ~/llama.cpp
  - Pacotes: unsloth transformers peft torch

Uso:
  python3 convert_local.py \
      --adapter  ~/Downloads/adapter_final \
      --output   ~/mtg_tracker/finetune/mtg_extractor_q4km.gguf

O adapter_final fica no Google Drive → baixe a pasta inteira e aponte --adapter para ela.
"""

import argparse
import os
import shutil
import subprocess
import sys

# ── Caminhos padrão ───────────────────────────────────────────────────────────
HOME          = os.path.expanduser("~")
LLAMA_DIR     = os.path.join(HOME, "llama.cpp")
SCRIPT_DIR    = os.path.dirname(os.path.abspath(__file__))
DEFAULT_OUT   = os.path.join(SCRIPT_DIR, "mtg_extractor_q4km.gguf")

F16_MIN_SIZE_GB = 3.5   # Gemma 4 E2B f16 ≈ 4–5 GB


# ── Helpers ───────────────────────────────────────────────────────────────────

def run(cmd: str, desc: str, check: bool = True) -> str:
    """Executa comando e retorna stdout. Lança RuntimeError se falhar."""
    print(f"  ▶ {desc}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if check and result.returncode != 0:
        print(f"\n  STDOUT (últimas linhas):\n{result.stdout[-3000:]}")
        print(f"\n  STDERR (últimas linhas):\n{result.stderr[-3000:]}")
        raise RuntimeError(f"FALHOU (exit {result.returncode}): {desc}")
    return result.stdout


def file_size_gb(path: str) -> float:
    return os.path.getsize(path) / 1e9 if os.path.exists(path) else 0.0


def require(path: str, label: str):
    if not os.path.exists(path):
        print(f"\n❌ {label} não encontrado: {path}")
        sys.exit(1)


# ── Passos ────────────────────────────────────────────────────────────────────

def step1_check_llama(quantize_bin: str):
    print("\n[1/4] Verificando llama.cpp...")
    require(LLAMA_DIR, "llama.cpp")
    if not os.path.exists(quantize_bin):
        print("  Compilando llama-quantize (pode demorar ~5 min na primeira vez)...")
        run(
            f"cd {LLAMA_DIR} && "
            f"cmake -B build -DLLAMA_CURL=OFF -DGGML_CUDA=OFF -DCMAKE_BUILD_TYPE=Release > /dev/null 2>&1 && "
            f"cmake --build build --config Release -j$(nproc) --target llama-quantize 2>&1 | tail -10 && "
            f"cp build/bin/llama-quantize {quantize_bin}",
            "Compilando llama-quantize"
        )
    print(f"  ✓ llama-quantize: {quantize_bin}")


def step2_merge(adapter_path: str, merged_dir: str):
    print(f"\n[2/4] Mesclando adapter + modelo base (CPU — sem GPU necessária)...")
    print(f"  Adapter: {adapter_path}")
    print(f"  Destino: {merged_dir}")

    if os.path.isdir(merged_dir) and len(os.listdir(merged_dir)) > 3:
        print("  ✓ Modelo mesclado já existe, pulando.")
        return

    os.makedirs(merged_dir, exist_ok=True)

    import json
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel

    # Lê o modelo base a partir do adapter_config.json
    adapter_config_path = os.path.join(adapter_path, "adapter_config.json")
    require(adapter_config_path, "adapter_config.json dentro do adapter_final")
    with open(adapter_config_path) as f:
        adapter_config = json.load(f)
    base_model_id = adapter_config.get("base_model_name_or_path", "")
    if not base_model_id:
        raise RuntimeError("adapter_config.json não contém 'base_model_name_or_path'.")

    # O adapter foi treinado na versão 4-bit quantizada do Unsloth (bnb-4bit).
    # Para o merge precisamos da versão float completa — trocamos pelo equivalente não-quantizado.
    if "bnb-4bit" in base_model_id or "unsloth-bnb" in base_model_id:
        original = base_model_id
        base_model_id = "unsloth/gemma-4-E2B-it"
        print(f"  Modelo base (adapter): {original}")
        print(f"  → Usando versão não-quantizada: {base_model_id}")
    else:
        print(f"  Modelo base: {base_model_id}")

    print(f"  Baixando modelo base do HuggingFace (~4–5 GB, pode demorar 10–20 min)...")
    print(f"  ⚠️  Se pedir login, rode antes: huggingface-cli login")

    # Carrega em float16 na CPU — usa ~6–8 GB de RAM
    base_model = AutoModelForCausalLM.from_pretrained(
        base_model_id,
        dtype          = torch.float16,
        device_map     = "cpu",
        low_cpu_mem_usage = True,
    )
    tokenizer = AutoTokenizer.from_pretrained(base_model_id)

    # Merge manual — não usa peft, evita problema com Gemma4ClippableLinear
    print("  Aplicando adapter LoRA manualmente (sem peft)...")
    from safetensors import safe_open
    import glob

    # Carrega todos os arquivos de pesos do adapter
    adapter_files = sorted(glob.glob(os.path.join(adapter_path, "adapter_model*.safetensors")))
    if not adapter_files:
        # tenta formato antigo .bin
        adapter_files = sorted(glob.glob(os.path.join(adapter_path, "adapter_model*.bin")))
    if not adapter_files:
        raise FileNotFoundError(
            f"Nenhum arquivo de pesos encontrado em {adapter_path}.\n"
            "Esperado: adapter_model.safetensors ou adapter_model.bin"
        )

    adapter_weights = {}
    for af in adapter_files:
        print(f"    Lendo {os.path.basename(af)} ...")
        with safe_open(af, framework="pt", device="cpu") as f:
            for key in f.keys():
                adapter_weights[key] = f.get_tensor(key).to(torch.float32)

    lora_r     = adapter_config.get("r", 16)
    lora_alpha = adapter_config.get("lora_alpha", lora_r * 2)
    scaling    = lora_alpha / lora_r
    print(f"    r={lora_r}, alpha={lora_alpha}, scaling={scaling:.4f}")

    # Mapeia nomes dos módulos -> módulo real
    named = dict(base_model.named_modules())

    applied = 0
    skipped = []
    for key in adapter_weights:
        if ".lora_A." not in key:
            continue
        # key exemplo: base_model.model.model.layers.0.self_attn.q_proj.lora_A.default.weight
        # Remove prefixo "base_model.model." e sufixo ".lora_A.default.weight"
        parts  = key.split(".lora_A.")[0]               # "base_model.model.model.layers.0..."
        mod_name = parts.removeprefix("base_model.model.")  # "model.layers.0.self_attn.q_proj"

        key_b  = key.replace(".lora_A.", ".lora_B.")
        if key_b not in adapter_weights:
            skipped.append(mod_name)
            continue

        lora_a = adapter_weights[key]          # [r, in]
        lora_b = adapter_weights[key_b]        # [out, r]
        delta  = (lora_b @ lora_a) * scaling   # [out, in]

        if mod_name not in named:
            skipped.append(mod_name)
            continue

        module = named[mod_name]
        # Gemma4ClippableLinear guarda os pesos em .linear.weight
        linear = getattr(module, "linear", module)
        if not hasattr(linear, "weight"):
            skipped.append(mod_name)
            continue

        linear.weight.data += delta.to(linear.weight.dtype)
        applied += 1

    print(f"    ✓ LoRA aplicado em {applied} camadas.")
    if skipped:
        print(f"    ⚠️  Pulados {len(skipped)}: {skipped[:5]}{'...' if len(skipped)>5 else ''}")

    # Libera RAM do adapter antes de salvar
    import gc
    del adapter_weights, named
    gc.collect()
    print(f"  RAM liberada. Salvando config e tokenizer...")

    # Salva config e tokenizer (pequeninhos, sem risco de OOM)
    base_model.config.save_pretrained(merged_dir)
    tokenizer.save_pretrained(merged_dir)

    # Salva pesos SEM chamar state_dict() para não duplicar 10 GB na RAM.
    # Iteramos named_parameters() que retorna referências (não cópias).
    print(f"  Salvando pesos em shards de 1.8 GB (sem duplicar RAM)...")
    from safetensors.torch import save_file as st_save

    SHARD_BYTES = int(1.8 * 1024 ** 3)   # 1.8 GB por shard
    weight_map  = {}                       # tensor_name → filename
    shard_buf   = {}
    shard_bytes = 0
    shard_idx   = 0
    total_bytes = 0

    def flush_shard(buf, idx):
        fname  = f"model-{idx+1:05d}-of-?????.safetensors"
        fpath  = os.path.join(merged_dir, fname)
        # Renomeia para nome provisório; corrigimos o total depois
        st_save(buf, fpath)
        for k in buf:
            weight_map[k] = fname
        print(f"    shard {idx+1} salvo ({sum(v.numel()*v.element_size() for v in buf.values())/1e9:.2f} GB)")
        del buf
        gc.collect()

    for param_name, param in base_model.named_parameters():
        t     = param.data          # referência direta — sem cópia
        nbytes = t.numel() * t.element_size()

        if shard_bytes + nbytes > SHARD_BYTES and shard_buf:
            flush_shard(shard_buf, shard_idx)
            shard_buf   = {}
            shard_bytes = 0
            shard_idx  += 1

        shard_buf[param_name] = t
        shard_bytes += nbytes
        total_bytes += nbytes

    if shard_buf:
        flush_shard(shard_buf, shard_idx)
        shard_idx += 1

    total_shards = shard_idx

    # Renomeia arquivos com total correto e cria o index JSON
    final_weight_map = {}
    for old_fname in sorted(set(weight_map.values())):
        new_fname = old_fname.replace("?????", f"{total_shards:05d}")
        os.rename(
            os.path.join(merged_dir, old_fname),
            os.path.join(merged_dir, new_fname),
        )
        for k, v in weight_map.items():
            if v == old_fname:
                final_weight_map[k] = new_fname

    index = {
        "metadata": {"total_size": total_bytes},
        "weight_map": final_weight_map,
    }
    index_path = os.path.join(merged_dir, "model.safetensors.index.json")
    with open(index_path, "w") as fp:
        import json as _json
        _json.dump(index, fp, indent=2)

    print(f"  ✓ Mesclado em: {merged_dir} ({total_shards} shards, {total_bytes/1e9:.1f} GB)")


def step3_convert_f16(merged_dir: str, f16_path: str):
    print(f"\n[3/4] Convertendo para f16 GGUF...")

    existing = file_size_gb(f16_path)
    if existing >= F16_MIN_SIZE_GB:
        print(f"  ✓ f16 já existe ({existing:.1f} GB), pulando conversão.")
        return

    if existing > 0:
        print(f"  ⚠️  f16 incompleto ({existing:.1f} GB), removendo e reconvertendo...")
        os.remove(f16_path)

    convert_script = os.path.join(LLAMA_DIR, "convert_hf_to_gguf.py")
    require(convert_script, "convert_hf_to_gguf.py")

    run(
        f"python3 {convert_script} {merged_dir} --outfile {f16_path} --outtype f16",
        "convert_hf_to_gguf.py"
    )

    size = file_size_gb(f16_path)
    if size < F16_MIN_SIZE_GB:
        raise RuntimeError(
            f"f16 gerado muito pequeno ({size:.1f} GB < {F16_MIN_SIZE_GB} GB esperado). "
            "Conversão falhou silenciosamente."
        )
    print(f"  ✓ f16 criado: {size:.1f} GB → {f16_path}")


def step4_quantize(f16_path: str, out_path: str, quantize_bin: str):
    print(f"\n[4/4] Quantizando para Q4_K_M...")

    if os.path.exists(out_path) and file_size_gb(out_path) > 1.0:
        print(f"  ✓ Q4_K_M já existe ({file_size_gb(out_path):.1f} GB): {out_path}")
        return

    run(
        f"{quantize_bin} {f16_path} {out_path} Q4_K_M",
        "llama-quantize Q4_K_M"
    )

    size = file_size_gb(out_path)
    if size < 1.0:
        raise RuntimeError(f"Q4_K_M muito pequeno ({size:.1f} GB). Quantização falhou.")

    # Remove o f16 só depois que Q4_K_M está confirmado
    os.remove(f16_path)
    print(f"  ✓ f16 local removido (liberou espaço).")
    print(f"  ✓ Q4_K_M criado: {size:.2f} GB → {out_path}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Converte adapter LoRA para GGUF Q4_K_M")
    parser.add_argument("--adapter",  required=True,       help="Caminho para a pasta adapter_final")
    parser.add_argument("--output",   default=DEFAULT_OUT, help="Caminho do arquivo .gguf final")
    parser.add_argument("--skip-merge", action="store_true",
                        help="Pular o merge (use se merged_model já existir)")
    args = parser.parse_args()

    adapter_path  = os.path.abspath(args.adapter)
    out_path      = os.path.abspath(args.output)
    out_dir       = os.path.dirname(out_path)
    merged_dir    = os.path.join(out_dir, "merged_model_local")
    f16_path      = os.path.join(out_dir, "_mtg_f16_temp.gguf")
    quantize_bin  = os.path.join(LLAMA_DIR, "llama-quantize")

    require(adapter_path, "adapter_final")
    os.makedirs(out_dir, exist_ok=True)

    print("=" * 60)
    print("MTG Tracker — Conversão Local para GGUF")
    print("=" * 60)
    print(f"  Adapter:  {adapter_path}")
    print(f"  Saída:    {out_path}")
    print(f"  RAM necessária: ~8–10 GB para o merge")

    step1_check_llama(quantize_bin)

    if not args.skip_merge:
        step2_merge(adapter_path, merged_dir)
    else:
        require(merged_dir, "merged_model_local")
        print("\n[2/4] Merge pulado (--skip-merge).")

    step3_convert_f16(merged_dir, f16_path)
    step4_quantize(f16_path, out_path, quantize_bin)

    size = file_size_gb(out_path)
    print(f"\n{'='*60}")
    print(f"✅ CONCLUÍDO!")
    print(f"   Arquivo: {out_path}")
    print(f"   Tamanho: {size:.2f} GB")
    print(f"\nPróximo passo:")
    print(f"  Copie o .gguf para a pasta do projeto React Native e integre com llama.rn.")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
