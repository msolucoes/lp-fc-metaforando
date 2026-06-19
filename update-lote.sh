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
# Uso (10 argumentos — agora exige o NOME VELHO do lote):
#   ./update-lote.sh "<nome_velho>" "<nome_novo>" \
#                    "<preco_velho>" "<preco_novo>" \
#                    "<extenso_velho>" "<extenso_novo>" \
#                    "<pct_velho>" "<pct_novo>" \
#                    "<off_velho>" "<off_novo>"
#
# Exemplo (Último Lote → Lote Promocional, R$37 → R$27):
#   ./update-lote.sh "Último Lote" "Lote Promocional" \
#                    "37" "27" \
#                    "Trinta e sete" "Vinte e sete" \
#                    "92" "63" \
#                    "lu6vvkvr" "ma564jtc"
#
# Validar antes:
#   - Conta GitHub: msolucoes (gh auth status)
#   - Link Hotmart novo gerado e testado
#   - Preço por extenso revisado (sempre "X reais. Menos que um almoço...")
#
# NÃO COBRE (fazer manualmente):
#   - Data do evento (ex: "20 de junho" → "04 de julho")
#   - Tag de campanha (configurada na Vercel)
#   - Copy do CTA (preservada — só o preço dentro dela é trocado)
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

if [ "$#" -ne 10 ]; then
  echo "Uso: $0 <nome_velho> <nome_novo> <preco_velho> <preco_novo> <extenso_velho> <extenso_novo> <pct_velho> <pct_novo> <off_velho> <off_novo>"
  echo ""
  echo "Exemplo:"
  echo "  $0 \"Último Lote\" \"Lote Promocional\" \"37\" \"27\" \"Trinta e sete\" \"Vinte e sete\" \"92\" \"63\" \"lu6vvkvr\" \"ma564jtc\""
  exit 1
fi

NOME_VELHO="$1"
NOME_NOVO="$2"
PRECO_VELHO="$3"
PRECO_NOVO="$4"
EXTENSO_VELHO="$5"
EXTENSO_NOVO="$6"
PCT_VELHO="$7"
PCT_NOVO="$8"
OFF_VELHO="$9"
OFF_NOVO="${10}"

# Versões em CAIXA ALTA do nome (usadas nas barras "NOME — XX% das vagas preenchidas")
NOME_VELHO_UP=$(echo "$NOME_VELHO" | tr '[:lower:]' '[:upper:]')
NOME_NOVO_UP=$(echo "$NOME_NOVO" | tr '[:lower:]' '[:upper:]')

REPO="/Users/Pinazza/sigil/metaforando/lp-fc-metaforando"
LOG="$REPO/update-lote.log"
PAGES=(a1 a1b a1c a3 a5)

cd "$REPO" || { echo "ERRO: não encontrou $REPO"; exit 1; }

echo "═══ Início: $(date) ═══" | tee -a "$LOG"
echo "Lote: $NOME_VELHO → $NOME_NOVO | R\$$PRECO_VELHO → R\$$PRECO_NOVO | $PCT_VELHO% → $PCT_NOVO% | off=$OFF_VELHO → off=$OFF_NOVO" | tee -a "$LOG"

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

  # Texto da barra (barra_vendas.texto) — ÚNICO texto trocado por valor completo.
  # FIX BUG-1: ancora a substituição APENAS na linha "texto" que vem logo após
  # "percentual": ... (ou seja, dentro do bloco barra_vendas). Assim NÃO toca no cta.texto.
  TEXTO_NOVO_BARRA="${NOME_NOVO_UP} — ${PCT_NOVO}% das vagas preenchidas"
  sed -i '' "/\"percentual\":/,/\"texto\":/ s/\"texto\": \"[^\"]*\"/\"texto\": \"$TEXTO_NOVO_BARRA\"/" "$CONFIG"

  # Nome do lote (lote.nome) — troca pelo valor exato antigo→novo (não usa wildcard)
  sed -i '' "s/\"nome\": \"$NOME_VELHO\"/\"nome\": \"$NOME_NOVO\"/g" "$CONFIG"

  # CTA texto: troca SOMENTE o preço dentro da copy, preservando a frase do CTA.
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

  # Texto por extenso ("Trinta e sete reais." → "Vinte e sete reais.")
  sed -i '' "s/${EXTENSO_VELHO} reais\\./${EXTENSO_NOVO} reais./g" "$HTML"

  # Link Hotmart
  sed -i '' "s/off=${OFF_VELHO}/off=${OFF_NOVO}/g" "$HTML"

  # Barra hardcoded — texto completo "NOME_VELHO — PCT_VELHO% das vagas preenchidas"
  # FIX BUG-2: troca a string inteira (nome + percentual juntos) de forma direta,
  # sem depender de o nome já bater com o percentual novo.
  sed -i '' "s/${NOME_VELHO_UP} — ${PCT_VELHO}% das vagas preenchidas/${NOME_NOVO_UP} — ${PCT_NOVO}% das vagas preenchidas/g" "$HTML"

  # Nome do lote hardcoded em fallbacks (price-label e data-config="lote.nome"): >Nome<
  # FIX BUG-3: o script antes não trocava isso. Cobre <span>Último Lote</span> etc.
  sed -i '' "s/>${NOME_VELHO}</>${NOME_NOVO}</g" "$HTML"

  # Sticky-cta fallback "Nome com vagas limitadas"
  sed -i '' "s/${NOME_VELHO} com vagas limitadas/${NOME_NOVO} com vagas limitadas/g" "$HTML"

  # Barra hardcoded — width (A3 usa style="width:XX%")
  sed -i '' "s/style=\"width:${PCT_VELHO}%\"/style=\"width:${PCT_NOVO}%\"/g" "$HTML"

  # Fallback do data-config percentual (caso o JS falhe, mostra o número certo)
  sed -i '' -E "s/(data-config=\"barra_vendas.percentual\">)[0-9]+(<\\/span>)/\\1${PCT_NOVO}\\2/g" "$HTML"

  echo "✓ $angle/index.html" | tee -a "$LOG"
done

echo "" | tee -a "$LOG"
echo "═══ Verificação ═══" | tee -a "$LOG"

# Sobras — FIX BUG-4: checa também NOME VELHO (caixa normal e alta) e PCT VELHO da barra.
SOBRAS=$(grep -lE "R\\\$ ?${PRECO_VELHO}|${EXTENSO_VELHO} reais|off=${OFF_VELHO}|${NOME_VELHO}|${NOME_VELHO_UP}|${PCT_VELHO}% das vagas" "${PAGES[@]/%//index.html}" 2>/dev/null || true)
if [ -n "$SOBRAS" ]; then
  echo "⚠ AINDA HÁ SOBRAS em:" | tee -a "$LOG"
  echo "$SOBRAS" | tee -a "$LOG"
  echo "  (rode 'grep -n' nos arquivos acima para localizar e corrija manualmente)" | tee -a "$LOG"
  exit 2
else
  echo "✓ Nenhuma sobra dos valores antigos" | tee -a "$LOG"
fi

echo "" | tee -a "$LOG"
echo "═══ Fim: $(date) ═══" | tee -a "$LOG"
echo ""
echo "ATENÇÃO: este script NÃO altera a DATA do evento nem a TAG de campanha — faça manualmente."
echo "PRÓXIMO PASSO: revisar as mudanças (git diff) e fazer commit/push via @devops."
echo "Lembre: conta GitHub para este projeto é msolucoes (gh auth switch --user msolucoes)."
