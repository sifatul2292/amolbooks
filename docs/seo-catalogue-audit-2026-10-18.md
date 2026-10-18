# Product SEO catalogue audit — 18 October 2026

Read-only audit of all 104 product URLs in the live sitemap. All 104 catalogue records were read; no production records were edited. The initial pass encountered rate limits; the saved report combines successful reads with a slower resumed pass.

| Stored field absent | Records |
|---|---:|
| ISBN | 97 |
| Edition | 20 |
| Page count | 7 |
| Publisher | 1 |
| Author | 2 |
| Language | 3 |

These are review flags, not proof of errors: Amol Notebook is not a published book and does not require an ISBN/author. It accounts for the missing publisher and one missing author record. The other record without an author is “জীবন যদি হতো নারী সাহাবীর মত”.

Productive Muslim is stored as an Amol Books 2026 edition with 256 pages. Competitor listings refer to a different publisher/edition/page count; their values were not copied. Confirm against the actual imprint page before changing the catalogue.

Four Raufur Rahim records (the combined set and individual volumes) contain the same comma-separated list of three ISBNs. Verify the ISBN for each individual volume/set before assigning it. Ambiguous lists and invalid single ISBNs are omitted from the generated schema, while the original catalogue values remain intact.

## Implemented in code

1. Keep curated titles; expand name-only/default titles with existing author/English-name details and one Amolbooks suffix.
2. Keep short custom descriptions intact; shorten long descriptions at sentence/word boundaries. Include the full stored summary in initial HTML and schema.
3. Emit stored publisher, edition, language and positive page counts; emit ISBN only after checksum validation.
4. Compute rating summaries from this product's approved reviews with valid 1–5 ratings; show the same summary in initial HTML.
5. Add crawlable author, publisher, category, catalogue and up-to-four published related-book links.

No ranking guarantee is implied. Missing edition facts require actual book/imprint verification. Existing SEO title synchronization, GA4 percent encoding, canonical URLs, prices/stock rules and startup fallback suppression are retained.

Machine-readable record list: `seo-catalogue-audit-2026-10-18.json`. Re-run with Node 18+: `node scripts/audit-product-seo.cjs > report.json`; pass an earlier report filename to resume successful records.
