import { NavLink, Outlet, useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { Heart, LayoutGrid, LogOut, MessageSquareText, Package, UserRound } from "lucide-react";
import { toast } from "react-toastify";
import Container from "../../components/common/Container.jsx";
import { logout, selectCurrentUser } from "../../redux/features/auth/authSlice.js";
import { useLogoutMutation } from "../../redux/api/authApi.js";

const LINKS = [
    { to: "/account", label: "Overview", icon: LayoutGrid, end: true },
    { to: "/account/profile", label: "Profile", icon: UserRound },
    { to: "/account/orders", label: "Orders", icon: Package },
    { to: "/account/wishlist", label: "Wishlist", icon: Heart },
    { to: "/account/reviews", label: "Reviews", icon: MessageSquareText },
];

function AccountLayout() {
    const user = useSelector(selectCurrentUser);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [logoutRequest, { isLoading }] = useLogoutMutation();

    const handleLogout = async () => {
        try {
            await logoutRequest().unwrap();
        } finally {
            dispatch(logout());
            toast.info("You have been logged out");
            navigate("/", { replace: true });
        }
    };

    return (
        <>
            <div className="border-b border-neutral-200 bg-secondary/60">
                <Container className="py-10 sm:py-12">
                    <p className="mb-3 text-[10px] font-bold tracking-[0.18em] text-neutral-500">MY ACCOUNT</p>
                    <h1 className="text-4xl leading-none font-medium tracking-[-0.05em] break-words sm:text-5xl">Hi, {user?.name?.split(" ")[0]}</h1>
                </Container>
            </div>
            <Container className="grid gap-8 py-8 lg:grid-cols-[220px_1fr] lg:gap-14 lg:py-12">
                <nav aria-label="Account" className="relative -mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
                    <ul className="flex gap-1 lg:flex-col">
                        {LINKS.map(({ to, label, icon: Icon, end }) => (
                            <li key={to} className="shrink-0">
                                <NavLink
                                    to={to}
                                    end={end}
                                    className={({ isActive }) =>
                                        `flex min-h-11 items-center gap-3 px-3 text-sm whitespace-nowrap transition ${
                                            isActive ? "bg-primary font-medium text-on-primary" : "text-neutral-600 hover:bg-black/5 hover:text-foreground"
                                        }`
                                    }
                                >
                                    <Icon className="size-4" aria-hidden="true" /> {label}
                                </NavLink>
                            </li>
                        ))}
                        <li className="shrink-0 lg:mt-4 lg:border-t lg:border-neutral-200 lg:pt-4">
                            <button
                                type="button"
                                onClick={handleLogout}
                                disabled={isLoading}
                                className="flex min-h-11 w-full items-center gap-3 px-3 text-sm whitespace-nowrap text-neutral-600 transition hover:bg-black/5 hover:text-red-700 disabled:opacity-50"
                            >
                                <LogOut className="size-4" aria-hidden="true" /> {isLoading ? "Logging out…" : "Log out"}
                            </button>
                        </li>
                    </ul>
                </nav>
                <div className="min-w-0">
                    <Outlet />
                </div>
            </Container>
        </>
    );
}

export default AccountLayout;
