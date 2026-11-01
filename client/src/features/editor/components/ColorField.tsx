import { useEffect, useId, useLayoutEffect, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { hexColorInputValue, normalizeCssColor } from "../cssColor.ts";

type ColorFieldProps = {
    label: string;
    value: string;
    onColorChange: (color: string) => void;
};

type PopoverPlacement = {
    top: number;
    left: number;
};

const popoverWidth = 256;
const viewportMargin = 8;

function commitColor(value: string): string | null {
    const color = normalizeCssColor(value);

    if (color === null) {
        return null;
    }

    if (/^#[0-9a-fA-F]{6}$/.test(color)) {
        return color.toLowerCase();
    }

    return color;
}

function placePopover(anchor: DOMRect, height: number): PopoverPlacement {
    let top = anchor.bottom + 6;
    let left = anchor.right - popoverWidth;

    if (top + height > window.innerHeight - viewportMargin) {
        top = anchor.top - height - 6;
    }

    if (left < viewportMargin) {
        left = viewportMargin;
    }

    if (left + popoverWidth > window.innerWidth - viewportMargin) {
        left = window.innerWidth - viewportMargin - popoverWidth;
    }

    return {
        top: Math.max(viewportMargin, top),
        left,
    };
}

function ColorField({ label, value, onColorChange }: ColorFieldProps) {
    const titleId = useId();
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const hexRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(value);
    const [pickerHex, setPickerHex] = useState(hexColorInputValue(value));
    const [pickerKey, setPickerKey] = useState(0);
    const [placement, setPlacement] = useState<PopoverPlacement>({ top: 0, left: 0 });
    const appliedColor = commitColor(draft);
    const canApply = appliedColor !== null && appliedColor !== value;

    function closePopover() {
        setOpen(false);
        triggerRef.current?.focus();
    }

    function openPopover() {
        setDraft(value);
        setPickerHex(hexColorInputValue(value));
        setPickerKey((current) => current + 1);
        setOpen(true);
    }

    function handleApply() {
        if (appliedColor === null || appliedColor === value) {
            closePopover();
            return;
        }

        onColorChange(appliedColor);
        closePopover();
    }

    function handlePickerInput(event: FormEvent<HTMLInputElement>) {
        const next = event.currentTarget.value.toLowerCase();
        setDraft(next);
        setPickerHex(next);
    }

    function handleHexChange(event: ChangeEvent<HTMLInputElement>) {
        const next = event.currentTarget.value;
        setDraft(next);
        const color = commitColor(next);

        if (color === null || !color.startsWith("#")) {
            return;
        }

        setPickerHex(color);
    }

    useLayoutEffect(() => {
        if (!open) {
            return;
        }

        const trigger = triggerRef.current;
        const popover = popoverRef.current;

        if (trigger === null || popover === null) {
            return;
        }

        setPlacement(placePopover(trigger.getBoundingClientRect(), popover.offsetHeight));
        hexRef.current?.focus();
        hexRef.current?.select();
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

            if (popoverRef.current?.contains(target) || triggerRef.current?.contains(target)) {
                return;
            }

            setOpen(false);
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key !== "Escape") {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
            triggerRef.current?.focus();
        }

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    const popoverStyle: CSSProperties = {
        top: placement.top,
        left: placement.left,
        width: popoverWidth,
    };

    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">{label}</span>
            <button
                ref={triggerRef}
                type="button"
                aria-expanded={open}
                aria-haspopup="dialog"
                aria-label={`${label} color`}
                onClick={() => {
                    if (open) {
                        closePopover();
                        return;
                    }

                    openPopover();
                }}
                className="flex h-9 items-center gap-2 rounded-control border border-border bg-surface-raised px-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
                <span
                    aria-hidden="true"
                    className="size-5 shrink-0 rounded border border-border"
                    style={{ backgroundColor: value }}
                />
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{value}</span>
            </button>
            {open ? createPortal(
                <div
                    ref={popoverRef}
                    role="dialog"
                    aria-labelledby={titleId}
                    style={popoverStyle}
                    className="fixed z-[80] rounded-lg border border-border bg-surface p-3 shadow-panel"
                >
                    <p id={titleId} className="text-xs font-medium text-secondary">{label}</p>
                    <div className="mt-3 flex items-center gap-2">
                        <input
                            key={pickerKey}
                            type="color"
                            defaultValue={pickerHex}
                            aria-label={`${label} picker`}
                            onInput={handlePickerInput}
                            className="h-9 w-9 shrink-0 cursor-pointer rounded-control border border-border bg-surface-raised p-1"
                        />
                        <input
                            ref={hexRef}
                            aria-label={`${label} hexadecimal value`}
                            value={draft}
                            spellCheck={false}
                            onChange={handleHexChange}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    handleApply();
                                }
                            }}
                            className="h-9 min-w-0 flex-1 rounded-control border border-border bg-surface-raised px-3 font-mono text-sm text-foreground outline-none"
                        />
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={closePopover}
                            className="h-8 rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={!canApply}
                            onClick={handleApply}
                            className={
                                canApply
                                    ? "h-8 rounded-control bg-accent px-3 text-sm font-medium text-white"
                                    : "h-8 cursor-not-allowed rounded-control bg-accent/40 px-3 text-sm font-medium text-white opacity-60"
                            }
                        >
                            Apply
                        </button>
                    </div>
                </div>,
                document.body,
            ) : null}
        </div>
    );
}

export default ColorField;
