import { useEffect } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
import { selectCurrentUser } from "../../redux/features/auth/authSlice.js";
import { selectCartItems, setCartItems, setSyncedUser } from "../../redux/features/cart/cartSlice.js";
import { useLazyGetServerCartQuery, useSaveServerCartMutation } from "../../redux/api/cartApi.js";

// Merge by taking the larger quantity per product so reloading never doubles items.
const mergeCarts = (serverItems, localItems) => {
    const merged = new Map(serverItems.map((item) => [item.product, { ...item }]));
    for (const item of localItems) {
        const existing = merged.get(item.product);
        merged.set(item.product, existing ? { ...existing, ...item, quantity: Math.max(existing.quantity, item.quantity) } : item);
    }
    return [...merged.values()];
};

// Keeps a signed-in customer's cart persisted on the server (loads + merges on login,
// then saves changes with a short debounce).
function CartSync() {
    const dispatch = useDispatch();
    const user = useSelector(selectCurrentUser);
    const items = useSelector(selectCartItems);
    const syncedUserId = useSelector((state) => state.cart.syncedUserId);
    const [fetchServerCart] = useLazyGetServerCartQuery();
    const [saveServerCart] = useSaveServerCartMutation();
    const store = useStore();

    const userId = user && !user.isAdmin ? user._id : null;

    useEffect(() => {
        if (!userId || syncedUserId === userId) return undefined;
        let cancelled = false;
        fetchServerCart()
            .unwrap()
            .then(({ items: serverItems }) => {
                if (cancelled) return;
                dispatch(setCartItems(mergeCarts(serverItems, store.getState().cart.items)));
                dispatch(setSyncedUser(userId));
            })
            .catch(() => {
                // Offline or session expired — the local cart keeps working.
            });
        return () => {
            cancelled = true;
        };
    }, [userId, syncedUserId, fetchServerCart, dispatch, store]);

    useEffect(() => {
        if (!userId || syncedUserId !== userId) return undefined;
        const timer = setTimeout(() => {
            saveServerCart(items);
        }, 600);
        return () => clearTimeout(timer);
    }, [items, userId, syncedUserId, saveServerCart]);

    return null;
}

export default CartSync;
