export function optimizeStorefrontHtml(html: string): string {
  // This removed CMS banner is still preloaded by the legacy document.
  html = html.replace(/<link\b(?=[^>]*\brel=["']preload["'])(?=[^>]*amolbooks-banner-24ee\.webp)[^>]*>/gi, '');
  // Angular swaps the global stylesheet in from media="print" at low priority,
  // so the app paints before its global rules (.container padding, header
  // sizes) and then the whole page jumps. Load it as a normal stylesheet.
  html = html.replace(/<link rel="stylesheet" href="(styles\.[a-f0-9]+\.css)" media="print" onload="this\.media='all'">/g, '<link rel="stylesheet" href="$1">');
  const loader = `      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=AW-18176858056';
      document.head.appendChild(s);`;
  // The active GTM container already loads this Ads destination. Retain the
  // standalone fallback if GTM fails, and keep all queued conversion commands.
  if (!html.includes('/* amol-ads-loader-dedup */')) {
    html = html.replace(loader, `      /* amol-ads-loader-dedup */
      if (!window.__amolGtmReady) {
${loader}
      }`);
  }
  return html;
}
