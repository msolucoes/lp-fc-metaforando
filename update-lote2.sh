#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Script: Atualização para Lote 2 — FC Metaforando
# Agendado para 09/04/2026 às 22:30 (BRT)
#
# Mudanças:
#   - Lote 1 → Lote 2
#   - R$ 24 → R$ 29
#   - 98% → 32%
#   - URL Hotmart: off=mkb2u3hb → off=kp97gd5j
# ═══════════════════════════════════════════════════════════════

REPO="/Users/Pinazza/sigil/metaforando/lp-fc-metaforando"
LOG="$REPO/update-lote2.log"

echo "=== Início: $(date) ===" > "$LOG"

cd "$REPO" || { echo "ERRO: não encontrou o repo" >> "$LOG"; exit 1; }

# ─── 1. Atualizar config.json das 3 páginas ──────────────────

for angle in a1 a3 a5; do
  CONFIG="$REPO/$angle/config.json"

  # Lote 1 → Lote 2
  sed -i '' 's/"nome": "Lote 1"/"nome": "Lote 2"/g' "$CONFIG"

  # Preço R$ 24 → R$ 29
  sed -i '' 's/"preco": "R\$ 24"/"preco": "R\$ 29"/g' "$CONFIG"

  # Percentual 98 → 32
  sed -i '' 's/"percentual": 98/"percentual": 32/g' "$CONFIG"
  sed -i '' 's/"texto": "98% das vagas preenchidas"/"texto": "32% das vagas preenchidas"/g' "$CONFIG"

  echo "✓ $angle/config.json atualizado" >> "$LOG"
done

# ─── 2. Atualizar CTAs nos config.json ───────────────────────

# A1: CTA com preço
sed -i '' 's/Quero parar de travar — R\$24/Quero parar de travar — R\$29/g' "$REPO/a1/config.json"

# A3: CTA com preço
sed -i '' 's/Quero ler pessoas — R\$24/Quero ler pessoas — R\$29/g' "$REPO/a3/config.json"

# A5: CTA com preço
sed -i '' 's/Quero ser a escolha óbvia — R\$24/Quero ser a escolha óbvia — R\$29/g' "$REPO/a5/config.json"

echo "✓ CTAs dos config.json atualizados" >> "$LOG"

# ─── 3. Atualizar HTMLs (valores hardcodados) ────────────────

for angle in a1 a3 a5; do
  HTML="$REPO/$angle/index.html"

  # Preço hardcodado: R$24 → R$29 (sem espaço)
  sed -i '' 's/R\$24/R\$29/g' "$HTML"

  # Preço hardcodado: R$ 24 → R$ 29 (com espaço)
  sed -i '' 's/R\$ 24/R\$ 29/g' "$HTML"

  # Lote 1 → Lote 2
  sed -i '' 's/Lote 1/Lote 2/g' "$HTML"

  # URL Hotmart: trocar oferta
  sed -i '' 's/off=mkb2u3hb/off=kp97gd5j/g' "$HTML"

  echo "✓ $angle/index.html atualizado" >> "$LOG"
done

# ─── 4. Atualizar sticky bar do A3 (hardcodado) ──────────────

sed -i '' 's/89% das vagas preenchidas/32% das vagas preenchidas/g' "$REPO/a3/index.html"
sed -i '' 's/98% das vagas preenchidas/32% das vagas preenchidas/g' "$REPO/a3/index.html"

echo "✓ Sticky bar A3 atualizada" >> "$LOG"

# ─── 5. Atualizar pipeline-state.json ────────────────────────

sed -i '' 's/off=mkb2u3hb/off=kp97gd5j/g' "$REPO/pipeline-state.json"

echo "✓ pipeline-state.json atualizado" >> "$LOG"

# ─── 6. Commit + Push ────────────────────────────────────────

cd "$REPO"
git add -A
git commit -m "chore: atualizar para Lote 2 — R\$29, 32%, nova oferta Hotmart

- Lote 1 → Lote 2
- R\$ 24 → R\$ 29
- 98% → 32% das vagas preenchidas
- URL Hotmart: off=mkb2u3hb → off=kp97gd5j
- Aplicado nos 3 ângulos (A1, A3, A5)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"

git push

if [ $? -eq 0 ]; then
  echo "✓ Push feito com sucesso!" >> "$LOG"
else
  echo "✗ ERRO no push — verificar autenticação GitHub" >> "$LOG"
fi

echo "=== Fim: $(date) ===" >> "$LOG"

# ─── 7. Auto-limpeza: remover o cron após execução ───────────

crontab -l 2>/dev/null | grep -v "update-lote2.sh" | crontab -

echo "✓ Cron removido (execução única)" >> "$LOG"
