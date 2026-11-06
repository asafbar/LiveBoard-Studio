import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import {
    boardSizeForOrientation,
    type BoardOrientation,
} from "../boardOrientation.ts";
import BoardRenderer from "./BoardRenderer.tsx";
import {
    boardTemplateById,
    boardTemplates,
    type BoardTemplateId,
} from "../templates/boardTemplates.ts";
import type { Board } from "../types/boardTypes.ts";
import {
    BoardRequestError,
    createBoard,
    type BoardWriteResult,
} from "../api/BoardApi.ts";

type CreateBoardDialogProps = {
    onClose: () => void;
    onCreated: (board: BoardWriteResult) => void;
};

const MAX_BOARD_NAME_LENGTH = 200;
const fieldClassName = "h-9 w-full rounded-control border border-border bg-surface-raised px-3 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-60";

function CreateBoardDialog({ onClose, onCreated }: CreateBoardDialogProps) {
    const [name, setName] = useState("");
    const [orientation, setOrientation] = useState<BoardOrientation>("landscape");
    const [templateId, setTemplateId] = useState<BoardTemplateId | "blank">("blank");
    const templatePreviews = useMemo(() => boardTemplates.map((template) => ({
        template,
        board: template.createDraft(template.name),
    })), []);
    const [nameError, setNameError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const submittingRef = useRef(false);
    const nameRef = useRef<HTMLInputElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);

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

        const nextNameError = readBoardNameError(name);
        setNameError(nextNameError);
        setFormError(null);

        if (nextNameError !== null) {
            return;
        }

        submittingRef.current = true;
        setSubmitting(true);

        try {
            const created = templateId === "blank"
                ? await createBoard(name.trim(), boardSizeForOrientation(orientation))
                : await createFromTemplate(name.trim(), templateId);
            onCreated(created);
        } catch (error: unknown) {
            const editorError = readCreateError(error);
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
                aria-labelledby="create-board-title"
                tabIndex={-1}
                onKeyDown={handleKeyDown}
                className="max-h-[min(920px,calc(100vh-2rem))] w-full max-w-5xl overflow-y-auto rounded-lg border border-border bg-surface p-5 shadow-panel outline-none"
            >
                <h2 id="create-board-title" className="text-base font-semibold text-foreground">
                    New Board
                </h2>
                <p className="mt-2 text-sm leading-5 text-secondary">
                    The new board starts unpublished. Choose a blank board or a ready-made template.
                </p>
                <form className="mt-4 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
                    <fieldset disabled={submitting}>
                        <legend className="text-xs text-muted">Template</legend>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Board template">
                            <TemplateChoice
                                name="Blank Board"
                                description="Start with an empty board."
                                detail={orientation === "portrait" ? "Portrait 1080 × 1920" : "Landscape 1920 × 1080"}
                                selected={templateId === "blank"}
                                preview={blankPreview(orientation)}
                                onSelect={() => setTemplateId("blank")}
                            />
                            {templatePreviews.map(({ template, board }) => (
                                <TemplateChoice
                                    key={template.id}
                                    name={template.name}
                                    description={template.description}
                                    detail={template.orientation === "portrait" ? "Portrait 1080 × 1920" : "Landscape 1920 × 1080"}
                                    selected={templateId === template.id}
                                    preview={board}
                                    onSelect={() => {
                                        setTemplateId(template.id);
                                        setOrientation(template.orientation);
                                    }}
                                />
                            ))}
                        </div>
                    </fieldset>
                    {templateId === "blank" ? (
                    <fieldset className="flex flex-col gap-2" disabled={submitting}>
                        <legend className="text-xs text-muted">Orientation</legend>
                        <div className="grid grid-cols-2 gap-2">
                            <OrientationChoice
                                label="Landscape"
                                detail="1920 × 1080"
                                selected={orientation === "landscape"}
                                onSelect={() => setOrientation("landscape")}
                            />
                            <OrientationChoice
                                label="Portrait"
                                detail="1080 × 1920"
                                selected={orientation === "portrait"}
                                onSelect={() => setOrientation("portrait")}
                            />
                        </div>
                    </fieldset>
                    ) : (
                        <p className="text-xs text-muted">
                            The selected template sets the board orientation.
                        </p>
                    )}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="board-name" className="text-xs text-muted">
                            Board name
                        </label>
                        <input
                            ref={nameRef}
                            id="board-name"
                            value={name}
                            spellCheck={false}
                            autoComplete="off"
                            disabled={submitting}
                            aria-required="true"
                            aria-invalid={nameError !== null}
                            aria-describedby={nameError !== null ? "board-name-error" : undefined}
                            onChange={(event) => {
                                setName(event.target.value);
                                setNameError(null);
                            }}
                            className={fieldClassName}
                        />
                        {nameError !== null ? (
                            <p id="board-name-error" role="alert" className="text-sm text-danger">
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
                            disabled={submitting}
                            className={
                                submitting
                                    ? "h-9 cursor-not-allowed rounded-control bg-accent/40 px-3 text-sm font-medium text-white opacity-60"
                                    : "h-9 rounded-control bg-accent px-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
                            }
                        >
                            {submitting ? "Creating..." : "Create Board"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

type TemplateChoiceProps = {
    name: string;
    description: string;
    detail: string;
    selected: boolean;
    preview: Board;
    onSelect: () => void;
};

function TemplateChoice({
    name,
    description,
    detail,
    selected,
    preview,
    onSelect,
}: TemplateChoiceProps) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={onSelect}
            className={
                selected
                    ? "flex flex-col gap-2 rounded-md border border-cyan/70 bg-surface-raised p-2 text-left"
                    : "flex flex-col gap-2 rounded-md border border-border bg-surface-raised/40 p-2 text-left transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover"
            }
        >
            <span inert aria-hidden="true" className="pointer-events-none flex h-36 w-full overflow-hidden rounded-md border border-border bg-canvas">
                <BoardRenderer board={preview} framed={false} />
            </span>
            <span className="block text-sm font-medium text-foreground">{name}</span>
            <span className="block text-xs leading-4 text-secondary">{description}</span>
            <span className="block text-xs text-muted">{detail}</span>
        </button>
    );
}

function blankPreview(orientation: BoardOrientation): Board {
    const size = boardSizeForOrientation(orientation);

    return {
        id: "blank-preview",
        name: "Blank board",
        width: size.width,
        height: size.height,
        background: {
            type: "solid",
            color: "#0b1220",
        },
        widgets: [],
    };
}

async function createFromTemplate(name: string, templateId: BoardTemplateId): Promise<BoardWriteResult> {
    const template = boardTemplateById(templateId);
    const draft = template.createDraft(name);

    return createBoard(name, {
        width: draft.width,
        height: draft.height,
    }, {
        background: draft.background,
        widgets: draft.widgets,
    });
}

type OrientationChoiceProps = {
    label: string;
    detail: string;
    selected: boolean;
    onSelect: () => void;
};

function OrientationChoice({
    label,
    detail,
    selected,
    onSelect,
}: OrientationChoiceProps) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onSelect}
            className={
                selected
                    ? "rounded-md border border-cyan/70 bg-surface-raised px-3 py-2 text-left"
                    : "rounded-md border border-border bg-surface-raised/40 px-3 py-2 text-left transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover"
            }
        >
            <span className="block text-sm font-medium text-foreground">{label}</span>
            <span className="block text-xs text-muted">{detail}</span>
        </button>
    );
}

function readBoardNameError(value: string): string | null {
    if (hasControlCharacter(value)) {
        return "Board name is required.";
    }

    const name = value.trim();

    if (name === "" || name.length > MAX_BOARD_NAME_LENGTH) {
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

function readCreateError(error: unknown): {
    nameError: string | null;
    formError: string | null;
} {
    if (!(error instanceof BoardRequestError)) {
        const message = error instanceof Error && error.message.trim() !== ""
            ? error.message
            : "The board could not be created. Check that the API is running, then try again.";

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

export default CreateBoardDialog;
