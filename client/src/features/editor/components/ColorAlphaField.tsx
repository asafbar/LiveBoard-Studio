import { useEffect, useId, useLayoutEffect, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { alphaPercentFromHex, effectiveOpacityPercent } from "../colorAlpha.ts";
import { colorInputHex, normalizeCssColor } from "../cssColor.ts";

type ColorAlphaFieldProps = {
    label: string;
    value: string;
    opacity: number | undefined;
    onColorChange: (color: string) => void;
    onOpacityChange: (opacity: number | null) => void;
    onSessionEnd?: () => void;
    defaultColor?: string;
    onReset?: () => void;
    hint?: string;
    validationPath?: string;
    issueMessage?: string | null;
};

type PopoverPlacement = {
    top: number;
    left: number;
};

const popoverWidth = 280;
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

function opaqueHex(color: string): string {
    const eightDigit = /^#([0-9a-fA-F]{8})$/.exec(color);

    if (eightDigit === null) {
        return color;
    }

    return `#${(eightDigit[1] ?? "").slice(0, 6).toLowerCase()}`;
}

function ColorAlphaField({
    label,
    value,
    opacity,
    onColorChange,
    onOpacityChange,
    onSessionEnd,
    defaultColor,
    onReset,
    hint,
    validationPath,
    issueMessage = null,
}: ColorAlphaFieldProps) {
    const titleId = useId();
    const hintId = useId();
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const hexRef = useRef<HTMLInputElement>(null);
    const publishedColorRef = useRef(value);
    const publishedOpacityRef = useRef(opacity);
    const changedRef = useRef(false);
    const onSessionEndRef = useRef(onSessionEnd);
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(value);
    const [pickerHex, setPickerHex] = useState(() => colorInputHex(value));
    const [pickerKey, setPickerKey] = useState(0);
    const [placement, setPlacement] = useState<PopoverPlacement>({ top: 0, left: 0 });
    const percent = effectiveOpacityPercent(opacity);
    const canReset = opacity !== undefined || (defaultColor !== undefined && value !== defaultColor);

    useEffect(() => {
        onSessionEndRef.current = onSessionEnd;
    }, [onSessionEnd]);

    function finishSession() {
        if (!changedRef.current) {
            return;
        }

        changedRef.current = false;
        onSessionEndRef.current?.();
    }

    function closePopover(restoreFocus: boolean) {
        finishSession();
        setOpen(false);

        if (restoreFocus) {
            triggerRef.current?.focus();
        }
    }

    function openPopover() {
        publishedColorRef.current = value;
        publishedOpacityRef.current = opacity;
        changedRef.current = false;
        setDraft(value);
        setPickerHex(colorInputHex(value));
        setPickerKey((current) => current + 1);
        setOpen(true);
    }

    function publishColor(next: string) {
        const encoded = alphaPercentFromHex(next);

        if (encoded !== null) {
            setDraft(encoded.color);
            setPickerHex(encoded.color);
            setPickerKey((current) => current + 1);

            if (encoded.color !== publishedColorRef.current) {
                publishedColorRef.current = encoded.color;
                changedRef.current = true;
                onColorChange(encoded.color);
            }

            publishOpacity(encoded.opacity);
            return;
        }

        const committed = commitColor(next);

        if (committed === null) {
            return;
        }

        const color = opaqueHex(committed);

        if (color === publishedColorRef.current) {
            return;
        }

        publishedColorRef.current = color;
        changedRef.current = true;
        onColorChange(color);
    }

    function publishOpacity(next: number) {
        if (next === effectiveOpacityPercent(publishedOpacityRef.current)) {
            return;
        }

        publishedOpacityRef.current = next;
        changedRef.current = true;
        onOpacityChange(next);
    }

    function handlePickerInput(event: FormEvent<HTMLInputElement>) {
        const next = event.currentTarget.value.toLowerCase();

        if (
            !publishedColorRef.current.startsWith("#")
            && colorInputHex(publishedColorRef.current) === next
        ) {
            return;
        }

        setDraft(next);
        setPickerHex(next);
        publishColor(next);
    }

    function handleHexChange(event: ChangeEvent<HTMLInputElement>) {
        const next = event.target.value;
        setDraft(next);
        const color = commitColor(next);

        if (color === null || !color.startsWith("#")) {
            return;
        }

        setPickerHex(opaqueHex(color));
        setPickerKey((current) => current + 1);
        publishColor(color);
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

        function closeFromDocument(restoreFocus: boolean) {
            if (changedRef.current) {
                changedRef.current = false;
                onSessionEndRef.current?.();
            }

            setOpen(false);

            if (restoreFocus) {
                triggerRef.current?.focus();
            }
        }

        function handlePointerDown(event: PointerEvent) {
            const target = event.target;

            if (!(target instanceof Node)) {
                return;
            }

            if (popoverRef.current?.contains(target) || triggerRef.current?.contains(target)) {
                return;
            }

            closeFromDocument(false);
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key !== "Escape") {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            closeFromDocument(true);
        }

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    useEffect(() => {
        return () => {
            if (!changedRef.current) {
                return;
            }

            changedRef.current = false;
            onSessionEndRef.current?.();
        };
    }, []);

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
                aria-invalid={issueMessage !== null}
                aria-describedby={hint === undefined ? undefined : hintId}
                aria-label={`${label} color and opacity`}
                data-validation-path={validationPath}
                onClick={() => {
                    if (open) {
                        closePopover(true);
                        return;
                    }

                    openPopover();
                }}
                className={
                    issueMessage === null
                        ? "flex h-9 items-center gap-2 rounded-control border border-border bg-surface-raised px-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                        : "flex h-9 items-center gap-2 rounded-control border border-danger-border bg-surface-raised px-2 text-left outline-none ring-1 ring-danger/40 focus-visible:ring-2 focus-visible:ring-accent/40"
                }
            >
                <AlphaSwatch color={value} percent={percent} />
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{value}</span>
                <span className="shrink-0 text-xs text-secondary">{percent}%</span>
            </button>
            {hint === undefined ? null : (
                <p id={hintId} className="text-xs text-muted">{hint}</p>
            )}
            {issueMessage === null ? null : (
                <p className="text-xs text-danger" role="alert">{issueMessage}</p>
            )}
            {open ? createPortal(
                <div
                    ref={popoverRef}
                    role="dialog"
                    aria-labelledby={titleId}
                    style={popoverStyle}
                    className="fixed z-[80] rounded-lg border border-border bg-surface p-3 shadow-panel"
                >
                    <p id={titleId} className="text-xs font-medium text-secondary">{label}</p>
                    <AlphaSwatch color={value} percent={percent} large />
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
                                    closePopover(true);
                                }
                            }}
                            className="h-9 min-w-0 flex-1 rounded-control border border-border bg-surface-raised px-3 font-mono text-sm text-foreground outline-none"
                        />
                    </div>
                    <label className="mt-3 flex flex-col gap-1.5">
                        <span className="flex items-center justify-between text-xs text-muted">
                            <span>Opacity</span>
                            <span>{percent}%</span>
                        </span>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={percent}
                            aria-label={`${label} opacity`}
                            aria-valuetext={`${percent}%`}
                            onChange={(event) => {
                                publishOpacity(Number(event.target.value));
                            }}
                            className="w-full accent-accent"
                        />
                    </label>
                    {canReset ? (
                        <button
                            type="button"
                            className="mt-2 text-xs text-secondary underline-offset-2 hover:underline"
                            onClick={() => {
                                publishedOpacityRef.current = undefined;
                                changedRef.current = true;
                                onOpacityChange(null);

                                if (onReset !== undefined) {
                                    onReset();
                                    return;
                                }

                                if (defaultColor !== undefined && defaultColor !== value) {
                                    publishedColorRef.current = defaultColor;
                                    setDraft(defaultColor);
                                    setPickerHex(colorInputHex(defaultColor));
                                    setPickerKey((current) => current + 1);
                                    onColorChange(defaultColor);
                                }
                            }}
                        >
                            Reset
                        </button>
                    ) : null}
                </div>,
                document.body,
            ) : null}
        </div>
    );
}

function AlphaSwatch({ color, percent, large = false }: { color: string; percent: number; large?: boolean }) {
    return (
        <span
            aria-hidden="true"
            className={large
                ? "relative mt-3 block h-10 w-full overflow-hidden rounded-control border border-border"
                : "relative block size-5 shrink-0 overflow-hidden rounded border border-border"}
            style={{
                backgroundColor: "#6b7280",
                backgroundImage: "linear-gradient(45deg, rgba(255,255,255,0.22) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.22) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.22) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.22) 75%)",
                backgroundSize: "10px 10px",
                backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0",
            }}
        >
            <span
                className="absolute inset-0 rounded-[inherit]"
                style={{
                    backgroundColor: color,
                    opacity: percent / 100,
                }}
            />
        </span>
    );
}

export default ColorAlphaField;
