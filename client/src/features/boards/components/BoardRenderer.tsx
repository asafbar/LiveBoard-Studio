import type { CSSProperties } from "react";
import type { Board, Widget } from "../types/boardTypes.ts";
import ClockWidget from "./ClockWidget.tsx";
import styles from "./BoardRenderer.module.css";
import TextWidget from "./TextWidget.tsx";

type BoardRendererProps = {
    board: Board;
};

type WidgetViewProps = {
    widget: Widget;
};

type StageStyle = CSSProperties & {
    "--board-width": string;
};

function WidgetView({ widget }: WidgetViewProps) {
    const content = widget.type === "text"
        ? <TextWidget settings={widget.settings} />
        : <ClockWidget settings={widget.settings} />;

    return (
        <div
            className={styles.widget}
            style={{
                left: widget.layout.x,
                top: widget.layout.y,
                width: widget.layout.width,
                height: widget.layout.height,
            }}
        >
            {content}
        </div>
    );
}

function BoardRenderer({ board }: BoardRendererProps) {
    const stageStyle: StageStyle = {
        width: board.width,
        height: board.height,
        "--board-width": `${board.width}px`,
    };

    return (
        <div className={styles.root}>
            <div className={styles.frame} aria-label={board.name}>
                <div className={styles.stage} style={stageStyle}>
                    {board.widgets.map((widget) => (
                        <WidgetView key={widget.id} widget={widget} />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default BoardRenderer;
