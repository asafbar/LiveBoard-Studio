import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import MediaManager, { type MediaManagerMode } from "./MediaManager.tsx";
import { mediaAssetIdFromSource, type MediaAsset } from "../api/mediaApi.ts";

type MediaManagerDialogProps = {
    mode?: MediaManagerMode;
    selectedSource?: string;
    onClose: () => void;
    onSelectAsset?: (asset: MediaAsset) => void;
};

function MediaManagerDialog({
    mode = "manage",
    selectedSource = "",
    onClose,
    onSelectAsset,
}: MediaManagerDialogProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);

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
            "button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]",
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

    return createPortal(
        <div
            className="fixed inset-0 z-[65] flex items-end justify-center bg-background/80 sm:items-center sm:p-4"
            onMouseDown={handleBackdropClick}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="media-manager-title"
                tabIndex={-1}
                onKeyDown={handleKeyDown}
                className="flex h-[100dvh] w-full flex-col overflow-hidden border border-border bg-background shadow-panel sm:h-[min(720px,90dvh)] sm:max-w-5xl sm:rounded-lg"
            >
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                    <h2 id="media-manager-title" className="truncate text-sm font-semibold text-foreground">
                        Media Library
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
                <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
                    <MediaManager
                        mode={mode}
                        selectedAssetId={mediaAssetIdFromSource(selectedSource)}
                        onSelectAsset={onSelectAsset}
                    />
                </div>
            </div>
        </div>,
        document.body,
    );
}

export default MediaManagerDialog;
