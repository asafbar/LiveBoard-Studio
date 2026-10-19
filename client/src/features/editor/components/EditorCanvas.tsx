import styles from "./EditorCanvas.module.css";

function EditorCanvas() {
    return (
        <section className="flex min-h-0 min-w-0 flex-1 bg-canvas" aria-label="Board canvas">
            <div className={styles.viewport}>
                <div className={styles.board}>
                    <div className={styles.grid} />
                    <div className={styles.placeholder}>
                        <h2 className={styles.title}>Tech Summit 2026</h2>
                        <p className={styles.subtitle}>Board canvas - 1920 x 1080</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default EditorCanvas;
