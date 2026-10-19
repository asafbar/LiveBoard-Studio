import StudioIcon from "./StudioIcon.tsx";
import type { StudioIconName } from "./StudioIcon.tsx";

type LibraryItem = {
    name: string;
    icon: StudioIconName;
    selected: boolean;
};

const libraryItems: LibraryItem[] = [
    { name: "Text", icon: "text", selected: false },
    { name: "Clock", icon: "clock", selected: true },
    { name: "Image", icon: "image", selected: false },
    { name: "Video", icon: "video", selected: false },
    { name: "Announcements", icon: "announcements", selected: false },
    { name: "Gallery", icon: "gallery", selected: false },
    { name: "Countdown", icon: "countdown", selected: false },
    { name: "QR Code", icon: "qr", selected: false },
];

function ComponentsPanel() {
    return (
        <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
            <div className="border-b border-border px-4 py-3">
                <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
                    Components
                </h2>
            </div>
            <div className="grid grid-cols-2 gap-2 overflow-y-auto p-3">
                {libraryItems.map((item) => (
                    <button
                        key={item.name}
                        type="button"
                        aria-current={item.selected ? "true" : undefined}
                        className={
                            item.selected
                                ? "flex flex-col items-center gap-2 rounded-md border border-cyan/70 bg-surface-raised px-2 py-3 text-center text-xs font-medium text-foreground"
                                : "flex flex-col items-center gap-2 rounded-md border border-border bg-surface-raised/40 px-2 py-3 text-center text-xs font-medium text-secondary transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover"
                        }
                    >
                        <span className={item.selected ? "text-cyan" : "text-muted"}>
                            <StudioIcon name={item.icon} />
                        </span>
                        {item.name}
                    </button>
                ))}
            </div>
        </aside>
    );
}

export default ComponentsPanel;
