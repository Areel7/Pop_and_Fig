import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation, useNavigate } from "react-router";
import { useSelector } from "react-redux";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import Logo from "./Logo.jsx";
import Container from "./Container.jsx";
import { ButtonLink } from "./Button.jsx";
import { selectCurrentUser } from "../../redux/features/auth/authSlice.js";
import { selectCartCount } from "../../redux/features/cart/cartSlice.js";
import { useWishlist } from "../../hooks/useWishlist.js";
import { useEscapeKey, useLockBodyScroll } from "../../hooks/useCommon.js";
import { ADMIN_BASE_PATH } from "../../redux/constant.js";

const LINKS = [
    { to: "/", label: "Home", end: true },
    { to: "/shop", label: "Shop" },
    { to: "/category", label: "Categories" },
    { to: "/contact", label: "Contact" },
];

const desktopLink = ({ isActive }) =>
    `relative py-2 text-sm font-medium whitespace-nowrap transition after:absolute after:bottom-0.5 after:left-0 after:h-px after:bg-primary after:transition-all after:duration-300 hover:text-foreground hover:after:w-full ${
        isActive ? "text-foreground after:w-full" : "text-neutral-500 after:w-0"
    }`;

function CountBadge({ count, label }) {
    if (!count) return null;
    return (
        <span className="absolute top-1 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] leading-none font-bold text-on-primary">
            {count > 99 ? "99+" : count}
            <span className="sr-only"> {label}</span>
        </span>
    );
}

const iconButton = "relative flex size-10 items-center justify-center transition hover:-translate-y-px hover:bg-black/5";

function Navbar() {
    // The drawer remembers the path it was opened on, so any navigation closes it automatically.
    const [openedAt, setOpenedAt] = useState(null);
    const [query, setQuery] = useState("");
    const user = useSelector(selectCurrentUser);
    const cartCount = useSelector(selectCartCount);
    const { count: wishlistCount } = useWishlist();
    const location = useLocation();
    const navigate = useNavigate();
    const open = openedAt === location.pathname;
    const setOpen = (value) => setOpenedAt(value ? location.pathname : null);

    const close = useCallback(() => setOpenedAt(null), []);
    useLockBodyScroll(open);
    useEscapeKey(open, close);

    const submitSearch = (event) => {
        event.preventDefault();
        const term = query.trim();
        navigate(term ? `/search?q=${encodeURIComponent(term)}` : "/search");
        setQuery("");
        close();
    };

    const accountPath = user ? (user.isAdmin ? `${ADMIN_BASE_PATH}/dashboard` : "/account") : "/login";

    return (
        <header className="sticky top-0 z-50 border-b border-neutral-200/80 bg-background/95 backdrop-blur-md">
            <Container className="flex min-h-16 items-center gap-6 md:min-h-[76px] md:gap-8">
                <Logo className="text-base sm:text-lg md:text-xl" />

                <nav aria-label="Main" className="mx-auto hidden items-center gap-[clamp(1.25rem,2.5vw,2.4rem)] md:flex">
                    {LINKS.map((link) => (
                        <NavLink key={link.to} to={link.to} end={link.end} className={desktopLink}>
                            {link.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="ml-auto flex items-center gap-0.5 md:ml-0 md:gap-1">
                    <Link to="/search" className={`${iconButton} hidden md:flex`} aria-label="Search products">
                        <Search className="size-[19px]" strokeWidth={1.6} aria-hidden="true" />
                    </Link>
                    <Link to={accountPath} className={`${iconButton} hidden md:flex`} aria-label={user ? "My account" : "Log in"}>
                        <User className="size-[19px]" strokeWidth={1.6} aria-hidden="true" />
                    </Link>
                    <Link to="/wishlist" className={iconButton} aria-label="Wishlist">
                        <Heart className="size-[19px]" strokeWidth={1.6} aria-hidden="true" />
                        <CountBadge count={wishlistCount} label="saved items" />
                    </Link>
                    <Link to="/cart" className={iconButton} aria-label="Shopping cart">
                        <ShoppingBag className="size-[19px]" strokeWidth={1.6} aria-hidden="true" />
                        <CountBadge count={cartCount} label="items in cart" />
                    </Link>

                    {!user && (
                        <div className="ml-2 hidden items-center gap-1.5 lg:flex">
                            <ButtonLink to="/login" variant="outline" size="sm" className="min-h-[34px]">
                                Login
                            </ButtonLink>
                            <ButtonLink to="/signup" size="sm" className="min-h-[34px]">
                                Sign Up
                            </ButtonLink>
                        </div>
                    )}

                    <button
                        type="button"
                        className={`${iconButton} md:hidden`}
                        onClick={() => setOpen(true)}
                        aria-label="Open menu"
                        aria-expanded={open}
                        aria-controls="mobile-menu"
                    >
                        <Menu className="size-5" strokeWidth={1.6} aria-hidden="true" />
                    </button>
                </div>
            </Container>

            {/* Portalled: the header's backdrop-filter would otherwise trap position:fixed children. */}
            {open &&
                createPortal(
                <div className="fixed inset-0 z-[60] md:hidden">
                    <div className="absolute inset-0 animate-fade-in bg-black/40" onClick={close} aria-hidden="true" />
                    <aside
                        id="mobile-menu"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Menu"
                        className="absolute inset-y-0 right-0 flex w-[min(88vw,380px)] animate-slide-in-right flex-col bg-background shadow-2xl"
                    >
                        <div className="flex min-h-16 items-center justify-between border-b border-neutral-200 px-4">
                            <Logo className="text-base" onClick={close} />
                            <button type="button" onClick={close} className={iconButton} aria-label="Close menu">
                                <X className="size-5" aria-hidden="true" />
                            </button>
                        </div>

                        <form onSubmit={submitSearch} role="search" className="border-b border-neutral-200 p-4">
                            <label htmlFor="mobile-search" className="sr-only">
                                Search products
                            </label>
                            <div className="flex items-center border border-neutral-300 focus-within:border-neutral-900">
                                <Search className="ml-3 size-4 text-neutral-400" aria-hidden="true" />
                                <input
                                    id="mobile-search"
                                    type="search"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search products"
                                    className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none"
                                />
                            </div>
                        </form>

                        <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-4 py-2">
                            {[...LINKS, { to: "/wishlist", label: "Wishlist" }, { to: "/cart", label: "Cart" }].map((link) => (
                                <NavLink
                                    key={link.to}
                                    to={link.to}
                                    end={link.end}
                                    onClick={close}
                                    className={({ isActive }) =>
                                        `flex min-h-13 items-center justify-between border-b border-neutral-100 text-[15px] ${isActive ? "font-semibold text-foreground" : "text-neutral-600"}`
                                    }
                                >
                                    {link.label}
                                    {link.to === "/cart" && cartCount > 0 && <span className="text-xs text-neutral-500">{cartCount}</span>}
                                    {link.to === "/wishlist" && wishlistCount > 0 && <span className="text-xs text-neutral-500">{wishlistCount}</span>}
                                </NavLink>
                            ))}
                        </nav>

                        <div className="border-t border-neutral-200 p-4">
                            {user ? (
                                <ButtonLink to={accountPath} block variant="outline" onClick={close}>
                                    <User className="size-4" aria-hidden="true" /> {user.isAdmin ? "Admin dashboard" : "My account"}
                                </ButtonLink>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    <ButtonLink to="/login" variant="outline" block onClick={close}>
                                        Login
                                    </ButtonLink>
                                    <ButtonLink to="/signup" block onClick={close}>
                                        Sign Up
                                    </ButtonLink>
                                </div>
                            )}
                        </div>
                    </aside>
                </div>,
                document.body
            )}
        </header>
    );
}

export default Navbar;
