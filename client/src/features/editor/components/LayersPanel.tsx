import {
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
    type KeyboardEvent as ReactKeyboardEvent,
    type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import type { Widget } from "../../boards/types/boardTypes.ts";
import {
    isWidgetLocked,
    isWidgetVisible,
    layerNameIsValid,
    maxLayerNameLength,
    normalizedLayerName,
    type WidgetLayerChange,
} from "../widgetLayer.ts";
import { widgetLayerIndex, type LayerDropPlacement, type LayerMove } from "../widgetOrder.ts";
import StudioIcon from "./StudioIcon.tsx";
import type { StudioIconName } from "./StudioIcon.tsx";

type LayersPanelProps = {
    widgets: Widget[];
    selectedWidgetId: string | null;
    revealedWidgetId: string | null;
    onSelectWidget: (widgetId: string) => void;
    onMoveWidget: (widgetId: string, move: LayerMove) => void;
    onReorderWidget: (widgetId: string, targetId: string, placement: LayerDropPlacement) => void;
    onLayerChange: (widgetId: string, change: WidgetLayerChange) => void;
};

type DropIndicator = {
    widgetId: string;
    placement: LayerDropPlacement;
};

type LayerDrag = {
    pointerId: number;
    widgetId: string;
    originY: number;
    dragging: boolean;
};

type LayerAction = {
    move: LayerMove;
    label: string;
    icon: StudioIconName;
    disabled: boolean;
    reason: string;
};

const typeLabels: Record<Widget["type"], string> = {
    text: "Text",
    clock: "Clock",
    image: "Image",
    "information-card": "Information Card",
    announcements: "Announcements",
    ticker: "Ticker",
    "vertical-announcements": "Vertical Announcements",
    weather: "Weather",
};

const typeIcons: Record<Widget["type"], StudioIconName> = {
    text: "text",
    clock: "clock",
    image: "image",
    "information-card": "information-card",
    announcements: "announcements",
    ticker: "ticker",
    "vertical-announcements": "vertical-announcements",
    weather: "weather",
};

const layerMenuWidth = 168;
const layerMenuHeight = 168;
const menuItemClassName = "flex h-8 w-full items-center gap-1.5 px-2 text-left text-[13px] font-medium leading-5 text-secondary outline-none hover:bg-surface-hover hover:text-foreground focus-visible:bg-surface-hover focus-visible:text-foreground";
const menuItemDisabledClassName = "flex h-8 w-full cursor-not-allowed items-center gap-1.5 px-2 text-left text-[13px] font-medium leading-5 text-muted opacity-60";
const iconButtonClassName = "inline-flex size-6 shrink-0 items-center justify-center rounded-control text-secondary outline-none transition-colors duration-150 hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent/40";
const layerLabelClassName = "min-w-0 flex-1 truncate text-[13px] font-medium leading-5";

function LayersPanel({
    widgets,
    selectedWidgetId,
    revealedWidgetId,
    onSelectWidget,
    onMoveWidget,
    onReorderWidget,
    onLayerChange,
}: LayersPanelProps) {
    const listRef = useRef<HTMLUListElement>(null);
    const dragRef = useRef<LayerDrag | null>(null);
    const indicatorRef = useRef<DropIndicator | null>(null);
    const [menuWidgetId, setMenuWidgetId] = useState<string | null>(null);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [indicator, setIndicator] = useState<DropIndicator | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const layers = [...widgets].reverse();

    useLayoutEffect(() => {
        if (revealedWidgetId === null) {
            return;
        }

        const row = listRef.current?.querySelector<HTMLElement>(`[data-layer-id="${CSS.escape(revealedWidgetId)}"]`);
        row?.scrollIntoView({ block: "nearest" });
    }, [revealedWidgetId, widgets]);

    function updateIndicator(next: DropIndicator | null) {
        const current = indicatorRef.current;

        if (current?.widgetId === next?.widgetId && current?.placement === next?.placement) {
            return;
        }

        indicatorRef.current = next;
        setIndicator(next);
    }

    function handleGripPointerDown(event: ReactPointerEvent<HTMLButtonElement>, widgetId: string) {
        if (event.button !== 0) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        onSelectWidget(widgetId);
        setMenuWidgetId(null);
        dragRef.current = {
            pointerId: event.pointerId,
            widgetId,
            originY: event.clientY,
            dragging: false,
        };

        try {
            event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
            // Capture requires an active pointer. The drop still commits on pointerup.
        }
    }

    function handleGripPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
        const drag = dragRef.current;

        if (drag === null || drag.pointerId !== event.pointerId) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (!drag.dragging) {
            if (Math.abs(event.clientY - drag.originY) < 3) {
                return;
            }

            drag.dragging = true;
            setDraggingId(drag.widgetId);
        }

        updateIndicator(dropIndicatorAt(listRef.current, event.clientY));
    }

    function handleGripPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
        const drag = dragRef.current;
        const drop = indicatorRef.current;
        dragRef.current = null;
        updateIndicator(null);
        setDraggingId(null);

        if (drag === null || drag.pointerId !== event.pointerId) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (!drag.dragging || drop === null) {
            return;
        }

        onReorderWidget(drag.widgetId, drop.widgetId, drop.placement);
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {widgets.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted">
                    No widgets on this board.
                </p>
            ) : (
                <ul ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-1" aria-label="Layers">
                    {layers.map((widget) => (
                        <LayerRow
                            key={widget.id}
                            widget={widget}
                            widgets={widgets}
                            selected={widget.id === selectedWidgetId}
                            revealed={widget.id === revealedWidgetId}
                            hidden={!isWidgetVisible(widget)}
                            locked={isWidgetLocked(widget)}
                            renaming={widget.id === renamingId}
                            menuOpen={widget.id === menuWidgetId}
                            dragging={widget.id === draggingId}
                            indicator={indicator?.widgetId === widget.id ? indicator.placement : null}
                            onSelectWidget={onSelectWidget}
                            onMoveWidget={onMoveWidget}
                            onLayerChange={onLayerChange}
                            onGripPointerDown={handleGripPointerDown}
                            onGripPointerMove={handleGripPointerMove}
                            onGripPointerUp={handleGripPointerUp}
                            onOpenMenu={() => {
                                setRenamingId(null);
                                setMenuWidgetId(widget.id);
                                onSelectWidget(widget.id);
                            }}
                            onCloseMenu={() => {
                                setMenuWidgetId((currentId) => currentId === widget.id ? null : currentId);
                            }}
                            onBeginRename={() => {
                                setMenuWidgetId(null);
                                setRenamingId(widget.id);
                                onSelectWidget(widget.id);
                            }}
                            onEndRename={() => {
                                setRenamingId((currentId) => currentId === widget.id ? null : currentId);
                            }}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}

type LayerRowProps = {
    widget: Widget;
    widgets: readonly Widget[];
    selected: boolean;
    revealed: boolean;
    hidden: boolean;
    locked: boolean;
    renaming: boolean;
    menuOpen: boolean;
    dragging: boolean;
    indicator: LayerDropPlacement | null;
    onSelectWidget: (widgetId: string) => void;
    onMoveWidget: (widgetId: string, move: LayerMove) => void;
    onLayerChange: (widgetId: string, change: WidgetLayerChange) => void;
    onGripPointerDown: (event: ReactPointerEvent<HTMLButtonElement>, widgetId: string) => void;
    onGripPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
    onGripPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
    onOpenMenu: () => void;
    onCloseMenu: () => void;
    onBeginRename: () => void;
    onEndRename: () => void;
};

function LayerRow({
    widget,
    widgets,
    selected,
    revealed,
    hidden,
    locked,
    renaming,
    menuOpen,
    dragging,
    indicator,
    onSelectWidget,
    onMoveWidget,
    onLayerChange,
    onGripPointerDown,
    onGripPointerMove,
    onGripPointerUp,
    onOpenMenu,
    onCloseMenu,
    onBeginRename,
    onEndRename,
}: LayerRowProps) {
    const label = layerLabel(widget, widgets);
    const fallbackLabel = defaultLayerLabel(widget, widgets);
    const rowClassName = [
        "relative flex h-10 items-center gap-px rounded-control px-0.5",
        selected ? "bg-accent/15" : "hover:bg-surface-hover",
        revealed ? "ring-2 ring-cyan/60" : "",
        dragging ? "opacity-60" : "",
    ].filter((name) => name.length > 0).join(" ");

    return (
        <li data-layer-id={widget.id} className="relative" onPointerDown={(event) => event.stopPropagation()}>
            {indicator === "before" ? <span className="pointer-events-none absolute inset-x-2 top-0 z-10 h-0.5 rounded-full bg-cyan" /> : null}
            <div className={rowClassName}>
                <button
                    type="button"
                    aria-label={`Drag to reorder ${label}`}
                    title="Drag to reorder"
                    onPointerDown={(event) => {
                        onGripPointerDown(event, widget.id);
                    }}
                    onPointerMove={onGripPointerMove}
                    onPointerUp={onGripPointerUp}
                    onPointerCancel={onGripPointerUp}
                    className={`${iconButtonClassName} cursor-grab touch-none active:cursor-grabbing`}
                >
                    <StudioIcon name="grip" className="size-4" />
                </button>
                <span className={hidden ? "text-muted" : selected ? "text-cyan" : "text-secondary"} aria-hidden="true">
                    <StudioIcon name={typeIcons[widget.type]} className="size-4" />
                </span>
                {renaming ? (
                    <LayerNameField
                        label={fallbackLabel}
                        value={widget.layerName ?? ""}
                        onCommit={(name) => {
                            onLayerChange(widget.id, { layerName: name });
                            onEndRename();
                        }}
                        onCancel={onEndRename}
                    />
                ) : (
                    <button
                        type="button"
                        aria-current={selected ? "true" : undefined}
                        title={label}
                        onClick={() => {
                            onSelectWidget(widget.id);
                        }}
                        onDoubleClick={() => {
                            onBeginRename();
                        }}
                        className="flex h-7 min-w-0 flex-1 items-center rounded-control px-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                        <span dir="auto" className={hidden ? `${layerLabelClassName} text-muted` : `${layerLabelClassName} text-foreground`}>
                            {label}
                        </span>
                    </button>
                )}
                <button
                    type="button"
                    aria-label={hidden ? `Show ${label}` : `Hide ${label}`}
                    aria-pressed={hidden ? "false" : "true"}
                    title={hidden ? "Show layer" : "Hide layer"}
                    onClick={() => {
                        onLayerChange(widget.id, { visible: hidden });
                    }}
                    className={iconButtonClassName}
                >
                    <StudioIcon name={hidden ? "eye-off" : "eye"} className="size-3.5" />
                </button>
                <button
                    type="button"
                    aria-label={locked ? `Unlock ${label}` : `Lock ${label}`}
                    aria-pressed={locked ? "true" : "false"}
                    title={locked ? "Unlock layer" : "Lock layer"}
                    onClick={() => {
                        onLayerChange(widget.id, { locked: !locked });
                    }}
                    className={locked ? `${iconButtonClassName} text-cyan` : iconButtonClassName}
                >
                    <StudioIcon name={locked ? "lock" : "unlock"} className="size-3.5" />
                </button>
                <LayerActionsMenu
                    label={label}
                    widget={widget}
                    widgets={widgets}
                    open={menuOpen}
                    onOpen={onOpenMenu}
                    onClose={onCloseMenu}
                    onRename={onBeginRename}
                    onMove={(move) => {
                        onMoveWidget(widget.id, move);
                        onCloseMenu();
                    }}
                />
            </div>
            {indicator === "after" ? <span className="pointer-events-none absolute inset-x-2 bottom-0 z-10 h-0.5 rounded-full bg-cyan" /> : null}
        </li>
    );
}

type LayerNameFieldProps = {
    label: string;
    value: string;
    onCommit: (name: string | null) => void;
    onCancel: () => void;
};

function LayerNameField({ label, value, onCommit, onCancel }: LayerNameFieldProps) {
    const [draft, setDraft] = useState(value);
    const [invalid, setInvalid] = useState(false);
    const cancelRef = useRef(false);
    const valid = layerNameIsValid(draft);

    function commit(nextValue: string) {
        if (!layerNameIsValid(nextValue)) {
            setInvalid(true);
            return;
        }

        onCommit(normalizedLayerName(nextValue));
    }

    return (
        <input
            aria-label={`Layer name for ${label}`}
            aria-invalid={invalid || !valid}
            title={valid ? label : `Use at most ${maxLayerNameLength} characters.`}
            maxLength={maxLayerNameLength}
            value={draft}
            placeholder={label}
            autoFocus
            onChange={(event) => {
                setDraft(event.target.value);
                setInvalid(false);
            }}
            onKeyDown={(event) => {
                event.stopPropagation();

                if (event.key === "Enter") {
                    event.preventDefault();
                    commit(draft);
                }

                if (event.key === "Escape") {
                    event.preventDefault();
                    cancelRef.current = true;
                    onCancel();
                }
            }}
            onBlur={() => {
                if (cancelRef.current) {
                    cancelRef.current = false;
                    return;
                }

                commit(draft);
            }}
            dir="auto"
            className="h-7 min-w-0 flex-1 rounded-control border border-border bg-surface-raised px-1.5 text-[13px] leading-5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        />
    );
}

type LayerActionsMenuProps = {
    label: string;
    widget: Widget;
    widgets: readonly Widget[];
    open: boolean;
    onOpen: () => void;
    onClose: () => void;
    onRename: () => void;
    onMove: (move: LayerMove) => void;
};

function LayerActionsMenu({
    label,
    widget,
    widgets,
    open,
    onOpen,
    onClose,
    onRename,
    onMove,
}: LayerActionsMenuProps) {
    const menuId = useId();
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [placement, setPlacement] = useState<{ top: number; left: number } | null>(null);
    const index = widgetLayerIndex(widgets, widget.id);
    const front = widgets.length - 1;
    const actions = layerActions(index >= 0, index === front, index === 0);

    useLayoutEffect(() => {
        if (!open) {
            return;
        }

        function updatePlacement() {
            const trigger = triggerRef.current;

            if (trigger === null) {
                return;
            }

            setPlacement(placeLayerMenu(trigger, menuRef.current));
        }

        updatePlacement();
        window.addEventListener("resize", updatePlacement);
        window.addEventListener("scroll", updatePlacement, true);

        return () => {
            window.removeEventListener("resize", updatePlacement);
            window.removeEventListener("scroll", updatePlacement, true);
        };
    }, [open]);

    useLayoutEffect(() => {
        if (!open || placement === null) {
            return;
        }

        const trigger = triggerRef.current;
        const menu = menuRef.current;

        if (trigger === null || menu === null) {
            return;
        }

        const next = placeLayerMenu(trigger, menu);

        if (next.top === placement.top && next.left === placement.left) {
            return;
        }

        setPlacement(next);
    }, [open, placement]);

    useLayoutEffect(() => {
        if (!open) {
            return;
        }

        menuRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();
    }, [open]);

    useEffect(() => {
        if (!open) {
            return;
        }

        function handlePointerDown(event: PointerEvent) {
            const target = event.target;

            if (!(target instanceof Node)) {
                return;
            }

            if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) {
                return;
            }

            onClose();
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                event.preventDefault();
                onClose();
                triggerRef.current?.focus();
            }
        }

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, onClose]);

    function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
            return;
        }

        event.preventDefault();
        const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? [])];
        const current = items.indexOf(document.activeElement as HTMLButtonElement);
        const direction = event.key === "ArrowDown" ? 1 : -1;
        const next = items[(current + direction + items.length) % items.length];
        next?.focus();
    }

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                aria-label={`Layer actions for ${label}`}
                aria-expanded={open}
                aria-controls={menuId}
                title="Layer actions"
                onClick={open ? onClose : onOpen}
                className={iconButtonClassName}
            >
                <StudioIcon name="more" className="size-3.5" />
            </button>
            {open && placement !== null ? createPortal(
                <div
                    ref={menuRef}
                    id={menuId}
                    role="region"
                    aria-label={`Layer actions for ${label}`}
                    onKeyDown={handleMenuKeyDown}
                    style={{ top: placement.top, left: placement.left }}
                    className="fixed z-[60] w-[168px] overflow-hidden rounded-control border border-border bg-surface py-0.5 shadow-panel"
                >
                    <button
                        type="button"
                        onClick={onRename}
                        className={menuItemClassName}
                    >
                        Rename
                    </button>
                    {actions.map((action) => (
                        <button
                            key={action.move}
                            type="button"
                            disabled={action.disabled}
                            title={action.reason}
                            onClick={() => {
                                onMove(action.move);
                            }}
                            className={action.disabled ? menuItemDisabledClassName : menuItemClassName}
                        >
                            <StudioIcon name={action.icon} className="size-3.5" />
                            <span>{action.label}</span>
                        </button>
                    ))}
                </div>,
                document.body,
            ) : null}
        </>
    );
}

function placeLayerMenu(trigger: HTMLElement, menu: HTMLDivElement | null): { top: number; left: number } {
    const rect = trigger.getBoundingClientRect();
    const sidebar = trigger.closest("aside");
    const boundaryRight = sidebar?.getBoundingClientRect().right ?? rect.right;
    const margin = 8;
    const gap = 4;
    const width = menu?.offsetWidth || layerMenuWidth;
    const height = menu?.offsetHeight || layerMenuHeight;
    let left = boundaryRight + gap;
    let top = rect.top;

    if (left + width > window.innerWidth - margin) {
        left = Math.max(margin, boundaryRight - width);
    }

    if (top + height > window.innerHeight - margin) {
        top = window.innerHeight - margin - height;
    }

    if (top < margin) {
        top = margin;
    }

    return { top, left };
}

function dropIndicatorAt(list: HTMLUListElement | null, clientY: number): DropIndicator | null {
    if (list === null) {
        return null;
    }

    const rows = [...list.querySelectorAll<HTMLElement>("[data-layer-id]")];

    for (const row of rows) {
        const widgetId = row.dataset.layerId;

        if (widgetId === undefined) {
            continue;
        }

        const rect = row.getBoundingClientRect();

        if (clientY < rect.top + (rect.height / 2)) {
            return { widgetId, placement: "before" };
        }
    }

    const lastRow = rows[rows.length - 1];
    const lastId = lastRow?.dataset.layerId;

    if (lastId === undefined) {
        return null;
    }

    return { widgetId: lastId, placement: "after" };
}

function layerActions(hasSelection: boolean, atFront: boolean, atBack: boolean): LayerAction[] {
    return [
        {
            move: "front",
            label: "Bring to front",
            icon: "bring-front",
            disabled: !hasSelection || atFront,
            reason: disabledReason(hasSelection, atFront, "Already at the front", "Bring to front"),
        },
        {
            move: "forward",
            label: "Move forward",
            icon: "move-forward",
            disabled: !hasSelection || atFront,
            reason: disabledReason(hasSelection, atFront, "Already at the front", "Move forward"),
        },
        {
            move: "backward",
            label: "Move backward",
            icon: "move-backward",
            disabled: !hasSelection || atBack,
            reason: disabledReason(hasSelection, atBack, "Already at the back", "Move backward"),
        },
        {
            move: "back",
            label: "Send to back",
            icon: "send-back",
            disabled: !hasSelection || atBack,
            reason: disabledReason(hasSelection, atBack, "Already at the back", "Send to back"),
        },
    ];
}

function disabledReason(
    hasSelection: boolean,
    atBoundary: boolean,
    boundaryReason: string,
    label: string,
): string {
    if (!hasSelection) {
        return "Select a layer first";
    }

    if (atBoundary) {
        return boundaryReason;
    }

    return label;
}

function layerLabel(widget: Widget, widgets: readonly Widget[]): string {
    const customName = widget.layerName?.trim() ?? "";

    if (customName !== "") {
        return customName;
    }

    return defaultLayerLabel(widget, widgets);
}

function defaultLayerLabel(widget: Widget, widgets: readonly Widget[]): string {
    const content = widgetContentLabel(widget);

    if (content !== null) {
        return content;
    }

    const number = widgets.filter((item) => item.type === widget.type)
        .findIndex((item) => item.id === widget.id) + 1;

    return `${typeLabels[widget.type]} ${number}`;
}

function widgetContentLabel(widget: Widget): string | null {
    switch (widget.type) {
        case "text":
            return nonempty(widget.settings.text);
        case "clock":
            return nonempty(widget.settings.timeZone);
        case "image":
            return nonempty(widget.settings.alt) ?? imageFileLabel(widget.settings.src);
        case "information-card":
            return nonempty(widget.settings.title);
        case "announcements":
            return nonempty(widget.settings.title);
        case "ticker": {
            const message = widget.settings.messages.find((item) => item.text.trim().length > 0);

            return message === undefined ? null : message.text.trim();
        }
        case "weather":
            return nonempty(widget.settings.title ?? "") ?? nonempty(widget.settings.location.label);
        case "vertical-announcements": {
            const item = widget.settings.items.find((entry) => {
                return entry.title.trim().length > 0
                    || (entry.label ?? "").trim().length > 0
                    || (entry.description ?? "").trim().length > 0;
            });

            if (item === undefined) {
                return null;
            }

            const title = item.title.trim();
            const label = (item.label ?? "").trim();
            const description = (item.description ?? "").trim();

            return title || label || description || null;
        }
    }
}

function imageFileLabel(source: string): string | null {
    const trimmed = source.trim();

    if (trimmed === "") {
        return null;
    }

    const path = trimmed.split("?")[0] ?? trimmed;
    const name = path.split("/").pop()?.trim() ?? "";

    return name === "" ? null : name;
}

function nonempty(value: string): string | null {
    const trimmed = value.trim();

    return trimmed === "" ? null : trimmed;
}

export default LayersPanel;
