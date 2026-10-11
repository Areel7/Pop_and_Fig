import { Link } from "react-router";
import { ArrowUpRight, FolderOpen } from "lucide-react";
import Container, { PageHeader } from "../../components/common/Container.jsx";
import { EmptyState, ErrorState, Skeleton } from "../../components/common/Feedback.jsx";
import { useGetCategoriesQuery } from "../../redux/api/categoryApi.js";
import { useDocumentTitle } from "../../hooks/useCommon.js";
import { resolveImageUrl } from "../../utils/format.js";

function Categories() {
    useDocumentTitle("Categories");
    const { data: categories = [], isLoading, isError, error, refetch } = useGetCategoriesQuery();

    return (
        <>
            <PageHeader label="EXPLORE" title="Categories" description="Find exactly what your shelf is missing — browse the collection by category." />
            <Container className="py-12 sm:py-16">
                {isError ? (
                    <ErrorState error={error} onRetry={refetch} />
                ) : isLoading ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }, (_, i) => (
                            <Skeleton key={i} className="aspect-[4/3]" />
                        ))}
                    </div>
                ) : categories.length === 0 ? (
                    <EmptyState icon={FolderOpen} title="No categories yet" message="Categories will appear here as soon as they are added." />
                ) : (
                    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {categories.map((category) => (
                            <li key={category._id}>
                                <Link to={`/category/${category.slug}`} className="group block">
                                    <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                                        {category.image ? (
                                            <img
                                                src={resolveImageUrl(category.image)}
                                                alt=""
                                                loading="lazy"
                                                className="size-full object-cover transition duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            <span className="flex size-full items-center justify-center font-heading text-7xl text-neutral-300" aria-hidden="true">
                                                {category.name.charAt(0)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-4 flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <h2 className="text-xl font-medium tracking-tight break-words">{category.name}</h2>
                                            <p className="mt-1 text-xs text-neutral-500">
                                                {category.productCount} {category.productCount === 1 ? "product" : "products"}
                                            </p>
                                            {category.description && <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{category.description}</p>}
                                        </div>
                                        <ArrowUpRight className="size-5 shrink-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </Container>
        </>
    );
}

export default Categories;
