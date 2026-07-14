/* ═══════════════════════════════════════════════════════════════════════
 * FC METAFORANDO — Virada de lote automática por data (client-side)
 * ───────────────────────────────────────────────────────────────────────
 * O QUE FAZ (por data, fuso de Brasília, sem depender de deploy):
 *   1) Define o lote ativo → troca preço exibido, texto por extenso e a
 *      BASE do checkout (o off= do Hotmart).
 *   2) Anima a barra de progresso proporcionalmente entre duas datas.
 *
 * O QUE NÃO TOCA (para não prejudicar tráfego/campanhas):
 *   - Formulário, envio ao ActiveCampaign, pixels/GTM.
 *   - Repasse de UTM e montagem do sck (continua no submit do form).
 *   Ele só expõe window.__CHECKOUT_URL, que o form usa como base.
 *
 * COMO EDITAR NA PRÓXIMA VIRADA: mexa só no bloco LOTES abaixo.
 * TESTE: adicione ?__loteDate=2026-07-16T10:00 na URL para simular a data.
 * ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  // ─────────────────────────── CONFIG ───────────────────────────
  // Datas em horário de BRASÍLIA (UTC-03:00, sem horário de verão).
  // "ate" = último instante válido do lote. O ÚLTIMO lote não tem "ate".
  var LOTES = [
    {
      nome: "Lote Promocional",
      preco: "R$ 27",           // sempre com espaço; o script cobre "R$27" também
      precoExtenso: "Vinte e sete",
      checkout: "https://pay.hotmart.com/V103997742J?off=06axulhm&checkoutMode=10",
      ate: "2026-07-14T23:59:59", // vira em 15/07 00:00
      // Barra fixa em 63% (nada regride no que já está no ar hoje).
      // Para rampar o Lote 1 depois, é só trocar startPct/start abaixo.
      progresso: { startPct: 63, endPct: 63, start: "2026-07-14T00:00:00", end: "2026-07-14T23:59:59" }
    },
    {
      nome: "Lote Promocional",  // nome mantido igual (pedido)
      preco: "R$ 37",
      precoExtenso: "Trinta e sete",
      checkout: "https://pay.hotmart.com/V103997742J?off=142taykp&checkoutMode=10",
      // sem "ate" = lote vigente até o fim
      // Barra sobe 51% → 98% entre 15/07 00:00 e 17/07 23:59:59 e trava em 98%.
      progresso: { startPct: 51, endPct: 98, start: "2026-07-15T00:00:00", end: "2026-07-17T23:59:59" }
    }
  ];

  var BR_OFFSET = "-03:00";
  // ─────────────────────────── FIM CONFIG ───────────────────────

  function tsBR(iso) { return iso ? new Date(iso + BR_OFFSET).getTime() : null; }

  // "Agora" — permite simular a data via ?__loteDate=... (só para teste).
  function agora() {
    try {
      var q = new URLSearchParams(window.location.search).get("__loteDate");
      if (q) { var t = new Date(q + BR_OFFSET).getTime(); if (!isNaN(t)) return t; }
    } catch (e) {}
    return Date.now();
  }

  function loteAtivo() {
    var t = agora();
    for (var i = 0; i < LOTES.length; i++) {
      var fim = tsBR(LOTES[i].ate);
      if (fim === null || t <= fim) return LOTES[i];
    }
    return LOTES[LOTES.length - 1];
  }

  function percentual(lote) {
    var p = lote.progresso;
    if (!p) return null;
    if (p.startPct === p.endPct) return p.endPct;
    var s = tsBR(p.start), e = tsBR(p.end), t = agora();
    if (t <= s) return p.startPct;
    if (t >= e) return p.endPct;                 // trava no endPct após o fim
    return Math.round(p.startPct + (p.endPct - p.startPct) * (t - s) / (e - s));
  }

  // Números conhecidos entre todos os lotes (para troca precisa e bidirecional).
  // IMPORTANTE: só trocamos os preços de LOTE (27/37). Valores de ancoragem
  // como R$18, R$350, R$497, R$800 NÃO entram aqui e nunca são tocados.
  var PRECOS_ESPACO = /R\$ (?:27|37)\b/g;   // "R$ 27" / "R$ 37"
  var PRECOS_JUNTO  = /R\$(?:27|37)\b/g;    // "R$27"  / "R$37"
  var EXTENSOS      = /(?:Vinte e sete|Trinta e sete)(?= reais)/g;
  var BARRA_TXT     = /\d+% das vagas preenchidas/g;

  function trocarTokens(root, lote, pct) {
    var precoJunto = lote.preco.replace(/\s/g, "");            // "R$37"
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var p = n.parentNode;
        if (p && /^(SCRIPT|STYLE|NOSCRIPT|IFRAME)$/.test(p.nodeName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var node;
    while ((node = walker.nextNode())) {
      var antes = node.nodeValue;
      var depois = antes
        .replace(PRECOS_ESPACO, lote.preco)
        .replace(PRECOS_JUNTO, precoJunto)
        .replace(EXTENSOS, lote.precoExtenso);
      if (pct != null) depois = depois.replace(BARRA_TXT, pct + "% das vagas preenchidas");
      if (depois !== antes) node.nodeValue = depois;
    }
  }

  var obs = null;

  function aplicar() {
    if (obs) obs.disconnect();                 // evita auto-disparo do observer

    var lote = loteAtivo();
    var pct = percentual(lote);

    // Base do checkout que o formulário vai usar (UTM/sck seguem no submit).
    window.__CHECKOUT_URL = lote.checkout;

    // Preço nos elementos data-config (a1/a1b/a1c/a5)
    var precos = document.querySelectorAll('[data-config="lote.preco"]');
    for (var i = 0; i < precos.length; i++) {
      if (precos[i].textContent !== lote.preco) precos[i].textContent = lote.preco;
    }

    // Barra de progresso (largura) — cobre a3 (width inline) e as demais
    if (pct != null) {
      var largura = Math.min(pct, 100) + "%";
      var fills = document.querySelectorAll(".scarcity-bar__fill");
      for (var j = 0; j < fills.length; j++) {
        if (fills[j].style.width !== largura) fills[j].style.width = largura;
      }
      // Caso exista um span que mostre só o número do percentual
      var nums = document.querySelectorAll('[data-config="barra_vendas.percentual"]');
      for (var k = 0; k < nums.length; k++) {
        if (nums[k].getAttribute("data-type") === "progress") {
          if (nums[k].style.width !== largura) nums[k].style.width = largura;
        } else if (nums[k].textContent.trim() !== String(pct)) {
          nums[k].textContent = pct;
        }
      }
    }

    // Preço no texto (CTAs, copy, sticky), por extenso e texto da barra
    if (document.body) trocarTokens(document.body, lote, pct);

    if (window.__loteDebug) {
      console.log("[virada-lote] preco:", lote.preco, "| off:", lote.checkout.match(/off=(\w+)/)[1], "| barra:", pct + "%");
    }

    // Reconecta o observer: garante vitória mesmo se o config.json resolver depois.
    if (obs) obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function aplicarSeguro() {
    try { aplicar(); } catch (e) { /* nunca deixa um erro matar o loop */ }
  }

  function iniciar() {
    // 1) Aplica imediatamente (reduz o flash no primeiro paint).
    aplicarSeguro();

    // 2) Reforço por setTimeout até ~4s. Usamos setTimeout (não rAF) porque o
    //    requestAnimationFrame é CONGELADO em abas em segundo plano — o config.json
    //    (fetch async) pode resolver depois e não seria revertido. Re-aplicando
    //    periodicamente, a última escrita é sempre a nossa (cobre rede lenta/mobile).
    var fim = Date.now() + 4000;
    (function loop() {
      aplicarSeguro();
      if (Date.now() < fim) setTimeout(loop, 150);
    })();

    // 3) Observer: reverte QUALQUER reescrita tardia quase de imediato (debounce
    //    por setTimeout 0 — também funciona em segundo plano, ao contrário do rAF).
    if ("MutationObserver" in window && document.body) {
      var pendente = false;
      obs = new MutationObserver(function () {
        if (pendente) return;
        pendente = true;
        setTimeout(function () { pendente = false; aplicarSeguro(); }, 0);
      });
      obs.observe(document.body, { childList: true, subtree: true, characterData: true });
      // Mantém por 12s (cobre config.json lento em mobile); depois desliga.
      setTimeout(function () { if (obs) { obs.disconnect(); obs = null; } }, 12000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
