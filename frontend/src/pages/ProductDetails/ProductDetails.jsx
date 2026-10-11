import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ChevronRight, RotateCcw, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import Container, { SectionHeader } from "../../components/common/Container.jsx";
import Button, { ButtonLink } from "../../components/common/Button.jsx";
import { EmptyState, ErrorState, Skeleton } from "../../components/common/Feedback.jsx";
import { StarRating } from "../../components/common/StarRating.jsx";
import { ProductGrid } from "../../components/products/ProductCard.jsx";
import { PriceTag, QuantityStepper, StockLabel, WishlistButton } from "../../components/products/ProductParts.jsx";
import { useAddToCart } from "../../hooks/useAddToCart.js";
import ProductReviews from "./ProductReviews.jsx";
import { useGetProductQuery, useGetProductsQuery } from "../../redux/api/productApi.js";
import { useSettings } from "../../hooks/useSettings.js";
import { useDocumentTitle } from "../../hooks/useCommon.js";
import { formatPrice, resolveImageUrl } from "../../utils/format.js";
import { isDiscounted } from "../../utils/pricing.js";

function Gallery({ images, name }) {
    const [active, setActive] = useState(0);
    const current = images[active];

    return (
        <div className="flex flex-col gap-3 md:flex-row-reverse">
            <div className="relative aspect-square flex-1 overflow-hidden bg-secondary">
                {current ? (
                    <img src={resolveImageUrl(current.url)} alt={current.alt || name} className="size-full object-cover" fetchPriority="high" />
                ) : (
                    <div className="flex size-full items-center justify-center text-sm text-neutral-500">No image available</div>
                )}
            </div>
            {images.length > 1 && (
                <ul className="relative flex gap-3 overflow-x-auto md:w-20 md:flex-col md:overflow-visible" aria-label="Product images">
                    {images.map((image, index) => (
                        <li key={`${image.url}-${index}`} className="shrink-0">
                            <button
                                type="button"
                                onClick={() => setActive(index)}
                                aria-label={`Show image ${index + 1}`}
                                aria-current={index === active}
                                className={`block size-18 overflow-hidden bg-secondary ring-offset-2 transition md:size-20 ${
                                    index === active ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100"
                                }`}
                            >
                                <img src={resolveImageUrl(image.url)} alt="" className="size-full object-cover" loading="lazy" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function PurchasePanel({ product }) {
    const [quantity, setQuantity] = useState(1);
    const addToCart = useAddToCart();
    const navigate = useNavigate();
    const { settings } = useSettings();
    const soldOut = product.stock <= 0;
    const threshold = settings.shipping?.freeShippingThreshold;

    return (
        <div className="min-w-0">
            {product.category && (
                <Link to={`/category/${product.category.slug}`} className="text-[11px] font-semibold tracking-[0.14em] text-neutral-500 uppercase hover:text-foreground">
                    {product.category.name}
                </Link>
            )}
            <h1 className="mt-3 text-3xl leading-[1.05] font-medium tracking-[-0.04em] break-words sm:text-5xl">{product.name}</h1>

            <a href="#reviews" className="mt-4 inline-flex items-center gap-2 text-sm hover:underline">
                <StarRating rating={product.rating} showValue={product.reviewCount > 0} />
                <span className="text-neutral-500">
                    {product.reviewCount > 0 ? `${product.reviewCount} review${product.reviewCount === 1 ? "" : "s"}` : "No reviews yet"}
                </span>
            </a>

            <div className="mt-6 flex flex-wrap items-center gap-3">
                <PriceTag product={product} size="lg" />
                {isDiscounted(product) && (
                    <span className="bg-primary px-2.5 py-1 text-xs font-semibold tracking-wide text-on-primary">{product.discountPercent}% OFF</span>
                )}
            </div>
            {isDiscounted(product) && <p className="mt-1 text-sm text-green-700">You save {formatPrice(product.price - product.finalPrice)}</p>}

            {product.shortDescription && <p className="mt-6 text-[15px] leading-7 text-neutral-700">{product.shortDescription}</p>}

            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 border-y border-neutral-200 py-4 text-sm">
                <dt className="text-neutral-500">Availability</dt>
                <dd>
                    <StockLabel stock={product.stock} />
                </dd>
                <dt className="text-neutral-500">Condition</dt>
                <dd>{product.condition === "used" ? "Pre-loved" : "New"}</dd>
                {product.sku && (
                    <>
                        <dt className="text-neutral-500">SKU</dt>
                        <dd className="break-all">{product.sku}</dd>
                    </>
                )}
            </dl>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <QuantityStepper value={quantity} onChange={setQuantity} max={Math.max(1, Math.min(99, product.stock))} disabled={soldOut} />
                <Button size="lg" className="flex-1" disabled={soldOut} onClick={() => addToCart(product, quantity)}>
                    <ShoppingBag className="size-4" aria-hidden="true" /> {soldOut ? "Sold out" : "Add to cart"}
                </Button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
                <Button
                    variant="outline"
                    disabled={soldOut}
                    onClick={() => {
                        if (addToCart(product, quantity)) navigate("/cart");
                    }}
                >
                    Buy now
                </Button>
                <WishlistButton
                    product={product}
                    withLabel
                    className="inline-flex min-h-11 items-center justify-center gap-2 border border-neutral-300 px-4 text-sm font-semibold transition hover:border-neutral-900"
                />
            </div>

            <ul className="mt-8 space-y-3 text-sm text-neutral-600">
                <li className="flex items-center gap-3">
                    <Truck className="size-4 shrink-0" aria-hidden="true" />
                    {threshold > 0 ? `Free shipping on orders over ${formatPrice(threshold)}` : "Carefully packed and shipped to your door"}
                </li>
                <li className="flex items-center gap-3">
                    <ShieldCheck className="size-4 shrink-0" aria-hidden="true" /> Prices and stock verified at checkout
                </li>
                <li className="flex items-center gap-3">
                    <RotateCcw className="size-4 shrink-0" aria-hidden="true" /> Questions? <Link to="/contact" className="underline underline-offset-4">Contact us</Link>
                </li>
            </ul>

            {product.tags?.length > 0 && (
                <ul className="mt-6 flex flex-wrap gap-2" aria-label="Tags">
                    {product.tags.map((tag) => (
                        <li key={tag}>
                            <Link to={`/search?q=${encodeURIComponent(tag)}`} className="inline-block bg-secondary px-3 py-1 text-xs hover:bg-neutral-200">
                                #{tag}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function RelatedProducts({ product }) {
    const { data, isLoading } = useGetProductsQuery({ category: product.category?.slug, limit: 5, sort: "popular" }, { skip: !product.category });
    const related = (data?.items || []).filter((p) => p._id !== product._id).slice(0, 4);
    if (!isLoading && related.length === 0) return null;

    return (
        <Container as="section" className="py-20">
            <SectionHeader label="YOU MAY ALSO LIKE" title="Related pieces" />
            <ProductGrid products={related} loading={isLoading} skeletonCount={4} />
        </Container>
    );
}

function ProductDetailsSkeleton() {
    return (
        <Container className="grid gap-10 py-10 lg:grid-cols-2 lg:gap-16">
            <Skeleton className="aspect-square" />
            <div className="space-y-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-12 w-4/5" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </Container>
    );
}

function ProductDetails() {
    const { id } = useParams();
    const { data: product, isLoading, isError, error, refetch } = useGetProductQuery(id);
    useDocumentTitle(product?.name || "Product");

    if (isLoading) return <ProductDetailsSkeleton />;
    if (isError) {
        if (error?.status === 404) {
            return (
                <EmptyState
                    className="min-h-[55vh]"
                    title="Product not found"
                    message="This product may have sold out permanently or been removed."
                    action={<ButtonLink to="/shop">Continue shopping</ButtonLink>}
                />
            );
        }
        return <ErrorState error={error} onRetry={refetch} className="min-h-[55vh]" />;
    }

    return (
        <>
            <Container className="pt-6">
                <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-xs text-neutral-500">
                    <Link to="/" className="shrink-0 hover:underline">Home</Link>
                    <ChevronRight className="size-3 shrink-0" aria-hidden="true" />
                    <Link to="/shop" className="shrink-0 hover:underline">Shop</Link>
                    {product.category && (
                        <>
                            <ChevronRight className="size-3 shrink-0" aria-hidden="true" />
                            <Link to={`/category/${product.category.slug}`} className="shrink-0 hover:underline">
                                {product.category.name}
                            </Link>
                        </>
                    )}
                    <ChevronRight className="size-3 shrink-0" aria-hidden="true" />
                    <span className="truncate" aria-current="page">{product.name}</span>
                </nav>
            </Container>

            <Container className="grid gap-10 py-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-12">
                <Gallery key={product._id} images={product.images || []} name={product.name} />
                <PurchasePanel key={`panel-${product._id}`} product={product} />
            </Container>

            {product.description && (
                <Container as="section" className="py-12" aria-labelledby="description-heading">
                    <div className="grid gap-6 border-t border-neutral-200 pt-12 lg:grid-cols-[1fr_2fr]">
                        <h2 id="description-heading" className="text-2xl font-medium tracking-tight">Description</h2>
                        <p className="text-[15px] leading-8 whitespace-pre-line text-neutral-700">{product.description}</p>
                    </div>
                </Container>
            )}

            <ProductReviews product={product} />
            <RelatedProducts product={product} />
        </>
    );
}

export default ProductDetails;
