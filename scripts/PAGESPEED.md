# Mobile PageSpeed fixes — 2026-10-18

Baseline: supplied report `diglia63ql`: performance 43, accessibility 78,
best practices 88, SEO 85. FCP 7.0s, LCP 10.9s, TBT 500ms, CLS 0.

Implemented in source/snippets:
- Responsive 320/640px WebP homepage covers, preserving original-image fallback.
  Local-file-only image middleware limits input pixels, concurrent conversions,
  and cached bytes/entries; browser cache lasts one day, not forever.
- First two shelf images are eager/high priority; later cards stay lazy.
- Homepage catalogue uses the existing same-origin proxy on production and local
  hosts, avoiding the direct cross-origin fetch flagged in the report.
- Main landmark, search button name, category decorative alt text, social link
  names, valid phone URL, removal of empty social destinations, side-nav hrefs,
  catalogue list-item role, download control name, and targeted text contrast.

Deploy backend and snippets together through scripts/vps-safe-pull.sh, build API,
and restart the API process. Its existing installer injects snippets at startup;
no compiled UI files should be edited manually. If nginx serves the storefront,
confirm /storefront-catalog/ and the API image route reach Nest. See the companion
nginx-pagespeed.conf.example. Do not cache personalized API responses.

Production work still required:
- The VPS already terminates the apex-to-www redirect in nginx. It measured
  about 30ms against local origin and 86ms through Cloudflare during this task;
  the old report's 7088ms delay was not reproduced. Keep the canonical www host
  and monitor a fresh audit rather than adding another redirect.
- Remove/replace three broken CMS-configured assets: amolbooks-banner-24ee.webp,
  banner-cf2f.webp, and assets/images/logo/download (2).png. Check the intended
  content in the admin; do not invent replacement promotional artwork.
- Unused Angular JS/CSS requires the original build pipeline to tree-shake or
  split safely; compiled bundles must not be patched. Third-party JS/cache
  lifetimes require reviewing the active GTM container/provider configuration.
  Every resource in the report's 204KiB cache warning is third-party owned
  (Facebook, Clarity or Cloudflare); increasing nginx cache TTL cannot fix it.
- The product script's repeated whole-body text scan and unchanged badge writes
  are fixed. The browser regression fixture reproduces nine full scans in 1.2s
  before the patch and one after. Homepage observer work is batched, route-only
  polling replaces repeated polling scans, icon fonts use swap even after the
  late stylesheet, and reported hover/drawer transitions animate transform and
  opacity only. Responsive logo derivatives are also installed.
- Removed the known broken banner preload and deduplicated the standalone Google
  Ads loader when GTM is ready; queued configuration/conversion commands and the
  standalone fallback remain. Large Angular DOM and vendor script cost still
  need original-build/GTM changes; no claim that all warnings disappear.
- llms.txt/ai-catalog.json are experimental discoverability audits, not the
  performance/SEO score. Do not fabricate these resources to silence checks.

Verification: build, focused image/API and browser fixture checks, existing
homepage/catalogue regression checks. Run a new mobile PageSpeed audit after
production deployment; no improved production score has been measured locally.
