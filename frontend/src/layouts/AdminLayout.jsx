import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import {
    BadgePercent,
    ExternalLink,
    FolderTree,
    LayoutDashboard,
    LogOut,
    Menu,
    MessageSquareText,
    Package,
    Settings,
    ShoppingCart,
    Users,
    X,
} from "lucide-react";
import { logout, selectCurrentUser } from "../redux/features/auth/authSlice.js";
import { useGetMeQuery, useLogoutMutation } from "../redux/api/authApi.js";
import { ADMIN_BASE_PATH, adminPath } from "../redux/constant.js";
import { useEscapeKey, useLockBodyScroll } from "../hooks/useCommon.js";

const NAV = [
    { to: adminPath("dashboard"), label: "Dashboard", icon: LayoutDashboard },
    { to: adminPath("products"), label: "Products", icon: Package },
    { to: adminPath("categories"), label: "Categories", icon: FolderTree },
    { to: adminPath("orders"), label: "Orders", icon: ShoppingCart },
    { to: adminPath("customers"), label: "Customers", icon: Users },
    { to: adminPath("reviews"), label: "Reviews", icon: MessageSquareText },
    { to: adminPath("discounts"), label: "Discounts / Sales", icon: BadgePercent },
    { to: adminPath("settings"), label: "Settings", icon: Settings },
];

// The admin panel always uses the neutral brand palette, regardless of storefront theme settings.
const ADMIN_THEME = {
    "--pf-primary": "#111111",
    "--pf-primary-contrast": "#ffffff",
    "--pf-secondary": "#f5f1eb",
    "--pf-accent": "#d4a373",
    "--pf-accent-contrast": "#111111",
    "--pf-background": "#f6f6f4",
    "--pf-text": "#111111",
    "--pf-button": "#111111",
    "--pf-button-text": "#ffffff",
    "--pf-font-body": '"Inter"',
    "--pf-font-heading": '"Inter"',
    "--pf-font-button": '"Inter"',
};

function SidebarContent({ onNavigate, onLogout, loggingOut, user }) {
    return (
        <div className="flex h-full flex-col bg-neutral-950 text-white">
            <div className="flex min-h-[72px] items-center border-b border-white/10 px-6">
                <p className="text-lg font-bold tracking-tight">
                    POP<span className="font-normal">-AND-FIGS</span>
                    <span className="ml-2 align-middle text-[10px] font-semibold tracking-[0.15em] text-white/40">ADMIN</span>
                </p>
            </div>
            <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-6">
                <p className="mb-2 px-3 text-[10px] font-bold tracking-[0.15em] text-white/40">MANAGE</p>
                <ul className="space-y-1">
                    {NAV.map(({ to, label, icon: Icon }) => (
                        <li key={to}>
                            <NavLink
                                to={to}
                                onClick={onNavigate}
                                className={({ isActive }) =>
                                    `flex min-h-11 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition ${
                                        isActive ? "bg-white text-neutral-950" : "text-white/65 hover:bg-white/10 hover:text-white"
                                    }`
                                }
                            >
                                <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                                {label}
                            </NavLink>
                        </li>
                    ))}
                </ul>
                <p className="mt-8 mb-2 px-3 text-[10px] font-bold tracking-[0.15em] text-white/40">STORE</p>
                <a
                    href="/"
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-white/65 transition hover:bg-white/10 hover:text-white"
                >
                    <ExternalLink className="size-[18px]" aria-hidden="true" /> View storefront
                </a>
            </nav>
            <div className="border-t border-white/10 p-3">
                <div className="mb-2 px-3 text-xs">
                    <p className="truncate font-medium">{user?.name}</p>
                    <p className="truncate text-white/50">{user?.email}</p>
                </div>
                <button
                    type="button"
                    onClick={onLogout}
                    disabled={loggingOut}
                    className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-white/65 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                    <LogOut className="size-[18px]" aria-hidden="true" /> {loggingOut ? "Logging out…" : "Logout"}
                </button>
            </div>
        </div>
    );
}

function AdminLayout() {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const user = useSelector(selectCurrentUser);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const [logoutRequest, { isLoading: loggingOut }] = useLogoutMutation();

    // Re-verify the session with the server; a 401 clears it via the API layer.
    const { data: me } = useGetMeQuery();
    useEffect(() => {
        if (me && !me.isAdmin) {
            dispatch(logout());
            navigate(ADMIN_BASE_PATH, { replace: true });
        }
    }, [me, dispatch, navigate]);

    const closeDrawer = useCallback(() => setDrawerOpen(false), []);
    useLockBodyScroll(drawerOpen);
    useEscapeKey(drawerOpen, closeDrawer);

    const handleLogout = async () => {
        try {
            await logoutRequest().unwrap();
        } finally {
            dispatch(logout());
            navigate(ADMIN_BASE_PATH, { replace: true });
        }
    };

    const current = NAV.find((item) => location.pathname.startsWith(item.to));

    return (
        <div style={ADMIN_THEME} className="min-h-screen bg-background font-admin text-foreground">
            <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
                <SidebarContent onLogout={handleLogout} loggingOut={loggingOut} user={user} />
            </aside>

            {drawerOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 animate-fade-in bg-black/50" onClick={closeDrawer} aria-hidden="true" />
                    <div role="dialog" aria-modal="true" aria-label="Admin menu" className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-slide-in-left">
                        <button
                            type="button"
                            onClick={closeDrawer}
                            className="absolute top-4 right-3 z-10 flex size-10 items-center justify-center text-white/70 hover:text-white"
                            aria-label="Close menu"
                        >
                            <X className="size-5" aria-hidden="true" />
                        </button>
                        <SidebarContent onNavigate={closeDrawer} onLogout={handleLogout} loggingOut={loggingOut} user={user} />
                    </div>
                </div>
            )}

            <div className="lg:pl-64">
                <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-neutral-200 bg-white/95 px-4 backdrop-blur lg:hidden">
                    <button
                        type="button"
                        onClick={() => setDrawerOpen(true)}
                        className="flex size-10 items-center justify-center hover:bg-neutral-100"
                        aria-label="Open admin menu"
                        aria-expanded={drawerOpen}
                    >
                        <Menu className="size-5" aria-hidden="true" />
                    </button>
                    <p className="truncate text-sm font-semibold">{current?.label || "Admin"}</p>
                </header>
                <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default AdminLayout;
