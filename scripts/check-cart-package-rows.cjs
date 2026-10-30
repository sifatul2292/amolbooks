// Needs the API dev server (BASE_URL, default http://localhost:3001) and Playwright.
// Cart and checkout keep a special package while the package API answers 404
// (the live nginx burst limit does this when a cart page loads many requests).
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:3001';
const PKG = '6abe2123b1f44997b7ca5950';
const BOOKS = ['6a04d8a16272179445d5efb9', '69a80022b32e6c3db3732121'];

async function run(name, { withPackage = true, saved = true, fail = Infinity, path = '/cart' }) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  let calls = 0;
  let failed = 0;
  await page.route(new RegExp(`/special-package/${PKG}(\\?|$)`), async (route) => {
    calls += 1;
    if (failed < fail) {
      failed += 1;
      return route.fulfill({ status: 404, contentType: 'text/html', body: '<html><body>404 Not Found</body></html>' });
    }
    return route.continue();
  });
  await page.goto(BASE + '/privacy-policy', { waitUntil: 'domcontentloaded' });
  const items = BOOKS.map((id) => ({ product: id, selectedQty: 1, cartType: 0 }));
  if (withPackage) items.push({ specialPackage: PKG, selectedQty: 1, selectedVariation: null, cartType: 1 });
  await page.evaluate(({ items, saved, PKG }) => {
    localStorage.clear();
    window.name = '';
    localStorage.setItem('Amolbooks_LOCAL_USER_CART_1', JSON.stringify(items));
    localStorage.setItem('Amolbooks_USER_CART_1', JSON.stringify(items));
    if (saved) {
      localStorage.setItem('ab-cart-product-cache-v1', JSON.stringify({ [PKG]: {
        _id: PKG, name: 'সফল উদ্যোক্তা বান্ডেল', slug: 'sofoluddoktamindmap', salePrice: 929, discountType: 2, discountAmount: 0,
        images: ['https://apisub.amolbooks.com/api/upload/images/sofol-muslim-uddokta-package-6d7b.webp'], author: [{ name: 'Special Package' }],
      } }));
    }
  }, { items, saved, PKG });
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(path === '/cart' ? 9000 : 11000);
  const result = await page.evaluate((path) => {
    const sel = path === '/cart' ? 'app-cart-information .cart-card' : 'app-checkout .cart-products-area .cart-product, app-checkout .cart-products-area [class*="product"], app-checkout .cart-products-area > *';
    const text = (document.querySelector(path === '/cart' ? 'app-cart-information' : 'app-checkout') || document.body).innerText.replace(/\s+/g, ' ');
    const summary = document.querySelector('app-cart-information .select-items-area');
    return {
      hasPackage: text.includes('সফল উদ্যোক্তা বান্ডেল'),
      hasBooks: text.includes('প্রোডাক্টিভ মুসলিম') && text.includes('আমার নবি মুহাম্মাদ'),
      summary: summary ? summary.innerText.replace(/\s+/g, ' ') : '',
      rows: path === '/cart' ? [...document.querySelectorAll(sel)].map((e) => e.innerText.replace(/\s+/g, ' ').slice(0, 40)) : undefined,
    };
  }, path);
  console.log(JSON.stringify({ name, calls, ...result }));
  await browser.close();
  return { calls, ...result };
}

(async () => {
  const out = [];
  out.push(await run('cart: package API always 404, saved copy', { saved: true, fail: Infinity }));
  out.push(await run('cart: package API 404 once, no saved copy', { saved: false, fail: 1 }));
  out.push(await run('cart: package API ok, no saved copy', { saved: false, fail: 0 }));
  out.push(await run('cart: books only', { withPackage: false, saved: false, fail: 0 }));
  out.push(await run('checkout: package API always 404, saved copy', { saved: true, fail: Infinity, path: '/checkout' }));
  out.push(await run('checkout: package API 404 once, no saved copy', { saved: false, fail: 1, path: '/checkout' }));
  const bad = out.filter((r, i) => !r.hasBooks || (i === 3 ? r.hasPackage : !r.hasPackage));
  if (bad.length) { console.error('FAIL: package missing from cart/checkout'); process.exit(1); }
  console.log('PASS: cart and checkout keep special packages when the package API refuses requests (retry, saved copy); book-only carts unchanged.');
})();
