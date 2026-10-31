import {
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
    type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import type { BoardSummary } from "../../boards/api/BoardApi.ts";

type BoardSelectorProps = {
    id: string;
    labelId: string;
    boards: BoardSummary[];
    value: string;
    disabled: boolean;
    invalid: boolean;
    describedBy?: string;
    onChange: (value: string) => void;
};

type BoardSelectorOption =
    | { kind: "none" }
    | { kind: "unavailable"; id: string }
    | { kind: "board"; board: BoardSummary };

type PopupPlacement = {
    top: number;
    left: number;
    width: number;
    listMaxHeight: number;
};

type PublicationStatusProps = {
    id?: string;
    published: boolean;
};

type SelectorChevronProps = {
    open: boolean;
};

type BoardSelectorOptionRowProps = {
    option: BoardSelectorOption;
    optionId: string;
    active: boolean;
    selected: boolean;
    onSelect: () => void;
    onActivate: () => void;
};

const LIST_ROW_HEIGHT = 36;
const VISIBLE_ROWS = 7;
const LIST_MAX_HEIGHT = LIST_ROW_HEIGHT * VISIBLE_ROWS;
const SEARCH_BLOCK_HEIGHT = 37;
const POPUP_GAP = 4;
const VIEWPORT_MARGIN = 8;
const UNAVAILABLE_LABEL = "Assigned board unavailable";
const EMPTY_RESULTS_LABEL = "No boards found";

function BoardSelector({
    id,
    labelId,
    boards,
    value,
    disabled,
    invalid,
    describedBy,
    onChange,
}: BoardSelectorProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const [placement, setPlacement] = useState<PopupPlacement | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const listboxId = useId();
    const popupOpen = open && !disabled;
    const options = buildOptions(boards, value, popupOpen ? query : "");
    const selection = readSelection(boards, value);
    const valueId = `${id}-value`;
    const statusId = `${id}-status`;
    const labelledBy = selection.published === null
        ? `${labelId} ${valueId}`
        : `${labelId} ${valueId} ${statusId}`;
    const resolvedIndex = resolveActiveIndex(activeIndex, options.length);
    const activeOptionId = resolvedIndex >= 0 ? optionElementId(listboxId, resolvedIndex) : undefined;
    const boardMatchCount = options.filter((option) => option.kind === "board").length;
    const noBoardMatches = query.trim() !== "" && boardMatchCount === 0;

    useLayoutEffect(() => {
        if (!popupOpen) {
            return;
        }

        function updatePlacement() {
            const trigger = triggerRef.current;

            if (trigger === null) {
                return;
            }

            setPlacement(measurePopup(trigger));
        }

        updatePlacement();
        window.addEventListener("resize", updatePlacement);
        window.addEventListener("scroll", updatePlacement, true);

        return () => {
            window.removeEventListener("resize", updatePlacement);
            window.removeEventListener("scroll", updatePlacement, true);
        };
    }, [popupOpen]);

    useEffect(() => {
        if (!popupOpen) {
            return;
        }

        searchRef.current?.focus();
    }, [popupOpen]);

    useEffect(() => {
        if (!popupOpen || activeOptionId === undefined) {
            return;
        }

        scrollOptionIntoView(activeOptionId);
    }, [popupOpen, activeOptionId]);

    useEffect(() => {
        if (!popupOpen) {
            return;
        }

        function handlePointerDown(event: MouseEvent) {
            const target = event.target;

            if (!(target instanceof Node)) {
                return;
            }

            if (rootRef.current?.contains(target) || popupRef.current?.contains(target)) {
                return;
            }

            setQuery("");
            setOpen(false);

            if (!(target instanceof Element) || target.closest("button, input, textarea, select, a, [tabindex]") === null) {
                triggerRef.current?.focus();
            }
        }

        document.addEventListener("mousedown", handlePointerDown);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
        };
    }, [popupOpen]);

    function openSelector(nextIndex: number | null) {
        const trigger = triggerRef.current;

        if (trigger === null || disabled) {
            return;
        }

        const nextOptions = buildOptions(boards, value, "");
        setPlacement(measurePopup(trigger));
        setQuery("");
        setActiveIndex(nextIndex ?? findSelectedIndex(nextOptions, value));
        setOpen(true);
    }

    function closeToTrigger() {
        setQuery("");
        setOpen(false);
        triggerRef.current?.focus();
    }

    function closeForTab(shiftKey: boolean) {
        const trigger = triggerRef.current;
        setQuery("");
        setOpen(false);

        if (trigger === null) {
            return;
        }

        if (shiftKey) {
            trigger.focus();
            return;
        }

        focusRelativeControl(trigger, 1);
    }

    function moveActive(delta: number) {
        setActiveIndex((current) => {
            if (options.length === 0) {
                return 0;
            }

            const next = resolveActiveIndex(current, options.length) + delta;

            if (next < 0) {
                return 0;
            }

            if (next >= options.length) {
                return options.length - 1;
            }

            return next;
        });
    }

    function selectOption(option: BoardSelectorOption) {
        if (option.kind === "none") {
            onChange("");
        } else if (option.kind === "unavailable") {
            onChange(option.id);
        } else {
            onChange(option.board.id);
        }

        closeToTrigger();
    }

    function selectActiveOption() {
        const option = options[resolvedIndex];

        if (option === undefined) {
            return;
        }

        selectOption(option);
    }

    function handleTriggerClick() {
        if (disabled) {
            return;
        }

        if (popupOpen) {
            closeToTrigger();
            return;
        }

        openSelector(null);
    }

    function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
        if (disabled) {
            return;
        }

        if (!popupOpen) {
            if (event.key === "ArrowDown") {
                consumeKey(event);
                openSelector(null);
            } else if (event.key === "ArrowUp") {
                consumeKey(event);
                openSelector(Math.max(buildOptions(boards, value, "").length - 1, 0));
            } else if (event.key === "Enter" || event.key === " ") {
                consumeKey(event);
                openSelector(null);
            }

            return;
        }

        if (event.key === "ArrowDown") {
            consumeKey(event);
            moveActive(1);
            return;
        }

        if (event.key === "ArrowUp") {
            consumeKey(event);
            moveActive(-1);
            return;
        }

        if (event.key === "Home") {
            consumeKey(event);
            setActiveIndex(0);
            return;
        }

        if (event.key === "End") {
            consumeKey(event);
            setActiveIndex(Math.max(options.length - 1, 0));
            return;
        }

        if (event.key === "Enter") {
            consumeKey(event);
            selectActiveOption();
            return;
        }

        if (event.key === "Escape" || event.key === " ") {
            consumeKey(event);
            closeToTrigger();
            return;
        }

        if (event.key === "Tab" && !event.shiftKey) {
            consumeKey(event);
            searchRef.current?.focus();
        }
    }

    function handleSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
        if (event.key === "ArrowDown") {
            consumeKey(event);
            moveActive(1);
            return;
        }

        if (event.key === "ArrowUp") {
            consumeKey(event);
            moveActive(-1);
            return;
        }

        if (event.key === "Home") {
            consumeKey(event);
            setActiveIndex(0);
            return;
        }

        if (event.key === "End") {
            consumeKey(event);
            setActiveIndex(Math.max(options.length - 1, 0));
            return;
        }

        if (event.key === "Enter") {
            if (event.nativeEvent.isComposing) {
                return;
            }

            consumeKey(event);
            selectActiveOption();
            return;
        }

        if (event.key === "Escape") {
            consumeKey(event);
            closeToTrigger();
            return;
        }

        if (event.key === "Tab") {
            consumeKey(event);
            closeForTab(event.shiftKey);
        }
    }

    const popup = popupOpen && placement !== null
        ? createPortal(
            <div
                ref={popupRef}
                data-board-selector-popup="true"
                style={{
                    top: placement.top,
                    left: placement.left,
                    width: placement.width,
                }}
                className="fixed z-[60] overflow-hidden rounded-control border border-border bg-surface shadow-panel"
            >
                <input
                    ref={searchRef}
                    type="search"
                    role="combobox"
                    value={query}
                    placeholder="Search boards"
                    spellCheck={false}
                    autoComplete="off"
                    aria-label="Search boards"
                    aria-autocomplete="list"
                    aria-expanded="true"
                    aria-controls={listboxId}
                    aria-activedescendant={activeOptionId}
                    onChange={(event) => {
                        const nextQuery = event.target.value;
                        setQuery(nextQuery);
                        setActiveIndex(findSelectedIndex(buildOptions(boards, value, nextQuery), value));
                    }}
                    onKeyDown={handleSearchKeyDown}
                    className="h-9 w-full border-b border-border bg-surface px-3 text-sm text-foreground outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50"
                />
                <div
                    data-board-selector-list="true"
                    className="overflow-y-auto overscroll-contain"
                    style={{ maxHeight: placement.listMaxHeight }}
                >
                    <ul id={listboxId} role="listbox" aria-labelledby={labelId} className="py-0">
                        {options.map((option, index) => (
                            <BoardSelectorOptionRow
                                key={optionKey(option)}
                                option={option}
                                optionId={optionElementId(listboxId, index)}
                                active={index === resolvedIndex}
                                selected={optionMatchesValue(option, value)}
                                onSelect={() => {
                                    selectOption(option);
                                }}
                                onActivate={() => {
                                    setActiveIndex(index);
                                }}
                            />
                        ))}
                    </ul>
                    {noBoardMatches ? (
                        <p className="px-3 py-2 text-xs text-muted">{EMPTY_RESULTS_LABEL}</p>
                    ) : null}
                </div>
                <p className="sr-only" aria-live="polite">
                    {noBoardMatches ? EMPTY_RESULTS_LABEL : `${boardMatchCount} ${boardMatchCount === 1 ? "board" : "boards"}`}
                </p>
            </div>,
            document.body,
        )
        : null;

    return (
        <div ref={rootRef} className="relative min-w-0">
            <button
                ref={triggerRef}
                id={id}
                type="button"
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={popupOpen}
                aria-controls={listboxId}
                aria-labelledby={labelledBy}
                aria-invalid={invalid}
                aria-describedby={describedBy}
                onClick={handleTriggerClick}
                onKeyDown={handleTriggerKeyDown}
                className={
                    disabled
                        ? "flex h-9 w-full min-w-0 cursor-not-allowed items-center gap-2 rounded-control border border-border bg-surface-raised px-3 text-sm text-foreground opacity-60 outline-none"
                        : "flex h-9 w-full min-w-0 items-center gap-2 rounded-control border border-border bg-surface-raised px-3 text-sm text-foreground outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
                }
            >
                <span id={valueId} className="min-w-0 flex-1 truncate text-left" title={selection.name}>
                    {selection.name}
                </span>
                {selection.published !== null ? (
                    <PublicationStatus id={statusId} published={selection.published} />
                ) : null}
                <SelectorChevron open={popupOpen} />
            </button>
            {popup}
        </div>
    );
}

function BoardSelectorOptionRow({
    option,
    optionId,
    active,
    selected,
    onSelect,
    onActivate,
}: BoardSelectorOptionRowProps) {
    const name = optionName(option);

    return (
        <li
            id={optionId}
            role="option"
            aria-selected={selected}
            title={name}
            onMouseEnter={onActivate}
            onMouseDown={(event) => {
                event.preventDefault();
            }}
            onClick={onSelect}
            className={optionClassName(active, selected)}
        >
            <span className="min-w-0 flex-1 truncate">{name}</span>
            {option.kind === "board" ? (
                <PublicationStatus published={option.board.isPublished} />
            ) : null}
        </li>
    );
}

function PublicationStatus({ id, published }: PublicationStatusProps) {
    return (
        <span id={id} className={`shrink-0 text-xs font-medium ${published ? "text-success" : "text-warning"}`}>
            {published ? "Published" : "Unpublished"}
        </span>
    );
}

function SelectorChevron({ open }: SelectorChevronProps) {
    return (
        <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 text-muted transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        >
            <path
                d="M5.5 7.5 10 12l4.5-4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function buildOptions(boards: BoardSummary[], value: string, query: string): BoardSelectorOption[] {
    const normalizedQuery = query.trim().toLowerCase();
    const selected = findBoard(boards, value);
    const options: BoardSelectorOption[] = [];

    if (normalizedQuery === "") {
        options.push({ kind: "none" });

        if (value !== "" && selected === null) {
            options.push({ kind: "unavailable", id: value });
        }
    }

    boards.slice().sort(compareBoardNames).forEach((board) => {
        if (normalizedQuery === "" || board.name.toLowerCase().includes(normalizedQuery)) {
            options.push({ kind: "board", board });
        }
    });

    return options;
}

function compareBoardNames(left: BoardSummary, right: BoardSummary): number {
    const byName = left.name.localeCompare(right.name, undefined, {
        numeric: true,
        sensitivity: "base",
    });

    if (byName !== 0) {
        return byName;
    }

    return left.id.localeCompare(right.id);
}

function readSelection(boards: BoardSummary[], value: string): { name: string; published: boolean | null } {
    if (value === "") {
        return { name: "No board assigned", published: null };
    }

    const board = findBoard(boards, value);

    if (board === null) {
        return { name: UNAVAILABLE_LABEL, published: null };
    }

    return { name: board.name, published: board.isPublished };
}

function findBoard(boards: BoardSummary[], value: string): BoardSummary | null {
    if (value === "") {
        return null;
    }

    return boards.find((board) => board.id.toLowerCase() === value.toLowerCase()) ?? null;
}

function findSelectedIndex(options: BoardSelectorOption[], value: string): number {
    const index = options.findIndex((option) => optionMatchesValue(option, value));
    return index >= 0 ? index : 0;
}

function optionMatchesValue(option: BoardSelectorOption, value: string): boolean {
    if (option.kind === "none") {
        return value === "";
    }

    if (option.kind === "unavailable") {
        return option.id === value;
    }

    return option.board.id.toLowerCase() === value.toLowerCase();
}

function optionName(option: BoardSelectorOption): string {
    if (option.kind === "none") {
        return "No board assigned";
    }

    if (option.kind === "unavailable") {
        return UNAVAILABLE_LABEL;
    }

    return option.board.name;
}

function optionKey(option: BoardSelectorOption): string {
    if (option.kind === "none") {
        return "none";
    }

    if (option.kind === "unavailable") {
        return `unavailable-${option.id}`;
    }

    return option.board.id;
}

function optionElementId(listboxId: string, index: number): string {
    return `${listboxId}-option-${index}`;
}

function resolveActiveIndex(index: number, length: number): number {
    if (length === 0) {
        return -1;
    }

    if (index < 0) {
        return 0;
    }

    if (index >= length) {
        return length - 1;
    }

    return index;
}

function optionClassName(active: boolean, selected: boolean): string {
    const base = "flex h-9 w-full min-w-0 cursor-pointer items-center gap-2 px-3 text-left text-sm text-foreground";

    if (active) {
        return `${base} bg-surface-hover ring-1 ring-inset ring-accent`;
    }

    if (selected) {
        return `${base} bg-accent/10`;
    }

    return base;
}

function measurePopup(trigger: HTMLElement): PopupPlacement {
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN - POPUP_GAP;
    const spaceAbove = rect.top - VIEWPORT_MARGIN - POPUP_GAP;
    const openBelow = spaceBelow >= spaceAbove;
    const available = Math.max(spaceBelow, spaceAbove);
    const listMaxHeight = Math.min(LIST_MAX_HEIGHT, Math.max(LIST_ROW_HEIGHT, available - SEARCH_BLOCK_HEIGHT));
    const popupHeight = SEARCH_BLOCK_HEIGHT + listMaxHeight;
    const top = openBelow
        ? rect.bottom + POPUP_GAP
        : Math.max(VIEWPORT_MARGIN, rect.top - POPUP_GAP - popupHeight);

    return {
        top,
        left: rect.left,
        width: rect.width,
        listMaxHeight,
    };
}

function focusRelativeControl(trigger: HTMLElement, direction: 1 | -1) {
    const dialog = trigger.closest<HTMLElement>("[role='dialog']");

    if (dialog === null) {
        return;
    }

    const focusable = [...dialog.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
    )];
    const index = focusable.indexOf(trigger);
    const next = index >= 0 ? focusable[index + direction] : undefined;

    if (next !== undefined) {
        next.focus();
    }
}

function scrollOptionIntoView(optionId: string) {
    const option = document.getElementById(optionId);
    const container = option?.closest("[data-board-selector-list]");

    if (!(option instanceof HTMLElement) || !(container instanceof HTMLElement)) {
        return;
    }

    const optionRect = option.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    if (optionRect.top < containerRect.top) {
        container.scrollTop -= containerRect.top - optionRect.top;
        return;
    }

    if (optionRect.bottom > containerRect.bottom) {
        container.scrollTop += optionRect.bottom - containerRect.bottom;
    }
}

function consumeKey(event: ReactKeyboardEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
}

export default BoardSelector;
