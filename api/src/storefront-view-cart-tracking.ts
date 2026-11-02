// The compiled checkout pushes view_cart with list prices (product.salePrice) and no value, and
// the storefront tracking script mirrors it to view_cart_stape as it is. This patch gives view_cart
// the same final prices begin_checkout uses, before GTM or the _stape mirror reads the event.
export const VIEW_CART_FINAL_PRICE_MARKER = '/* amol-view-cart-final-prices */';

const STAPE_OF = '  function stapeOf(obj){';
const VIEW_CART_HELPER = `  ${VIEW_CART_FINAL_PRICE_MARKER}
  function fixViewCartPrices(obj){
    if(!obj||obj.event!=='view_cart'||obj.__stape||!obj.ecommerce||!Array.isArray(obj.ecommerce.items))return;
    var ec=obj.ecommerce;
    ec.items=applyTrackingPrices(ec.items);
    ec.value=cartVal(ec.items);
    if(!ec.currency)ec.currency='BDT';
  }
${STAPE_OF}`;
// Both dataLayer wrappers fix the event before passing it on, whichever of them GTM sits behind.
const EARLY_PUSH = 'window.dataLayer.push=function(obj){\n    var r=_rawPush.apply(window.dataLayer,arguments);';
const EARLY_PUSH_FIXED = 'window.dataLayer.push=function(obj){\n    try{fixViewCartPrices(obj);}catch(e){}\n    var r=_rawPush.apply(window.dataLayer,arguments);';
const LATE_PUSH = 'dl.push=function(obj){\n      var r=orig.apply(dl,arguments);';
const LATE_PUSH_FIXED = 'dl.push=function(obj){\n      try{fixViewCartPrices(obj);}catch(e){}\n      var r=orig.apply(dl,arguments);';

export function patchViewCartPrices(html: string): string {
  if (html.includes(VIEW_CART_FINAL_PRICE_MARKER)) return html;
  if (![STAPE_OF, EARLY_PUSH, LATE_PUSH, 'function applyTrackingPrices(', 'function cartVal('].every((part) => html.includes(part))) {
    return html;
  }
  return html
    .replace(STAPE_OF, VIEW_CART_HELPER)
    .replace(EARLY_PUSH, EARLY_PUSH_FIXED)
    .replace(LATE_PUSH, LATE_PUSH_FIXED);
}

// The header search preloads every book with salePrice and no discount fields, and the tracking
// script learnt prices from every product list it saw, so that preload could replace a book's final
// price with its list price just before view_cart / add_to_cart / begin_checkout read it. A
// list-price-only record may now set a price, but never replace one already learnt.
export const TRACKING_LIST_PRICE_MARKER = '/* amol-list-price-guard */';
const REMEMBER_PRICE = '    _trackingPriceById[String(p._id)]=finalTrackingPrice(p);\n  }';
const REMEMBER_PRICE_GUARDED = `    ${TRACKING_LIST_PRICE_MARKER}
    if(p.afterDiscountPrice==null&&!('discountType' in p)&&!('discountAmount' in p)&&Object.prototype.hasOwnProperty.call(_trackingPriceById,String(p._id)))return;
${REMEMBER_PRICE}`;

export function patchTrackingListPrices(html: string): string {
  if (html.includes(TRACKING_LIST_PRICE_MARKER) || !html.includes('function rememberTrackingProduct(p){')) return html;
  const at = html.indexOf(REMEMBER_PRICE, html.indexOf('function rememberTrackingProduct(p){'));
  if (at === -1) return html;
  return html.slice(0, at) + REMEMBER_PRICE_GUARDED + html.slice(at + REMEMBER_PRICE.length);
}
