import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from "react";

type RevertDraftPhase = "confirm" | "reverting" | "failed";

type RevertDraftDialogProps = {
    phase: RevertDraftPhase;
    errorMessage: string | null;
    onCancel: () => void;
    onConfirm: () => void;
};

function RevertDraftDialog({
    phase,
    errorMessage,
    onCancel,
    onConfirm,
}: RevertDraftDialogProps) {
    const cancelRef = useRef<HTMLButtonElement>(null);
    const confirmRef = useRef<HTMLButtonElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const busy = phase === "reverting";

    useEffect(() => {
        if (phase === "failed") {
            confirmRef.current?.focus();
            return;
        }

        cancelRef.current?.focus();
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

        const focusable = [...dialog.querySelectorAll<HTMLElement>("button:not([disabled])")];
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

    const title = phase === "failed" ? "Revert failed" : "Discard unsaved changes?";
    const message = phase === "failed"
        ? errorMessage ?? "The saved draft could not be restored. Your unsaved edits are still here."
        : phase === "reverting"
            ? "Restoring the last saved draft. Published displays are not changed."
            : "All unsaved edits will be discarded. The editor will return to the last saved draft. Published displays are not changed.";

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 p-4"
            onMouseDown={handleBackdropMouseDown}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="revert-draft-title"
                aria-describedby="revert-draft-message"
                onKeyDown={handleKeyDown}
                className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-panel"
            >
                <h2 id="revert-draft-title" className="text-base font-semibold text-foreground">
                    {title}
                </h2>
                <p id="revert-draft-message" className="mt-2 text-sm leading-5 text-secondary">
                    {message}
                </p>
                <div className="mt-5 flex justify-end gap-2">
                    <button
                        ref={cancelRef}
                        type="button"
                        onClick={onCancel}
                        className="h-9 rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
                    >
                        {phase === "failed" ? "Close" : "Cancel"}
                    </button>
                    <button
                        ref={confirmRef}
                        type="button"
                        onClick={onConfirm}
                        disabled={busy}
                        className={
                            busy
                                ? "h-9 cursor-not-allowed rounded-control border border-danger-strong/40 bg-danger-strong/40 px-3 text-sm font-medium text-white opacity-60"
                                : "h-9 rounded-control border border-danger-strong bg-danger-strong px-3 text-sm font-medium text-white transition-colors duration-150 hover:border-danger-strong-hover hover:bg-danger-strong-hover"
                        }
                    >
                        {phase === "failed" ? "Try again" : "Discard Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export type { RevertDraftPhase };
export default RevertDraftDialog;
