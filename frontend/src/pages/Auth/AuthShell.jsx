import { useSettings } from "../../hooks/useSettings.js";
import { resolveImageUrl } from "../../utils/format.js";
import defaultHero from "../../assets/hero.jpg";

function AuthShell({ label, title, description, children, footer }) {
    const { settings } = useSettings();
    const image = settings.hero?.image ? resolveImageUrl(settings.hero.image) : defaultHero;

    return (
        <div className="grid min-h-[calc(100vh-76px)] lg:grid-cols-2">
            <div className="relative hidden overflow-hidden bg-neutral-900 lg:block">
                <img src={image} alt="" className="absolute inset-0 size-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" aria-hidden="true" />
                <div className="absolute inset-x-12 bottom-12 text-white">
                    <p className="text-[11px] font-bold tracking-[0.2em] text-white/70">{(settings.store?.name || "Pop & Figs").toUpperCase()}</p>
                    <p className="mt-4 max-w-md font-heading text-5xl leading-[0.95] tracking-[-0.05em]">
                        {settings.hero?.title || "Collect the characters you love."}
                    </p>
                </div>
            </div>
            <div className="flex items-center justify-center px-4 py-14 sm:px-8">
                <div className="w-full max-w-md">
                    {label && <p className="mb-3 text-[10px] font-bold tracking-[0.18em] text-neutral-500">{label}</p>}
                    <h1 className="text-4xl leading-none font-medium tracking-[-0.05em] sm:text-5xl">{title}</h1>
                    {description && <p className="mt-4 text-sm leading-relaxed text-neutral-600">{description}</p>}
                    <div className="mt-8">{children}</div>
                    {footer && <div className="mt-8 border-t border-neutral-200 pt-6 text-sm text-neutral-600">{footer}</div>}
                </div>
            </div>
        </div>
    );
}

export default AuthShell;
