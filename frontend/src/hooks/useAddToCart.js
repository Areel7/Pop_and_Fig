import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { addToCart } from "../redux/features/cart/cartSlice.js";

// Adds to the local cart (quantities are capped at available stock; checkout re-validates on the server).
export const useAddToCart = () => {
    const dispatch = useDispatch();
    return (product, quantity = 1) => {
        if (!product || product.stock <= 0) {
            toast.error("This product is out of stock");
            return false;
        }
        dispatch(addToCart({ product, quantity }));
        toast.success(`${product.name} added to cart`);
        return true;
    };
};
