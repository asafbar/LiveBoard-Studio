import BoardRenderer from "../../boards/components/BoardRenderer.tsx";
import type { Board, WidgetLayout } from "../../boards/types/boardTypes.ts";
import styles from "./EditorCanvas.module.css";

type EditorCanvasProps = {
    board: Board;
    selectedWidgetId: string | null;
    onSelectWidget: (widgetId: string | null) => void;
    onWidgetPositionChange: (widgetId: string, position: { x: number; y: number }) => void;
    onWidgetLayoutChange: (widgetId: string, layout: WidgetLayout) => void;
};

function EditorCanvas({
    board,
    selectedWidgetId,
    onSelectWidget,
    onWidgetPositionChange,
    onWidgetLayoutChange,
}: EditorCanvasProps) {
    return (
        <section className="flex min-h-0 min-w-0 flex-1 bg-canvas" aria-label="Board canvas">
            <div className={styles.viewport}>
                <BoardRenderer
                    board={board}
                    selectedWidgetId={selectedWidgetId}
                    onSelectWidget={onSelectWidget}
                    onWidgetPositionChange={onWidgetPositionChange}
                    onWidgetLayoutChange={onWidgetLayoutChange}
                />
            </div>
        </section>
    );
}

export default EditorCanvas;
