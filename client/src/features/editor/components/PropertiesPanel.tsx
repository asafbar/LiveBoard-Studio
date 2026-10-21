import { useState } from "react";
import type { Widget } from "../../boards/types/boardTypes.ts";

type PropertiesPanelProps = {
    selectedWidget: Widget | null;
};

type PropertyTabName = "Content" | "Style" | "Position";

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

type Property = TextProperty | ToggleProperty;

type PropertyFieldProps = {
    property: Property;
};

const propertyTabs: PropertyTabName[] = ["Content", "Style", "Position"];

function widgetTypeLabel(type: Widget["type"]): string {
    switch (type) {
        case "text":
            return "Text";
        case "clock":
            return "Clock";
        case "image":
            return "Image";
        case "information-card":
            return "Information Card";
        case "announcements":
            return "Announcements";
    }
}

function contentProperties(widget: Widget): Property[] {
    switch (widget.type) {
        case "text":
            return [
                { kind: "text", label: "Text", value: widget.settings.text },
            ];
        case "clock":
            return [
                { kind: "text", label: "Time zone", value: widget.settings.timeZone },
                { kind: "toggle", label: "Show date", enabled: widget.settings.showDate },
                { kind: "toggle", label: "Show seconds", enabled: widget.settings.showSeconds },
            ];
        case "image":
            return [
                { kind: "text", label: "Image source", value: widget.settings.src },
                { kind: "text", label: "Alternative text", value: widget.settings.alt },
            ];
        case "information-card":
            return [
                { kind: "text", label: "Title", value: widget.settings.title },
                { kind: "text", label: "Subtitle", value: widget.settings.subtitle ?? "" },
                { kind: "text", label: "Description", value: widget.settings.description ?? "" },
                { kind: "text", label: "Badge", value: widget.settings.badge ?? "" },
                { kind: "text", label: "Image source", value: widget.settings.imageSrc ?? "" },
            ];
        case "announcements":
            return [
                { kind: "text", label: "Title", value: widget.settings.title },
                {
                    kind: "text",
                    label: "Number of items",
                    value: String(widget.settings.items.length),
                },
                ...widget.settings.items.map((item, index) => ({
                    kind: "text" as const,
                    label: `Item ${index + 1}`,
                    value: item.title,
                })),
            ];
    }
}

function styleProperties(widget: Widget): Property[] {
    switch (widget.type) {
        case "text":
            return [
                { kind: "select", label: "Tone", value: widget.settings.tone },
                { kind: "select", label: "Size", value: widget.settings.size },
            ];
        case "clock":
            return [
                { kind: "select", label: "Alignment", value: widget.settings.align },
            ];
        case "image":
            return [
                { kind: "select", label: "Object fit", value: widget.settings.objectFit },
                { kind: "text", label: "Border radius", value: String(widget.settings.borderRadius) },
            ];
        case "information-card":
        case "announcements":
            return [];
    }
}

function positionProperties(widget: Widget): Property[] {
    return [
        { kind: "text", label: "X", value: String(widget.layout.x) },
        { kind: "text", label: "Y", value: String(widget.layout.y) },
        { kind: "text", label: "Width", value: String(widget.layout.width) },
        { kind: "text", label: "Height", value: String(widget.layout.height) },
    ];
}

function propertiesForTab(widget: Widget, tab: PropertyTabName): Property[] {
    switch (tab) {
        case "Content":
            return contentProperties(widget);
        case "Style":
            return styleProperties(widget);
        case "Position":
            return positionProperties(widget);
    }
}

function PropertyField({ property }: PropertyFieldProps) {
    if (property.kind === "toggle") {
        const trackClassName = property.enabled
            ? "relative h-5 w-9 rounded-full bg-accent"
            : "relative h-5 w-9 rounded-full bg-surface-hover";
        const knobClassName = property.enabled
            ? "absolute top-0.5 right-0.5 size-4 rounded-full bg-white"
            : "absolute top-0.5 left-0.5 size-4 rounded-full bg-white";

        return (
            <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-secondary">{property.label}</span>
                <span className="inline-flex items-center gap-2 text-xs font-medium text-secondary">
                    {property.enabled ? "On" : "Off"}
                    <span className={trackClassName} aria-hidden="true">
                        <span className={knobClassName} />
                    </span>
                </span>
            </div>
        );
    }

    const inputClassName = property.kind === "select"
        ? "h-9 w-full rounded-control border border-border bg-surface-raised px-3 pr-8 text-sm text-foreground outline-none"
        : "h-9 w-full rounded-control border border-border bg-surface-raised px-3 text-sm text-foreground outline-none";

    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">{property.label}</span>
            <span className="relative">
                <input
                    readOnly
                    value={property.value}
                    className={inputClassName}
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

function PropertiesPanel({ selectedWidget }: PropertiesPanelProps) {
    const [activeTab, setActiveTab] = useState<PropertyTabName>("Content");
    const properties = selectedWidget === null ? [] : propertiesForTab(selectedWidget, activeTab);

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
                        key={tab}
                        type="button"
                        aria-selected={tab === activeTab}
                        onClick={() => {
                            setActiveTab(tab);
                        }}
                        className={
                            tab === activeTab
                                ? "rounded-control bg-surface-raised px-3 py-1.5 text-sm font-medium text-foreground"
                                : "rounded-control px-3 py-1.5 text-sm font-medium text-muted"
                        }
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {selectedWidget === null ? (
                <div className="flex flex-col gap-2 p-4">
                    <h3 className="text-sm font-semibold text-foreground">No widget selected</h3>
                    <p className="text-sm leading-5 text-muted">
                        Select a widget on the canvas to view its properties.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-4 overflow-y-auto p-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">
                            {widgetTypeLabel(selectedWidget.type)}
                        </h3>
                        <span className="rounded-full border border-cyan/40 bg-cyan/10 px-2 py-0.5 text-xs font-medium text-cyan">
                            Widget
                        </span>
                    </div>
                    {activeTab === "Style" && properties.length === 0 ? (
                        <p className="text-sm text-muted">No style properties.</p>
                    ) : (
                        properties.map((property) => (
                            <PropertyField key={property.label} property={property} />
                        ))
                    )}
                </div>
            )}
        </aside>
    );
}

export default PropertiesPanel;
