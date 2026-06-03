(function () {
  'use strict';

  var WIDGET_ID = 'amol-book-fair-bestseller';
  var DEFAULT_API_BASE = location.hostname.indexOf('amolbooks.com') !== -1
    ? 'https://apisub.amolbooks.com'
    : location.origin;

  var config = Object.assign({
    enabled: true,
    apiBase: DEFAULT_API_BASE,
    pages: ['/', '/home', '/product-list'],
    title: 'বইমেলা বেস্টসেলার ২০২৬',
    badgeTitle: 'অমল বইমেলা ২০২৬',
    subtitle: 'অনলাইন বইমেলা',
    bookfairTag: '',
    categoryCards: [],
    maxProducts: 80,
    maxCategories: 6,
    productsPerCategory: 4
  }, window.AMOL_BOOK_FAIR_BESTSELLER || {});

  var lastPath = '';
  var productsCache = null;
  var loading = false;

  function isAllowedPage() {
    return config.pages.some(function (page) {
      if (page === '/') return location.pathname === '/';
      return location.pathname.indexOf(page) === 0;
    });
  }

  function apiUrl(path) {
    return String(config.apiBase).replace(/\/$/, '') + path;
  }

  function productSelect() {
    return {
      name: 1,
      nameEn: 1,
      slug: 1,
      images: 1,
      author: 1,
      category: 1,
      regularPrice: 1,
      salePrice: 1,
      discountAmount: 1,
      discountType: 1,
      totalSold: 1,
      priority: 1
    };
  }

  function fetchProductList(filter, limit, sort) {
    return fetch(apiUrl('/api/product/get-all'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filter: filter,
        sort: sort || { priority: -1, totalSold: -1, createdAt: -1 },
        pagination: { pageSize: limit || config.productsPerCategory, currentPage: 0 },
        select: productSelect()
      })
    })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (res) { return res && Array.isArray(res.data) ? res.data : []; })
      .catch(function () { return []; });
  }

  function fetchDynamicProducts() {
    var filter = { status: 'publish' };
    if (config.bookfairTag) filter['tags.name'] = config.bookfairTag;

    return fetchProductList(
      filter,
      config.maxProducts,
      { totalSold: -1, priority: -1, createdAt: -1 }
    );
  }

  function fetchCategoryCard(card) {
    var filter = { status: 'publish' };
    var tagName = card.tag || config.bookfairTag;

    if (card.productSlugs && card.productSlugs.length) {
      filter.slug = { $in: card.productSlugs };
    } else if (card.slug || card.categorySlug) {
      filter['category.slug'] = card.slug || card.categorySlug;
    }

    if (tagName) filter['tags.name'] = tagName;

    return fetchProductList(
      filter,
      card.limit || config.productsPerCategory,
      card.sort || { priority: -1, totalSold: -1, createdAt: -1 }
    ).then(function (products) {
      if (card.productSlugs && card.productSlugs.length) {
        products.sort(function (a, b) {
          return card.productSlugs.indexOf(a.slug) - card.productSlugs.indexOf(b.slug);
        });
      }

      return {
        category: {
          name: card.title,
          nameEn: card.title,
          slug: card.slug || card.categorySlug
        },
        minProducts: card.minProducts || 1,
        products: products.slice(0, card.limit || config.productsPerCategory)
      };
    });
  }

  function fetchGroups() {
    if (productsCache) return Promise.resolve(productsCache);
    if (loading) return Promise.resolve([]);
    loading = true;

    if (config.categoryCards && config.categoryCards.length) {
      return Promise.all(config.categoryCards.map(fetchCategoryCard))
        .then(function (groups) {
          loading = false;
          productsCache = groups.filter(function (group) {
            return group.products.length >= (group.minProducts || 1);
          });
          return productsCache;
        })
        .catch(function () {
          loading = false;
          return [];
        });
    }

    return fetchDynamicProducts()
      .then(function (products) {
        loading = false;
        productsCache = groupProducts(products);
        return productsCache;
      })
      .catch(function () {
        loading = false;
        return [];
      });
  }

  function asArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  function firstImage(product) {
    var images = asArray(product.images);
    return images[0] || 'https://cdn.saleecom.com/upload/images/placeholder.png';
  }

  function authorName(product) {
    var author = asArray(product.author)[0] || product.author;
    return (author && (author.name || author.nameEn)) || '';
  }

  function productTitle(product) {
    return product.name || product.nameEn || 'বই';
  }

  function categoryItems(product) {
    return asArray(product.category).filter(function (cat) {
      return cat && (cat.name || cat.nameEn || cat.slug || cat._id);
    });
  }

  function categoryHref(category) {
    if (!category || !category.slug) return '/product-list';
    return '/product-list?categories=' + encodeURIComponent(category.slug);
  }

  function productHref(product) {
    return product.slug ? '/product-details/' + encodeURIComponent(product.slug) : '/product-list';
  }

  function taka(value) {
    if (value === null || value === undefined || value === '') return '';
    return String(Math.round(Number(value))) + '৳';
  }

  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function discountLabel(product) {
    var regular = Number(product.regularPrice || 0);
    var sale = Number(product.salePrice || 0);
    if (!regular || !sale || sale >= regular) return '';
    return Math.round(((regular - sale) / regular) * 100) + '% ছাড়';
  }

  function groupProducts(products) {
    var groups = [];
    var byKey = {};

    products.forEach(function (product) {
      categoryItems(product).forEach(function (category) {
        var key = category._id || category.slug || category.name || category.nameEn;
        if (!key) return;

        if (!byKey[key]) {
          byKey[key] = {
            category: category,
            products: []
          };
          groups.push(byKey[key]);
        }

        if (byKey[key].products.length < config.productsPerCategory) {
          byKey[key].products.push(product);
        }
      });
    });

    return groups
      .filter(function (group) { return group.products.length >= 2; })
      .slice(0, config.maxCategories);
  }

  function styles() {
    return [
      ':host{display:block;font-family:hind-siliguri,ui-sans-serif,system-ui,sans-serif;color:#4a4a4a}',
      '*{box-sizing:border-box}',
      'a{color:inherit;text-decoration:none}',
      '.wrap{background:#f3f4f6;margin:38px 0;padding:30px 0 42px;overflow:hidden}',
      '.inner{width:min(1200px,calc(100vw - 28px));margin:0 auto}',
      '.mast{display:flex;align-items:center;justify-content:center;gap:22px;margin-bottom:24px}',
      '.mark{background:#fff;padding:18px 28px;text-align:center;box-shadow:0 1px 0 rgba(0,0,0,.04)}',
      '.mark strong{display:block;color:#8b2031;font-size:27px;line-height:1.05;font-weight:800}',
      '.mark span{display:block;color:#e24a32;font-size:18px;font-weight:700;margin-top:3px}',
      '.title{border-left:1px solid #d4515d;padding-left:22px;font-size:22px;font-weight:700;color:#333;white-space:nowrap}',
      '.rail{display:flex;gap:18px;overflow-x:auto;padding:8px 4px 10px;scroll-snap-type:x proximity}',
      '.rail::-webkit-scrollbar{height:8px}.rail::-webkit-scrollbar-thumb{background:#c8cdd3;border-radius:999px}',
      '.panel{background:#fff;border:2px solid #8b2031;border-radius:8px;min-width:330px;max-width:330px;overflow:hidden;scroll-snap-align:start}',
      '.panel-head{height:58px;background:#8b2031;color:#fff;display:flex;align-items:center;gap:10px;padding:0 18px;font-size:18px;font-weight:700}',
      '.panel-head .icon{width:18px;height:18px;border:1px solid rgba(255,255,255,.85);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px}',
      '.book{position:relative;display:grid;grid-template-columns:64px 1fr;gap:12px;min-height:94px;padding:12px 14px;border-top:1px solid #b66d78;background:#fff}',
      '.book:first-of-type{border-top:0}',
      '.cover{width:58px;height:76px;border-radius:4px;object-fit:cover;background:#f0f0f0;box-shadow:0 1px 3px rgba(0,0,0,.16)}',
      '.rank{position:absolute;left:9px;top:10px;background:#ed3f2f;color:#fff;width:31px;height:31px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;clip-path:polygon(50% 0,61% 26%,89% 15%,78% 43%,100% 58%,70% 64%,72% 95%,50% 76%,28% 95%,30% 64%,0 58%,22% 43%,11% 15%,39% 26%)}',
      '.name{font-size:14px;line-height:1.35;font-weight:700;color:#4a4a4a;margin-bottom:2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
      '.author{font-size:12px;line-height:1.3;color:#8a8f98;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.price{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px}',
      '.sale{color:#e73d32;font-weight:800}.regular{color:#777;text-decoration:line-through}.discount{color:#e73d32}',
      '.see{height:45px;border-top:1px solid #b66d78;background:#fff8f8;color:#e73d32;display:flex;align-items:center;justify-content:space-between;padding:0 16px;font-size:15px;font-weight:700}',
      '.empty{display:none}',
      '@media(max-width:700px){.wrap{margin:24px 0;padding:22px 0 30px}.mast{justify-content:flex-start;gap:12px;margin-bottom:16px}.mark{padding:12px 16px}.mark strong{font-size:20px}.mark span{font-size:14px}.title{font-size:17px;padding-left:12px;white-space:normal}.panel{min-width:292px;max-width:292px}.panel-head{height:52px;font-size:16px}.book{grid-template-columns:56px 1fr;padding:10px 12px}.cover{width:52px;height:70px}.name{font-size:13px}}'
    ].join('');
  }

  function render(groups) {
    if (!groups.length) return '';

    return [
      '<style>' + styles() + '</style>',
      '<section class="wrap" aria-label="' + escapeHtml(config.title) + '">',
      '<div class="inner">',
      '<div class="mast"><div class="mark"><strong>' + escapeHtml(config.badgeTitle) + '</strong><span>' + escapeHtml(config.subtitle) + '</span></div><div class="title">' + escapeHtml(config.title) + '</div></div>',
      '<div class="rail">',
      groups.map(renderGroup).join(''),
      '</div>',
      '</div>',
      '</section>'
    ].join('');
  }

  function renderGroup(group) {
    var category = group.category;
    var title = category.name || category.nameEn || 'বই';

    return [
      '<article class="panel">',
      '<a class="panel-head" href="' + escapeHtml(categoryHref(category)) + '"><span class="icon">↗</span><span>' + escapeHtml(title) + '</span></a>',
      group.products.map(function (product, index) {
        var discount = discountLabel(product);
        return [
          '<a class="book" href="' + escapeHtml(productHref(product)) + '">',
          '<span class="rank">' + (index + 1) + '</span>',
          '<img class="cover" loading="lazy" src="' + escapeHtml(firstImage(product)) + '" alt="">',
          '<span>',
          '<span class="name">' + escapeHtml(productTitle(product)) + '</span>',
          '<span class="author">' + escapeHtml(authorName(product)) + '</span>',
          '<span class="price"><span class="sale">' + taka(product.salePrice) + '</span>',
          product.regularPrice ? '<span class="regular">' + taka(product.regularPrice) + '</span>' : '',
          discount ? '<span class="discount">(' + discount + ')</span>' : '',
          '</span>',
          '</span>',
          '</a>'
        ].join('');
      }).join(''),
      '<a class="see" href="' + escapeHtml(categoryHref(category)) + '"><span>সব দেখুন</span><span>›</span></a>',
      '</article>'
    ].join('');
  }

  function findAnchor() {
    var root = document.querySelector('app-root');
    if (!root) return null;

    var candidates = root.querySelectorAll('section,.container,app-carousel,app-banner,.banner,.banner-area,.main-area');
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (el.id === WIDGET_ID || el.closest('#' + WIDGET_ID)) continue;
      if (el.offsetHeight > 120) return { parent: el.parentNode, after: el };
    }

    return { parent: root, after: root.lastElementChild };
  }

  function mount(groups) {
    if (!isAllowedPage()) {
      remove();
      return;
    }
    if (!groups.length) {
      remove();
      return;
    }

    var existing = document.getElementById(WIDGET_ID);
    if (!existing) {
      var anchor = findAnchor();
      if (!anchor || !anchor.parent) return;

      existing = document.createElement('div');
      existing.id = WIDGET_ID;
      if (anchor.after && anchor.after.nextSibling) {
        anchor.parent.insertBefore(existing, anchor.after.nextSibling);
      } else {
        anchor.parent.appendChild(existing);
      }
      existing.attachShadow({ mode: 'open' });
    }

    existing.shadowRoot.innerHTML = render(groups);
  }

  function remove() {
    var existing = document.getElementById(WIDGET_ID);
    if (existing) existing.remove();
  }

  function refresh() {
    if (!config.enabled) return remove();
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      remove();
    }
    if (!isAllowedPage()) return remove();

    fetchGroups().then(function (groups) {
      mount(groups);
    });
  }

  function watchNavigation() {
    var pushState = history.pushState;
    var replaceState = history.replaceState;

    history.pushState = function () {
      var result = pushState.apply(this, arguments);
      setTimeout(refresh, 120);
      return result;
    };
    history.replaceState = function () {
      var result = replaceState.apply(this, arguments);
      setTimeout(refresh, 120);
      return result;
    };
    window.addEventListener('popstate', function () { setTimeout(refresh, 120); });
  }

  function boot() {
    watchNavigation();
    refresh();
    setTimeout(refresh, 800);
    setTimeout(refresh, 1800);

    try {
      new MutationObserver(function () {
        if (isAllowedPage() && !document.getElementById(WIDGET_ID)) {
          setTimeout(refresh, 120);
        }
      }).observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
