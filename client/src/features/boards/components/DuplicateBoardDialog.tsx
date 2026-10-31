import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import {
    BoardRequestError,
    duplicateBoard,
    type BoardWriteResult,
} from "../api/BoardApi.ts";
import type { BoardDirectoryItem } from "../hooks/useBoardDirectory.ts";

type DuplicateBoardDialogProps = {
    board: BoardDirectoryItem;
    onClose: () => void;
    onDuplicated: (board: BoardWriteResult) => void;
};

function DuplicateBoardDialog({ board, onClose, onDuplicated }: DuplicateBoardDialogProps) {
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const submittingRef = useRef(false);
    const dialogRef = useRef<HTMLDivElement>(null);
    const confirmRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        confirmRef.current?.focus();
    }, []);

    useEffect(() => {
        if (!submitting) {
            return;
        }

        dialogRef.current?.focus();
    }, [submitting]);

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
        if (submittingRef.current || event.target !== event.currentTarget) {
            return;
        }

        onClose();
    }

    async function handleDuplicate() {
        if (submittingRef.current) {
            return;
        }

        submittingRef.current = true;
        setSubmitting(true);
        setFormError(null);

        try {
            const created = await duplicateBoard(board.id);
            onDuplicated(created);
        } catch (error: unknown) {
            setFormError(readDuplicateError(error));
            submittingRef.current = false;
            setSubmitting(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
            onMouseDown={handleBackdropMouseDown}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="duplicate-board-title"
                aria-describedby="duplicate-board-note"
                tabIndex={-1}
                onKeyDown={handleKeyDown}
                className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-panel outline-none"
            >
                <h2 id="duplicate-board-title" className="text-base font-semibold text-foreground">
                    Duplicate {board.name}
                </h2>
                <p id="duplicate-board-note" className="mt-2 text-sm leading-5 text-secondary">
                    This copies the saved draft onto a new unpublished board.
                    The published snapshot is not copied, and {board.name} stays unchanged.
                </p>
                {formError !== null ? (
                    <p role="alert" className="mt-4 text-sm text-danger">
                        {formError}
                    </p>
                ) : null}
                <div className="mt-5 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className={
                            submitting
                                ? "h-9 cursor-not-allowed rounded-control border border-border bg-surface-raised/40 px-3 text-sm font-medium text-muted opacity-60"
                                : "h-9 rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
                        }
                    >
                        Cancel
                    </button>
                    <button
                        ref={confirmRef}
                        type="button"
                        onClick={() => {
                            void handleDuplicate();
                        }}
                        disabled={submitting}
                        className={
                            submitting
                                ? "h-9 cursor-not-allowed rounded-control bg-accent/40 px-3 text-sm font-medium text-white opacity-60"
                                : "h-9 rounded-control bg-accent px-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
                        }
                    >
                        {submitting ? "Duplicating..." : "Duplicate"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function readDuplicateError(error: unknown): string {
    if (error instanceof BoardRequestError && error.message.trim() !== "") {
        return error.message;
    }

    if (error instanceof Error && error.message.trim() !== "") {
        return error.message;
    }

    return "The board could not be duplicated. Check that the API is running, then try again.";
}

export default DuplicateBoardDialog;
