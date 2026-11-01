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
