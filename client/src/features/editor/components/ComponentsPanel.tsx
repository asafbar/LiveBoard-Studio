import { useState } from "react";
import type { WidgetType } from "../../boards/types/boardTypes.ts";
import StudioIcon from "./StudioIcon.tsx";
import type { StudioIconName } from "./StudioIcon.tsx";

type ComponentsPanelProps = {
    onAddWidget: (type: WidgetType) => void;
};

type LibraryItem = {
    name: string;
    icon: StudioIconName;
    type: WidgetType | null;
};

const libraryItems: LibraryItem[] = [
    { name: "Text", icon: "text", type: "text" },
    { name: "Clock", icon: "clock", type: "clock" },
    { name: "Image", icon: "image", type: "image" },
    { name: "Information Card", icon: "information-card", type: "information-card" },
    { name: "Announcements", icon: "announcements", type: "announcements" },
    { name: "Video", icon: "video", type: null },
    { name: "Gallery", icon: "gallery", type: null },
    { name: "Countdown", icon: "countdown", type: null },
    { name: "QR Code", icon: "qr", type: null },
];

function ComponentsPanel({ onAddWidget }: ComponentsPanelProps) {
    const [selectedType, setSelectedType] = useState<WidgetType | null>(null);

    function handleAddWidget() {
        if (selectedType === null) {
            return;
        }

        onAddWidget(selectedType);
    }

    return (
        <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
            <div className="border-b border-border px-4 py-3">
                <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
                    Components
                </h2>
            </div>
            <div className="grid flex-1 grid-cols-2 content-start gap-2 overflow-y-auto p-3">
                {libraryItems.map((item) => {
                    const available = item.type !== null;
                    const selected = available && item.type === selectedType;

                    return (
                        <button
                            key={item.name}
                            type="button"
                            disabled={!available}
                            aria-pressed={available ? selected : undefined}
                            title={available ? undefined : "Not available yet"}
                            onClick={() => {
                                if (item.type !== null) {
                                    setSelectedType(item.type);
                                }
                            }}
                            className={
                                !available
                                    ? "flex cursor-not-allowed flex-col items-center gap-1 rounded-md border border-border/70 bg-surface-raised/20 px-2 py-3 text-center text-xs font-medium text-muted opacity-60"
                                    : selected
                                        ? "flex flex-col items-center gap-2 rounded-md border border-cyan/70 bg-surface-raised px-2 py-3 text-center text-xs font-medium text-foreground"
                                        : "flex flex-col items-center gap-2 rounded-md border border-border bg-surface-raised/40 px-2 py-3 text-center text-xs font-medium text-secondary transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover"
                            }
                        >
                            <span className={selected ? "text-cyan" : available ? "text-secondary" : "text-muted"}>
                                <StudioIcon name={item.icon} />
                            </span>
                            {item.name}
                            {available ? null : (
                                <span className="text-[10px] tracking-wide uppercase">Not ready</span>
                            )}
                        </button>
                    );
                })}
            </div>
            <div className="border-t border-border p-3">
                <button
                    type="button"
                    disabled={selectedType === null}
                    onClick={handleAddWidget}
                    className={
                        selectedType === null
                            ? "h-9 w-full cursor-not-allowed rounded-control border border-border bg-surface-raised/40 text-sm font-medium text-muted opacity-60"
                            : "h-9 w-full rounded-control bg-accent text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
                    }
                >
                    Add Widget
                </button>
            </div>
        </aside>
    );
}

export default ComponentsPanel;
