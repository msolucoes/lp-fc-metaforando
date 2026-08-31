'use strict';

// CHECKOUT: substitua SOMENTE esta constante pela URL real do checkout.
const CHECKOUT_URL = 'https://pay.hotmart.com/N19450788R?off=w590zejz&checkoutMode=10';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const UTM_STORAGE_KEY = 'metaforando_utms';

function readUtmsFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const utms = {};
  UTM_KEYS.forEach((key) => {
    const value = params.get(key);
    if (value) utms[key] = value;
  });
  return utms;
}

function getUtms() {
  const fromUrl = readUtmsFromUrl();
  if (Object.keys(fromUrl).length) {
    try { sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(fromUrl)); } catch (e) {}
    return fromUrl;
  }
  try {
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return {};
}

// sck no formato padrão da casa: utm_campaign|utm_source|utm_medium|utm_content|utm_term
function buildSck(utms) {
  return [utms.utm_campaign, utms.utm_source, utms.utm_medium, utms.utm_content, utms.utm_term]
    .map((v) => v || '')
    .join('|');
}

function buildCheckoutUrl(baseUrl, utms) {
  const url = new URL(baseUrl);
  UTM_KEYS.forEach((key) => {
    if (utms[key]) url.searchParams.set(key, utms[key]);
  });
  const sck = buildSck(utms);
  if (sck.replace(/\|/g, '')) url.searchParams.set('sck', sck);
  return url.toString();
}

const checkoutLinks = document.querySelectorAll('[data-event="click_cta_downsell"]');
const checkoutNotice = document.querySelector('.checkout-notice');
let noticeTimer;

checkoutLinks.forEach((link) => {
  link.setAttribute('href', CHECKOUT_URL);
  link.addEventListener('click', (event) => {
    if (CHECKOUT_URL === '#') {
      event.preventDefault();
      // Mensagem funcional apenas na prévia, sem simular uma compra.
      checkoutNotice.hidden = false;
      clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => { checkoutNotice.hidden = true; }, 5000);
      return;
    }

    // Reconstrói o link com as UTMs da sessão no momento do clique
    // (fase de captura), caso o GTM não sobrescreva o sck primeiro.
    const finalUrl = buildCheckoutUrl(CHECKOUT_URL, getUtms());
    link.setAttribute('href', finalUrl);

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'click_cta_downsell',
      cta_position: link.dataset.ctaPosition,
      product: 'Decodificação de Microexpressões Faciais'
    });
  }, true);
});

// Reaplica as UTMs assim que a página carrega, para que o href já esteja
// correto mesmo sem interação (ex.: middle-click / abrir em nova aba).
document.addEventListener('DOMContentLoaded', () => {
  const utms = getUtms();
  if (Object.keys(utms).length) {
    checkoutLinks.forEach((link) => {
      link.setAttribute('href', buildCheckoutUrl(CHECKOUT_URL, utms));
    });
  }
});

// Animações de rolagem fluidas: fade + leve deslocamento ao entrar na tela.
(function initScrollReveal() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sections = document.querySelectorAll('.reveal');
  const items = document.querySelectorAll('.reveal-item');
  const targets = [...sections, ...items];

  if (reduceMotion || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  targets.forEach((el) => observer.observe(el));
})();
