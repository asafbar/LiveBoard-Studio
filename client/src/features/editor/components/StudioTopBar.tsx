import {
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
    type KeyboardEvent as ReactKeyboardEvent,
    type ReactNode,
    type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import StudioIcon, { type StudioIconName } from "./StudioIcon.tsx";

export type DraftSaveStatus = "saved" | "unsaved" | "saving" | "failed";

type StudioTopBarProps = {
    boardName: string;
    saveStatus: DraftSaveStatus | null;
    saveError: string | null;
    saveDisabled: boolean;
    previewDisabled: boolean;
    publishDisabled: boolean;
    publishGuidance: string | null;
    displayPath: string | null;
    revertDisabled: boolean;
    onSave: () => void;
    onPreview: () => void;
    onPublish: () => void;
    onRevert: () => void;
};

type HeaderAction = {
    key: string;
    label: string;
    icon: StudioIconName;
    disabled?: boolean;
    to?: string;
    href?: string;
    onSelect?: () => void;
    hint?: string;
};

type HeaderMenuProps = {
    label: string;
    accessibleName: string;
    panelLabel: string;
    icon: StudioIconName;
    actions: HeaderAction[];
    open: boolean;
    align: "start" | "end";
    labelClassName?: string;
    onOpenChange: (open: boolean) => void;
};

type MenuPlacement = {
    top: number;
    left: number;
};

const saveStatusLabel: Record<DraftSaveStatus, string> = {
    saved: "Saved",
    unsaved: "Unsaved changes",
    saving: "Saving...",
    failed: "Save failed",
};

const saveStatusClassName: Record<DraftSaveStatus, string> = {
    saved: "text-secondary",
    unsaved: "text-foreground",
    saving: "text-secondary",
    failed: "text-danger",
};

const saveStatusDotClassName: Record<DraftSaveStatus, string> = {
    saved: "bg-cyan",
    unsaved: "bg-foreground",
    saving: "bg-secondary",
    failed: "bg-danger",
};

const quietButtonClassName = "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control border border-border bg-surface-raised px-2.5 text-sm font-medium text-secondary outline-none transition-colors duration-150 hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent/40 lg:gap-2 lg:px-3";
const quietDisabledClassName = "inline-flex h-9 shrink-0 cursor-not-allowed items-center gap-1.5 rounded-control border border-border bg-surface-raised/40 px-2.5 text-sm font-medium text-muted opacity-60 lg:gap-2 lg:px-3";
const accentButtonClassName = "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control bg-accent px-2.5 text-sm font-medium text-white outline-none transition-colors duration-150 hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent/40 lg:gap-2 lg:px-3";
const accentDisabledClassName = "inline-flex h-9 shrink-0 cursor-not-allowed items-center gap-1.5 rounded-control bg-accent/40 px-2.5 text-sm font-medium text-white opacity-60 lg:gap-2 lg:px-3";
const menuItemClassName = "flex h-10 w-full items-center gap-2 px-3 text-left text-sm font-medium text-secondary outline-none hover:bg-surface-hover hover:text-foreground focus-visible:bg-surface-hover focus-visible:text-foreground";
const menuItemDisabledClassName = "flex h-10 w-full cursor-not-allowed items-center gap-2 px-3 text-left text-sm font-medium text-muted opacity-60";

const MENU_GAP = 6;
const VIEWPORT_MARGIN = 8;

function StudioTopBar({
    boardName,
    saveStatus,
    saveError,
    saveDisabled,
    previewDisabled,
    publishDisabled,
    publishGuidance,
    displayPath,
    revertDisabled,
    onSave,
    onPreview,
    onPublish,
    onRevert,
}: StudioTopBarProps) {
    const navigate = useNavigate();
    const [openPanel, setOpenPanel] = useState<"navigation" | "actions" | null>(null);
    const statusLabel = saveStatus === null ? null : saveStatusLabel[saveStatus];
    const statusDescription = saveStatus === "failed" && saveError !== null
        ? `Save failed. ${saveError}`
        : undefined;
    const saveNeedsAttention = saveStatus === "unsaved" || saveStatus === "saving" || saveStatus === "failed";

    function handleLogout() {
        navigate("/login", { state: { logout: true } });
    }

    const navigationActions: HeaderAction[] = [
        { key: "boards", label: "Boards", icon: "boards", to: "/boards" },
        { key: "displays", label: "Displays", icon: "displays", to: "/displays" },
        { key: "media", label: "Media Library", icon: "image", to: "/media" },
        { key: "logout", label: "Logout", icon: "logout", onSelect: handleLogout },
    ];

    const moreActions: HeaderAction[] = [
        {
            key: "revert",
            label: "Revert to Saved",
            icon: "revert",
            disabled: revertDisabled,
            onSelect: onRevert,
        },
        ...(!saveNeedsAttention
            ? [{
                key: "save",
                label: "Save Draft",
                icon: "save" as const,
                disabled: saveDisabled,
                onSelect: onSave,
            }]
            : []),
        displayPath === null
            ? {
                key: "display",
                label: "Open Display",
                icon: "open-display" as const,
                disabled: true,
            }
            : {
                key: "display",
                label: "Open Display",
                icon: "open-display" as const,
                href: displayPath,
                hint: "opens in a new tab",
            },
    ];

    return (
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface px-3 lg:gap-4 lg:px-4">
            <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-linear-to-br from-accent to-cyan text-[11px] font-semibold tracking-wide text-background">
                    LB
                </span>
                <h1
                    className="min-w-0 shrink truncate text-sm font-semibold text-foreground"
                    title={boardName}
                >
                    {boardName}
                </h1>
                <HeaderMenu
                    label="Menu"
                    accessibleName="Studio navigation"
                    panelLabel="Studio navigation"
                    icon="menu"
                    actions={navigationActions}
                    open={openPanel === "navigation"}
                    align="start"
                    onOpenChange={(open) => {
                        setOpenPanel(open ? "navigation" : null);
                    }}
                />
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
                {statusLabel !== null && saveStatus !== null ? (
                    <SaveStatus
                        label={statusLabel}
                        description={statusDescription}
                        className={saveStatusClassName[saveStatus]}
                        dotClassName={saveStatusDotClassName[saveStatus]}
                    />
                ) : null}
                {saveNeedsAttention ? (
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={saveDisabled}
                        className={saveDisabled ? accentDisabledClassName : accentButtonClassName}
                    >
                        Save Draft
                    </button>
                ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1.5 lg:gap-2">
                <button
                    type="button"
                    onClick={onPreview}
                    disabled={previewDisabled}
                    className={previewDisabled ? quietDisabledClassName : quietButtonClassName}
                >
                    <StudioIcon name="preview" className="size-4" />
                    Preview
                </button>
                <span title={publishGuidance ?? undefined} className="inline-flex">
                    <button
                        type="button"
                        onClick={onPublish}
                        disabled={publishDisabled}
                        aria-describedby={publishGuidance !== null ? "publish-guidance" : undefined}
                        className={publishDisabled ? accentDisabledClassName : accentButtonClassName}
                    >
                        <StudioIcon name="publish" className="size-4" />
                        Publish
                    </button>
                    {publishGuidance !== null ? (
                        <span id="publish-guidance" className="sr-only">
                            {publishGuidance}
                        </span>
                    ) : null}
                </span>
                <HeaderMenu
                    label="More"
                    accessibleName="More actions"
                    panelLabel="More actions"
                    icon="more"
                    labelClassName="hidden lg:inline"
                    actions={moreActions}
                    open={openPanel === "actions"}
                    align="end"
                    onOpenChange={(open) => {
                        setOpenPanel(open ? "actions" : null);
                    }}
                />
            </div>
        </header>
    );
}

type SaveStatusProps = {
    label: string;
    description: string | undefined;
    className: string;
    dotClassName: string;
};

function SaveStatus({ label, description, className, dotClassName }: SaveStatusProps) {
    return (
        <p
            role="status"
            aria-live="polite"
            aria-label={description}
            title={description}
            className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-xs font-medium ${className}`}
        >
            <span className={`size-1.5 rounded-full ${dotClassName}`} aria-hidden="true" />
            {label}
        </p>
    );
}

function HeaderMenu({
    label,
    accessibleName,
    panelLabel,
    icon,
    actions,
    open,
    align,
    labelClassName,
    onOpenChange,
}: HeaderMenuProps) {
    const menuId = useId();
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Array<HTMLElement | null>>([]);
    const [placement, setPlacement] = useState<MenuPlacement | null>(null);

    useLayoutEffect(() => {
        if (!open) {
            return;
        }

        function updatePlacement() {
            const trigger = triggerRef.current;

            if (trigger === null) {
                return;
            }

            if (!isTriggerVisible(trigger)) {
                onOpenChange(false);
                return;
            }

            setPlacement(measureMenu(trigger, panelRef.current, align));
        }

        updatePlacement();
        const observer = new ResizeObserver(updatePlacement);
        observer.observe(document.documentElement);
        window.addEventListener("resize", updatePlacement);
        window.addEventListener("scroll", updatePlacement, true);

        return () => {
            observer.disconnect();
            window.removeEventListener("resize", updatePlacement);
            window.removeEventListener("scroll", updatePlacement, true);
        };
    }, [align, open, onOpenChange]);

    useEffect(() => {
        if (!open) {
            return;
        }

        function handlePointerDown(event: PointerEvent) {
            const target = event.target;

            if (!(target instanceof Node)) {
                return;
            }

            if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
                return;
            }

            onOpenChange(false);
        }

        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, [open, onOpenChange]);

    function closeToTrigger() {
        onOpenChange(false);
        triggerRef.current?.focus();
    }

    function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
        if (event.key === "ArrowDown") {
            event.preventDefault();

            if (open) {
                focusableItems(itemRefs.current)[0]?.focus();
                return;
            }

            onOpenChange(true);
            return;
        }

        if (event.key === "Escape" && open) {
            event.preventDefault();
            event.stopPropagation();
            closeToTrigger();
        }
    }

    function handlePanelKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
        const items = focusableItems(itemRefs.current);

        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const current = items.indexOf(document.activeElement as HTMLElement);
            const delta = event.key === "ArrowDown" ? 1 : -1;
            const next = current === -1
                ? 0
                : (current + delta + items.length) % items.length;
            items[next]?.focus();
            return;
        }

        if (event.key === "Home") {
            event.preventDefault();
            items[0]?.focus();
            return;
        }

        if (event.key === "End") {
            event.preventDefault();
            items[items.length - 1]?.focus();
            return;
        }

        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            closeToTrigger();
            return;
        }

        if (event.key !== "Tab" || items.length === 0) {
            return;
        }

        const first = items[0];
        const last = items[items.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            closeToTrigger();
            return;
        }

        if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            onOpenChange(false);
            focusAfter(triggerRef.current);
        }
    }

    const panel = open && placement !== null
        ? createPortal(
            <HeaderMenuPanel
                panelRef={panelRef}
                menuId={menuId}
                panelLabel={panelLabel}
                onKeyDown={handlePanelKeyDown}
                placement={placement}
            >
                {actions.map((action, index) => (
                    <HeaderMenuItem
                        key={action.key}
                        action={action}
                        itemRef={(node) => {
                            itemRefs.current[index] = node;
                        }}
                        onActivate={() => {
                            onOpenChange(false);
                        }}
                    />
                ))}
            </HeaderMenuPanel>,
            document.body,
        )
        : null;

    return (
        <div className="shrink-0">
            <button
                ref={triggerRef}
                type="button"
                aria-label={accessibleName}
                aria-expanded={open}
                aria-controls={menuId}
                aria-haspopup="true"
                onClick={() => {
                    onOpenChange(!open);
                }}
                onKeyDown={handleTriggerKeyDown}
                className={quietButtonClassName}
            >
                <StudioIcon name={icon} className="size-4" />
                <span className={labelClassName}>{label}</span>
            </button>
            {panel}
        </div>
    );
}

type HeaderMenuPanelProps = {
    panelRef: RefObject<HTMLDivElement | null>;
    menuId: string;
    panelLabel: string;
    placement: MenuPlacement;
    onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
    children: ReactNode;
};

function HeaderMenuPanel({
    panelRef,
    menuId,
    panelLabel,
    placement,
    onKeyDown,
    children,
}: HeaderMenuPanelProps) {
    useLayoutEffect(() => {
        const panel = panelRef.current;

        if (panel === null) {
            return;
        }

        const first = panel.querySelector<HTMLElement>("a[href], button:not([disabled])");
        first?.focus();
    }, [panelRef]);

    return (
        <div
            ref={panelRef}
            id={menuId}
            role="region"
            aria-label={panelLabel}
            onKeyDown={onKeyDown}
            style={{ top: placement.top, left: placement.left }}
            className="fixed z-[60] w-56 overflow-hidden rounded-control border border-border bg-surface py-1 shadow-panel"
        >
            {children}
        </div>
    );
}

type HeaderMenuItemProps = {
    action: HeaderAction;
    itemRef: (node: HTMLElement | null) => void;
    onActivate: () => void;
};

function HeaderMenuItem({ action, itemRef, onActivate }: HeaderMenuItemProps) {
    const content = (
        <>
            <StudioIcon name={action.icon} className="size-4" />
            <span>{action.label}</span>
            {action.hint !== undefined ? <span className="sr-only"> ({action.hint})</span> : null}
        </>
    );

    if (action.disabled === true || (action.to === undefined && action.href === undefined && action.onSelect === undefined)) {
        return (
            <button type="button" disabled ref={itemRef} className={menuItemDisabledClassName}>
                {content}
            </button>
        );
    }

    if (action.to !== undefined) {
        return (
            <Link
                ref={itemRef}
                to={action.to}
                onClick={onActivate}
                className={menuItemClassName}
            >
                {content}
            </Link>
        );
    }

    if (action.href !== undefined) {
        return (
            <a
                ref={itemRef}
                href={action.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onActivate}
                className={menuItemClassName}
            >
                {content}
            </a>
        );
    }

    return (
        <button
            type="button"
            ref={itemRef}
            onClick={() => {
                onActivate();
                action.onSelect?.();
            }}
            className={menuItemClassName}
        >
            {content}
        </button>
    );
}

function focusableItems(items: Array<HTMLElement | null>): HTMLElement[] {
    return items.filter((item): item is HTMLElement => item !== null && !item.hasAttribute("disabled"));
}

function focusAfter(trigger: HTMLElement | null) {
    if (trigger === null) {
        return;
    }

    const focusable = [...document.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
    )].filter((element) => element.tabIndex !== -1 && !element.closest("[inert]"));
    const index = focusable.indexOf(trigger);
    focusable[index + 1]?.focus();
}

function isTriggerVisible(trigger: HTMLElement): boolean {
    const rect = trigger.getBoundingClientRect();

    return rect.bottom > 0
        && rect.top < window.innerHeight
        && rect.right > 0
        && rect.left < window.innerWidth;
}

function measureMenu(trigger: HTMLElement, menu: HTMLElement | null, align: "start" | "end"): MenuPlacement {
    const rect = trigger.getBoundingClientRect();
    const width = menu === null || menu.offsetWidth === 0 ? 224 : menu.offsetWidth;
    const height = menu === null || menu.offsetHeight === 0 ? 168 : menu.offsetHeight;
    const belowTop = rect.bottom + MENU_GAP;
    const aboveTop = rect.top - MENU_GAP - height;
    const belowFits = belowTop + height <= window.innerHeight - VIEWPORT_MARGIN;
    const aboveFits = aboveTop >= VIEWPORT_MARGIN;
    const preferredTop = belowFits || !aboveFits ? belowTop : aboveTop;
    const maxTop = Math.max(VIEWPORT_MARGIN, window.innerHeight - height - VIEWPORT_MARGIN);
    const top = Math.min(Math.max(VIEWPORT_MARGIN, preferredTop), maxTop);
    const preferredLeft = align === "end" ? rect.right - width : rect.left;
    const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN);
    const left = Math.min(Math.max(VIEWPORT_MARGIN, preferredLeft), maxLeft);

    return { top, left };
}

export default StudioTopBar;
