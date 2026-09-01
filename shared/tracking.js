// ═══════════════════════════════════════════════════════════
// TRACKING — Vercel Analytics + GTM + Meta Pixel + Hotmart
// Substituir os IDs placeholder pelos reais antes do deploy
// ═══════════════════════════════════════════════════════════

// Vercel Web Analytics
// Initialize queue for analytics events before script loads
window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };

// Load Vercel Analytics script
(function() {
  var script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/insights/script.js';
  document.head.appendChild(script);
})();

// Google Tag Manager (async)
// (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
// new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
// j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
// 'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
// })(window,document,'script','dataLayer','GTM-XXXXXXX');

// Meta Pixel (async)
// !function(f,b,e,v,n,t,s)
// {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
// n.callMethod.apply(n,arguments):n.queue.push(arguments)};
// if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
// n.queue=[];t=b.createElement(e);t.async=!0;
// t.src=v;s=b.getElementsByTagName(e)[0];
// s.parentNode.insertBefore(t,s)}(window, document,'script',
// 'https://connect.facebook.net/en_US/fbevents.js');
// fbq('init', 'PIXEL_ID_AQUI');
// fbq('track', 'PageView');

// Hotmart
// Inserir scripts do Hotmart aqui quando disponíveis

console.log('[Tracking] Vercel Analytics + placeholder scripts carregados. Substitua os IDs reais antes do deploy.');
