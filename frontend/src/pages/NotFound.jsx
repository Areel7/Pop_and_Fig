import { ButtonLink } from "../components/common/Button.jsx";
import Container from "../components/common/Container.jsx";
import { useDocumentTitle } from "../hooks/useCommon.js";

function NotFound() {
    useDocumentTitle("Page not found");
    return (
        <Container className="flex min-h-[60vh] flex-col items-start justify-center py-20">
            <p className="text-[11px] font-bold tracking-[0.2em] text-neutral-500">ERROR 404</p>
            <h1 className="mt-4 text-5xl leading-none font-medium tracking-[-0.05em] sm:text-7xl">This page wandered off.</h1>
            <p className="mt-6 max-w-md text-neutral-600">The page you're looking for doesn't exist or has moved.</p>
            <div className="mt-8 flex flex-wrap gap-2">
                <ButtonLink to="/">Back to home</ButtonLink>
                <ButtonLink to="/shop" variant="outline">
                    Browse the shop
                </ButtonLink>
            </div>
        </Container>
    );
}

export default NotFound;
