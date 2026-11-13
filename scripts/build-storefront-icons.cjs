// Builds gtm-snippets/storefront-icons.html: every Font Awesome icon the shop shows, drawn as an
// inline SVG mask in the page head, so icons appear with the page instead of after the icon font
// (owner, 2026-11-13: "these takes a lot of time to load" ... "replace all").
//
// Each icon keeps its colour (currentColor) and size (1em of the element's font size), so the
// compiled Angular markup (<i class="fa fa-home">) needs no change. Icons not listed here still
// use the icon font, which keeps loading as before.
//
// usage: node scripts/build-storefront-icons.cjs        (writes the snippet)
//        node scripts/build-storefront-icons.cjs --check (fails if the snippet is out of date)
const fs = require('node:fs');
const path = require('node:path');

const OUT = path.join(__dirname, '..', 'gtm-snippets', 'storefront-icons.html');

// Stroke drawings use the defaults below; `f:` paths are filled.
const F = (d, extra = '') => `<path d='${d}' fill='black' stroke='none'${extra}/>`;
const S = (d) => `<path d='${d}'/>`;
const C = (cx, cy, r, filled) => `<circle cx='${cx}' cy='${cy}' r='${r}'${filled ? " fill='black' stroke='none'" : ''}/>`;
const R = (x, y, w, h, rx) => `<rect x='${x}' y='${y}' width='${w}' height='${h}' rx='${rx}'/>`;

const STAR = 'M12 2.8l2.8 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.1l-5.7 3 1.2-6.3-4.6-4.4 6.3-.8L12 2.8Z';
const HEART = 'M12 20.3l-1.3-1.2C6.1 14.9 3 12.1 3 8.6 3 5.8 5.2 3.7 7.9 3.7c1.6 0 3.1.7 4.1 1.9 1-1.2 2.5-1.9 4.1-1.9 2.7 0 4.9 2.1 4.9 4.9 0 3.5-3.1 6.3-7.7 10.5L12 20.3Z';
const BOOKMARK = 'M6.5 3h11a1 1 0 0 1 1 1v17l-6.5-4.2L5.5 21V4a1 1 0 0 1 1-1Z';
const BAG = S('M8.5 8.5V6.6a3.5 3.5 0 0 1 7 0v1.9') + F('M5.3 8.5h13.4l1 11.1a2.1 2.1 0 0 1-2.1 2.4H6.4a2.1 2.1 0 0 1-2.1-2.4l1-11.1Z');
const CART = S('M2.5 3.5h2.4l2.2 10.6a1.6 1.6 0 0 0 1.6 1.3h8.8a1.6 1.6 0 0 0 1.6-1.2L21 7.5H5.6') + C(9, 20, 1.6, true) + C(17.5, 20, 1.6, true);
const HOME = F('M12 3.2 2.8 11a1 1 0 0 0 .7 1.8H5V20a1 1 0 0 0 1 1h4v-5.5h4V21h4a1 1 0 0 0 1-1v-7.2h1.5a1 1 0 0 0 .7-1.8L12 3.2Z');
const TRASH = F('M9.2 2.5h5.6l.9 1.5H20a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2h4.3l.9-1.5ZM5.5 7.5h13l-.9 12.6A2.1 2.1 0 0 1 15.5 22h-7a2.1 2.1 0 0 1-2.1-1.9L5.5 7.5Z');
const XMARK = S('M6 6l12 12M18 6 6 18');
const DOWN = S('M6 9l6 6 6-6');
const WHATSAPP = F('M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.28-.2-.57-.35Zm-5.42 7.4h0a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.89 9.88Zm8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89a11.82 11.82 0 0 0-3.48-8.41Z');

// [class selectors] -> drawing. More specific variants (outline/regular) come after the solid ones.
const ICONS = [
  [['.fa-align-left'], S('M4 6h16M4 10h10M4 14h16M4 18h10')],
  [['.fa-angle-down', '.fa-chevron-down'], DOWN],
  [['.fa-angle-up', '.fa-chevron-up'], S('M6 15l6-6 6 6')],
  [['.fa-angle-left', '.fa-chevron-left'], S('M15 6l-6 6 6 6')],
  [['.fa-angle-right', '.fa-chevron-right'], S('M9 6l6 6-6 6')],
  [['.fa-caret-down'], F('M6 9h12l-6 7Z')],
  [['.fa-arrow-right'], S('M4 12h15M13 6l6 6-6 6')],
  [['.fa-bars'], S('M4 6.5h16M4 12h16M4 17.5h16')],
  [['.fa-list-ul'], C(5, 6, 1.4, true) + C(5, 12, 1.4, true) + C(5, 18, 1.4, true) + S('M9 6h11M9 12h11M9 18h11')],
  [['.fa-bell'], F('M12 2.5a1.5 1.5 0 0 1 1.5 1.5v.6A6.5 6.5 0 0 1 18.5 11v4l1.8 2.4a1 1 0 0 1-.8 1.6H4.5a1 1 0 0 1-.8-1.6L5.5 15v-4a6.5 6.5 0 0 1 5-6.4V4A1.5 1.5 0 0 1 12 2.5Zm-2.5 17.5h5a2.5 2.5 0 0 1-5 0Z')],
  [['.fa-bookmark'], F(BOOKMARK)],
  [['.far.fa-bookmark', '.fa-regular.fa-bookmark'], S(BOOKMARK)],
  [['.fa-calendar'], R(3, 5, 18, 16, 2) + S('M3 10h18M8 3v4M16 3v4')],
  [['.fa-calendar-check'], R(3, 5, 18, 16, 2) + S('M3 10h18M8 3v4M16 3v4M9 15.5l2 2 4-4')],
  [['.fa-car'], F('M5 11l1.6-4.3A2 2 0 0 1 8.5 5.4h7a2 2 0 0 1 1.9 1.3L19 11h.5a1.5 1.5 0 0 1 1.5 1.5V17a1 1 0 0 1-1 1h-1v1.5a1.5 1.5 0 0 1-3 0V18H8v1.5a1.5 1.5 0 0 1-3 0V18H4a1 1 0 0 1-1-1v-4.5A1.5 1.5 0 0 1 4.5 11H5Zm2.2 0h9.6l-1.2-3.3a.5.5 0 0 0-.5-.3H8.9a.5.5 0 0 0-.5.3L7.2 11ZM7 15.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Zm10 0a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z', " fill-rule='evenodd'")],
  [['.fa-cart-shopping', '.fa-shopping-cart'], CART],
  [['.fa-shopping-bag', '.fa-bag-shopping'], BAG],
  [['.fa-shopping-basket', '.fa-basket-shopping'], F('M3 9.5h18l-1.7 9.3a2 2 0 0 1-2 1.7H6.7a2 2 0 0 1-2-1.7L3 9.5Z') + S('M7.5 9.5 10.5 4M16.5 9.5 13.5 4')],
  [['.fa-check'], S('M5 12.5l4.5 4.5L19 7.5')],
  [['.fa-check-circle', '.fa-circle-check'], C(12, 12, 9.5) + S('M7.5 12.5l3 3 6-6')],
  [['.fa-times-circle', '.fa-circle-xmark'], C(12, 12, 9.5) + S('M9 9l6 6M15 9l-6 6')],
  [['.fa-xmark', '.fa-times', '.fa-close'], XMARK],
  [['.fa-cloud-arrow-up'], S('M7 18.5h10.5a4 4 0 0 0 .6-8A6 6 0 0 0 6.6 9.6 4.5 4.5 0 0 0 7 18.5ZM12 16v-6M9.5 12.5 12 10l2.5 2.5')],
  [['.fa-code-branch'], C(6, 5, 2.2) + C(6, 19, 2.2) + C(18, 6, 2.2) + S('M6 7.2v9.6M18 8.2c0 5-12 3.5-12 8.6')],
  [['.fa-credit-card'], R(2.5, 5, 19, 14, 2) + S('M2.5 9.5h19M6 15h4')],
  [['.fa-exclamation'], S('M12 4v10') + C(12, 19.5, 1.6, true)],
  [['.fa-eye'], S('M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z') + C(12, 12, 3)],
  [['.fa-eye-slash'], S('M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7ZM3 3l18 18') + C(12, 12, 3)],
  [['.fa-gift'], R(3, 8, 18, 4, 1) + S('M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8M12 8v13M12 8S9.5 3.5 7.5 4.6C6 5.4 7 8 12 8Zm0 0s2.5-4.5 4.5-3.4C18 5.4 17 8 12 8Z')],
  [['.fa-globe'], C(12, 12, 9.5) + S('M2.5 12h19M12 2.5c2.6 2.6 3.8 6 3.8 9.5s-1.2 6.9-3.8 9.5c-2.6-2.6-3.8-6-3.8-9.5S9.4 5.1 12 2.5Z')],
  [['.fa-heart'], F(HEART)],
  [['.far.fa-heart', '.fa-regular.fa-heart'], S(HEART)],
  [['.fa-home', '.fa-house'], HOME],
  [['.fa-magnifying-glass', '.fa-search'], C(10.5, 10.5, 6.5) + S('M15.5 15.5 20.5 20.5')],
  [['.fa-map-marker', '.fa-map-marker-alt', '.fa-location-dot'], F('M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z', " fill-rule='evenodd'")],
  [['.fa-minus'], S('M5 12h14')],
  [['.fa-plus'], S('M12 5v14M5 12h14')],
  [['.fa-phone', '.fa-phone-alt', '.fa-phone-flip'], F('M20.5 16.2v3.1a1.6 1.6 0 0 1-1.8 1.6A17.6 17.6 0 0 1 3.1 5.3 1.6 1.6 0 0 1 4.7 3.5h3.1a1.6 1.6 0 0 1 1.6 1.3l.6 2.9a1.6 1.6 0 0 1-.5 1.5l-1.5 1.3a13 13 0 0 0 5.9 5.9l1.3-1.5a1.6 1.6 0 0 1 1.5-.5l2.9.6a1.6 1.6 0 0 1 1.3 1.6Z')],
  [['.fa-play'], F('M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5Z')],
  [['.fa-quote-left'], F('M4 12.5C4 8.4 6.4 5.6 10 5v2.6c-1.8.5-3 1.9-3.2 3.9H10V19H4v-6.5Zm10 0c0-4.1 2.4-6.9 6-7.5v2.6c-1.8.5-3 1.9-3.2 3.9H20V19h-6v-6.5Z')],
  [['.fa-share'], F('M14 5l7 6.5-7 6.5v-4c-5 0-8.5 1.5-11 5 1-5 4-9.5 11-10.5V5Z')],
  [['.fa-share-nodes', '.fa-share-alt'], C(18, 5, 2.6, true) + C(6, 12, 2.6, true) + C(18, 19, 2.6, true) + S('M8.3 10.8l7.4-4.4M8.3 13.2l7.4 4.4')],
  [['.fa-sign-out', '.fa-sign-out-alt', '.fa-right-from-bracket'], S('M9 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H9M15 8l4 4-4 4M19 12H9.5')],
  [['.fa-spinner'], S('M12 3a9 9 0 1 0 9 9')],
  [['.fa-star'], F(STAR)],
  [['.far.fa-star', '.fa-regular.fa-star', '.fa-star-o'], S(STAR).replace('/>', " stroke-width='1.8'/>")],
  [['.fa-star-half-alt', '.fa-star-half-stroke', '.fa-star-half', '.fa-star-half-o'], S(STAR).replace('/>', " stroke-width='1.8'/>") + F('M12 2.8V17.1l-5.7 3 1.2-6.3-4.6-4.4 6.3-.8L12 2.8Z')],
  [['.fa-trash', '.fa-trash-alt', '.fa-trash-can'], TRASH],
  [['.fa-user'], C(12, 7.5, 4.5, true) + F('M3.5 20.5a8.5 8.5 0 0 1 17 0 1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1Z')],
  [['.fa-user-circle', '.fa-circle-user'], C(12, 12, 9.5) + C(12, 10, 3.2) + S('M6.2 18.4a7 7 0 0 1 11.6 0')],
  // Brands
  [['.fa-facebook-f', '.fa-facebook'], F('M13.5 21v-7.5h2.6l.4-3.1h-3V8.5c0-.9.3-1.5 1.6-1.5h1.6V4.2c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.3H8v3.1h2.5V21h3Z')],
  [['.fa-instagram'], R(3, 3, 18, 18, 5) + C(12, 12, 4) + C(17.3, 6.7, 1.1, true)],
  [['.fa-telegram', '.fa-telegram-plane'], F('M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.9 5.6-1.7 8.2c-.1.6-.5.7-1 .4l-2.7-2-1.3 1.3c-.1.1-.3.3-.6.3l.2-2.7 5-4.5c.2-.2 0-.3-.3-.1l-6.2 3.9-2.6-.8c-.6-.2-.6-.6.1-.8l10.2-3.9c.5-.2.9.1.9.7Z', " fill-rule='evenodd'")],
  [['.fa-twitter', '.fa-x-twitter'], F('M17.8 3h3l-6.6 7.6L22 21h-6.1l-4.8-6.3L5.6 21H2.6l7-8.1L2.2 3h6.2l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z', " fill-rule='evenodd'")],
  [['.fa-whatsapp'], WHATSAPP],
  [['.fa-google'], S('M19.5 12h-7M19.5 12a7.5 7.5 0 1 1-2.2-5.3')],
];

function dataUri(inner) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'>${inner}</svg>`;
  return 'data:image/svg+xml,' + svg.replace(/"/g, "'").replace(/%/g, '%25').replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E').replace(/\s+/g, ' ');
}

function build() {
  const all = [...new Set(ICONS.flatMap(([selectors]) => selectors))];
  const lines = [
    '<!-- All Pages. Generated by scripts/build-storefront-icons.cjs — edit the script, not this file.',
    '     Font Awesome icons drawn inline (CSS masks) so they show with the page instead of after the',
    '     icon font; colour and size follow the element as before. Unlisted icons still use the font. -->',
    '<style id="ab-storefront-icons">',
    `:is(${all.join(', ')})::before {`,
    '  content: "" !important;',
    '  display: inline-block !important;',
    '  width: 1em !important;',
    '  height: 1em !important;',
    '  vertical-align: -0.125em;',
    '  background-color: currentColor !important;',
    '  -webkit-mask: var(--ab-icon) center / contain no-repeat !important;',
    '  mask: var(--ab-icon) center / contain no-repeat !important;',
    '}',
  ];
  for (const [selectors, inner] of ICONS) lines.push(`${selectors.join(', ')} { --ab-icon: url("${dataUri(inner)}"); }`);
  lines.push('</style>', '');
  return lines.join('\n');
}

const html = build();
if (process.argv.includes('--check')) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (current !== html) {
    console.error('gtm-snippets/storefront-icons.html is out of date: run node scripts/build-storefront-icons.cjs');
    process.exit(1);
  }
  console.log('storefront icons up to date (' + ICONS.length + ' drawings)');
} else {
  fs.writeFileSync(OUT, html);
  console.log('wrote ' + path.relative(process.cwd(), OUT) + ' (' + ICONS.length + ' drawings, ' + Math.round(html.length / 1024) + ' KB)');
}
