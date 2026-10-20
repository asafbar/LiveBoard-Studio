export type WidgetType = "text" | "clock" | "image" | "information-card";

export type WidgetLayout = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type TextWidgetSettings = {
    text: string;
    tone: "default" | "accent";
    size: "title" | "display";
};

export type ClockWidgetSettings = {
    timeZone: string;
    showDate: boolean;
    showSeconds: boolean;
    align: "left" | "right";
};

export type ImageWidgetSettings = {
    src: string;
    alt: string;
    objectFit: "cover" | "contain";
    borderRadius: number;
    fallbackBackgroundColor: string;
};

export type InformationCardWidgetSettings = {
    title: string;
    subtitle?: string;
    description?: string;
    badge?: string;
    imageSrc?: string;
    backgroundColor: string;
    textColor: string;
    borderRadius: number;
};

export type Widget = {
    id: string;
    layout: WidgetLayout;
} & (
    | {
        type: "text";
        settings: TextWidgetSettings;
    }
    | {
        type: "clock";
        settings: ClockWidgetSettings;
    }
    | {
        type: "image";
        settings: ImageWidgetSettings;
    }
    | {
        type: "information-card";
        settings: InformationCardWidgetSettings;
    }
);

export type BoardBackground =
    | {
        type: "solid";
        color: string;
    }
    | {
        type: "gradient";
        from: string;
        to: string;
        angle: number;
    }
    | {
        type: "image";
        src: string;
        fit: "cover" | "contain";
        position: string;
        fallbackColor: string;
    };

export type Board = {
    id: string;
    name: string;
    width: number;
    height: number;
    background: BoardBackground;
    widgets: Widget[];
};
