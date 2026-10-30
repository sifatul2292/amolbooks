export function optimizeStorefrontHtml(html: string): string {
  // This removed CMS banner is still preloaded by the legacy document.
  html = html.replace(/<link\b(?=[^>]*\brel=["']preload["'])(?=[^>]*amolbooks-banner-24ee\.webp)[^>]*>/gi, '');
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
