import { Link, useLocation } from "react-router";
import { useSelector } from "react-redux";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import Container, { PageHeader } from "../../components/common/Container.jsx";
import Button, { ButtonLink } from "../../components/common/Button.jsx";
import { EmptyState, ErrorState } from "../../components/common/Feedback.jsx";
import { ProductCardSkeleton } from "../../components/products/ProductCard.jsx";
import { PriceTag, StockLabel } from "../../components/products/ProductParts.jsx";
import { useAddToCart } from "../../hooks/useAddToCart.js";
import { selectCurrentUser } from "../../redux/features/auth/authSlice.js";
import { useWishlist } from "../../hooks/useWishlist.js";
import { useDocumentTitle } from "../../hooks/useCommon.js";
import { productImage } from "../../utils/format.js";

function WishlistItems() {
    const { items, isLoading, isError, error, refetch, toggle } = useWishlist();
    const addToCart = useAddToCart();

    if (isError) return <ErrorState error={error} onRetry={refetch} />;
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, i) => (
                    <ProductCardSkeleton key={i} />
                ))}
            </div>
        );
    }
    if (items.length === 0) {
        return (
            <EmptyState
                icon={Heart}
                title="Your wishlist is empty"
                message="Tap the heart on any product to save it here for later."
                action={<ButtonLink to="/shop">Discover products</ButtonLink>}
            />
        );
    }

    // "Move to cart": add to cart, then remove from the wishlist.
    const moveToCart = async (product) => {
        if (addToCart(product)) await toggle(product);
    };

    return (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
            {items.map((product) => {
                const soldOut = product.stock <= 0;
                const href = `/product/${product.slug}`;
                return (
                    <li key={product._id} className="flex min-w-0 flex-col">
                        <Link to={href} className="block aspect-square overflow-hidden bg-secondary" tabIndex={-1} aria-hidden="true">
                            {productImage(product) && <img src={productImage(product)} alt="" loading="lazy" className="size-full object-cover" />}
                        </Link>
                        <div className="flex flex-1 flex-col pt-3">
                            <Link to={href} className="line-clamp-2 text-[15px] hover:underline">
                                {product.name}
                            </Link>
                            <PriceTag product={product} size="sm" className="mt-1" />
                            <StockLabel stock={product.stock} className="mt-1" />
                            <div className="mt-3 flex gap-2">
                                <Button size="sm" className="flex-1" disabled={soldOut} onClick={() => moveToCart(product)}>
                                    <ShoppingBag className="size-3.5" aria-hidden="true" />
                                    {soldOut ? "Sold out" : "Move to cart"}
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => toggle(product)} aria-label={`Remove ${product.name} from wishlist`}>
                                    <Trash2 className="size-3.5" aria-hidden="true" />
                                </Button>
                            </div>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

// Rendered at /wishlist (with page chrome) and inside the account area at /account/wishlist.
function Wishlist({ embedded = false }) {
    useDocumentTitle("Wishlist");
    const user = useSelector(selectCurrentUser);
    const location = useLocation();

    const content = user ? (
        <WishlistItems />
    ) : (
        <EmptyState
            icon={Heart}
            title="Save your favourites"
            message="Log in to keep a wishlist that follows you across devices."
            action={
                <div className="flex flex-wrap justify-center gap-2">
                    <ButtonLink to="/login" state={{ from: location.pathname }}>
                        Log in
                    </ButtonLink>
                    <ButtonLink to="/signup" variant="outline" state={{ from: location.pathname }}>
                        Create account
                    </ButtonLink>
                </div>
            }
        />
    );

    if (embedded) {
        return (
            <div>
                <h2 className="mb-6 text-2xl font-medium tracking-tight">Wishlist</h2>
                {content}
            </div>
        );
    }

    return (
        <>
            <PageHeader label="SAVED FOR LATER" title="Wishlist" />
            <Container className="py-10 sm:py-14">{content}</Container>
        </>
    );
}

export default Wishlist;
