function Container({ as: Tag = "div", className = "", children, ...props }) {
    return (
        <Tag className={`mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 ${className}`} {...props}>
            {children}
        </Tag>
    );
}

export function SectionHeader({ label, title, action, className = "" }) {
    return (
        <div className={`mb-8 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between ${className}`}>
            <div className="min-w-0">
                {label && <p className="mb-3 text-[10px] font-bold tracking-[0.18em] text-neutral-500 uppercase">{label}</p>}
                <h2 className="text-4xl leading-[0.95] font-medium tracking-[-0.05em] sm:text-5xl lg:text-6xl">{title}</h2>
            </div>
            {action}
        </div>
    );
}

export function PageHeader({ label, title, description, children }) {
    return (
        <div className="border-b border-neutral-200 bg-secondary/60">
            <Container className="py-10 sm:py-14">
                {label && <p className="mb-3 text-[10px] font-bold tracking-[0.18em] text-neutral-500 uppercase">{label}</p>}
                <h1 className="text-4xl leading-none font-medium tracking-[-0.05em] break-words sm:text-6xl">{title}</h1>
                {description && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-600 sm:text-base">{description}</p>}
                {children}
            </Container>
        </div>
    );
}

export default Container;
