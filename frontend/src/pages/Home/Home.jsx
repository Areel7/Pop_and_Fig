import { Link } from "react-router";
import { useSelector } from "react-redux";
import { ArrowRight, BadgePercent, Quote } from "lucide-react";
import Container, { SectionHeader } from "../../components/common/Container.jsx";
import { ButtonLink } from "../../components/common/Button.jsx";
import { EmptyState, ErrorState, Skeleton } from "../../components/common/Feedback.jsx";
import { StarRating } from "../../components/common/StarRating.jsx";
import { ProductGrid } from "../../components/products/ProductCard.jsx";
import { useGetProductsQuery } from "../../redux/api/productApi.js";
import { useGetCategoriesQuery } from "../../redux/api/categoryApi.js";
import { useGetActiveDiscountsQuery } from "../../redux/api/discountApi.js";
import { useGetRecentReviewsQuery } from "../../redux/api/reviewApi.js";
import { selectCurrentUser } from "../../redux/features/auth/authSlice.js";
import { useSettings } from "../../hooks/useSettings.js";
import { useDocumentTitle } from "../../hooks/useCommon.js";
import { formatPrice, resolveImageUrl } from "../../utils/format.js";
import defaultHero from "../../assets/hero.jpg";

const isExternal = (url = "") => /^https?:\/\//i.test(url);

function SmartLink({ to, children, ...props }) {
    if (isExternal(to)) {
        return (
            <a href={to} {...props}>
                {children}
            </a>
        );
    }
    return (
        <Link to={to || "/shop"} {...props}>
            {children}
        </Link>
    );
}

function ViewAll({ to, children = "View all" }) {
    return (
        <Link to={to} className="group inline-flex items-center gap-3 text-xs font-semibold whitespace-nowrap transition-all hover:gap-4">
            {children} <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
    );
}

function Hero({ hero, loading }) {
    const image = hero.image ? resolveImageUrl(hero.image) : defaultHero;
    return (
        <section className="relative flex min-h-[560px] items-center overflow-hidden bg-neutral-900 md:min-h-[720px]" aria-label="Featured">
            {!loading && (
                <img src={image} alt="" fetchPriority="high" decoding="async" className="absolute inset-0 size-full scale-[1.03] object-cover blur-[1.5px]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/25" aria-hidden="true" />
            <Container className="relative py-24">
                {loading ? (
                    <div className="max-w-3xl space-y-5">
                        <Skeleton className="h-3 w-24 bg-white/20" />
                        <Skeleton className="h-20 w-full bg-white/20 sm:h-32" />
                        <Skeleton className="h-4 w-80 max-w-full bg-white/20" />
                    </div>
                ) : (
                    <div className="max-w-4xl">
                        {hero.label && <p className="mb-6 text-[11px] font-bold tracking-[0.2em] text-white/70">{hero.label}</p>}
                        <h1 className="text-[clamp(3.2rem,9vw,8.4rem)] leading-[0.9] font-medium tracking-[-0.065em] text-balance text-white">
                            {hero.title || "Collect the characters you love."}
                        </h1>
                        {hero.subtitle && <p className="mt-8 max-w-md text-[15px] leading-7 text-white/80">{hero.subtitle}</p>}
                        {hero.buttonText && (
                            <SmartLink
                                to={hero.buttonUrl}
                                className="mt-9 inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-white px-7 font-button text-[13px] font-semibold text-neutral-900 transition hover:-translate-y-0.5 hover:bg-neutral-100"
                            >
                                {hero.buttonText}
                            </SmartLink>
                        )}
                    </div>
                )}
            </Container>
        </section>
    );
}

function CategoriesSection() {
    const { data: categories = [], isLoading, isError, error, refetch } = useGetCategoriesQuery();
    const visible = categories.slice(0, 8);

    return (
        <Container as="section" className="py-20 sm:py-28" aria-labelledby="home-categories">
            <SectionHeader label="EXPLORE" title={<span id="home-categories">Shop by category</span>} action={<ViewAll to="/category" />} />
            {isError ? (
                <ErrorState error={error} onRetry={refetch} />
            ) : isLoading ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    {Array.from({ length: 4 }, (_, i) => (
                        <Skeleton key={i} className="aspect-[0.82]" />
                    ))}
                </div>
            ) : visible.length === 0 ? (
                <EmptyState title="Categories are coming soon" message="We're setting up the shelves. Check back shortly." />
            ) : (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    {visible.map((category) => (
                        <Link key={category._id} to={`/category/${category.slug}`} className="group relative block aspect-[0.82] overflow-hidden bg-neutral-200">
                            {category.image ? (
                                <img
                                    src={resolveImageUrl(category.image)}
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                    className="size-full object-cover transition duration-500 group-hover:scale-105"
                                />
                            ) : (
                                <span className="flex size-full items-center justify-center bg-secondary font-heading text-6xl text-neutral-400" aria-hidden="true">
                                    {category.name.charAt(0)}
                                </span>
                            )}
                            <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" aria-hidden="true" />
                            <span className="absolute inset-x-4 bottom-4 text-white sm:inset-x-6 sm:bottom-6">
                                <span className="block font-heading text-xl font-medium break-words sm:text-2xl">{category.name}</span>
                                <span className="mt-1 block text-[11px] text-white/75">
                                    {category.productCount} {category.productCount === 1 ? "item" : "items"} · Explore →
                                </span>
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </Container>
    );
}

function ProductSection({ label, title, params, link, linkLabel, emptyMessage, hideWhenEmpty = false, className = "" }) {
    const { data, isLoading, isError, error, refetch } = useGetProductsQuery(params);
    const products = data?.items || [];
    if (hideWhenEmpty && !isLoading && !isError && products.length === 0) return null;

    return (
        <Container as="section" className={`py-20 sm:py-28 ${className}`}>
            <SectionHeader label={label} title={title} action={<ViewAll to={link}>{linkLabel}</ViewAll>} />
            {isError ? (
                <ErrorState error={error} onRetry={refetch} />
            ) : !isLoading && products.length === 0 ? (
                <EmptyState title="New pieces are on their way" message={emptyMessage} />
            ) : (
                <ProductGrid products={products} loading={isLoading} skeletonCount={params.limit} />
            )}
        </Container>
    );
}

function PromoSection({ promo }) {
    const { data: sales = [] } = useGetActiveDiscountsQuery();
    if (!promo?.enabled) return null;

    return (
        <section className="bg-secondary">
            <Container className="grid gap-10 py-20 sm:py-28 lg:grid-cols-[1.3fr_1fr] lg:items-end">
                <div>
                    {promo.label && <p className="mb-4 text-[10px] font-bold tracking-[0.18em] text-neutral-500">{promo.label}</p>}
                    <h2 className="text-[clamp(2.6rem,6vw,5.6rem)] leading-[0.92] font-medium tracking-[-0.055em] text-balance">{promo.title}</h2>
                    {promo.subtitle && <p className="mt-6 max-w-lg text-[15px] leading-7 text-neutral-600">{promo.subtitle}</p>}
                    {promo.buttonText && (
                        <SmartLink
                            to={promo.buttonUrl}
                            className="mt-8 inline-flex min-h-12 items-center justify-center bg-button px-7 font-button text-[13px] font-semibold text-on-button transition hover:-translate-y-0.5 hover:opacity-90"
                        >
                            {promo.buttonText}
                        </SmartLink>
                    )}
                </div>
                {sales.length > 0 && (
                    <ul className="space-y-3" aria-label="Current sales">
                        {sales.slice(0, 3).map((sale) => (
                            <li key={sale._id} className="flex items-center gap-4 bg-background p-5">
                                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
                                    <BadgePercent className="size-5" aria-hidden="true" />
                                </span>
                                <div className="min-w-0">
                                    <p className="font-semibold break-words">
                                        {sale.type === "percentage" ? `${sale.value}% off` : `${formatPrice(sale.value)} off`} · {sale.name}
                                    </p>
                                    <p className="text-xs text-neutral-500">
                                        {sale.description ||
                                            (sale.appliesTo === "all" ? "On everything in store" : "On selected items")}
                                        {sale.endDate && ` · Ends ${new Date(sale.endDate).toLocaleDateString()}`}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Container>
        </section>
    );
}

function ReviewsSection() {
    const { data: reviews = [], isLoading } = useGetRecentReviewsQuery(6);
    if (!isLoading && reviews.length === 0) return null;

    return (
        <Container as="section" className="py-20 sm:py-28" aria-labelledby="home-reviews">
            <SectionHeader label="KIND WORDS" title={<span id="home-reviews">Loved by our customers</span>} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {isLoading
                    ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-56" />)
                    : reviews.map((review) => (
                          <figure key={review._id} className="flex flex-col border border-neutral-200 p-7">
                              <Quote className="mb-4 size-6 text-accent" aria-hidden="true" />
                              <StarRating rating={review.rating} />
                              {review.title && <p className="mt-4 font-semibold">{review.title}</p>}
                              <blockquote className="mt-2 line-clamp-5 flex-1 text-[15px] leading-7 text-neutral-700">“{review.comment}”</blockquote>
                              <figcaption className="mt-6 text-sm">
                                  <span className="font-semibold">{review.name}</span>
                                  <span className="text-neutral-500">
                                      {" "}
                                      on{" "}
                                      <Link to={`/product/${review.product.slug}`} className="underline-offset-4 hover:underline">
                                          {review.product.name}
                                      </Link>
                                  </span>
                              </figcaption>
                          </figure>
                      ))}
            </div>
        </Container>
    );
}

function CallToAction() {
    const user = useSelector(selectCurrentUser);
    return (
        <Container as="section" className="py-10">
            <div className="flex flex-col items-start justify-between gap-8 border-t border-neutral-900 pt-12 md:flex-row md:items-end">
                <h2 className="max-w-2xl text-[clamp(2.2rem,5vw,4.2rem)] leading-[0.95] font-medium tracking-[-0.05em]">
                    {user ? "Your next favourite piece is one click away." : "Save favourites, track orders, check out faster."}
                </h2>
                {user ? (
                    <ButtonLink to="/shop" size="lg">
                        Continue shopping
                    </ButtonLink>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        <ButtonLink to="/signup" size="lg">
                            Create an account
                        </ButtonLink>
                        <ButtonLink to="/login" size="lg" variant="outline">
                            Log in
                        </ButtonLink>
                    </div>
                )}
            </div>
        </Container>
    );
}

function Home() {
    useDocumentTitle("");
    const { settings, isLoading } = useSettings();

    return (
        <>
            <Hero hero={settings.hero || {}} loading={isLoading} />
            <CategoriesSection />
            <ProductSection
                label="OUR COLLECTION"
                title="Featured picks"
                params={{ featured: "true", limit: 8, sort: "newest" }}
                link="/shop?featured=true"
                linkLabel="Shop featured"
                hideWhenEmpty
            />
            <PromoSection promo={settings.promo} />
            <ProductSection
                label="JUST LANDED"
                title="New arrivals"
                params={{ limit: 8, sort: "newest" }}
                link="/shop?sort=newest"
                linkLabel="Shop all"
                emptyMessage="Our first products are being added. Check back soon."
            />
            <ProductSection
                label="MORE TO LOVE"
                title="Popular right now"
                params={{ limit: 4, sort: "popular" }}
                link="/shop?sort=popular"
                linkLabel="View best sellers"
                hideWhenEmpty
                className="pt-0 sm:pt-0"
            />
            <ReviewsSection />
            <CallToAction />
        </>
    );
}

export default Home;
