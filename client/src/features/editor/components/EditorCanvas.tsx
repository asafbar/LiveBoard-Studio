import type { KeyboardEvent } from "react";
import BoardRenderer from "../../boards/components/BoardRenderer.tsx";
import type { Board, WidgetLayout } from "../../boards/types/boardTypes.ts";
import styles from "./EditorCanvas.module.css";

type EditorCanvasProps = {
    board: Board;
    selectedWidgetId: string | null;
    onSelectWidget: (widgetId: string | null) => void;
    onWidgetPositionChange: (widgetId: string, position: { x: number; y: number }) => void;
    onWidgetLayoutChange: (widgetId: string, layout: WidgetLayout) => void;
    onGestureEnd: () => void;
    onDeleteSelectedWidget: () => void;
};

function isTextEditingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    if (target.isContentEditable) {
        return true;
    }

    return target.closest("input, textarea, select") !== null;
}

function EditorCanvas({
    board,
    selectedWidgetId,
    onSelectWidget,
    onWidgetPositionChange,
    onWidgetLayoutChange,
    onGestureEnd,
    onDeleteSelectedWidget,
}: EditorCanvasProps) {
    function handleCanvasKeyDown(event: KeyboardEvent<HTMLElement>) {
        if (event.key !== "Delete" && event.key !== "Backspace") {
            return;
        }

        if (isTextEditingTarget(event.target)) {
            return;
        }

        event.preventDefault();
        onDeleteSelectedWidget();
    }

    return (
        <section
            className="flex min-h-0 min-w-0 flex-1 bg-canvas"
            aria-label="Board canvas"
            tabIndex={-1}
            onKeyDown={handleCanvasKeyDown}
        >
            <div className={styles.viewport}>
                <BoardRenderer
                    board={board}
                    selectedWidgetId={selectedWidgetId}
                    onSelectWidget={onSelectWidget}
                    onWidgetPositionChange={onWidgetPositionChange}
                    onWidgetLayoutChange={onWidgetLayoutChange}
                    onGestureEnd={onGestureEnd}
                />
            </div>
        </section>
    );
}

export default EditorCanvas;
