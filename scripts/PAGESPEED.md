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
production deployment; measured production results are recorded below.

## First deployment and first-paint follow-up

Commit bbbb358e is live. The first fresh mobile report is
https://pagespeed.web.dev/analysis/https-amolbooks-com/37jv2ahujg?form_factor=mobile
(performance 37, accessibility 97, best practices 92, SEO 100). It confirms reduced
image waste and product-script CPU, but first render and TBT remain slow.

Follow-up: responsive cover preloads and a lossless WOFF2 Bengali font
(247356 -> 87976 bytes, all 427 codepoints retained). Conversion used FontTools
4.60.2/Brotli 1.2.0 in a temporary virtualenv, without runtime dependencies.

## Final production verification

Deployed c0f8f255. Final mobile report:
https://pagespeed.web.dev/analysis/https-amolbooks-com/78hpo5tbwr?form_factor=mobile

- Performance 55; accessibility 97; best practices 96; SEO 100.
- FCP 5.0s; LCP 7.1s; TBT 300ms; Speed Index 5.7s; CLS 0.04.
- PSI resolved this run to canonical www; lab variability/redirect handling mean
  comparison with the original report is not a controlled attribution test.
- Last follow-up repairs social destinations populated after Angular hydration;
  no new accessibility score is claimed for that change without another audit.
- At the user's explicit request, server.amolbooks.com remains unchanged.
  Vendor/Angular bundle work, unused CSS and large DOM remain open; every warning
  is not fixed. Existing nginx duplicate-host warnings remain outside this patch.

Rollback snapshots live under /home/amolbooks/source-snapshots/pagespeed-* and
uploads have separate snapshots from the mandatory safe-pull workflow.

## Mobile bar and icon-font follow-up

Restores the green mobile bottom bar: white SVG icons were invisible after the
previous contrast patch made the background white. Icon fonts now use local
WOFF2 subsets (3964 + 2212 bytes) for known storefront codepoints, with Unicode
range fallback to the original vendor faces for other icons. Both local-font
selection and an actual unlisted-character fallback are covered by browser tests.

Regenerate using scripts/build-storefront-icon-fonts.py with the official Font
Awesome 6.2.0 solid TTF, brands TTF and CSS paths as its three arguments, using
FontTools/Brotli in a development virtualenv. The sources are available under
https://github.com/FortAwesome/Font-Awesome/tree/6.2.0/webfonts and the upstream
6.2.0 css/all.min.css. Update the URLs/ranges in pagespeed-runtime.html from the
new icon-fonts.json after regeneration. Licensing is retained in the fonts and
assets/font-awesome-LICENSE.txt. No runtime font-conversion dependency.

The p3vpeiqndv report's field assessment still includes the preceding 28 days
(LCP 5s, CLS 0.3). Lab CLS is already 0.039, while lab LCP 8.8s still needs work.
Do not promise a passing assessment or an automatic pass after 28 days.
