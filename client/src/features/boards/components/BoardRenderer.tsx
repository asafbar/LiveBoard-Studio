import { useState, type CSSProperties } from "react";
import type { Board, BoardBackground, Widget } from "../types/boardTypes.ts";
import ClockWidget from "./ClockWidget.tsx";
import ImageWidget from "./ImageWidget.tsx";
import InformationCardWidget from "./InformationCardWidget.tsx";
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

type BoardBackgroundLayerProps = {
    background: BoardBackground;
};

type ImageBackgroundProps = {
    background: Extract<BoardBackground, { type: "image" }>;
};

type LoadFailure = {
    src: string;
    failed: boolean;
};

function ImageBoardBackground({ background }: ImageBackgroundProps) {
    const [loadFailure, setLoadFailure] = useState<LoadFailure>({
        src: background.src,
        failed: false,
    });
    const failed = loadFailure.src === background.src && loadFailure.failed;
    const showImage = background.src.length > 0 && !failed;
    const fitClass = background.fit === "cover" ? styles.backgroundCover : styles.backgroundContain;

    return (
        <div
            className={styles.background}
            style={{ backgroundColor: background.fallbackColor }}
            aria-hidden="true"
        >
            {showImage ? (
                <img
                    className={`${styles.backgroundImage} ${fitClass}`}
                    src={background.src}
                    alt=""
                    style={{ objectPosition: background.position }}
                    onError={() => {
                        setLoadFailure({
                            src: background.src,
                            failed: true,
                        });
                    }}
                />
            ) : null}
        </div>
    );
}

function BoardBackgroundLayer({ background }: BoardBackgroundLayerProps) {
    switch (background.type) {
        case "solid":
            return (
                <div
                    className={styles.background}
                    style={{ backgroundColor: background.color }}
                    aria-hidden="true"
                />
            );
        case "gradient":
            return (
                <div
                    className={styles.background}
                    style={{
                        backgroundImage: `linear-gradient(${background.angle}deg, ${background.from}, ${background.to})`,
                    }}
                    aria-hidden="true"
                />
            );
        case "image":
            return <ImageBoardBackground background={background} />;
    }
}

function renderWidget(widget: Widget) {
    switch (widget.type) {
        case "text":
            return <TextWidget settings={widget.settings} />;
        case "clock":
            return <ClockWidget settings={widget.settings} />;
        case "image":
            return <ImageWidget settings={widget.settings} />;
        case "information-card":
            return <InformationCardWidget settings={widget.settings} />;
    }
}

function WidgetView({ widget }: WidgetViewProps) {
    const content = renderWidget(widget);

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
                    <BoardBackgroundLayer background={board.background} />
                    {board.widgets.map((widget) => (
                        <WidgetView key={widget.id} widget={widget} />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default BoardRenderer;
