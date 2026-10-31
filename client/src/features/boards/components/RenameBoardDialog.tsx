import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import {
    BoardRequestError,
    renameBoard,
    type BoardWriteResult,
} from "../api/BoardApi.ts";
import type { BoardDirectoryItem } from "../hooks/useBoardDirectory.ts";

type RenameBoardDialogProps = {
    board: BoardDirectoryItem;
    onClose: () => void;
    onRenamed: (board: BoardWriteResult) => void;
};

const MAX_BOARD_NAME_LENGTH = 200;
const fieldClassName = "h-9 w-full rounded-control border border-border bg-surface-raised px-3 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-60";

function RenameBoardDialog({ board, onClose, onRenamed }: RenameBoardDialogProps) {
    const [name, setName] = useState(board.name);
    const [nameError, setNameError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const submittingRef = useRef(false);
    const nameRef = useRef<HTMLInputElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const unchanged = name.trim() === board.name && !hasControlCharacter(name);

    useEffect(() => {
        nameRef.current?.focus();
        nameRef.current?.select();
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
            "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
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

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (submittingRef.current || unchanged) {
            return;
        }

        const nextNameError = readBoardNameError(name);
        setNameError(nextNameError);
        setFormError(null);

        if (nextNameError !== null) {
            return;
        }

        submittingRef.current = true;
        setSubmitting(true);

        try {
            const renamed = await renameBoard(board.id, name.trim());
            onRenamed(renamed);
        } catch (error: unknown) {
            const editorError = readRenameError(error);
            setNameError(editorError.nameError);
            setFormError(editorError.formError);
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
                aria-labelledby="rename-board-title"
                tabIndex={-1}
                onKeyDown={handleKeyDown}
                className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-panel outline-none"
            >
                <h2 id="rename-board-title" className="text-base font-semibold text-foreground">
                    Rename Board
                </h2>
                <p className="mt-2 text-sm leading-5 text-secondary">
                    This changes the board name in Boards and Displays. Draft and published content stay as they are.
                </p>
                <form className="mt-4 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="rename-board-name" className="text-xs text-muted">
                            Board name
                        </label>
                        <input
                            ref={nameRef}
                            id="rename-board-name"
                            value={name}
                            spellCheck={false}
                            autoComplete="off"
                            disabled={submitting}
                            aria-required="true"
                            aria-invalid={nameError !== null}
                            aria-describedby={nameError !== null ? "rename-board-name-error" : undefined}
                            onChange={(event) => {
                                setName(event.target.value);
                                setNameError(null);
                            }}
                            className={fieldClassName}
                        />
                        {nameError !== null ? (
                            <p id="rename-board-name-error" role="alert" className="text-sm text-danger">
                                {nameError}
                            </p>
                        ) : null}
                    </div>
                    {formError !== null ? (
                        <p role="alert" className="text-sm text-danger">
                            {formError}
                        </p>
                    ) : null}
                    <div className="flex justify-end gap-2">
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
                            type="submit"
                            disabled={submitting || unchanged}
                            className={
                                submitting || unchanged
                                    ? "h-9 cursor-not-allowed rounded-control bg-accent/40 px-3 text-sm font-medium text-white opacity-60"
                                    : "h-9 rounded-control bg-accent px-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
                            }
                        >
                            {submitting ? "Saving..." : "Save"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function readBoardNameError(value: string): string | null {
    if (hasControlCharacter(value)) {
        return "Board name is required.";
    }

    const trimmed = value.trim();

    if (trimmed === "" || trimmed.length > MAX_BOARD_NAME_LENGTH) {
        return "Board name is required and must be at most 200 characters.";
    }

    return null;
}

function hasControlCharacter(value: string): boolean {
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);

        if (code <= 31 || code === 127) {
            return true;
        }
    }

    return false;
}

function readRenameError(error: unknown): {
    nameError: string | null;
    formError: string | null;
} {
    if (!(error instanceof BoardRequestError)) {
        const message = error instanceof Error && error.message.trim() !== ""
            ? error.message
            : "The board could not be renamed. Check that the API is running, then try again.";

        return {
            nameError: null,
            formError: message,
        };
    }

    const nameError = error.fieldErrors.name ?? (error.statusCode === 409 ? error.message : null);
    const formError = nameError === null
        ? error.message
        : error.message === "Validation failed." || error.message === nameError
            ? null
            : error.message;

    return {
        nameError,
        formError,
    };
}

export default RenameBoardDialog;
