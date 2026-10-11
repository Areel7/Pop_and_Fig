// The store currency is Pakistani Rupees (PKR) by business rule. Amounts are stored as plain numbers;
// this is the single place that turns a number into a display price.
export const CURRENCY = "PKR";
export const CURRENCY_SYMBOL = "₨";

const numberFormat = new Intl.NumberFormat("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

// 2500 -> "₨ 2,500"
export const formatPrice = (value) => `${CURRENCY_SYMBOL} ${numberFormat.format(Number(value) || 0)}`;
