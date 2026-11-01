import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";

type MediaPreviewDialogProps = {
    filename: string;
    mimeType: string;
    sizeLabel: string;
    uploadedLabel: string;
    imageUrl: string;
    onClose: () => void;
};

function MediaPreviewDialog({
    filename,
    mimeType,
    sizeLabel,
    uploadedLabel,
    imageUrl,
    onClose,
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
            className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 p-4"
            onMouseDown={handleBackdropClick}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="media-preview-title"
                tabIndex={-1}
                onKeyDown={handleKeyDown}
                className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-panel"
            >
                <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                    <h2 id="media-preview-title" className="min-w-0 truncate text-base font-semibold text-foreground">
                        {filename}
                    </h2>
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-9 shrink-0 items-center rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-secondary outline-none transition-colors duration-150 hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                        Close
                    </button>
                </div>
                <div className="min-h-0 flex-1 overflow-auto bg-canvas p-4">
                    {imageFailed ? (
                        <div className="flex min-h-48 items-center justify-center rounded-lg border border-border bg-surface px-4 py-8 text-center">
                            <p className="text-sm text-secondary">This image could not be displayed.</p>
                        </div>
                    ) : (
                        <img
                            src={imageUrl}
                            alt={filename}
                            onError={() => {
                                setImageFailed(true);
                            }}
                            className="mx-auto max-h-[60dvh] w-full object-contain"
                        />
                    )}
                </div>
                <div className="border-t border-border px-4 py-4">
                    <dl className="grid gap-3 text-sm sm:grid-cols-3">
                        <div>
                            <dt className="text-xs font-medium text-muted">File size</dt>
                            <dd className="mt-1 text-foreground">{sizeLabel}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-muted">Uploaded</dt>
                            <dd className="mt-1 text-foreground">{uploadedLabel}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-muted">Type</dt>
                            <dd className="mt-1 text-foreground">{mimeType}</dd>
                        </div>
                    </dl>
                    <div className="mt-4">
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
                            className="mt-1 h-9 w-full rounded-control border border-border bg-surface-raised px-3 font-mono text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                        />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                void copyImageUrl();
                            }}
                            className="inline-flex h-9 items-center rounded-control bg-accent px-3 text-sm font-medium text-white outline-none transition-colors duration-150 hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent/40"
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
    );
}

export default MediaPreviewDialog;
