import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import type { WidgetType } from "../../boards/types/boardTypes.ts";
import { dragStartDistance, screenRectForLayout } from "../../boards/boardCoordinates.ts";
import type { BoardPoint } from "../../boards/boardCoordinates.ts";
import { componentDropLayout, editorStageBox } from "../boardPlacement.ts";
import StudioIcon from "./StudioIcon.tsx";
import type { StudioIconName } from "./StudioIcon.tsx";

type ComponentsPanelProps = {
    boardWidth: number;
    boardHeight: number;
    onAddWidget: (type: WidgetType) => void;
    onDropWidget: (type: WidgetType, point: BoardPoint) => void;
};

type LibraryItem = {
    name: string;
    icon: StudioIconName;
    type: WidgetType | null;
};

type ComponentDrag = {
    type: WidgetType;
    name: string;
    icon: StudioIconName;
    pointerId: number;
    originX: number;
    originY: number;
    clientX: number;
    clientY: number;
    dragging: boolean;
};

const libraryItems: LibraryItem[] = [
    { name: "Text", icon: "text", type: "text" },
    { name: "Clock", icon: "clock", type: "clock" },
    { name: "Weather", icon: "weather", type: "weather" },
    { name: "News", icon: "news", type: "news" },
    { name: "Image", icon: "image", type: "image" },
    { name: "Information Card", icon: "information-card", type: "information-card" },
    { name: "Announcements", icon: "announcements", type: "announcements" },
    { name: "Vertical Announcements", icon: "vertical-announcements", type: "vertical-announcements" },
    { name: "Ticker", icon: "ticker", type: "ticker" },
    { name: "Video", icon: "video", type: null },
    { name: "Gallery", icon: "gallery", type: null },
    { name: "Countdown", icon: "countdown", type: "countdown" },
    { name: "QR Code", icon: "qr", type: "qr" },
];

function ComponentsPanel({
    boardWidth,
    boardHeight,
    onAddWidget,
    onDropWidget,
}: ComponentsPanelProps) {
    const [selectedType, setSelectedType] = useState<WidgetType | null>(null);
    const [drag, setDrag] = useState<ComponentDrag | null>(null);
    const dragRef = useRef<ComponentDrag | null>(null);

    useEffect(() => {
        if (drag?.dragging !== true) {
            return;
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key !== "Escape") {
                return;
            }

            event.preventDefault();
            dragRef.current = null;
            setDrag(null);
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [drag?.dragging]);

    function handleAddWidget() {
        if (selectedType === null) {
            return;
        }

        onAddWidget(selectedType);
    }

    function updateDrag(next: ComponentDrag | null) {
        dragRef.current = next;
        setDrag(next);
    }

    function handleItemPointerDown(event: ReactPointerEvent<HTMLButtonElement>, item: LibraryItem) {
        if (event.button !== 0 || item.type === null) {
            return;
        }

        updateDrag({
            type: item.type,
            name: item.name,
            icon: item.icon,
            pointerId: event.pointerId,
            originX: event.clientX,
            originY: event.clientY,
            clientX: event.clientX,
            clientY: event.clientY,
            dragging: false,
        });

        try {
            event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
            // Capture requires an active pointer. The click path still works.
        }
    }

    function handleItemPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
        const current = dragRef.current;

        if (current === null || current.pointerId !== event.pointerId) {
            return;
        }

        const distance = Math.hypot(event.clientX - current.originX, event.clientY - current.originY);
        const dragging = current.dragging || distance >= dragStartDistance;

        if (!dragging) {
            return;
        }

        event.preventDefault();
        updateDrag({
            ...current,
            clientX: event.clientX,
            clientY: event.clientY,
            dragging: true,
        });
    }

    function handleItemPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
        const current = dragRef.current;

        if (current === null || current.pointerId !== event.pointerId) {
            return;
        }

        updateDrag(null);

        if (!current.dragging) {
            return;
        }

        const drop = componentDropLayout(
            current.type,
            boardWidth,
            boardHeight,
            event.clientX,
            event.clientY,
            editorStageBox(),
        );

        if (drop === null) {
            return;
        }

        onDropWidget(current.type, drop.point);
    }

    function handleItemPointerCancel(event: ReactPointerEvent<HTMLButtonElement>) {
        if (dragRef.current?.pointerId !== event.pointerId) {
            return;
        }

        updateDrag(null);
    }

    const stage = drag?.dragging === true ? editorStageBox() : null;
    const drop = drag?.dragging === true
        ? componentDropLayout(drag.type, boardWidth, boardHeight, drag.clientX, drag.clientY, stage)
        : null;
    const indicator = drop !== null && stage !== null
        ? screenRectForLayout(stage, boardWidth, boardHeight, drop.layout)
        : null;

    return (
        <div className="flex min-h-0 flex-1 flex-col">
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
                            title={available ? "Drag onto the board, or select it and choose Add Widget" : "Not available yet"}
                            onClick={() => {
                                if (item.type !== null) {
                                    setSelectedType(item.type);
                                }
                            }}
                            onPointerDown={(event) => {
                                handleItemPointerDown(event, item);
                            }}
                            onPointerMove={handleItemPointerMove}
                            onPointerUp={handleItemPointerUp}
                            onPointerCancel={handleItemPointerCancel}
                            className={
                                !available
                                    ? "flex cursor-not-allowed flex-col items-center gap-1 rounded-md border border-border/70 bg-surface-raised/20 px-2 py-3 text-center text-xs font-medium text-muted opacity-60"
                                    : selected
                                        ? "flex cursor-grab touch-none flex-col items-center gap-2 rounded-md border border-cyan/70 bg-surface-raised px-2 py-3 text-center text-xs font-medium text-foreground active:cursor-grabbing"
                                        : "flex cursor-grab touch-none flex-col items-center gap-2 rounded-md border border-border bg-surface-raised/40 px-2 py-3 text-center text-xs font-medium text-secondary transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover active:cursor-grabbing"
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
            {drag?.dragging === true ? createPortal(
                <>
                    {indicator === null ? null : (
                        <div
                            className="pointer-events-none fixed z-[90] rounded-md border-2 border-dashed border-cyan bg-cyan/15"
                            style={{
                                left: indicator.left,
                                top: indicator.top,
                                width: indicator.width,
                                height: indicator.height,
                            }}
                        />
                    )}
                    <div
                        className="pointer-events-none fixed z-[90] flex items-center gap-2 rounded-md border border-cyan/70 bg-surface-raised/90 px-3 py-2 text-xs font-medium text-foreground shadow-panel"
                        style={{
                            left: drag.clientX + 16,
                            top: drag.clientY + 16,
                        }}
                    >
                        <span className="text-cyan">
                            <StudioIcon name={drag.icon} />
                        </span>
                        {drag.name}
                    </div>
                </>,
                document.body,
            ) : null}
        </div>
    );
}

export default ComponentsPanel;
