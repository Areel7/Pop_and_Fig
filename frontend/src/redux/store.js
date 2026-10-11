import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import authReducer, { logout } from "./features/auth/authSlice.js";
import cartReducer, { clearCart, persistCart, setSyncedUser } from "./features/cart/cartSlice.js";
import { apiSlice } from "./api/apiSlice.js";

// On logout: forget cached private data and the local cart (it lives on the server for the account).
const logoutMiddleware = (storeApi) => (next) => (action) => {
    const result = next(action);
    if (logout.match(action)) {
        storeApi.dispatch(apiSlice.util.resetApiState());
        storeApi.dispatch(clearCart());
        storeApi.dispatch(setSyncedUser(null));
    }
    return result;
};

export const store = configureStore({
    reducer: {
        [apiSlice.reducerPath]: apiSlice.reducer,
        auth: authReducer,
        cart: cartReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiSlice.middleware, logoutMiddleware),
    devTools: import.meta.env.DEV,
});

let lastCart = store.getState().cart;
store.subscribe(() => {
    const { cart } = store.getState();
    if (cart.items !== lastCart.items) persistCart(cart);
    lastCart = cart;
});

setupListeners(store.dispatch);
export default store;
