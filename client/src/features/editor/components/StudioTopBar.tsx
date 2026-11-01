import { Link } from "react-router-dom";
import LogoutButton from "../../auth/components/LogoutButton.tsx";
import StudioIcon from "./StudioIcon.tsx";

export type DraftSaveStatus = "saved" | "unsaved" | "saving" | "failed";

type StudioTopBarProps = {
    boardName: string;
    saveStatus: DraftSaveStatus | null;
    saveError: string | null;
    saveDisabled: boolean;
    previewDisabled: boolean;
    publishDisabled: boolean;
    publishGuidance: string | null;
    displayPath: string | null;
    onSave: () => void;
    onPreview: () => void;
    onPublish: () => void;
};

const saveStatusLabel: Record<DraftSaveStatus, string> = {
    saved: "Saved",
    unsaved: "Unsaved changes",
    saving: "Saving...",
    failed: "Save failed",
};

const saveStatusClassName: Record<DraftSaveStatus, string> = {
    saved: "text-secondary",
    unsaved: "text-foreground",
    saving: "text-secondary",
    failed: "text-danger",
};

const saveStatusDotClassName: Record<DraftSaveStatus, string> = {
    saved: "bg-cyan",
    unsaved: "bg-foreground",
    saving: "bg-secondary",
    failed: "bg-danger",
};

function StudioTopBar({
    boardName,
    saveStatus,
    saveError,
    saveDisabled,
    previewDisabled,
    publishDisabled,
    publishGuidance,
    displayPath,
    onSave,
    onPreview,
    onPublish,
}: StudioTopBarProps) {
    const statusLabel = saveStatus === null ? null : saveStatusLabel[saveStatus];
    const statusDescription = saveStatus === "failed" && saveError !== null
        ? `Save failed. ${saveError}`
        : undefined;

    return (
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-surface px-4">
            <div className="flex shrink-0 items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-control bg-linear-to-br from-accent to-cyan text-[11px] font-semibold tracking-wide text-background">
                    LB
                </span>
                <span className="text-sm font-semibold tracking-tight text-foreground">
                    LiveBoard Studio
                </span>
                <Link
                    to="/displays"
                    className="inline-flex h-9 items-center rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
                >
                    Displays
                </Link>
                <Link
                    to="/boards"
                    className="inline-flex h-9 items-center rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
                >
                    Boards
                </Link>
                <Link
                    to="/media"
                    className="inline-flex h-9 items-center rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
                >
                    Media Library
                </Link>
                <LogoutButton />
            </div>

            <div className="flex min-w-0 flex-1 justify-center">
                <p className="truncate rounded-control border border-border bg-surface-raised px-4 py-1.5 text-sm font-medium text-foreground">
                    {boardName}
                </p>
            </div>

            <div className="flex shrink-0 flex-col items-end justify-center gap-1">
                <div className="flex items-center justify-end gap-2">
                {statusLabel !== null && saveStatus !== null ? (
                    <p
                        role="status"
                        aria-live="polite"
                        aria-label={statusDescription}
                        title={statusDescription}
                        className={`inline-flex items-center gap-2 text-xs font-medium ${saveStatusClassName[saveStatus]}`}
                    >
                        <span
                            className={`size-1.5 rounded-full ${saveStatusDotClassName[saveStatus]}`}
                            aria-hidden="true"
                        />
                        {statusLabel}
                    </p>
                ) : null}
                <button
                    type="button"
                    onClick={onSave}
                    disabled={saveDisabled}
                    className={
                        saveDisabled
                            ? "inline-flex h-9 cursor-not-allowed items-center rounded-control border border-border bg-surface-raised/40 px-3 text-sm font-medium text-muted opacity-60"
                            : "inline-flex h-9 items-center rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-secondary transition-colors duration-150 hover:bg-surface-hover"
                    }
                >
                    Save
                </button>
                <button
                    type="button"
                    onClick={onPreview}
                    disabled={previewDisabled}
                    className={
                        previewDisabled
                            ? "inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-control border border-border bg-surface-raised/40 px-3 text-sm font-medium text-muted opacity-60"
                            : "inline-flex h-9 items-center gap-2 rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-secondary transition-colors duration-150 hover:bg-surface-hover"
                    }
                >
                    <StudioIcon name="preview" />
                    Preview
                </button>
                {displayPath === null ? (
                    <button
                        type="button"
                        disabled
                        className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-control border border-border bg-surface-raised/40 px-3 text-sm font-medium text-muted opacity-60"
                    >
                        <StudioIcon name="open-display" />
                        Open Display
                    </button>
                ) : (
                    <a
                        href={displayPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 items-center gap-2 rounded-control border border-cyan/40 px-3 text-sm font-medium text-cyan transition-colors duration-150 hover:bg-cyan/10"
                    >
                        <StudioIcon name="open-display" />
                        Open Display
                        <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                )}
                <span title={publishGuidance ?? undefined} className="inline-flex">
                    <button
                        type="button"
                        onClick={onPublish}
                        disabled={publishDisabled}
                        aria-describedby={publishGuidance !== null ? "publish-guidance" : undefined}
                        className={
                            publishDisabled
                                ? "inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-control bg-accent/40 px-3 text-sm font-medium text-white opacity-60"
                                : "inline-flex h-9 items-center gap-2 rounded-control bg-accent px-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
                        }
                    >
                        <StudioIcon name="publish" />
                        Publish
                    </button>
                </span>
                </div>
                <p
                    id="publish-guidance"
                    aria-live="polite"
                    className={`h-4 text-right text-[11px] leading-4 font-medium ${
                        publishGuidance === null ? "" : "text-warning"
                    }`}
                >
                    {publishGuidance}
                </p>
            </div>
        </header>
    );
}

export default StudioTopBar;
