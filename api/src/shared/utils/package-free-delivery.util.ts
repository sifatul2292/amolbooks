// This bundle grants free delivery to the entire website order, with no expiry.
export const FREE_DELIVERY_PACKAGE_ID = '6abe2123b1f44997b7ca5950';

// All three of these books in one order also make the whole order's delivery free.
// With any two in the cart, gtm-snippets/book-pair-offer.html offers the third.
export const FREE_DELIVERY_BOOK_SET_IDS = [
  '6a04d8a16272179445d5efb9', // প্রোডাক্টিভ মুসলিম
  '69d4d786f87b62b239b68d48', // ইসলামি অর্থনীতি ও সফল উদ্যোক্তার মাইন্ডম্যাপ
  '6ac36c234a5f9c4fe4453004', // দ্য বারাকাহ ইফেক্ট
];

// Whole copies only, so a fractional quantity of a book cannot unlock the offer.
function hasQuantity(item: any): boolean {
  return Number.isInteger(Number(item?.selectedQty)) && Number(item.selectedQty) > 0;
}

export function hasFreeDeliveryPackage(items: any[]): boolean {
  return (Array.isArray(items) ? items : []).some((item) =>
    item?.cartType === 1 &&
    String(item?.product?._id || '').toLowerCase() === FREE_DELIVERY_PACKAGE_ID &&
    hasQuantity(item),
  );
}

export function hasFreeDeliveryBookSet(items: any[]): boolean {
  const ids = (Array.isArray(items) ? items : [])
    .filter((item) => item && item.cartType !== 1 && hasQuantity(item))
    .map((item) => String(item?.product?._id || '').toLowerCase());
  return FREE_DELIVERY_BOOK_SET_IDS.every((id) => ids.includes(id));
}

export function hasFreeDelivery(items: any[]): boolean {
  return hasFreeDeliveryPackage(items) || hasFreeDeliveryBookSet(items);
}
