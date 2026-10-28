import StudioIcon from "./StudioIcon.tsx";

export type DraftSaveStatus = "saved" | "unsaved" | "saving" | "failed";

type StudioTopBarProps = {
    saveStatus: DraftSaveStatus | null;
    saveError: string | null;
    saveDisabled: boolean;
    onSave: () => void;
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

function StudioTopBar({ saveStatus, saveError, saveDisabled, onSave }: StudioTopBarProps) {
    const statusLabel = saveStatus === null ? null : saveStatusLabel[saveStatus];
    const statusDescription = saveStatus === "failed" && saveError !== null
        ? `Save failed. ${saveError}`
        : undefined;

    return (
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-surface px-4">
            <div className="flex min-w-64 items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-control bg-linear-to-br from-accent to-cyan text-[11px] font-semibold tracking-wide text-background">
                    LB
                </span>
                <span className="text-sm font-semibold tracking-tight text-foreground">
                    LiveBoard Studio
                </span>
            </div>

            <div className="flex flex-1 justify-center">
                <p className="rounded-control border border-border bg-surface-raised px-4 py-1.5 text-sm font-medium text-foreground">
                    Tech Summit 2026
                </p>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2">
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
                    className="inline-flex h-9 items-center gap-2 rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-secondary transition-colors duration-150 hover:bg-surface-hover"
                >
                    <StudioIcon name="preview" />
                    Preview
                </button>
                <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-control bg-accent px-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
                >
                    <StudioIcon name="publish" />
                    Publish
                </button>
            </div>
        </header>
    );
}

export default StudioTopBar;
