import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";

type MediaPreviewDialogProps = {
    filename: string;
    mimeType: string;
    sizeLabel: string;
    uploadedLabel: string;
    imageUrl: string;
    onClose: () => void;
    onUseImage?: () => void;
};

function MediaPreviewDialog({
    filename,
    mimeType,
    sizeLabel,
    uploadedLabel,
    imageUrl,
    onClose,
    onUseImage,
}: MediaPreviewDialogProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const [imageFailed, setImageFailed] = useState(false);
    const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

    useEffect(() => {
        const previousFocus = document.activeElement;
        closeRef.current?.focus();

        return () => {
            if (previousFocus instanceof HTMLElement) {
                previousFocus.focus();
            }
        };
    }, []);

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onClose();
            return;
        }

        if (event.key !== "Tab") {
            return;
        }

        const dialog = dialogRef.current;

        if (dialog === null) {
            return;
        }

        const focusable = [...dialog.querySelectorAll<HTMLElement>(
            "button:not([disabled]), input:not([disabled]), a[href]",
        )];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (first === undefined || last === undefined) {
            event.preventDefault();
            return;
        }

        event.stopPropagation();

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
            return;
        }

        if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
        if (event.target === event.currentTarget) {
            onClose();
        }
    }

    async function copyImageUrl() {
        try {
            await navigator.clipboard.writeText(imageUrl);
            setCopyState("copied");
        } catch {
            setCopyState("failed");
        }
    }

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-background/80 px-3 py-[5dvh] sm:px-4"
            onMouseDown={handleBackdropClick}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="media-preview-title"
                tabIndex={-1}
                onKeyDown={handleKeyDown}
                className="flex h-full min-h-0 w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-panel"
            >
                <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border px-3">
                    <h2 id="media-preview-title" className="min-w-0 truncate text-sm font-semibold text-foreground sm:text-base">
                        {filename}
                    </h2>
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 shrink-0 items-center rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-secondary outline-none transition-colors duration-150 hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                        Close
                    </button>
                </div>
                <div className="flex min-h-0 flex-1 overflow-hidden bg-canvas p-2">
                    <div className="relative min-h-0 min-w-0 flex-1">
                        {imageFailed ? (
                            <div className="flex h-full items-center justify-center px-4 text-center">
                                <p className="text-sm text-secondary">This image could not be displayed.</p>
                            </div>
                        ) : (
                            <img
                                src={imageUrl}
                                alt={filename}
                                onError={() => {
                                    setImageFailed(true);
                                }}
                                className="absolute inset-0 h-full w-full object-contain"
                            />
                        )}
                    </div>
                </div>
                <div className="shrink-0 border-t border-border">
                    {onUseImage !== undefined ? (
                        <div className="flex justify-center px-3 pt-2">
                            <button
                                type="button"
                                onClick={onUseImage}
                                className="inline-flex h-9 items-center justify-center rounded-control bg-accent px-4 text-sm font-medium text-white outline-none transition-colors duration-150 hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent/40"
                            >
                                Use Image
                            </button>
                        </div>
                    ) : null}
                    <div className="max-h-28 overflow-y-auto px-3 py-2 sm:max-h-none sm:overflow-visible">
                        <dl className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs sm:text-sm">
                            <div className="flex items-baseline gap-1.5">
                                <dt className="text-muted">File size</dt>
                                <dd className="text-foreground">{sizeLabel}</dd>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <dt className="text-muted">Type</dt>
                                <dd className="text-foreground">{mimeType}</dd>
                            </div>
                            <div className="flex min-w-0 items-baseline gap-1.5">
                                <dt className="shrink-0 text-muted">Uploaded</dt>
                                <dd className="truncate text-foreground">{uploadedLabel}</dd>
                            </div>
                        </dl>
                        {copyState === "failed" ? (
                            <div className="mt-2">
                                <label htmlFor="media-image-url" className="text-xs font-medium text-muted">
                                    Image URL
                                </label>
                                <input
                                    id="media-image-url"
                                    readOnly
                                    value={imageUrl}
                                    onFocus={(event) => {
                                        event.currentTarget.select();
                                    }}
                                    className="mt-1 h-8 w-full rounded-control border border-border bg-surface-raised px-2 font-mono text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                                />
                            </div>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    void copyImageUrl();
                                }}
                                className={onUseImage === undefined
                                    ? "inline-flex h-8 items-center rounded-control bg-accent px-3 text-sm font-medium text-white outline-none transition-colors duration-150 hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent/40"
                                    : "inline-flex h-8 items-center rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-secondary outline-none transition-colors duration-150 hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent/40"}
                            >
                                Copy Image URL
                            </button>
                            <p role="status" aria-live="polite" className="text-sm text-secondary">
                                {copyState === "copied" ? "Image URL copied." : ""}
                                {copyState === "failed" ? "Select the image URL and copy it manually." : ""}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MediaPreviewDialog;
