// This bundle grants free delivery to the entire website order, with no expiry.
export const FREE_DELIVERY_PACKAGE_ID = '6abe2123b1f44997b7ca5950';

export function hasFreeDeliveryPackage(items: any[]): boolean {
  return (Array.isArray(items) ? items : []).some((item) =>
    item?.cartType === 1 &&
    String(item?.product?._id || '').toLowerCase() === FREE_DELIVERY_PACKAGE_ID &&
    Number.isFinite(Number(item?.selectedQty)) && Number(item.selectedQty) > 0,
  );
}
