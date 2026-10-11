import { Suspense } from "react";
import { Outlet, isRouteErrorResponse, useRouteError } from "react-router";
import { useSelector } from "react-redux";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ThemeManager from "../components/common/ThemeManager.jsx";
import CartSync from "../components/common/CartSync.jsx";
import { ScrollToTop } from "../components/common/RouteGuards.jsx";
import { PageLoader } from "../components/common/Feedback.jsx";
import { ButtonLink } from "../components/common/Button.jsx";
import { selectCurrentUser } from "../redux/features/auth/authSlice.js";
import { useGetMeQuery } from "../redux/api/authApi.js";

// Confirms a cached session is still valid on load (a 401 clears it in the API layer).
function SessionCheck() {
    const user = useSelector(selectCurrentUser);
    useGetMeQuery(undefined, { skip: !user });
    return null;
}

// Global concerns shared by the storefront and the admin panel.
function RootLayout() {
    return (
        <>
            <ThemeManager />
            <SessionCheck />
            <CartSync />
            <ScrollToTop />
            <ToastContainer position="bottom-right" autoClose={3000} newestOnTop limit={3} theme="light" />
            <Suspense fallback={<PageLoader />}>
                <Outlet />
            </Suspense>
        </>
    );
}

export function RouteError() {
    const error = useRouteError();
    const notFound = isRouteErrorResponse(error) && error.status === 404;
    if (!notFound) console.error(error);
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-[11px] font-bold tracking-[0.2em] text-neutral-500">{notFound ? "404" : "UNEXPECTED ERROR"}</p>
            <h1 className="text-4xl font-medium tracking-tight">{notFound ? "Page not found" : "Something went wrong"}</h1>
            <p className="max-w-md text-sm text-neutral-500">
                {notFound ? "The page you are looking for does not exist." : "Please refresh the page. If the problem continues, contact us."}
            </p>
            <ButtonLink to="/" className="mt-2">
                Back to home
            </ButtonLink>
        </div>
    );
}

export default RootLayout;
