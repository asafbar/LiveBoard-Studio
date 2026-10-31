import {
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
    type KeyboardEvent as ReactKeyboardEvent,
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type BoardActionsMenuProps = {
    boardName: string;
    disabled: boolean;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRename: () => void;
    onDuplicate: () => void;
};

type MenuPlacement = {
    top: number;
    left: number;
};

type MenuIconProps = {
    children: ReactNode;
};

const MENU_WIDTH = 180;
const MENU_HEIGHT = 80;
const MENU_GAP = 4;
const VIEWPORT_MARGIN = 8;

function BoardActionsMenu({
    boardName,
    disabled,
    open,
    onOpenChange,
    onRename,
    onDuplicate,
}: BoardActionsMenuProps) {
    const menuId = useId();
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const renameRef = useRef<HTMLButtonElement>(null);
    const duplicateRef = useRef<HTMLButtonElement>(null);
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

        const item = focusIndex === 0 ? renameRef.current : duplicateRef.current;
        item?.focus();
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
        const trigger = triggerRef.current;

        if (trigger === null || disabled) {
            return;
        }

        setPlacement(measureMenu(trigger, null));
        setFocusIndex(index);
        onOpenChange(true);
    }

    function closeToTrigger() {
        onOpenChange(false);
        triggerRef.current?.focus();
    }

    function choose(action: () => void) {
        onOpenChange(false);
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
            openMenu(1);
            return;
        }

        if (event.key === "Escape" && menuOpen) {
            consumeKey(event);
            closeToTrigger();
        }
    }

    function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            consumeKey(event);
            const items = [renameRef.current, duplicateRef.current];
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
            renameRef.current?.focus();
            return;
        }

        if (event.key === "End") {
            consumeKey(event);
            setFocusIndex(1);
            duplicateRef.current?.focus();
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

            if (event.shiftKey) {
                triggerRef.current?.focus();
                return;
            }

            focusBoardEdit(triggerRef.current);
        }
    }

    const menu = menuOpen && placement !== null
        ? createPortal(
            <div
                ref={menuRef}
                id={menuId}
                role="menu"
                aria-label={`More actions for ${boardName}`}
                onKeyDown={handleMenuKeyDown}
                style={{ top: placement.top, left: placement.left }}
                className="fixed z-[60] w-44 overflow-hidden rounded-control border border-border bg-surface py-1 shadow-panel"
            >
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
                    <PencilIcon />
                    Rename
                </button>
                <button
                    ref={duplicateRef}
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    onClick={() => {
                        choose(onDuplicate);
                    }}
                    className={menuItemClassName}
                >
                    <CopyIcon />
                    Duplicate
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
                aria-label="More actions"
                title="Rename or duplicate this board"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-controls={menuId}
                onClick={handleTriggerClick}
                onKeyDown={handleTriggerKeyDown}
                className={
                    disabled
                        ? "inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-control border border-border bg-surface-raised/40 text-muted opacity-60"
                        : "inline-flex h-9 w-9 items-center justify-center rounded-control border border-border bg-surface-raised text-secondary outline-none transition-colors duration-150 hover:bg-surface-hover hover:text-foreground focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
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

function PencilIcon() {
    return (
        <MenuIcon>
            <path
                d="M12.6 3.4a1.4 1.4 0 0 1 2 0l2 2a1.4 1.4 0 0 1 0 2L8.2 15.8 4.4 16.6 5.2 12.8 12.6 3.4Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
        </MenuIcon>
    );
}

function CopyIcon() {
    return (
        <MenuIcon>
            <rect x="7" y="7" width="9" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path
                d="M5.5 13H5A1.5 1.5 0 0 1 3.5 11.5v-7A1.5 1.5 0 0 1 5 3h7A1.5 1.5 0 0 1 13.5 4.5V5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
        </MenuIcon>
    );
}

function MenuIcon({ children }: MenuIconProps) {
    return (
        <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 shrink-0">
            {children}
        </svg>
    );
}

const menuItemClassName = "flex h-9 w-full items-center gap-2 px-3 text-left text-sm font-medium text-secondary outline-none hover:bg-surface-hover hover:text-foreground focus-visible:bg-surface-hover focus-visible:text-foreground";

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
    const maxTop = Math.max(VIEWPORT_MARGIN, window.innerHeight - height - VIEWPORT_MARGIN);
    const top = Math.min(Math.max(VIEWPORT_MARGIN, preferredTop), maxTop);
    const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN);
    const left = Math.min(Math.max(VIEWPORT_MARGIN, rect.right - width), maxLeft);

    return { top, left };
}

function focusBoardEdit(trigger: HTMLElement | null) {
    const edit = trigger?.closest("li")?.querySelector<HTMLElement>("[data-board-edit]");
    edit?.focus();
}

function consumeKey(event: ReactKeyboardEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
}

export default BoardActionsMenu;
