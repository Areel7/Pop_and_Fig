// Display helpers only — the backend is the authority for every price customers pay.

// True when customers pay less than the regular price (product sale or a running sale campaign).
export const isDiscounted = (product) => Number(product?.finalPrice ?? product?.price) < Number(product?.price);

// discount = ((price - salePrice) / price) * 100, rounded to a whole percent.
export const discountPercentOf = (price, salePrice) => {
    const regular = Number(price);
    const sale = Number(salePrice);
    if (!(regular > 0) || !(sale > 0) || sale >= regular) return 0;
    return Math.round(((regular - sale) / regular) * 100);
};
