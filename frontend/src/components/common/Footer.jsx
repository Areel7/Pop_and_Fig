import { Link } from "react-router";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import Container from "./Container.jsx";
import { brandParts } from "../../utils/format.js";
import { useSettings } from "../../hooks/useSettings.js";

const SOCIALS = [
    ["instagram", "Instagram"],
    ["facebook", "Facebook"],
    ["tiktok", "TikTok"],
    ["twitter", "X / Twitter"],
    ["youtube", "YouTube"],
];

function FooterColumn({ title, children }) {
    return (
        <div className="flex flex-col gap-3">
            <h3 className="mb-2 text-[11px] font-semibold tracking-[0.14em] uppercase">{title}</h3>
            {children}
        </div>
    );
}

const footerLink = "w-fit text-sm text-on-primary/60 transition hover:translate-x-0.5 hover:text-on-primary";

function Footer() {
    const { settings } = useSettings();
    const { store = {}, social = {} } = settings;
    const { first, rest } = brandParts(store.name);
    const socials = SOCIALS.filter(([key]) => social[key]);

    return (
        <footer className="mt-24 bg-primary text-on-primary">
            <Container className="grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-[1.8fr_repeat(3,minmax(0,0.8fr))] lg:gap-14 lg:py-20">
                <div className="sm:col-span-2 lg:col-span-1 lg:max-w-sm">
                    <Link to="/" className="mb-5 inline-block text-2xl font-extrabold tracking-tight transition hover:opacity-70">
                        {first}
                        <span className="font-normal">{rest}</span>
                    </Link>
                    {store.tagline && <p className="text-sm leading-7 text-on-primary/60">{store.tagline}</p>}
                    <Link
                        to="/shop"
                        className="mt-7 inline-flex items-center gap-2 border-b border-on-primary/30 pb-1 text-[13px] font-semibold transition-all hover:gap-3 hover:border-on-primary"
                    >
                        Explore collection <ArrowUpRight className="size-4" aria-hidden="true" />
                    </Link>
                </div>

                <FooterColumn title="Shop">
                    <Link to="/shop" className={footerLink}>All products</Link>
                    <Link to="/shop?sort=newest" className={footerLink}>New arrivals</Link>
                    <Link to="/shop?sort=popular" className={footerLink}>Best sellers</Link>
                    <Link to="/shop?onSale=true" className={footerLink}>On sale</Link>
                    <Link to="/category" className={footerLink}>Categories</Link>
                </FooterColumn>

                <FooterColumn title="Account">
                    <Link to="/account" className={footerLink}>My account</Link>
                    <Link to="/account/orders" className={footerLink}>Order history</Link>
                    <Link to="/wishlist" className={footerLink}>Wishlist</Link>
                    <Link to="/cart" className={footerLink}>Cart</Link>
                </FooterColumn>

                <FooterColumn title="Contact">
                    <Link to="/contact" className={footerLink}>Contact us</Link>
                    {store.email && (
                        <a href={`mailto:${store.email}`} className={`${footerLink} inline-flex items-center gap-2 break-all`}>
                            <Mail className="size-3.5 shrink-0" aria-hidden="true" /> {store.email}
                        </a>
                    )}
                    {store.phone && (
                        <a href={`tel:${store.phone.replace(/[^\d+]/g, "")}`} className={`${footerLink} inline-flex items-center gap-2`}>
                            <Phone className="size-3.5 shrink-0" aria-hidden="true" /> {store.phone}
                        </a>
                    )}
                    {store.address && (
                        <p className="inline-flex gap-2 text-sm text-on-primary/60">
                            <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> {store.address}
                        </p>
                    )}
                </FooterColumn>
            </Container>

            <Container>
                <div className="flex flex-col gap-6 border-y border-on-primary/15 py-12 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="mb-4 text-[11px] font-semibold tracking-[0.16em] text-on-primary/50">STAY IN THE LOOP</p>
                        <p className="font-heading text-[clamp(1.9rem,4vw,3.3rem)] leading-none tracking-[-0.04em]">
                            Get the latest
                            <br />
                            from {store.name || "Pop & Figs"}.
                        </p>
                    </div>
                    <Link
                        to="/shop?sort=newest"
                        className="inline-flex w-fit items-center gap-2 border-b border-on-primary/30 pb-1 text-sm font-semibold transition-all hover:gap-3 hover:border-on-primary"
                    >
                        See new arrivals <ArrowUpRight className="size-4" aria-hidden="true" />
                    </Link>
                </div>
            </Container>

            <Container className="flex flex-col gap-4 py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
                <p className="text-on-primary/50">
                    © {new Date().getFullYear()} {first}
                    {rest}. All rights reserved.
                </p>
                {socials.length > 0 && (
                    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Social media">
                        {socials.map(([key, label]) => (
                            <li key={key}>
                                <a href={social[key]} target="_blank" rel="noopener noreferrer" className="text-on-primary/60 transition hover:text-on-primary">
                                    {label}
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </Container>
        </footer>
    );
}

export default Footer;
