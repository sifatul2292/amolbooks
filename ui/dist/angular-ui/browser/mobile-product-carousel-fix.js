(function () {
  'use strict';

  var STYLE_ID = 'amol-mobile-carousel-fix';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '@media(max-width:700px){',
      '  .tag-products-swiper .swiper-slide{',
      '    width:calc((100% - 12px)/2)!important;',
      '    max-width:calc((100% - 12px)/2)!important;',
      '    margin-right:12px!important;',
      '  }',
      '  .tag-products-swiper app-product-card-one,',
      '  .tag-products-swiper app-product-card-loader{',
      '    width:100%!important;',
      '    min-width:0!important;',
      '  }',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function fixSwiperInstances() {
    var swipers = document.querySelectorAll('.tag-products-swiper');
    swipers.forEach(function (el) {
      var swiper = el.swiper;
      if (!swiper || !swiper.params) return;

      swiper.params.slidesPerView = 2;
      swiper.params.spaceBetween = 12;
      swiper.params.breakpoints = Object.assign({}, swiper.params.breakpoints || {}, {
        0: { slidesPerView: 2, spaceBetween: 12 },
        500: { slidesPerView: 2, spaceBetween: 12 },
      });

      if (typeof swiper.update === 'function') swiper.update();
    });
  }

  function run() {
    injectStyles();
    if (window.innerWidth <= 700) fixSwiperInstances();
  }

  document.addEventListener('DOMContentLoaded', function () {
    run();
    setTimeout(run, 800);
    setTimeout(run, 1800);
  });
  window.addEventListener('resize', run);

  try {
    new MutationObserver(function () {
      clearTimeout(run._t);
      run._t = setTimeout(run, 120);
    }).observe(document.body, { childList: true, subtree: true });
  } catch (e) {}
})();
