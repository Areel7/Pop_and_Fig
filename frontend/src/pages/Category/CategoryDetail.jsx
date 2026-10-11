import { Link, useParams } from "react-router";
import { ChevronRight } from "lucide-react";
import Container from "../../components/common/Container.jsx";
import { ButtonLink } from "../../components/common/Button.jsx";
import { EmptyState, ErrorState, Skeleton } from "../../components/common/Feedback.jsx";
import ProductBrowser from "../../components/products/ProductBrowser.jsx";
import { useGetCategoryQuery } from "../../redux/api/categoryApi.js";
import { useDocumentTitle } from "../../hooks/useCommon.js";
import { resolveImageUrl } from "../../utils/format.js";

function CategoryDetail() {
    const { slug } = useParams();
    const { data: category, isLoading, isError, error, refetch } = useGetCategoryQuery(slug);
    useDocumentTitle(category?.name || "Category");

    if (isError) {
        if (error?.status === 404) {
            return (
                <EmptyState
                    className="min-h-[50vh]"
                    title="Category not found"
                    message="This category may have been renamed or is no longer available."
                    action={<ButtonLink to="/category">Browse categories</ButtonLink>}
                />
            );
        }
        return <ErrorState error={error} onRetry={refetch} className="min-h-[50vh]" />;
    }

    return (
        <>
            <section className="relative overflow-hidden border-b border-neutral-200 bg-secondary/60">
                {category?.image && (
                    <>
                        <img src={resolveImageUrl(category.image)} alt="" className="absolute inset-0 size-full object-cover" />
                        <span className="absolute inset-0 bg-gradient-to-r from-black/75 to-black/30" aria-hidden="true" />
                    </>
                )}
                <Container className={`relative py-12 sm:py-16 ${category?.image ? "text-white" : ""}`}>
                    <nav aria-label="Breadcrumb" className={`mb-6 flex items-center gap-1.5 text-xs ${category?.image ? "text-white/70" : "text-neutral-500"}`}>
                        <Link to="/" className="hover:underline">Home</Link>
                        <ChevronRight className="size-3" aria-hidden="true" />
                        <Link to="/category" className="hover:underline">Categories</Link>
                        <ChevronRight className="size-3" aria-hidden="true" />
                        <span aria-current="page">{category?.name || "…"}</span>
                    </nav>
                    {isLoading ? (
                        <Skeleton className="h-14 w-72 max-w-full" />
                    ) : (
                        <>
                            <h1 className="text-4xl leading-none font-medium tracking-[-0.05em] break-words sm:text-6xl">{category.name}</h1>
                            {category.description && (
                                <p className={`mt-4 max-w-2xl text-sm leading-relaxed sm:text-base ${category.image ? "text-white/80" : "text-neutral-600"}`}>
                                    {category.description}
                                </p>
                            )}
                        </>
                    )}
                </Container>
            </section>
            {category && (
                <ProductBrowser
                    fixed={{ category: category.slug }}
                    emptyTitle="Nothing here yet"
                    emptyMessage="Products in this category will appear here soon."
                />
            )}
        </>
    );
}

export default CategoryDetail;
