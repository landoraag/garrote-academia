/* Sem zoom nas telas do app, principalmente no celular (pinça e toque duplo).
   O meta viewport e o touch-action do CSS cobrem Android e a maioria dos navegadores; o iPhone ignora o meta, então a pinça também é cancelada aqui.
   Toques rápidos seguidos (como no + e - dos produtos) continuam funcionando, porque o toque duplo é desligado só pelo CSS. */
['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
document.addEventListener('touchmove', e => { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
