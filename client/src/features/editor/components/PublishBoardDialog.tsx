import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from "react";
import { Link } from "react-router-dom";

type PublishDialogPhase = "confirm" | "published" | "failed";

type PublishBoardDialogProps = {
    phase: PublishDialogPhase;
    errorMessage: string | null;
    displayPath: string | null;
    onCancel: () => void;
    onConfirm: () => void;
    onRetry: () => void;
};

function PublishBoardDialog({
    phase,
    errorMessage,
    displayPath,
    onCancel,
    onConfirm,
    onRetry,
}: PublishBoardDialogProps) {
    const cancelRef = useRef<HTMLButtonElement>(null);
    const confirmRef = useRef<HTMLButtonElement>(null);
    const retryRef = useRef<HTMLButtonElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (phase === "confirm") {
            cancelRef.current?.focus();
            return;
        }

        if (phase === "failed") {
            retryRef.current?.focus();
            return;
        }

        closeRef.current?.focus();
    }, [phase]);

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onCancel();
            return;
        }

        if (event.key !== "Tab") {
            return;
        }

        const dialog = dialogRef.current;

        if (dialog === null) {
            return;
        }

        const focusable = [...dialog.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
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

    function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
        if (event.target !== event.currentTarget) {
            return;
        }

        onCancel();
    }

    const title = phase === "confirm"
        ? "Publish this board?"
        : phase === "published"
            ? "Published successfully"
            : "Publish failed";
    const message = phase === "confirm"
        ? "This replaces the version visible on Display screens."
        : phase === "published"
            ? "Display screens show this version after they refresh."
            : errorMessage ?? "The board could not be published. Check that the API is running, then try again.";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
            onMouseDown={handleBackdropMouseDown}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="publish-board-title"
                aria-describedby="publish-board-message"
                onKeyDown={handleKeyDown}
                className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-panel"
            >
                <h2 id="publish-board-title" className="text-base font-semibold text-foreground">
                    {title}
                </h2>
                <p id="publish-board-message" className="mt-2 text-sm leading-5 text-secondary">
                    {message}
                </p>
                <div className="mt-5 flex justify-end gap-2">
                    {phase === "confirm" ? (
                        <>
                            <button
                                ref={cancelRef}
                                type="button"
                                onClick={onCancel}
                                className="h-9 rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
                            >
                                Cancel
                            </button>
                            <button
                                ref={confirmRef}
                                type="button"
                                onClick={onConfirm}
                                className="h-9 rounded-control bg-accent px-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
                            >
                                Publish
                            </button>
                        </>
                    ) : null}
                    {phase === "published" && displayPath !== null ? (
                        <Link
                            to={displayPath}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={onCancel}
                            className="inline-flex h-9 items-center rounded-control bg-accent px-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
                        >
                            Open Display
                            <span className="sr-only"> (opens in a new tab)</span>
                        </Link>
                    ) : null}
                    {phase === "failed" ? (
                        <button
                            ref={retryRef}
                            type="button"
                            onClick={onRetry}
                            className="h-9 rounded-control bg-accent px-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
                        >
                            Retry
                        </button>
                    ) : null}
                    {phase !== "confirm" ? (
                        <button
                            ref={closeRef}
                            type="button"
                            onClick={onCancel}
                            className="h-9 rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
                        >
                            Close
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

export default PublishBoardDialog;
