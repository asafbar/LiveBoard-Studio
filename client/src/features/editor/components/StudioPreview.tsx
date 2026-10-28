import BoardRenderer from "../../boards/components/BoardRenderer.tsx";
import type { Board } from "../../boards/types/boardTypes.ts";

type StudioPreviewProps = {
    board: Board;
    onBack: () => void;
};

function StudioPreview({ board, onBack }: StudioPreviewProps) {
    return (
        <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-canvas font-sans text-foreground antialiased">
            <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex h-9 items-center rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
                >
                    Back to Studio
                </button>
                <p className="truncate text-sm font-medium text-foreground">{board.name}</p>
                <p className="text-xs font-medium tracking-wide text-muted uppercase">Preview</p>
            </header>
            <div className="flex min-h-0 flex-1">
                <BoardRenderer board={board} framed={false} />
            </div>
        </div>
    );
}

export default StudioPreview;
