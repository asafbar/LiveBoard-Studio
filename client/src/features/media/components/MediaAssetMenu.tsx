import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";

type MediaAssetMenuProps = {
    filename: string;
    disabled: boolean;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onPreview: () => void;
    onCopyUrl: () => void;
    onRename: () => void;
    onViewUsage: () => void;
};

type MenuPlacement = {
    top: number;
    left: number;
};

const MENU_WIDTH = 176;
const MENU_HEIGHT = 152;
const MENU_GAP = 4;
const VIEWPORT_MARGIN = 8;

const menuItemClassName = "flex h-9 w-full items-center px-3 text-left text-sm font-medium text-secondary outline-none hover:bg-surface-hover hover:text-foreground focus-visible:bg-surface-hover focus-visible:text-foreground";

function MediaAssetMenu({
    filename,
    disabled,
    open,
    onOpenChange,
    onPreview,
    onCopyUrl,
    onRename,
    onViewUsage,
}: MediaAssetMenuProps) {
    const menuId = useId();
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const previewRef = useRef<HTMLButtonElement>(null);
    const copyRef = useRef<HTMLButtonElement>(null);
    const renameRef = useRef<HTMLButtonElement>(null);
    const usageRef = useRef<HTMLButtonElement>(null);
    const [placement, setPlacement] = useState<MenuPlacement | null>(null);
    const [focusIndex, setFocusIndex] = useState(0);
    const menuOpen = open && !disabled;

    useLayoutEffect(() => {
        if (!menuOpen) {
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

            setPlacement(measureMenu(trigger, menuRef.current));
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
    }, [menuOpen, onOpenChange]);

    useEffect(() => {
        if (!menuOpen) {
            return;
        }

        const items = [previewRef.current, copyRef.current, renameRef.current, usageRef.current];
        items[focusIndex]?.focus();
    }, [menuOpen, focusIndex]);

    useEffect(() => {
        if (!menuOpen) {
            return;
        }

        function handlePointerDown(event: MouseEvent) {
            const target = event.target;

            if (!(target instanceof Node)) {
                return;
            }

            if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
                return;
            }

            onOpenChange(false);
        }

        document.addEventListener("mousedown", handlePointerDown);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
        };
    }, [menuOpen, onOpenChange]);

    function openMenu(index: number) {
        if (triggerRef.current === null || disabled) {
            return;
        }

        setPlacement(measureMenu(triggerRef.current, null));
        setFocusIndex(index);
        onOpenChange(true);
    }

    function closeToTrigger() {
        onOpenChange(false);
        triggerRef.current?.focus();
    }

    function choose(action: () => void) {
        onOpenChange(false);
        triggerRef.current?.focus();
        action();
    }

    function handleTriggerClick() {
        if (disabled) {
            return;
        }

        if (menuOpen) {
            onOpenChange(false);
            return;
        }

        openMenu(0);
    }

    function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
        if (disabled) {
            return;
        }

        if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            consumeKey(event);
            openMenu(0);
            return;
        }

        if (event.key === "ArrowUp") {
            consumeKey(event);
            openMenu(3);
            return;
        }

        if (event.key === "Escape" && menuOpen) {
            consumeKey(event);
            closeToTrigger();
        }
    }

    function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
        const items = [previewRef.current, copyRef.current, renameRef.current, usageRef.current];

        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            consumeKey(event);
            const current = items.findIndex((item) => item === document.activeElement);
            const delta = event.key === "ArrowDown" ? 1 : -1;
            const next = current === -1
                ? 0
                : (current + delta + items.length) % items.length;
            setFocusIndex(next);
            items[next]?.focus();
            return;
        }

        if (event.key === "Home") {
            consumeKey(event);
            setFocusIndex(0);
            previewRef.current?.focus();
            return;
        }

        if (event.key === "End") {
            consumeKey(event);
            setFocusIndex(3);
            usageRef.current?.focus();
            return;
        }

        if (event.key === "Escape") {
            consumeKey(event);
            closeToTrigger();
            return;
        }

        if (event.key === "Tab") {
            consumeKey(event);
            onOpenChange(false);
            triggerRef.current?.focus();
        }
    }

    const menu = menuOpen && placement !== null
        ? createPortal(
            <div
                ref={menuRef}
                id={menuId}
                role="menu"
                aria-label={`More actions for ${filename}`}
                onKeyDown={handleMenuKeyDown}
                style={{ top: placement.top, left: placement.left }}
                className="fixed z-[75] w-44 overflow-hidden rounded-control border border-border bg-surface py-1 shadow-panel"
            >
                <button
                    ref={previewRef}
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    onClick={() => {
                        choose(onPreview);
                    }}
                    className={menuItemClassName}
                >
                    Preview
                </button>
                <button
                    ref={copyRef}
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    onClick={() => {
                        choose(onCopyUrl);
                    }}
                    className={menuItemClassName}
                >
                    Copy image URL
                </button>
                <button
                    ref={renameRef}
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    onClick={() => {
                        choose(onRename);
                    }}
                    className={menuItemClassName}
                >
                    Rename
                </button>
                <button
                    ref={usageRef}
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    onClick={() => {
                        choose(onViewUsage);
                    }}
                    className={menuItemClassName}
                >
                    View Usage
                </button>
            </div>,
            document.body,
        )
        : null;

    return (
        <div className="relative">
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                aria-label={`More actions for ${filename}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-controls={menuOpen ? menuId : undefined}
                onClick={handleTriggerClick}
                onKeyDown={handleTriggerKeyDown}
                className={
                    disabled
                        ? "inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-control text-muted opacity-60"
                        : "inline-flex h-9 w-9 items-center justify-center rounded-control text-secondary outline-none transition-colors duration-150 hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent/40"
                }
            >
                <MoreIcon />
            </button>
            {menu}
        </div>
    );
}

function MoreIcon() {
    return (
        <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4">
            <circle cx="10" cy="4.5" r="1.25" fill="currentColor" />
            <circle cx="10" cy="10" r="1.25" fill="currentColor" />
            <circle cx="10" cy="15.5" r="1.25" fill="currentColor" />
        </svg>
    );
}

function consumeKey(event: ReactKeyboardEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
}

function isTriggerVisible(trigger: HTMLElement): boolean {
    const rect = trigger.getBoundingClientRect();

    return rect.bottom > 0
        && rect.top < window.innerHeight
        && rect.right > 0
        && rect.left < window.innerWidth;
}

function measureMenu(trigger: HTMLElement, menu: HTMLElement | null): MenuPlacement {
    const rect = trigger.getBoundingClientRect();
    const width = menu === null || menu.offsetWidth === 0 ? MENU_WIDTH : menu.offsetWidth;
    const height = menu === null || menu.offsetHeight === 0 ? MENU_HEIGHT : menu.offsetHeight;
    const belowTop = rect.bottom + MENU_GAP;
    const aboveTop = rect.top - MENU_GAP - height;
    const belowFits = belowTop + height <= window.innerHeight - VIEWPORT_MARGIN;
    const aboveFits = aboveTop >= VIEWPORT_MARGIN;
    const preferredTop = belowFits || !aboveFits ? belowTop : aboveTop;
    const top = Math.min(
        Math.max(preferredTop, VIEWPORT_MARGIN),
        window.innerHeight - height - VIEWPORT_MARGIN,
    );
    const left = Math.min(
        Math.max(rect.right - width, VIEWPORT_MARGIN),
        window.innerWidth - width - VIEWPORT_MARGIN,
    );

    return { top, left };
}

export default MediaAssetMenu;
