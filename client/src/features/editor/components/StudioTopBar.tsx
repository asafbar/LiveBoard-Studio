import StudioIcon from "./StudioIcon.tsx";

function StudioTopBar() {
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

            <div className="flex min-w-64 items-center justify-end gap-2">
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
