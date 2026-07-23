import { DiscountTypeEnum } from '../../enum/product.enum';

type Priceable = Record<string, any>;

function plain(value: any): Priceable {
  return value?._doc ? value._doc : value || {};
}

function finiteNumber(value: any, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function selectedProductPrice(item: Priceable): Priceable {
  const product = plain(item.product || item);
  const selectedVariation = plain(item.selectedVariation);
  if (selectedVariation.salePrice != null || selectedVariation.price != null) {
    return selectedVariation;
  }

  const selectedVariationId = item.selectedVariation;
  const variation = (product.variationsOptions || []).find(
    (option) => String(option?._id) === String(selectedVariationId),
  );
  return variation ? plain(variation) : product;
}

export function calculateEffectiveProductPrice(item: Priceable): number {
  const product = plain(item.product || item);
  const priceSource = selectedProductPrice(item);
  const salePrice = finiteNumber(
    priceSource.salePrice ?? priceSource.price ?? product.salePrice,
  );
  const discountType = finiteNumber(
    priceSource.discountType ?? product.discountType,
  );
  const discountAmount = finiteNumber(
    priceSource.discountAmount ?? product.discountAmount,
  );

  if (discountType === DiscountTypeEnum.PERCENTAGE) {
    return Math.max(
      0,
      Math.floor(salePrice - (salePrice * discountAmount) / 100),
    );
  }
  if (discountType === DiscountTypeEnum.CASH) {
    return Math.max(0, Math.floor(salePrice - discountAmount));
  }
  return Math.max(0, Math.floor(salePrice));
}

export function calculateSpecialPackageProductsTotal(
  specialPackage: Priceable,
): number {
  const packageData = plain(specialPackage);
  const products = packageData.products || [];
  if (!products.length) return Math.max(0, finiteNumber(packageData.salePrice));

  return products.reduce((total, item) => {
    const quantity =
      item?.quantity == null
        ? 1
        : Math.max(0, Math.floor(finiteNumber(item.quantity)));
    return total + calculateEffectiveProductPrice(item) * quantity;
  }, 0);
}

export function withCalculatedSpecialPackageSubtotal(
  specialPackage: Priceable,
): Priceable {
  const packageData = plain(specialPackage);
  return {
    ...packageData,
    salePrice: calculateSpecialPackageProductsTotal(packageData),
  };
}
