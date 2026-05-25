#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# update-lote.sh — Atualização de lote nas 5 páginas FC Metaforando
#
# Páginas: a1, a1b, a1c, a3, a5
#
# IMPORTANTE — A3 é hardcoded de propósito (sem config.json,
# decisão de performance). Por isso o script edita TODOS os HTMLs
# diretamente via sed, não confia só em config.json.
#
# Uso:
#   ./update-lote.sh "<lote_nome>" "<preco_velho>" "<preco_novo>" \
#                    "<extenso_velho>" "<extenso_novo>" \
#                    "<pct_velho>" "<pct_novo>" \
#                    "<off_velho>" "<off_novo>"
#
# Exemplo (Lote 3 → Último Lote, R$27 → R$37):
#   ./update-lote.sh "Último Lote" "27" "37" \
#                    "Vinte e sete" "Trinta e sete" \
#                    "73" "89" \
#                    "80nj4k9k" "sjs6cmmn"
#
# Validar antes:
#   - Conta GitHub: msolucoes (gh auth status)
#   - Link Hotmart novo gerado e testado
#   - Preço por extenso revisado (sempre "X reais. Menos que um almoço...")
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

if [ "$#" -ne 9 ]; then
  echo "Uso: $0 <lote_nome> <preco_velho> <preco_novo> <extenso_velho> <extenso_novo> <pct_velho> <pct_novo> <off_velho> <off_novo>"
  echo ""
  echo "Exemplo:"
  echo "  $0 \"Último Lote\" \"27\" \"37\" \"Vinte e sete\" \"Trinta e sete\" \"73\" \"89\" \"80nj4k9k\" \"sjs6cmmn\""
  exit 1
fi

LOTE_NOME="$1"
PRECO_VELHO="$2"
PRECO_NOVO="$3"
EXTENSO_VELHO="$4"
EXTENSO_NOVO="$5"
PCT_VELHO="$6"
PCT_NOVO="$7"
OFF_VELHO="$8"
OFF_NOVO="$9"

REPO="/Users/Pinazza/sigil/metaforando/lp-fc-metaforando"
LOG="$REPO/update-lote.log"
PAGES=(a1 a1b a1c a3 a5)

cd "$REPO" || { echo "ERRO: não encontrou $REPO"; exit 1; }

echo "═══ Início: $(date) ═══" | tee -a "$LOG"
echo "Lote: $LOTE_NOME | R\$$PRECO_VELHO → R\$$PRECO_NOVO | $PCT_VELHO% → $PCT_NOVO% | off=$OFF_VELHO → off=$OFF_NOVO" | tee -a "$LOG"

# ─── 1. Atualizar config.json (a1, a1b, a1c, a5 — A3 não tem config.json) ───

for angle in a1 a1b a1c a5; do
  CONFIG="$REPO/$angle/config.json"
  if [ ! -f "$CONFIG" ]; then
    echo "⚠ $angle/config.json não existe, pulando" | tee -a "$LOG"
    continue
  fi

  # Preço
  sed -i '' "s/\"preco\": \"R\\\$ $PRECO_VELHO\"/\"preco\": \"R\\\$ $PRECO_NOVO\"/g" "$CONFIG"

  # Percentual (numérico)
  sed -i '' "s/\"percentual\": $PCT_VELHO,/\"percentual\": $PCT_NOVO,/g" "$CONFIG"

  # Texto da barra (substitui qualquer texto antigo pelo novo, mantendo o padrão "NOME — XX% das vagas preenchidas")
  TEXTO_NOVO=$(echo "$LOTE_NOME" | tr '[:lower:]' '[:upper:]')" — ${PCT_NOVO}% das vagas preenchidas"
  sed -i '' "s/\"texto\": \"[^\"]*\"/\"texto\": \"$TEXTO_NOVO\"/g" "$CONFIG"

  # Nome do lote
  sed -i '' "s/\"nome\": \"[^\"]*\"/\"nome\": \"$LOTE_NOME\"/g" "$CONFIG"

  # CTA texto (substitui preço dentro do CTA — preserva copy específica)
  sed -i '' "s/R\\\$${PRECO_VELHO}/R\\\$${PRECO_NOVO}/g" "$CONFIG"

  echo "✓ $angle/config.json" | tee -a "$LOG"
done

# ─── 2. Atualizar HTMLs (todas as 5 páginas, valores hardcoded) ──────────

for angle in "${PAGES[@]}"; do
  HTML="$REPO/$angle/index.html"
  if [ ! -f "$HTML" ]; then
    echo "⚠ $angle/index.html não existe, pulando" | tee -a "$LOG"
    continue
  fi

  # Preços (com e sem espaço)
  sed -i '' "s/R\\\$${PRECO_VELHO}/R\\\$${PRECO_NOVO}/g" "$HTML"
  sed -i '' "s/R\\\$ ${PRECO_VELHO}/R\\\$ ${PRECO_NOVO}/g" "$HTML"

  # Texto por extenso ("Vinte e sete reais." → "Trinta e sete reais.")
  sed -i '' "s/${EXTENSO_VELHO} reais\\./${EXTENSO_NOVO} reais./g" "$HTML"

  # Link Hotmart
  sed -i '' "s/off=${OFF_VELHO}/off=${OFF_NOVO}/g" "$HTML"

  # Barra hardcoded — texto (todas as variações de "X% das vagas preenchidas")
  TEXTO_NOVO_BARRA=$(echo "$LOTE_NOME" | tr '[:lower:]' '[:upper:]')" — ${PCT_NOVO}% das vagas preenchidas"
  # Substitui qualquer "LOTE XXX — YY% das vagas preenchidas" pelo novo (A3 e sticky-cta)
  sed -i '' -E "s/(LOTE [A-ZÚÁÉÍÓÊÔÃÕÇ ]+ — )[0-9]+(% das vagas preenchidas)/\\1${PCT_NOVO}\\2/g" "$HTML"
  # Substitui o nome do lote se diferente
  sed -i '' -E "s/(scarcity-bar__text[^>]*>)[A-ZÚÁÉÍÓÊÔÃÕÇ ]+ — ${PCT_NOVO}%/\\1$(echo "$LOTE_NOME" | tr '[:lower:]' '[:upper:]') — ${PCT_NOVO}%/g" "$HTML"
  sed -i '' -E "s/(sticky-cta__text[^>]*>)[A-ZÚÁÉÍÓÊÔÃÕÇ ]+ — ${PCT_NOVO}%/\\1$(echo "$LOTE_NOME" | tr '[:lower:]' '[:upper:]') — ${PCT_NOVO}%/g" "$HTML"

  # Barra hardcoded — width (A3 usa style="width:XX%")
  sed -i '' "s/style=\"width:${PCT_VELHO}%\"/style=\"width:${PCT_NOVO}%\"/g" "$HTML"

  # Fallback do data-config percentual (caso o JS falhe, mostra o número certo)
  sed -i '' -E "s/(data-config=\"barra_vendas.percentual\">)[0-9]+(<\\/span>)/\\1${PCT_NOVO}\\2/g" "$HTML"

  echo "✓ $angle/index.html" | tee -a "$LOG"
done

echo "" | tee -a "$LOG"
echo "═══ Verificação ═══" | tee -a "$LOG"

# Sobras
SOBRAS=$(grep -lE "R\\\$ ?${PRECO_VELHO}|${EXTENSO_VELHO} reais|off=${OFF_VELHO}" "${PAGES[@]/%//index.html}" 2>/dev/null || true)
if [ -n "$SOBRAS" ]; then
  echo "⚠ AINDA HÁ SOBRAS em:" | tee -a "$LOG"
  echo "$SOBRAS" | tee -a "$LOG"
  exit 2
else
  echo "✓ Nenhuma sobra dos valores antigos" | tee -a "$LOG"
fi

echo "" | tee -a "$LOG"
echo "═══ Fim: $(date) ═══" | tee -a "$LOG"
echo ""
echo "PRÓXIMO PASSO: revisar as mudanças (git diff) e fazer commit/push via @devops."
echo "Lembre: conta GitHub para este projeto é msolucoes (gh auth switch --user msolucoes)."
