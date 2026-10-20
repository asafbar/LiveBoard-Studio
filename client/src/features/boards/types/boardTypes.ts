export type WidgetType = "text" | "clock";

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
);

export type Board = {
    id: string;
    name: string;
    width: number;
    height: number;
    widgets: Widget[];
};
