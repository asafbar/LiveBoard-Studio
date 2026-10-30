import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import type { BoardSummary } from "../../boards/api/BoardApi.ts";
import {
    createDisplay,
    DisplayRequestError,
    updateDisplay,
    type DisplayRecord,
    type UpdateDisplayPayload,
} from "../api/displayApi.ts";

type DisplayEditorMode = "create" | "edit";

type DisplayEditorDialogProps = {
    mode: DisplayEditorMode;
    display: DisplayRecord | null;
    boards: BoardSummary[];
    onClose: () => void;
    onSaved: (display: DisplayRecord) => void;
};

const MAX_DISPLAY_NAME_LENGTH = 200;
const fieldClassName = "h-9 w-full rounded-control border border-border bg-surface-raised px-3 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-60";

function DisplayEditorDialog({
    mode,
    display,
    boards,
    onClose,
    onSaved,
}: DisplayEditorDialogProps) {
    const [name, setName] = useState(display?.name ?? "");
    const [boardValue, setBoardValue] = useState(display?.boardId ?? "");
    const [nameError, setNameError] = useState<string | null>(null);
    const [boardError, setBoardError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const submittingRef = useRef(false);
    const nameRef = useRef<HTMLInputElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const unchanged = mode === "edit"
        && display !== null
        && !hasDisplayChanges(display, name, boardValue);
    const boardChanged = mode === "edit"
        && display !== null
        && !isSameBoard(boardValue, display.boardId);

    useEffect(() => {
        nameRef.current?.focus();
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

        if (submittingRef.current) {
            return;
        }

        const nextNameError = readDisplayNameError(name);
        setNameError(nextNameError);
        setBoardError(null);
        setFormError(null);

        if (nextNameError !== null || unchanged) {
            return;
        }

        submittingRef.current = true;
        setSubmitting(true);

        try {
            const saved = await saveDisplay(mode, display, name, boardValue);
            onSaved(saved);
        } catch (error: unknown) {
            const editorError = readEditorError(error);
            setNameError(editorError.nameError);
            setBoardError(editorError.boardError);
            setFormError(editorError.formError);
            submittingRef.current = false;
            setSubmitting(false);
        }
    }

    const title = mode === "create" ? "Add Screen" : "Manage Screen";
    const submitLabel = submitting
        ? (mode === "create" ? "Adding..." : "Saving...")
        : (mode === "create" ? "Add Screen" : "Save");
    const selectedBoardKnown = boardValue === ""
        || boards.some((board) => board.id.toLowerCase() === boardValue.toLowerCase());

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
            onMouseDown={handleBackdropMouseDown}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="display-editor-title"
                tabIndex={-1}
                onKeyDown={handleKeyDown}
                className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-panel outline-none"
            >
                <h2 id="display-editor-title" className="text-base font-semibold text-foreground">
                    {title}
                </h2>
                <form className="mt-4 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="display-name" className="text-xs text-muted">
                            Display name
                        </label>
                        <input
                            ref={nameRef}
                            id="display-name"
                            value={name}
                            spellCheck={false}
                            autoComplete="off"
                            disabled={submitting}
                            aria-required="true"
                            aria-invalid={nameError !== null}
                            aria-describedby={nameError !== null ? "display-name-error" : undefined}
                            onChange={(event) => {
                                setName(event.target.value);
                                setNameError(null);
                            }}
                            className={fieldClassName}
                        />
                        {nameError !== null ? (
                            <p id="display-name-error" role="alert" className="text-sm text-danger">
                                {nameError}
                            </p>
                        ) : null}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="display-board" className="text-xs text-muted">
                            Assigned board
                        </label>
                        <select
                            id="display-board"
                            value={boardValue}
                            disabled={submitting}
                            aria-invalid={boardError !== null}
                            aria-describedby={describeBoard(boardError, boardChanged)}
                            onChange={(event) => {
                                setBoardValue(event.target.value);
                                setBoardError(null);
                            }}
                            className={fieldClassName}
                        >
                            <option value="">No board assigned</option>
                            {boardValue !== "" && !selectedBoardKnown ? (
                                <option value={boardValue}>Assigned board unavailable</option>
                            ) : null}
                            {boards.map((board) => (
                                <option key={board.id} value={board.id}>
                                    {board.name}
                                </option>
                            ))}
                        </select>
                        {boardError !== null ? (
                            <p id="display-board-error" role="alert" className="text-sm text-danger">
                                {boardError}
                            </p>
                        ) : null}
                        {boardChanged ? (
                            <p id="display-board-note" className="text-sm leading-5 text-secondary">
                                An already open screen may need to be reloaded to show its new assigned board.
                            </p>
                        ) : null}
                    </div>
                    {mode === "edit" && display !== null ? (
                        <div className="rounded-control border border-border bg-surface-raised px-3 py-2">
                            <p className="text-xs text-muted">Status</p>
                            <p className={`mt-1 text-sm font-medium ${display.online ? "text-cyan" : "text-muted"}`}>
                                {display.online ? "Online" : "Offline"}
                            </p>
                            <p className="mt-3 text-xs text-muted">Screen ID</p>
                            <p className="mt-1 font-mono text-xs break-all text-secondary">{display.id}</p>
                        </div>
                    ) : null}
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
                            {submitLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function describeBoard(boardError: string | null, boardChanged: boolean): string | undefined {
    const ids = [
        boardError !== null ? "display-board-error" : null,
        boardChanged ? "display-board-note" : null,
    ].filter((id): id is string => id !== null);

    if (ids.length === 0) {
        return undefined;
    }

    return ids.join(" ");
}

async function saveDisplay(
    mode: DisplayEditorMode,
    display: DisplayRecord | null,
    name: string,
    boardValue: string,
): Promise<DisplayRecord> {
    if (mode === "create") {
        return createDisplay({
            name: name.trim(),
            boardId: boardValue === "" ? null : boardValue,
        });
    }

    if (display === null) {
        throw new DisplayRequestError("This display address is not valid.", {});
    }

    return updateDisplay(display.id, buildDisplayUpdate(display, name, boardValue));
}

function hasDisplayChanges(display: DisplayRecord, name: string, boardValue: string): boolean {
    return name.trim() !== display.name || !isSameBoard(boardValue, display.boardId);
}

function isSameBoard(boardValue: string, boardId: string | null): boolean {
    if (boardValue === "") {
        return boardId === null;
    }

    if (boardId === null) {
        return false;
    }

    return boardValue.toLowerCase() === boardId.toLowerCase();
}

function buildDisplayUpdate(
    display: DisplayRecord,
    name: string,
    boardValue: string,
): UpdateDisplayPayload {
    const payload: UpdateDisplayPayload = {};
    const trimmedName = name.trim();

    if (trimmedName !== display.name) {
        payload.name = trimmedName;
    }

    if (!isSameBoard(boardValue, display.boardId)) {
        payload.boardId = boardValue === "" ? null : boardValue;
    }

    return payload;
}

function readDisplayNameError(value: string): string | null {
    if (hasControlCharacter(value)) {
        return "Display name is required.";
    }

    const name = value.trim();

    if (name === "" || name.length > MAX_DISPLAY_NAME_LENGTH) {
        return "Display name is required and must be at most 200 characters.";
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

function readEditorError(error: unknown): {
    nameError: string | null;
    boardError: string | null;
    formError: string | null;
} {
    if (!(error instanceof DisplayRequestError)) {
        const message = error instanceof Error && error.message.trim() !== ""
            ? error.message
            : "The screen could not be saved. Check that the API is running, then try again.";

        return {
            nameError: null,
            boardError: null,
            formError: message,
        };
    }

    const nameError = error.fieldErrors.name ?? null;
    const boardError = error.fieldErrors.boardId ?? null;
    const formError = nameError === null && boardError === null
        ? error.message
        : error.message === "Validation failed."
            ? null
            : error.message;

    return {
        nameError,
        boardError,
        formError,
    };
}

export default DisplayEditorDialog;
