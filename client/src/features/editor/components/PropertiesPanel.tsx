type PropertyTab = {
    label: string;
    selected: boolean;
};

type TextProperty = {
    kind: "text" | "select";
    label: string;
    value: string;
};

type ToggleProperty = {
    kind: "toggle";
    label: string;
    enabled: boolean;
};

type ClockProperty = TextProperty | ToggleProperty;

const propertyTabs: PropertyTab[] = [
    { label: "Content", selected: true },
    { label: "Style", selected: false },
    { label: "Position", selected: false },
];

const clockProperties: ClockProperty[] = [
    { kind: "text", label: "Label", value: "Local time" },
    { kind: "select", label: "Time zone", value: "Asia/Jerusalem" },
    { kind: "select", label: "Format", value: "24-hour" },
    { kind: "toggle", label: "Show seconds", enabled: true },
];

type PropertyFieldProps = {
    property: ClockProperty;
};

function PropertyField({ property }: PropertyFieldProps) {
    if (property.kind === "toggle") {
        return (
            <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-secondary">{property.label}</span>
                <span className="inline-flex items-center gap-2 text-xs font-medium text-secondary">
                    {property.enabled ? "On" : "Off"}
                    <span
                        className="relative h-5 w-9 rounded-full bg-accent"
                        aria-hidden="true"
                    >
                        <span className="absolute top-0.5 right-0.5 size-4 rounded-full bg-white" />
                    </span>
                </span>
            </div>
        );
    }

    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">{property.label}</span>
            <span className="relative">
                <input
                    readOnly
                    value={property.value}
                    className={
                    property.kind === "select"
                        ? "h-9 w-full rounded-control border border-border bg-surface-raised px-3 pr-8 text-sm text-foreground outline-none"
                        : "h-9 w-full rounded-control border border-border bg-surface-raised px-3 text-sm text-foreground outline-none"
                }
                />
                {property.kind === "select" ? (
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted">
                        <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            className="size-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                        >
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </span>
                ) : null}
            </span>
        </label>
    );
}

function PropertiesPanel() {
    return (
        <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-surface">
            <div className="border-b border-border px-4 py-3">
                <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
                    Properties
                </h2>
            </div>

            <div className="flex gap-1 border-b border-border px-3 py-2">
                {propertyTabs.map((tab) => (
                    <button
                        key={tab.label}
                        type="button"
                        aria-selected={tab.selected}
                        className={
                            tab.selected
                                ? "rounded-control bg-surface-raised px-3 py-1.5 text-sm font-medium text-foreground"
                                : "rounded-control px-3 py-1.5 text-sm font-medium text-muted"
                        }
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto p-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Clock</h3>
                    <span className="rounded-full border border-cyan/40 bg-cyan/10 px-2 py-0.5 text-xs font-medium text-cyan">
                        Widget
                    </span>
                </div>
                {clockProperties.map((property) => (
                    <PropertyField key={property.label} property={property} />
                ))}
            </div>
        </aside>
    );
}

export default PropertiesPanel;
