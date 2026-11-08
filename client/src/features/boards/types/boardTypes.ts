export type WidgetType = "text" | "clock" | "image" | "information-card" | "announcements" | "ticker" | "vertical-announcements" | "weather" | "news" | "countdown" | "qr";

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
    backgroundOpacity?: number;
    textColor: string;
    textOpacity?: number;
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
    backgroundOpacity?: number;
    textColor: string;
    textOpacity?: number;
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
    backgroundOpacity?: number;
    textColor: string;
    textOpacity?: number;
    accentColor: string;
    accentOpacity?: number;
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

export type WeatherTemperatureUnit = "celsius" | "fahrenheit";

export type WeatherLayoutName = "compact" | "expanded";

export type WeatherPreset = "classic" | "minimal" | "horizontal" | "forecast";

export type WeatherDirection = "auto" | "ltr" | "rtl";

export type WeatherAlign = "start" | "center" | "end" | "left" | "right";

export type WeatherFontFamily = "sans" | "serif" | "mono";

export type WeatherFontWeight = 400 | 500 | 600 | 700;

export type WeatherRefreshMinutes = 10 | 30 | 60 | 1440;

export type WeatherLocationSettings = {
    id?: string;
    name: string;
    label: string;
    latitude: number;
    longitude: number;
    timezone: string;
    country?: string;
    countryCode?: string;
    admin1?: string;
};

export type NewsSource = "sample" | "usgs";

export type NewsCategory = "israel" | "breaking" | "business" | "technology" | "earthquakes";

export type NewsPreset = "ticker" | "cards" | "list";

export type NewsTickerMotion = "scroll" | "slide";

export type NewsScrollDirection = "ltr" | "rtl";

export type NewsDirection = "auto" | "ltr" | "rtl";

export type NewsAlign = "start" | "center" | "end" | "left" | "right";

export type NewsFontFamily = "sans" | "serif" | "mono";

export type NewsFontWeight = 400 | 500 | 600 | 700;

export type NewsRefreshMinutes = 10 | 30 | 60 | 1440;

export type NewsWidgetSettings = {
    source: NewsSource;
    category: NewsCategory;
    preset: NewsPreset;
    maxHeadlines: number;
    rotationSeconds: number;
    tickerMotion?: NewsTickerMotion;
    scrollDirection?: NewsScrollDirection;
    scrollSpeed?: number;
    refreshIntervalMinutes?: NewsRefreshMinutes;
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    borderRadius: number;
    title?: string;
    direction?: NewsDirection;
    align?: NewsAlign;
    titleAlign?: NewsAlign;
    backgroundOpacity?: number;
    padding?: number;
    titleSpacing?: number;
    titleColor?: string;
    textOpacity?: number;
    titleOpacity?: number;
    accentOpacity?: number;
    fontFamily?: NewsFontFamily;
    fontSize?: number;
    fontWeight?: NewsFontWeight;
    titleFontFamily?: NewsFontFamily;
    titleFontSize?: number;
    titleFontWeight?: NewsFontWeight;
};

export type WeatherWidgetSettings = {
    location: WeatherLocationSettings;
    unit: WeatherTemperatureUnit;
    layout: WeatherLayoutName;
    showFeelsLike: boolean;
    showForecast: boolean;
    title?: string;
    preset?: WeatherPreset;
    backgroundColor: string;
    backgroundOpacity?: number;
    textColor: string;
    textOpacity?: number;
    titleColor?: string;
    titleOpacity?: number;
    accentColor: string;
    accentOpacity?: number;
    borderRadius: number;
    padding?: number;
    titleSpacing?: number;
    refreshIntervalMinutes?: WeatherRefreshMinutes;
    direction?: WeatherDirection;
    align?: WeatherAlign;
    titleAlign?: WeatherAlign;
    fontFamily?: WeatherFontFamily;
    fontSize?: number;
    fontWeight?: WeatherFontWeight;
    titleFontFamily?: WeatherFontFamily;
    titleFontSize?: number;
    titleFontWeight?: WeatherFontWeight;
};

export type CountdownPreset = "digital" | "minimal";

export type CountdownDirection = "auto" | "ltr" | "rtl";

export type CountdownAlign = "start" | "center" | "end" | "left" | "right";

export type CountdownFontFamily = "sans" | "serif" | "mono";

export type CountdownFontWeight = 400 | 500 | 600 | 700;

export type CountdownWidgetSettings = {
    title?: string;
    targetDate: string;
    targetTime: string;
    timeZone: string;
    showDays: boolean;
    showHours: boolean;
    showMinutes: boolean;
    showSeconds: boolean;
    completionMessage?: string;
    preset: CountdownPreset;
    direction?: CountdownDirection;
    align?: CountdownAlign;
    titleAlign?: CountdownAlign;
    backgroundColor: string;
    backgroundOpacity?: number;
    textColor: string;
    textOpacity?: number;
    titleColor?: string;
    titleOpacity?: number;
    accentColor: string;
    accentOpacity?: number;
    borderRadius: number;
    padding?: number;
    titleSpacing?: number;
    fontFamily?: CountdownFontFamily;
    fontSize?: number;
    fontWeight?: CountdownFontWeight;
    titleFontFamily?: CountdownFontFamily;
    titleFontSize?: number;
    titleFontWeight?: CountdownFontWeight;
};

export type QrPreset = "classic" | "split";

export type QrDirection = "auto" | "ltr" | "rtl";

export type QrAlign = "start" | "center" | "end" | "left" | "right";

export type QrFontFamily = "sans" | "serif" | "mono";

export type QrFontWeight = 400 | 500 | 600 | 700;

export type QrWidgetSettings = {
    content: string;
    title?: string;
    subtitle?: string;
    preset: QrPreset;
    direction?: QrDirection;
    align?: QrAlign;
    titleAlign?: QrAlign;
    foregroundColor: string;
    codeBackgroundColor: string;
    backgroundColor: string;
    backgroundOpacity?: number;
    textColor: string;
    textOpacity?: number;
    titleColor?: string;
    titleOpacity?: number;
    borderRadius: number;
    padding?: number;
    titleSpacing?: number;
    fontFamily?: QrFontFamily;
    fontSize?: number;
    fontWeight?: QrFontWeight;
    titleFontFamily?: QrFontFamily;
    titleFontSize?: number;
    titleFontWeight?: QrFontWeight;
};

export type VerticalAnnouncementsWidgetSettings = {
    items: VerticalAnnouncementItem[];
    speed: number;
    backgroundColor: string;
    backgroundOpacity?: number;
    textColor: string;
    textOpacity?: number;
    accentColor: string;
    accentOpacity?: number;
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
    | {
        type: "weather";
        settings: WeatherWidgetSettings;
    }
    | {
        type: "news";
        settings: NewsWidgetSettings;
    }
    | {
        type: "countdown";
        settings: CountdownWidgetSettings;
    }
    | {
        type: "qr";
        settings: QrWidgetSettings;
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
