import { Link } from "react-router";
import { ShoppingBag } from "lucide-react";
import { StarRating } from "../common/StarRating.jsx";
import { Skeleton } from "../common/Feedback.jsx";
import { PriceTag, StockLabel, WishlistButton } from "./ProductParts.jsx";
import { useAddToCart } from "../../hooks/useAddToCart.js";
import { productImage } from "../../utils/format.js";
import { isDiscounted } from "../../utils/pricing.js";

function ProductCard({ product, eager = false }) {
    const addToCart = useAddToCart();
    const image = productImage(product);
    const soldOut = product.stock <= 0;
    const discounted = isDiscounted(product);
    const href = `/product/${product.slug || product._id}`;

    return (
        <article className="group relative flex min-w-0 flex-col">
            <div className="relative aspect-square overflow-hidden bg-secondary">
                <Link to={href} className="block size-full" tabIndex={-1} aria-hidden="true">
                    {image ? (
                        <img
                            src={image}
                            alt=""
                            loading={eager ? "eager" : "lazy"}
                            decoding="async"
                            className={`size-full object-cover transition duration-500 group-hover:scale-[1.04] ${soldOut ? "opacity-60" : ""}`}
                        />
                    ) : (
                        <div className="flex size-full items-center justify-center text-xs text-neutral-500">No image</div>
                    )}
                </Link>

                <WishlistButton
                    product={product}
                    className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-sm transition hover:scale-105"
                />

                <div className="pointer-events-none absolute top-3 left-3 flex flex-col items-start gap-1.5">
                    {discounted && (
                        <span className="bg-primary px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-on-primary">
                            {product.discountPercent ? `${product.discountPercent}% OFF` : "SALE"}
                        </span>
                    )}
                    {product.featured && !discounted && (
                        <span className="bg-accent px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-on-accent">FEATURED</span>
                    )}
                </div>
                {soldOut && (
                    <span className="pointer-events-none absolute bottom-3 left-3 bg-neutral-800 px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-white">
                        SOLD OUT
                    </span>
                )}
            </div>

            <div className="flex flex-1 flex-col pt-3.5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="mb-1 truncate text-[11px] tracking-[0.08em] text-neutral-500 uppercase">
                            {product.category?.name || "Collectible"}
                            {product.condition === "used" && " · Pre-loved"}
                        </p>
                        <h3 className="font-sans text-[15px] leading-snug">
                            <Link to={href} className="line-clamp-2 hover:underline hover:underline-offset-4">
                                {product.name}
                            </Link>
                        </h3>
                    </div>
                    <PriceTag product={product} size="sm" className="shrink-0 flex-col items-end text-right" />
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    {product.reviewCount > 0 ? (
                        <StarRating rating={product.rating} count={product.reviewCount} />
                    ) : (
                        <span className="text-xs text-neutral-400">No reviews yet</span>
                    )}
                    <StockLabel stock={product.stock} />
                </div>

                <button
                    type="button"
                    onClick={() => addToCart(product)}
                    disabled={soldOut}
                    className="mt-3.5 inline-flex min-h-10 items-center justify-center gap-2 border border-primary font-button text-xs font-semibold tracking-wide transition hover:bg-primary hover:text-on-primary disabled:cursor-not-allowed disabled:border-neutral-300 disabled:text-neutral-400 disabled:hover:bg-transparent"
                >
                    <ShoppingBag className="size-3.5" aria-hidden="true" />
                    {soldOut ? "Sold out" : "Add to cart"}
                    <span className="sr-only"> — {product.name}</span>
                </button>
            </div>
        </article>
    );
}

export function ProductCardSkeleton() {
    return (
        <div aria-hidden="true">
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="mt-4 h-3 w-1/3" />
            <Skeleton className="mt-2 h-4 w-3/4" />
            <Skeleton className="mt-3 h-10 w-full" />
        </div>
    );
}

// Responsive grid that renders skeletons while loading.
export function ProductGrid({ products = [], loading = false, skeletonCount = 8, className = "" }) {
    const grid = `grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4 ${className}`;
    if (loading) {
        return (
            <div className={grid} role="status" aria-label="Loading products">
                {Array.from({ length: skeletonCount }, (_, i) => (
                    <ProductCardSkeleton key={i} />
                ))}
            </div>
        );
    }
    return (
        <div className={grid}>
            {products.map((product, index) => (
                <ProductCard key={product._id} product={product} eager={index < 4} />
            ))}
        </div>
    );
}

export default ProductCard;
