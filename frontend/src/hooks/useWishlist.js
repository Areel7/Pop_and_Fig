import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router";
import { toast } from "react-toastify";
import { selectCurrentUser } from "../redux/features/auth/authSlice.js";
import {
    useAddToWishlistMutation,
    useGetWishlistQuery,
    useRemoveFromWishlistMutation,
} from "../redux/api/accountApi.js";
import { getErrorMessage } from "../redux/api/apiSlice.js";

// Wishlists are stored on the server for signed-in customers; guests are sent to log in.
export const useWishlist = () => {
    const user = useSelector(selectCurrentUser);
    const navigate = useNavigate();
    const location = useLocation();
    const { data: items = [], ...query } = useGetWishlistQuery(undefined, { skip: !user });
    const [add] = useAddToWishlistMutation();
    const [remove] = useRemoveFromWishlistMutation();

    const ids = useMemo(() => new Set(items.map((p) => p._id)), [items]);

    const toggle = async (product) => {
        if (!user) {
            toast.info("Log in to save items to your wishlist");
            navigate("/login", { state: { from: location.pathname + location.search } });
            return;
        }
        try {
            if (ids.has(product._id)) {
                await remove(product._id).unwrap();
                toast.success("Removed from wishlist");
            } else {
                await add(product).unwrap();
                toast.success("Saved to wishlist");
            }
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    return { items, ids, count: user ? items.length : 0, isSaved: (id) => ids.has(id), toggle, ...query };
};
