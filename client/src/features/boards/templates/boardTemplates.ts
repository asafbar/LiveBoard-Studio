import type { BoardOrientation } from "../boardOrientation.ts";
import { defaultCountdownSettings } from "../countdown/countdownDefaults.ts";
import type {
    AnnouncementItem,
    AnnouncementsWidgetSettings,
    Board,
    BoardBackground,
    ClockWidgetSettings,
    CountdownWidgetSettings,
    InformationCardWidgetSettings,
    QrWidgetSettings,
    TextWidgetSettings,
    TickerWidgetSettings,
    VerticalAnnouncementItem,
    VerticalAnnouncementsWidgetSettings,
    WeatherPreset,
    WeatherWidgetSettings,
    Widget,
    WidgetLayout,
} from "../types/boardTypes.ts";
import { weatherCityById, weatherLocationFromCity } from "../weather/weatherCities.ts";

type BoardTemplateId =
    | "welcome-lobby"
    | "conference-events"
    | "office-dashboard"
    | "portrait-welcome"
    | "event-schedule";

type BoardTemplate = {
    id: BoardTemplateId;
    name: string;
    description: string;
    orientation: BoardOrientation;
    createDraft: (boardName: string, now?: Date) => Board;
};

const landscapeSize = { width: 1920, height: 1080 };
const portraitSize = { width: 1080, height: 1920 };

function createId(): string {
    return crypto.randomUUID();
}

function layout(x: number, y: number, width: number, height: number): WidgetLayout {
    return { x, y, width, height };
}

function textWidget(
    text: string,
    box: WidgetLayout,
    tone: TextWidgetSettings["tone"],
    size: TextWidgetSettings["size"],
): Widget {
    return {
        id: createId(),
        type: "text",
        layout: box,
        settings: { text, tone, size },
    };
}

function clockWidget(box: WidgetLayout, timeZone: ClockWidgetSettings["timeZone"], align: ClockWidgetSettings["align"]): Widget {
    return {
        id: createId(),
        type: "clock",
        layout: box,
        settings: {
            timeZone,
            showDate: true,
            showSeconds: false,
            align,
        },
    };
}

function cardWidget(
    box: WidgetLayout,
    title: string,
    subtitle: string,
    description: string,
    badge: string,
    backgroundColor: string,
    textColor: string,
): Widget {
    const settings: InformationCardWidgetSettings = {
        title,
        subtitle,
        description,
        badge,
        backgroundColor,
        backgroundOpacity: 100,
        textColor,
        borderRadius: 24,
    };

    return {
        id: createId(),
        type: "information-card",
        layout: box,
        settings,
    };
}

function announcementItem(
    title: string,
    description: string,
    meta: string,
    icon: AnnouncementItem["icon"],
): AnnouncementItem {
    return {
        id: createId(),
        title,
        description,
        meta,
        icon,
    };
}

function announcementsWidget(
    box: WidgetLayout,
    title: string,
    items: AnnouncementItem[],
    backgroundColor: string,
    textColor: string,
): Widget {
    const settings: AnnouncementsWidgetSettings = {
        title,
        items,
        backgroundColor,
        backgroundOpacity: 100,
        textColor,
        borderRadius: 24,
    };

    return {
        id: createId(),
        type: "announcements",
        layout: box,
        settings,
    };
}

function weatherWidget(box: WidgetLayout, cityId: string, preset: WeatherPreset, title: string): Widget {
    const city = weatherCityById(cityId);

    if (city === null) {
        throw new Error("The template weather city is not available.");
    }

    const settings: WeatherWidgetSettings = {
        location: weatherLocationFromCity(city),
        unit: "celsius",
        layout: "expanded",
        showFeelsLike: true,
        showForecast: preset === "forecast",
        preset,
        title,
        direction: "ltr",
        align: "start",
        backgroundColor: "#10283a",
        backgroundOpacity: 94,
        textColor: "#f4f7fb",
        accentColor: "#7dd3fc",
        borderRadius: 24,
        padding: 20,
        refreshIntervalMinutes: 30,
    };

    return {
        id: createId(),
        type: "weather",
        layout: box,
        settings,
    };
}

function calendarDate(epoch: number, timeZone: string): string {
    const parts: Record<string, string> = {};

    new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date(epoch)).forEach((part) => {
        if (part.type !== "literal") {
            parts[part.type] = part.value;
        }
    });

    return `${parts.year}-${parts.month}-${parts.day}`;
}

function countdownWidget(box: WidgetLayout, now: Date, title: string, completionMessage: string): Widget {
    const base = defaultCountdownSettings(now);
    const settings: CountdownWidgetSettings = {
        ...base,
        title,
        completionMessage,
        targetDate: calendarDate(now.getTime() + (14 * 24 * 60 * 60 * 1000), "America/New_York"),
        targetTime: "09:00:00",
        timeZone: "America/New_York",
        showDays: true,
        showHours: true,
        showMinutes: true,
        showSeconds: false,
        preset: "digital",
        direction: "ltr",
        align: "center",
        backgroundColor: "#2a1848",
        backgroundOpacity: 100,
        textColor: "#f8f5ff",
        accentColor: "#e9d5ff",
        borderRadius: 24,
        padding: 20,
    };

    return {
        id: createId(),
        type: "countdown",
        layout: box,
        settings,
    };
}

function qrWidget(box: WidgetLayout, content: string, title: string, subtitle: string, backgroundColor: string, textColor: string): Widget {
    const settings: QrWidgetSettings = {
        content,
        title,
        subtitle,
        preset: "split",
        direction: "ltr",
        align: "start",
        foregroundColor: "#102030",
        codeBackgroundColor: "#ffffff",
        backgroundColor,
        backgroundOpacity: 100,
        textColor,
        borderRadius: 24,
        padding: 16,
    };

    return {
        id: createId(),
        type: "qr",
        layout: box,
        settings,
    };
}

function tickerWidget(box: WidgetLayout, message: string, backgroundColor: string, textColor: string, accentColor: string): Widget {
    const settings: TickerWidgetSettings = {
        messages: [{ id: createId(), text: message }],
        direction: "ltr",
        speed: 48,
        backgroundColor,
        backgroundOpacity: 100,
        textColor,
        accentColor,
        borderRadius: 18,
        fontFamily: "sans",
        fontSize: 28,
        fontWeight: 600,
    };

    return {
        id: createId(),
        type: "ticker",
        layout: box,
        settings,
    };
}

function scheduleItem(label: string, title: string, description: string): VerticalAnnouncementItem {
    return {
        id: createId(),
        label,
        title,
        description,
    };
}

function verticalSchedule(box: WidgetLayout, items: VerticalAnnouncementItem[], backgroundColor: string, textColor: string, accentColor: string): Widget {
    const settings: VerticalAnnouncementsWidgetSettings = {
        items,
        speed: 36,
        pauseSeconds: 4,
        backgroundColor,
        backgroundOpacity: 100,
        textColor,
        accentColor,
        borderRadius: 24,
        fontFamily: "sans",
        fontWeight: 600,
        titleFontSize: 32,
        descriptionFontSize: 20,
    };

    return {
        id: createId(),
        type: "vertical-announcements",
        layout: box,
        settings,
    };
}

function draft(
    boardName: string,
    size: { width: number; height: number },
    background: BoardBackground,
    widgets: Widget[],
): Board {
    return {
        id: createId(),
        name: boardName,
        width: size.width,
        height: size.height,
        background,
        widgets,
    };
}

function welcomeLobby(boardName: string): Board {
    return draft(boardName, landscapeSize, {
        type: "gradient",
        from: "#071525",
        to: "#16324d",
        angle: 155,
    }, [
        textWidget("Welcome", layout(48, 40, 1100, 150), "default", "display"),
        textWidget("We are glad you are here today.", layout(48, 204, 1100, 64), "accent", "title"),
        clockWidget(layout(1240, 40, 632, 180), "America/New_York", "right"),
        cardWidget(
            layout(48, 292, 560, 328),
            "Reception",
            "Ground floor",
            "Check in with the front desk. A host will direct you to your meeting.",
            "Arrive",
            "#123044",
            "#f4f7fb",
        ),
        cardWidget(
            layout(632, 292, 560, 328),
            "Visitors",
            "Guest access",
            "Please keep your visitor badge visible while you are in the building.",
            "Badge",
            "#18344a",
            "#f4f7fb",
        ),
        weatherWidget(layout(1216, 292, 656, 328), "5128581", "horizontal", "Outside now"),
        announcementsWidget(layout(48, 644, 1824, 388), "Today in the lobby", [
            announcementItem("Morning briefing", "Team leads meet in the glass room beside reception.", "09:00", "people"),
            announcementItem("Cafe service", "Coffee and lunch are served in the atrium until 14:00.", "All day", "food"),
            announcementItem("Building note", "The east elevator is reserved for deliveries this afternoon.", "Notice", "info"),
        ], "#0d2233", "#f4f7fb"),
    ]);
}

function conferenceEvents(boardName: string, now: Date): Board {
    return draft(boardName, landscapeSize, {
        type: "gradient",
        from: "#140c24",
        to: "#3a2158",
        angle: 140,
    }, [
        textWidget("Design Forum", layout(48, 40, 1180, 120), "default", "display"),
        textWidget("Talks, workshops, and open sessions.", layout(48, 172, 1100, 64), "accent", "title"),
        countdownWidget(layout(48, 260, 880, 300), now, "Doors open", "The forum has started"),
        qrWidget(
            layout(960, 260, 440, 500),
            "https://example.com/events",
            "Event guide",
            "Open the example program",
            "#24143c",
            "#f8f5ff",
        ),
        cardWidget(
            layout(1440, 40, 432, 340),
            "Main hall",
            "Level 2",
            "Keynotes and panel discussions are held in the main hall.",
            "Stage",
            "#311b52",
            "#f8f5ff",
        ),
        cardWidget(
            layout(1440, 404, 432, 356),
            "Registration",
            "Lobby desks",
            "Collect your badge before the first session begins.",
            "Check in",
            "#3b2260",
            "#f8f5ff",
        ),
        announcementsWidget(layout(48, 784, 1824, 248), "Sample agenda", [
            announcementItem("Opening remarks", "Welcome and a short overview of the day.", "09:30", "people"),
            announcementItem("Product stories", "Three teams share what they shipped this year.", "11:00", "info"),
            announcementItem("Workshop block", "Hands-on rooms are marked on the level map.", "13:30", "music"),
        ], "#24143c", "#f8f5ff"),
    ]);
}

function officeDashboard(boardName: string): Board {
    return draft(boardName, landscapeSize, {
        type: "gradient",
        from: "#101418",
        to: "#243038",
        angle: 180,
    }, [
        textWidget("Office Board", layout(48, 36, 1100, 128), "default", "display"),
        textWidget("Shared updates for the day.", layout(48, 172, 1000, 64), "accent", "title"),
        clockWidget(layout(1248, 36, 624, 176), "America/New_York", "right"),
        announcementsWidget(layout(48, 248, 760, 672), "Notices", [
            announcementItem("Quiet hours", "Please keep calls out of the open workspace before noon.", "Morning", "info"),
            announcementItem("Rooms", "Book a room on the shared calendar before you move in.", "Today", "people"),
            announcementItem("Kitchen", "Clear the counter after lunch so the next group can use it.", "Reminder", "food"),
        ], "#1a242b", "#f3f6f8"),
        cardWidget(
            layout(832, 248, 392, 316),
            "Meeting rooms",
            "Level 3",
            "Rooms A and B are open for scheduled meetings.",
            "Rooms",
            "#1d2b33",
            "#f3f6f8",
        ),
        cardWidget(
            layout(832, 580, 392, 340),
            "Facilities",
            "Help desk",
            "Report a building issue at the desk near the north stair.",
            "Help",
            "#24343d",
            "#f3f6f8",
        ),
        weatherWidget(layout(1248, 248, 624, 672), "2643743", "classic", "City weather"),
        tickerWidget(
            layout(48, 944, 1824, 88),
            "Please sign out of shared devices before you leave for the day.",
            "#152026",
            "#f3f6f8",
            "#86efac",
        ),
    ]);
}

function portraitWelcome(boardName: string): Board {
    return draft(boardName, portraitSize, {
        type: "gradient",
        from: "#10261f",
        to: "#1d4a3c",
        angle: 180,
    }, [
        textWidget("Welcome", layout(48, 48, 984, 160), "default", "display"),
        textWidget("Take a moment to look around.", layout(48, 220, 984, 72), "accent", "title"),
        clockWidget(layout(48, 316, 984, 180), "Europe/London", "left"),
        weatherWidget(layout(48, 520, 984, 440), "2643743", "classic", "Current conditions"),
        cardWidget(
            layout(48, 984, 984, 300),
            "Your visit",
            "Start here",
            "A guide at the entrance can help you find the right floor.",
            "Guide",
            "#184838",
            "#f3fbf7",
        ),
        announcementsWidget(layout(48, 1308, 984, 564), "While you are here", [
            announcementItem("Gallery", "The ground floor display changes every Monday morning.", "Floor 0", "info"),
            announcementItem("Seating", "Quiet seating is available beside the north windows.", "Floor 1", "people"),
            announcementItem("Refreshments", "Water and tea are set out near the stair landing.", "Floor 1", "food"),
        ], "#14382d", "#f3fbf7"),
    ]);
}

function eventSchedule(boardName: string): Board {
    return draft(boardName, portraitSize, {
        type: "gradient",
        from: "#1c140c",
        to: "#4a3420",
        angle: 175,
    }, [
        textWidget("Community Showcase", layout(48, 40, 984, 140), "default", "display"),
        textWidget("Saturday sessions and open studios.", layout(48, 192, 984, 64), "accent", "title"),
        verticalSchedule(layout(48, 280, 984, 980), [
            scheduleItem("09:00", "Arrival", "Collect a program at the welcome table in the foyer."),
            scheduleItem("10:00", "Opening session", "A short introduction in Studio A."),
            scheduleItem("11:30", "Workshops", "Choose a room. Each workshop lasts 45 minutes."),
            scheduleItem("13:00", "Lunch break", "Seating is available in the courtyard."),
            scheduleItem("14:30", "Open studios", "Walk through the studios at your own pace."),
            scheduleItem("16:30", "Closing notes", "Meet back in Studio A for a brief wrap-up."),
        ], "#2c2116", "#fbf6ef", "#f6c98a"),
        cardWidget(
            layout(48, 1284, 548, 400),
            "Attendees",
            "Before you enter",
            "Keep your ticket visible and follow the floor signs to each room.",
            "Please",
            "#3a2a1c",
            "#fbf6ef",
        ),
        qrWidget(
            layout(620, 1284, 412, 560),
            "https://example.com/schedule",
            "Program",
            "Example schedule link",
            "#3a2a1c",
            "#fbf6ef",
        ),
    ]);
}

const boardTemplates: readonly BoardTemplate[] = [
    {
        id: "welcome-lobby",
        name: "Welcome Lobby",
        description: "A landscape lobby screen with a greeting, clock, weather, and visitor notes.",
        orientation: "landscape",
        createDraft: (boardName) => welcomeLobby(boardName),
    },
    {
        id: "conference-events",
        name: "Conference & Events",
        description: "A landscape event screen with a countdown, agenda, and example QR code.",
        orientation: "landscape",
        createDraft: (boardName, now) => conferenceEvents(boardName, now ?? new Date()),
    },
    {
        id: "office-dashboard",
        name: "Office Dashboard",
        description: "A landscape office board with notices, room information, and city weather.",
        orientation: "landscape",
        createDraft: (boardName) => officeDashboard(boardName),
    },
    {
        id: "portrait-welcome",
        name: "Portrait Welcome",
        description: "A tall welcome screen with the time, weather, and stacked visitor notes.",
        orientation: "portrait",
        createDraft: (boardName) => portraitWelcome(boardName),
    },
    {
        id: "event-schedule",
        name: "Event Schedule",
        description: "A tall schedule with session times, attendee notes, and an example QR code.",
        orientation: "portrait",
        createDraft: (boardName) => eventSchedule(boardName),
    },
];

function boardTemplateById(id: BoardTemplateId): BoardTemplate {
    const template = boardTemplates.find((item) => item.id === id);

    if (template === undefined) {
        throw new Error("The board template is not available.");
    }

    return template;
}

export type { BoardTemplate, BoardTemplateId };
export { boardTemplateById, boardTemplates };
