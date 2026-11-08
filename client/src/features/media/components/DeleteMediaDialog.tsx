import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import {
    MediaRequestError,
    deleteMediaAsset,
    getMediaUsage,
    type MediaAsset,
    type MediaUsage,
} from "../api/mediaApi.ts";

type DeleteMediaDialogProps = {
    asset: MediaAsset;
    onClose: () => void;
    onRemoved: (assetId: string) => void;
    onFinished: (message: string) => void;
};

type DialogPhase = "loading" | "blocked" | "confirm" | "failed" | "removed";

function DeleteMediaDialog({
    asset,
    onClose,
    onRemoved,
    onFinished,
}: DeleteMediaDialogProps) {
    const [phase, setPhase] = useState<DialogPhase>("loading");
    const [usage, setUsage] = useState<MediaUsage | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const submittingRef = useRef(false);
    const removedRef = useRef(false);
    const dialogRef = useRef<HTMLDivElement>(null);
    const cancelRef = useRef<HTMLButtonElement>(null);
    const confirmRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const previousFocus = document.activeElement;
        let active = true;

        getMediaUsage(asset.id)
            .then((nextUsage) => {
                if (!active) {
                    return;
                }

                applyUsage(nextUsage);
            })
            .catch((error: unknown) => {
                if (!active) {
                    return;
                }

                setUsage(null);
                setErrorMessage(readDeleteError(error));
                setPhase("failed");
            });

        return () => {
            active = false;

            if (previousFocus instanceof HTMLElement) {
                previousFocus.focus();
            }
        };
    }, [asset.id]);

    useEffect(() => {
        if (submitting) {
            dialogRef.current?.focus();
            return;
        }

        if (phase === "confirm") {
            cancelRef.current?.focus();
            return;
        }

        cancelRef.current?.focus();
    }, [phase, submitting]);

    function applyUsage(nextUsage: MediaUsage) {
        setUsage(nextUsage);
        setErrorMessage(null);
        setPhase(nextUsage.referenced ? "blocked" : "confirm");
    }

    function markRemoved(message: string) {
        if (!removedRef.current) {
            removedRef.current = true;
            onRemoved(asset.id);
        }

        onFinished(message);
    }

    async function confirmDelete() {
        if (submittingRef.current || phase !== "confirm") {
            return;
        }

        submittingRef.current = true;
        setSubmitting(true);
        setErrorMessage(null);
        let closed = false;

        try {
            await deleteMediaAsset(asset.id);
            markRemoved("Image deleted.");
            closed = true;
            onClose();
        } catch (error: unknown) {
            if (error instanceof MediaRequestError && error.statusCode === 409 && error.usage !== null) {
                applyUsage(error.usage);
                return;
            }

            const message = readDeleteError(error);

            if (error instanceof MediaRequestError && (error.statusCode === 404 || error.statusCode === 422)) {
                setErrorMessage(message);
                setPhase("removed");
                markRemoved(message);
                return;
            }

            setErrorMessage(message);

            if (usage !== null && !usage.referenced) {
                setPhase("confirm");
                return;
            }

            setPhase("failed");
        } finally {
            submittingRef.current = false;

            if (!closed) {
                setSubmitting(false);
            }
        }
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();

            if (!submittingRef.current) {
                onClose();
            }

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
            "button:not([disabled])",
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
        if (event.target !== event.currentTarget || submittingRef.current) {
            return;
        }

        onClose();
    }

    const blocked = phase === "blocked";
    const boardCount = usage === null ? 0 : usage.boards.length;
    const deleteDisabled = submitting || phase !== "confirm";

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 p-4"
            onMouseDown={handleBackdropMouseDown}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-media-title"
                aria-describedby="delete-media-message"
                tabIndex={-1}
                onKeyDown={handleKeyDown}
                className="flex max-h-[min(32rem,calc(100vh-2rem))] w-full max-w-md flex-col rounded-lg border border-border bg-surface p-5 shadow-panel outline-none"
            >
                <h2 id="delete-media-title" className="text-base font-semibold text-foreground">
                    Delete image?
                </h2>
                <p className="mt-2 truncate text-sm text-foreground" title={asset.originalFilename}>
                    {asset.originalFilename}
                </p>
                <div id="delete-media-message" className="mt-4 min-h-0 flex-1 overflow-auto">
                    {phase === "loading" ? (
                        <p className="text-sm text-secondary">Checking where this image is used.</p>
                    ) : null}
                    {phase === "confirm" ? (
                        <p className="text-sm leading-5 text-secondary">
                            Deleting this image is permanent. Its library record and file will be removed.
                        </p>
                    ) : null}
                    {blocked ? (
                        <p className="text-sm leading-5 text-secondary">
                            This image is used by a saved draft or a published board, so it cannot be deleted.
                        </p>
                    ) : null}
                    {blocked && usage !== null ? (
                        <>
                            <p className="mt-3 text-sm text-secondary">
                                {boardCount === 1 ? "Used by 1 board." : `Used by ${boardCount} boards.`}
                            </p>
                            <ul className="mt-3 rounded-control border border-border">
                                {usage.boards.map((board) => (
                                    <li
                                        key={board.id}
                                        className="border-b border-border px-3 py-2 last:border-b-0"
                                    >
                                        <p className="truncate text-sm font-medium text-foreground" title={board.name}>
                                            {board.name}
                                        </p>
                                        <p className="mt-1 flex flex-wrap gap-1">
                                            {board.inDraft ? <UsageBadge label="Draft" /> : null}
                                            {board.inPublished ? <UsageBadge label="Published" /> : null}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </>
                    ) : null}
                    {errorMessage !== null ? (
                        <p role="alert" className="text-sm leading-5 text-danger">
                            {errorMessage}
                        </p>
                    ) : null}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                    <button
                        ref={cancelRef}
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="h-9 rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {phase === "confirm" ? "Cancel" : "Close"}
                    </button>
                    <button
                        ref={confirmRef}
                        type="button"
                        onClick={() => {
                            void confirmDelete();
                        }}
                        disabled={deleteDisabled}
                        className="h-9 rounded-control border border-danger-strong bg-danger-strong px-3 text-sm font-medium text-white transition-colors duration-150 hover:border-danger-strong-hover hover:bg-danger-strong-hover disabled:cursor-not-allowed disabled:border-danger-strong/40 disabled:bg-danger-strong/40"
                    >
                        {submitting ? "Deleting..." : "Delete image"}
                    </button>
                </div>
            </div>
        </div>
    );
}

type UsageBadgeProps = {
    label: string;
};

function UsageBadge({ label }: UsageBadgeProps) {
    return (
        <span className="inline-flex h-5 items-center rounded-control border border-border bg-surface-raised px-1.5 text-[11px] font-medium text-muted">
            {label}
        </span>
    );
}

function readDeleteError(error: unknown): string {
    if (error instanceof MediaRequestError && error.statusCode === 401) {
        return "Your session has expired. Sign in again to continue.";
    }

    if (error instanceof MediaRequestError && error.message.trim() !== "") {
        return error.message;
    }

    if (error instanceof Error && error.message.trim() !== "") {
        return error.message;
    }

    return "The image could not be deleted. Check that the API is running, then try again.";
}

export default DeleteMediaDialog;
