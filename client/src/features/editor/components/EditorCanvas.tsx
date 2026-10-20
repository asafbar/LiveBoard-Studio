import BoardRenderer from "../../boards/components/BoardRenderer.tsx";
import { techSummitBoard } from "../../boards/data/techSummitBoard.ts";
import styles from "./EditorCanvas.module.css";

function EditorCanvas() {
    return (
        <section className="flex min-h-0 min-w-0 flex-1 bg-canvas" aria-label="Board canvas">
            <div className={styles.viewport}>
                <BoardRenderer board={techSummitBoard} />
            </div>
        </section>
    );
}

export default EditorCanvas;
