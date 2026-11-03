import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import {
    MediaRequestError,
    getMediaUsage,
    type MediaAsset,
    type MediaUsage,
} from "../api/mediaApi.ts";

type MediaUsageDialogProps = {
    asset: MediaAsset;
    onClose: () => void;
};

function MediaUsageDialog({ asset, onClose }: MediaUsageDialogProps) {
    const [usage, setUsage] = useState<MediaUsage | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const previousFocus = document.activeElement;
        let active = true;

        getMediaUsage(asset.id)
            .then((nextUsage) => {
                if (!active) {
                    return;
                }

                setUsage(nextUsage);
                setErrorMessage(null);
            })
            .catch((error: unknown) => {
                if (!active) {
                    return;
                }

                setUsage(null);
                setErrorMessage(readUsageError(error));
            })
            .finally(() => {
                if (active) {
                    setLoading(false);
                }
            });

        return () => {
            active = false;

            if (previousFocus instanceof HTMLElement) {
                previousFocus.focus();
            }
        };
    }, [asset.id]);

    useEffect(() => {
        closeRef.current?.focus();
    }, [loading]);

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
            "button:not([disabled]), a[href]",
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

    function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
        if (event.target !== event.currentTarget) {
            return;
        }

        onClose();
    }

    const boardCount = usage === null ? 0 : usage.boards.length;

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 p-4"
            onMouseDown={handleBackdropMouseDown}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="media-usage-title"
                tabIndex={-1}
                onKeyDown={handleKeyDown}
                className="flex max-h-[min(32rem,calc(100vh-2rem))] w-full max-w-md flex-col rounded-lg border border-border bg-surface p-5 shadow-panel outline-none"
            >
                <h2 id="media-usage-title" className="text-base font-semibold text-foreground">
                    Image Usage
                </h2>
                <p className="mt-2 truncate text-sm text-foreground" title={asset.originalFilename}>
                    {asset.originalFilename}
                </p>
                {loading ? (
                    <p className="mt-4 text-sm text-secondary">Checking where this image is used.</p>
                ) : null}
                {errorMessage !== null ? (
                    <p role="alert" className="mt-4 text-sm text-danger">
                        {errorMessage}
                    </p>
                ) : null}
                {usage !== null && boardCount === 0 ? (
                    <p className="mt-4 text-sm leading-5 text-secondary">
                        This image is not used by a saved draft or a published board.
                    </p>
                ) : null}
                {usage !== null && boardCount > 0 ? (
                    <>
                        <p className="mt-4 text-sm text-secondary">
                            {boardCount === 1 ? "Used by 1 board." : `Used by ${boardCount} boards.`}
                        </p>
                        <ul className="mt-3 min-h-0 flex-1 overflow-auto rounded-control border border-border">
                            {usage.boards.map((board) => (
                                <li
                                    key={board.id}
                                    className="border-b border-border px-3 py-2 last:border-b-0"
                                >
                                    <p className="truncate text-sm font-medium text-foreground" title={board.name}>
                                        {board.name}
                                    </p>
                                    <p className="mt-1 text-xs text-muted">
                                        {usageLabels(board.inDraft, board.inPublished).join(" · ")}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </>
                ) : null}
                <div className="mt-4 flex justify-end">
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        className="h-9 rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

function usageLabels(inDraft: boolean, inPublished: boolean): string[] {
    const labels: string[] = [];

    if (inDraft) {
        labels.push("Draft");
    }

    if (inPublished) {
        labels.push("Published");
    }

    return labels;
}

function readUsageError(error: unknown): string {
    if (error instanceof MediaRequestError && error.statusCode === 401) {
        return "Your session has expired. Sign in again to continue.";
    }

    if (error instanceof MediaRequestError && error.message.trim() !== "") {
        return error.message;
    }

    if (error instanceof Error && error.message.trim() !== "") {
        return error.message;
    }

    return "Image usage could not be loaded. Check that the API is running, then try again.";
}

export default MediaUsageDialog;
