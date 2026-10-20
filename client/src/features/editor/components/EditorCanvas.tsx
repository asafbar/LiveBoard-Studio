import BoardRenderer from "../../boards/components/BoardRenderer.tsx";
import { techSummitBoard } from "../../boards/data/techSummitBoard.ts";
import styles from "./EditorCanvas.module.css";

type EditorCanvasProps = {
    selectedWidgetId: string | null;
    onSelectWidget: (widgetId: string | null) => void;
};

function EditorCanvas({ selectedWidgetId, onSelectWidget }: EditorCanvasProps) {
    return (
        <section className="flex min-h-0 min-w-0 flex-1 bg-canvas" aria-label="Board canvas">
            <div className={styles.viewport}>
                <BoardRenderer
                    board={techSummitBoard}
                    selectedWidgetId={selectedWidgetId}
                    onSelectWidget={onSelectWidget}
                />
            </div>
        </section>
    );
}

export default EditorCanvas;
