import { useSelector } from "react-redux";
import { selectCartItems } from "../redux/features/cart/cartSlice.js";
import { useGetCartQuoteQuery } from "../redux/api/cartApi.js";

// Server-calculated totals for the current cart (unit prices, subtotal, shipping, stock issues).
export const useCartQuote = () => {
    const items = useSelector(selectCartItems);
    const query = useGetCartQuoteQuery(items, { skip: items.length === 0 });
    return { items, quote: items.length ? query.data : null, ...query };
};
