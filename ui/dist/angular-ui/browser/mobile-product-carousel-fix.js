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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectStyles, { once: true });
  } else {
    injectStyles();
  }
})();
