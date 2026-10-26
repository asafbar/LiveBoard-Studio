import { useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from "react";
import type { Board, BoardBackground, Widget } from "../types/boardTypes.ts";
import AnnouncementsWidget from "./AnnouncementsWidget.tsx";
import ClockWidget from "./ClockWidget.tsx";
import ImageWidget from "./ImageWidget.tsx";
import InformationCardWidget from "./InformationCardWidget.tsx";
import styles from "./BoardRenderer.module.css";
import TextWidget from "./TextWidget.tsx";

type BoardRendererProps = {
    board: Board;
    selectedWidgetId?: string | null;
    onSelectWidget?: (widgetId: string | null) => void;
};

type WidgetViewProps = {
    widget: Widget;
    selected: boolean;
    interactive: boolean;
    onSelectWidget?: (widgetId: string | null) => void;
};

type StageStyle = CSSProperties & {
    "--board-width": string;
};

type WidgetFrameStyle = CSSProperties & {
    "--widget-radius"?: string;
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

function widgetAccessibleName(widget: Widget): string {
    switch (widget.type) {
        case "text":
            return widget.settings.text;
        case "clock":
            return "Clock";
        case "image":
            return widget.settings.alt.length > 0 ? widget.settings.alt : "Image";
        case "information-card":
            return widget.settings.title;
        case "announcements":
            return widget.settings.title;
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
        case "announcements":
            return <AnnouncementsWidget settings={widget.settings} />;
    }
}

function selectionRadius(widget: Widget): string | undefined {
    switch (widget.type) {
        case "image":
        case "information-card":
        case "announcements":
            return `${widget.settings.borderRadius}px`;
        case "text":
        case "clock":
            return undefined;
    }
}

function WidgetView({ widget, selected, interactive, onSelectWidget }: WidgetViewProps) {
    const content = renderWidget(widget);
    const className = [
        styles.widget,
        interactive ? styles.widgetSelectable : "",
        selected ? styles.widgetSelected : "",
    ].filter((name) => name.length > 0).join(" ");
    const radius = selectionRadius(widget);
    const frameStyle: WidgetFrameStyle = {
        left: widget.layout.x,
        top: widget.layout.y,
        width: widget.layout.width,
        height: widget.layout.height,
    };

    if (radius !== undefined) {
        frameStyle["--widget-radius"] = radius;
    }

    function handleClick(event: MouseEvent<HTMLDivElement>) {
        event.stopPropagation();
        onSelectWidget?.(widget.id);
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key !== "Enter" && event.key !== " ") {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        onSelectWidget?.(widget.id);
    }

    return (
        <div
            className={className}
            style={frameStyle}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-pressed={interactive ? selected : undefined}
            aria-label={interactive ? widgetAccessibleName(widget) : undefined}
            onClick={interactive ? handleClick : undefined}
            onKeyDown={interactive ? handleKeyDown : undefined}
        >
            {content}
        </div>
    );
}

function BoardRenderer({ board, selectedWidgetId = null, onSelectWidget }: BoardRendererProps) {
    const interactive = onSelectWidget !== undefined;
    const stageStyle: StageStyle = {
        width: board.width,
        height: board.height,
        "--board-width": `${board.width}px`,
    };

    function handleStageClick() {
        onSelectWidget?.(null);
    }

    return (
        <div className={styles.root}>
            <div className={styles.frame} aria-label={board.name}>
                <div
                    className={styles.stage}
                    style={stageStyle}
                    onClick={interactive ? handleStageClick : undefined}
                >
                    <BoardBackgroundLayer background={board.background} />
                    {board.widgets.map((widget) => (
                        <WidgetView
                            key={widget.id}
                            widget={widget}
                            selected={interactive && widget.id === selectedWidgetId}
                            interactive={interactive}
                            onSelectWidget={onSelectWidget}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default BoardRenderer;
