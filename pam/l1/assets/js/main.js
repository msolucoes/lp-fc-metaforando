/* ==========================================================================
   PROTOCOLO AUTORIDADE MAGNÉTICA — JS mínimo, sem dependências.
   Accordion e carrossel são nativos (zero JS por decisão de INP).
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------------
     1. Reveal de seção — fade-up 8px, uma vez, via IntersectionObserver
     ------------------------------------------------------------------------ */
  var revealables = document.querySelectorAll('.reveal');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

    revealables.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ------------------------------------------------------------------------
     2. Facade de vídeo — o embed de terceiro só entra no clique.
        Tira 500KB+ do caminho crítico e protege o LCP.
     ------------------------------------------------------------------------ */
  document.querySelectorAll('[data-video]').forEach(function (facade) {
    facade.addEventListener('click', function () {
      var src = facade.getAttribute('data-video');
      if (!src || src.indexOf('PLACEHOLDER') !== -1) return;

      var iframe = document.createElement('iframe');
      iframe.src = src;
      iframe.title = facade.getAttribute('data-video-title') || 'Vídeo';
      iframe.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.setAttribute('loading', 'lazy');

      facade.parentNode.appendChild(iframe);
      facade.remove();
      iframe.focus();
    });
  });

  /* ------------------------------------------------------------------------
     3. Barra sticky — entra depois do Hero, some quando a oferta está em tela
        para não competir com o CTA principal.
     ------------------------------------------------------------------------ */
  var stickyBar = document.querySelector('[data-sticky-bar]');
  var hero = document.querySelector('[data-hero]');
  var offer = document.querySelector('[data-offer]');

  if (stickyBar && hero && 'IntersectionObserver' in window) {
    var pastHero = false;
    var onOffer = false;

    var sync = function () {
      stickyBar.classList.toggle('is-visible', pastHero && !onOffer);
    };

    new IntersectionObserver(function (entries) {
      pastHero = !entries[0].isIntersecting;
      sync();
    }, { threshold: 0 }).observe(hero);

    if (offer) {
      new IntersectionObserver(function (entries) {
        onOffer = entries[0].isIntersecting;
        sync();
      }, { threshold: 0 }).observe(offer);
    }
  }

  /* ------------------------------------------------------------------------
     4. Contadores — 800ms, uma vez. Só os números que estão na copy.
     ------------------------------------------------------------------------ */
  var counters = document.querySelectorAll('[data-count-to]');

  if (counters.length && !reduceMotion && 'IntersectionObserver' in window) {
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        var el = entry.target;
        var target = parseFloat(el.getAttribute('data-count-to'));
        var decimals = parseInt(el.getAttribute('data-count-decimals') || '0', 10);
        var suffix = el.getAttribute('data-count-suffix') || '';
        var start = performance.now();

        var tick = function (now) {
          var progress = Math.min((now - start) / 800, 1);
          var eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = (target * eased).toFixed(decimals) + suffix;
          if (progress < 1) requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
        countObserver.unobserve(el);
      });
    }, { threshold: 0.5 });

    counters.forEach(function (el) { countObserver.observe(el); });
  }

  /* ------------------------------------------------------------------------
     5. Origem do clique — mede qual bloco converte.
        Empurra o evento para o dataLayer (GTM). Não altera a URL do checkout.
     ------------------------------------------------------------------------ */
  document.querySelectorAll('[data-cta]').forEach(function (link) {
    link.addEventListener('click', function () {
      var origem = link.getAttribute('data-cta');
      if (window.dataLayer) {
        window.dataLayer.push({ event: 'cta_click', cta_origem: origem });
      }
    });
  });

  /* ------------------------------------------------------------------------
     5b. UTMs → checkout Hotmart.
         Repassa as utm_* da URL da página para os links de CTA e monta o
         `sck` posicional (source|medium|campaign|content|term) para o
         rastreio nativo da Hotmart.
     ------------------------------------------------------------------------ */
  (function () {
    var params = new URLSearchParams(window.location.search);
    var UTMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    if (!UTMS.some(function (k) { return params.get(k); })) return;

    var vals = UTMS.map(function (k) { return params.get(k) || ''; });
    while (vals.length && !vals[vals.length - 1]) vals.pop();
    var sck = vals.join('|');

    document.querySelectorAll('a[data-cta]').forEach(function (a) {
      try {
        var u = new URL(a.href);
        if (u.hostname.indexOf('hotmart.com') === -1) return;
        UTMS.forEach(function (k) {
          var v = params.get(k);
          if (v) u.searchParams.set(k, v);
        });
        if (sck) u.searchParams.set('sck', sck);
        a.href = u.toString();
      } catch (e) { /* href inválido: deixa como está */ }
    });
  })();
})();

/* ------------------------------------------------------------------------
   6. Carrossel de depoimentos — o trilho continua scroll-snap nativo;
      o JS só move o scroll pelas setas e sincroniza os pontos.
   ------------------------------------------------------------------------ */
(function () {
  'use strict';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('[data-carousel]').forEach(function (root) {
    var track = root.querySelector('[data-carousel-track]');
    var prev = root.querySelector('[data-carousel-prev]');
    var next = root.querySelector('[data-carousel-next]');
    var dotsBox = root.querySelector('[data-carousel-dots]');
    if (!track || !prev || !next || !dotsBox) return;

    var slides = Array.prototype.slice.call(track.children);
    if (slides.length < 2) return;

    var dots = slides.map(function (_, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel__dot';
      dot.setAttribute('aria-label', 'Ir para o depoimento ' + (i + 1));
      dot.addEventListener('click', function () { goTo(i); });
      dotsBox.appendChild(dot);
      return dot;
    });

    /* Alvo de scroll que centraliza o slide i no trilho. */
    var leftOf = function (i) {
      return slides[i].offsetLeft - (track.clientWidth - slides[i].offsetWidth) / 2;
    };
    var current = function () {
      var best = 0, bestDist = Infinity;
      slides.forEach(function (_, i) {
        var d = Math.abs(leftOf(i) - track.scrollLeft);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      return best;
    };
    var goTo = function (i) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: leftOf(i), behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    var sync = function () {
      var i = current();
      dots.forEach(function (dot, j) { dot.classList.toggle('is-active', j === i); });
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    };

    prev.addEventListener('click', function () { goTo(current() - 1); });
    next.addEventListener('click', function () { goTo(current() + 1); });
    track.addEventListener('scroll', function () { window.requestAnimationFrame(sync); }, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  });
})();

/* ------------------------------------------------------------------------
   7. CTA liberado por tempo — variante de trafego.
      Sem data-delay-seconds, o CTA permanece visivel desde o inicio.
   ------------------------------------------------------------------------ */
(function () {
  'use strict';
  document.querySelectorAll('[data-delayed-cta][data-delay-seconds]').forEach(function (el) {
    var seconds = parseFloat(el.getAttribute('data-delay-seconds'));
    if (isNaN(seconds)) { el.classList.add('is-released'); return; }
    window.setTimeout(function () { el.classList.add('is-released'); }, seconds * 1000);
  });
})();

/* ------------------------------------------------------------------------
   8. Gate da VSL — o lead entra e vê só o vídeo; aos 18:25 (1105s) o
      player da VTurb libera CTA, dobras, rodapé e sticky (remove
      body.is-gated). Quem já desbloqueou uma vez vê a página completa
      no retorno (localStorage).
   ------------------------------------------------------------------------ */
(function () {
  'use strict';
  if (!document.body.classList.contains('is-gated')) return;

  var SECONDS_TO_DISPLAY = 18 * 60 + 25; /* 18:25 */
  var STORAGE_KEY = 'vslElsDisplayed_6a79dcea0b4c5fbc536d3fca';
  var elsDisplayed = false;
  var attempts = 0;

  var showHiddenElements = function () {
    if (elsDisplayed) return;
    elsDisplayed = true;
    document.body.classList.remove('is-gated');
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch (e) {}
    /* Dobras entram já em tela: dispara o reveal de quem ficou acima da dobra. */
    window.dispatchEvent(new Event('scroll'));
  };

  var alreadyDisplayed = false;
  try { alreadyDisplayed = localStorage.getItem(STORAGE_KEY) === 'true'; } catch (e) {}
  if (alreadyDisplayed) { showHiddenElements(); return; }

  var startWatchVideoProgress = function () {
    if (typeof window.smartplayer === 'undefined' ||
        !(window.smartplayer.instances && window.smartplayer.instances.length)) {
      if (attempts >= 60) return; /* player não carregou em ~60s: mantém gate */
      attempts += 1;
      return setTimeout(startWatchVideoProgress, 1000);
    }
    window.smartplayer.instances[0].on('timeupdate', function () {
      if (elsDisplayed) return;
      var t = window.smartplayer.instances[0].video.currentTime;
      if (t < SECONDS_TO_DISPLAY) return;
      showHiddenElements();
    });
  };
  startWatchVideoProgress();
})();
