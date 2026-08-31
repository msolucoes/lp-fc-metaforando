'use strict';

// CHECKOUT: substitua SOMENTE esta constante pela URL real do checkout.
const CHECKOUT_URL = 'https://pay.hotmart.com/N19450788R?off=w590zejz&checkoutMode=10';

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

    // O sck/src/xcod são construídos e acionados no clique pela tag
    // VK Pixel Sales (GTM), igual nas outras páginas do domínio.
    // Não sobrescrever o href aqui para não competir com essa tag.
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'click_cta_downsell',
      cta_position: link.dataset.ctaPosition,
      product: 'Decodificação de Microexpressões Faciais'
    });
  });
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
