import { useEffect } from "react";
import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router";
import { selectCurrentUser } from "../../redux/features/auth/authSlice.js";
import { ADMIN_BASE_PATH } from "../../redux/constant.js";

// Customer-only areas: redirect to login and remember where the user was going.
export function RequireAuth({ children }) {
    const user = useSelector(selectCurrentUser);
    const location = useLocation();
    if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
    return children || <Outlet />;
}

// Admin UI guard. This only controls what is rendered — the API independently verifies the
// session and admin role on every admin request.
export function RequireAdmin({ children }) {
    const user = useSelector(selectCurrentUser);
    const location = useLocation();
    if (!user?.isAdmin) return <Navigate to={ADMIN_BASE_PATH} replace state={{ from: location.pathname }} />;
    return children || <Outlet />;
}

// Login/sign-up pages bounce signed-in users to where they were headed.
export function GuestOnly({ children }) {
    const user = useSelector(selectCurrentUser);
    const location = useLocation();
    if (user) return <Navigate to={location.state?.from || "/account"} replace />;
    return children || <Outlet />;
}

export function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "instant" });
    }, [pathname]);
    return null;
}
