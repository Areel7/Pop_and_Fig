import { useRef } from "react";
import { useSearchParams } from "react-router";
import { House, Mail, Palette, Share2, Store, Truck, Type } from "lucide-react";
import { ErrorState, Skeleton } from "../../../components/common/Feedback.jsx";
import { AdminPageHeader, Card } from "../../../components/admin/AdminUI.jsx";
import { useGetSettingsQuery } from "../../../redux/api/settingsApi.js";
import { useDocumentTitle } from "../../../hooks/useCommon.js";
import { ColorsSettings, TypographySettings } from "./BrandSettings.jsx";
import { HeroSettings, PromoSettings } from "./HomepageSettings.jsx";
import { ShippingSettings, SocialSettings, StoreInfoSettings } from "./StoreSettings.jsx";
import EmailSettings from "./EmailSettings.jsx";

const TABS = [
    { id: "colors", label: "Brand colors", icon: Palette },
    { id: "typography", label: "Typography", icon: Type },
    { id: "homepage", label: "Homepage hero & promo", icon: House },
    { id: "store", label: "Store information", icon: Store },
    { id: "shipping", label: "Shipping", icon: Truck },
    { id: "social", label: "Social links", icon: Share2 },
    { id: "email", label: "Email / Gmail", icon: Mail },
];

// Each section form is keyed by its saved data: after a save (or refetch) it remounts with fresh values,
// which avoids syncing server data into local state with effects.
const keyOf = (value) => JSON.stringify(value ?? {});

function SettingsSkeleton() {
    return (
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]" aria-hidden="true">
            <div className="flex gap-2 overflow-hidden lg:flex-col">
                {TABS.map((tab) => (
                    <Skeleton key={tab.id} className="h-10 w-32 shrink-0 rounded-lg lg:w-full" />
                ))}
            </div>
            <Card>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-2 h-3 w-64 max-w-full" />
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {Array.from({ length: 6 }, (_, i) => (
                        <div key={i}>
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="mt-2 h-11 w-full" />
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}

function AdminSettings() {
    useDocumentTitle("Settings");
    const { data: settings, isLoading, isError, error, refetch } = useGetSettingsQuery();
    const [searchParams, setSearchParams] = useSearchParams();
    const tabRefs = useRef({});

    const requested = searchParams.get("tab");
    const active = TABS.some((tab) => tab.id === requested) ? requested : TABS[0].id;

    const selectTab = (id, focus = false) => {
        setSearchParams(
            (params) => {
                const next = new URLSearchParams(params);
                next.set("tab", id);
                return next;
            },
            { replace: true }
        );
        if (focus) tabRefs.current[id]?.focus();
    };

    const onTabKeyDown = (event) => {
        const index = TABS.findIndex((tab) => tab.id === active);
        let nextIndex = null;
        if (event.key === "ArrowDown" || event.key === "ArrowRight") nextIndex = (index + 1) % TABS.length;
        else if (event.key === "ArrowUp" || event.key === "ArrowLeft") nextIndex = (index - 1 + TABS.length) % TABS.length;
        else if (event.key === "Home") nextIndex = 0;
        else if (event.key === "End") nextIndex = TABS.length - 1;
        if (nextIndex === null) return;
        event.preventDefault();
        selectTab(TABS[nextIndex].id, true);
    };

    const header = <AdminPageHeader title="Settings" description="Branding, homepage content, store details, shipping and email." />;

    if (!settings && isLoading) {
        return (
            <div>
                {header}
                <SettingsSkeleton />
            </div>
        );
    }

    if (!settings) {
        return (
            <div>
                {header}
                <Card>
                    <ErrorState error={isError ? error : undefined} title="Could not load settings" onRetry={refetch} />
                </Card>
            </div>
        );
    }

    const panels = {
        colors: <ColorsSettings key={keyOf(settings.theme)} theme={settings.theme} />,
        typography: <TypographySettings key={keyOf(settings.typography)} typography={settings.typography} fonts={settings.fonts || []} />,
        homepage: (
            <div className="space-y-6">
                <HeroSettings key={keyOf(settings.hero)} hero={settings.hero} />
                <PromoSettings key={keyOf(settings.promo)} promo={settings.promo} />
            </div>
        ),
        store: <StoreInfoSettings key={keyOf(settings.store)} store={settings.store} />,
        shipping: <ShippingSettings key={keyOf(settings.shipping)} shipping={settings.shipping} />,
        social: <SocialSettings key={keyOf(settings.social)} social={settings.social} />,
        // Only mounted when opened, so the email status is fetched on demand.
        email: active === "email" ? <EmailSettings /> : null,
    };

    return (
        <div>
            {header}
            <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
                <div
                    role="tablist"
                    aria-label="Settings sections"
                    aria-orientation="vertical"
                    onKeyDown={onTabKeyDown}
                    className="relative -mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 lg:sticky lg:top-6 lg:flex-col lg:overflow-visible lg:pb-0"
                >
                    {TABS.map(({ id, label, icon: Icon }) => {
                        const selected = id === active;
                        return (
                            <button
                                key={id}
                                ref={(node) => {
                                    tabRefs.current[id] = node;
                                }}
                                type="button"
                                role="tab"
                                id={`settings-tab-${id}`}
                                aria-selected={selected}
                                aria-controls={`settings-panel-${id}`}
                                tabIndex={selected ? 0 : -1}
                                onClick={() => selectTab(id)}
                                className={`flex min-h-10 shrink-0 items-center gap-2.5 rounded-lg px-3 text-left text-sm font-medium whitespace-nowrap transition focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none ${
                                    selected ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-900"
                                }`}
                            >
                                <Icon className="size-4 shrink-0" aria-hidden="true" />
                                {label}
                            </button>
                        );
                    })}
                </div>

                <div className="min-w-0">
                    {TABS.map(({ id }) => (
                        // Inactive panels stay mounted (hidden) so unsaved edits survive switching tabs.
                        <div key={id} role="tabpanel" id={`settings-panel-${id}`} aria-labelledby={`settings-tab-${id}`} hidden={id !== active} tabIndex={0} className="focus:outline-none">
                            {panels[id]}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default AdminSettings;
