// Shop book lists (all books, category, publisher and author pages) are requested by the
// compiled storefront with sort { createdAt: -1 } (newest first), and there is no Angular
// source to change that. The /storefront-catalog proxy swaps that one sort for the curated
// order: products with a `priority` (best sellers, set by scripts/curate-product-order.cjs)
// come first, highest first; every other book follows newest first. Searches keep their
// own ranking and any other sort the storefront asks for is left untouched.
export const CURATED_LIST_SORT = { priority: -1, createdAt: -1 };

export function curatedListRequest(body: any, searchQuery?: string | null): any {
  if (!body || typeof body !== 'object' || (searchQuery && String(searchQuery).trim())) return body;
  const sort = body.sort;
  const newestFirst = sort && typeof sort === 'object' && Object.keys(sort).length === 1 && Number(sort.createdAt) === -1;
  if (!newestFirst || body.filter?.status !== 'publish') return body;
  return { ...body, sort: { ...CURATED_LIST_SORT } };
}
