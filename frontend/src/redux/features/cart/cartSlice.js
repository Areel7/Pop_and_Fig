import { createSlice } from "@reduxjs/toolkit";

const STORAGE_KEY = "pf-cart";
const MAX_QUANTITY = 99;

// Cart holds product IDs + quantities (plus a small display snapshot). Prices are NEVER stored
// here — every total shown comes from the backend /api/cart/quote endpoint.
const load = () => {
    try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return { items: Array.isArray(parsed?.items) ? parsed.items.filter((i) => i?.product && i.quantity > 0) : [] };
    } catch {
        return { items: [] };
    }
};

export const persistCart = (cart) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: cart.items }));
    } catch {
        // ignore storage failures
    }
};

const clamp = (quantity, stock) => Math.max(1, Math.min(MAX_QUANTITY, stock ?? MAX_QUANTITY, quantity));

const cartSlice = createSlice({
    name: "cart",
    initialState: { ...load(), syncedUserId: null },
    reducers: {
        addToCart: (state, { payload }) => {
            const { product, quantity = 1 } = payload;
            const existing = state.items.find((i) => i.product === product._id);
            if (existing) {
                existing.quantity = clamp(existing.quantity + quantity, product.stock);
            } else {
                state.items.push({
                    product: product._id,
                    quantity: clamp(quantity, product.stock),
                    name: product.name,
                    slug: product.slug,
                    image: product.images?.[0]?.url || product.image || "",
                });
            }
        },
        updateQuantity: (state, { payload }) => {
            const item = state.items.find((i) => i.product === payload.productId);
            if (item) item.quantity = clamp(payload.quantity, payload.stock);
        },
        removeFromCart: (state, { payload: productId }) => {
            state.items = state.items.filter((i) => i.product !== productId);
        },
        clearCart: (state) => {
            state.items = [];
        },
        setCartItems: (state, { payload }) => {
            state.items = payload;
        },
        setSyncedUser: (state, { payload }) => {
            state.syncedUserId = payload;
        },
    },
});

export const { addToCart, updateQuantity, removeFromCart, clearCart, setCartItems, setSyncedUser } = cartSlice.actions;

export const selectCartItems = (state) => state.cart.items;
export const selectCartCount = (state) => state.cart.items.reduce((sum, item) => sum + item.quantity, 0);

export default cartSlice.reducer;
