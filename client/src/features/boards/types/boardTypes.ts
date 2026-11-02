export type WidgetType = "text" | "clock" | "image" | "information-card" | "announcements" | "ticker" | "vertical-announcements";

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

export type AnnouncementIconName = "food" | "people" | "music" | "info";

export type AnnouncementItem = {
    id: string;
    title: string;
    description?: string;
    meta?: string;
    icon?: AnnouncementIconName;
};

export type AnnouncementsWidgetSettings = {
    title: string;
    items: AnnouncementItem[];
    backgroundColor: string;
    textColor: string;
    borderRadius: number;
};

export type TickerDirection = "rtl" | "ltr";

export type TickerFontFamily = "sans" | "serif" | "mono";

export type TickerFontWeight = 400 | 500 | 600 | 700;

export type TickerMessage = {
    id: string;
    text: string;
};

export type TickerWidgetSettings = {
    messages: TickerMessage[];
    direction: TickerDirection;
    speed: number;
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    borderRadius: number;
    fontFamily?: TickerFontFamily;
    fontSize?: number;
    fontWeight?: TickerFontWeight;
};

export type VerticalAnnouncementItem = {
    id: string;
    title: string;
    description?: string;
    label?: string;
};

export type VerticalAnnouncementsWidgetSettings = {
    items: VerticalAnnouncementItem[];
    speed: number;
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    borderRadius: number;
    pauseSeconds?: number;
    fontFamily?: TickerFontFamily;
    titleFontSize?: number;
    descriptionFontSize?: number;
    fontWeight?: TickerFontWeight;
};

export type Widget = {
    id: string;
    layout: WidgetLayout;
    layerName?: string;
    visible?: boolean;
    locked?: boolean;
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
    | {
        type: "announcements";
        settings: AnnouncementsWidgetSettings;
    }
    | {
        type: "ticker";
        settings: TickerWidgetSettings;
    }
    | {
        type: "vertical-announcements";
        settings: VerticalAnnouncementsWidgetSettings;
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
