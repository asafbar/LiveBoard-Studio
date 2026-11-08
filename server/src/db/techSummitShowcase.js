const { techSummitBoard } = require("./techSummitBoard");

const TECH_SUMMIT_SHOWCASE_ID = "3ba65451-3e71-49e0-88fc-01ce6723cdf4";
const TIME_ZONE = "Asia/Jerusalem";

const showcaseLayouts = {
    "welcome-line": { x: 64, y: 282, width: 820, height: 64 },
    "summit-title": { x: 64, y: 355, width: 850, height: 140 },
    "summit-clock": { x: 1248, y: 52, width: 608, height: 180 },
    "conference-hero": { x: 938, y: 264, width: 918, height: 360 },
    "next-session": { x: 64, y: 648, width: 590, height: 248 },
    "summit-announcements": { x: 678, y: 648, width: 680, height: 248 }
};

function buildTechSummitShowcase(now = new Date()) {
    const targetDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));

    return {
        ...techSummitBoard,
        id: "tech-summit-showcase",
        name: "Tech Summit Showcase",
        background: {
            type: "image",
            src: "/media/tech-summit/showcase-background.svg",
            fit: "cover",
            position: "center center",
            fallbackColor: "#071326"
        },
        widgets: [
            ...techSummitBoard.widgets
                .filter((widget) => widget.id !== "summit-networking")
                .map((widget) => ({
                    ...widget,
                    layout: showcaseLayouts[widget.id],
                    settings: widget.id === "welcome-line"
                        ? { text: "JERUSALEM  /  MAIN STAGE", tone: "accent", size: "title" }
                        : widget.settings
                })),
            {
                id: "summit-tagline",
                type: "text",
                layout: { x: 64, y: 512, width: 830, height: 100 },
                settings: {
                    text: "Keynotes, demos, and hands-on labs.",
                    tone: "default",
                    size: "title"
                }
            },
            {
                id: "summit-weather",
                type: "weather",
                layout: { x: 64, y: 52, width: 600, height: 180 },
                settings: {
                    title: "Jerusalem weather",
                    location: {
                        id: "281184",
                        name: "Jerusalem",
                        label: "Jerusalem, Israel",
                        latitude: 31.76904,
                        longitude: 35.21633,
                        timezone: TIME_ZONE,
                        country: "Israel",
                        countryCode: "IL",
                        admin1: "Jerusalem"
                    },
                    unit: "celsius",
                    layout: "expanded",
                    showFeelsLike: true,
                    showForecast: false,
                    preset: "horizontal",
                    direction: "ltr",
                    align: "start",
                    backgroundColor: "#10283a",
                    textColor: "#f4f7fb",
                    accentColor: "#7dd3fc",
                    borderRadius: 24,
                    padding: 20
                }
            },
            {
                id: "summit-countdown",
                type: "countdown",
                layout: { x: 688, y: 52, width: 536, height: 180 },
                settings: {
                    title: "Doors open in",
                    targetDate,
                    targetTime: "09:00:00",
                    timeZone: TIME_ZONE,
                    showDays: true,
                    showHours: true,
                    showMinutes: true,
                    showSeconds: false,
                    completionMessage: "Doors are open",
                    preset: "digital",
                    direction: "ltr",
                    align: "center",
                    backgroundColor: "#142c4b",
                    textColor: "#f4f7fb",
                    accentColor: "#7dd3fc",
                    borderRadius: 24,
                    padding: 20
                }
            },
            {
                id: "summit-program",
                type: "qr",
                layout: { x: 1382, y: 648, width: 474, height: 248 },
                settings: {
                    title: "Explore LiveBoard",
                    subtitle: "Scan to view the project on GitHub",
                    content: "https://github.com/asafbar/LiveBoard-Studio",
                    preset: "split",
                    direction: "ltr",
                    align: "start",
                    foregroundColor: "#102030",
                    codeBackgroundColor: "#ffffff",
                    backgroundColor: "#142c4b",
                    textColor: "#f4f7fb",
                    borderRadius: 24,
                    padding: 16
                }
            },
            {
                id: "summit-event-ticker",
                type: "ticker",
                layout: { x: 64, y: 928, width: 1792, height: 72 },
                settings: {
                    messages: [
                        { id: "summit-ticker-check-in", text: "Check-in is open at the main entrance." },
                        { id: "summit-ticker-labs", text: "Bring your laptop to the hands-on labs." }
                    ],
                    direction: "ltr",
                    speed: 48,
                    backgroundColor: "#0b1c31",
                    backgroundOpacity: 100,
                    textColor: "#e3efff",
                    accentColor: "#50d9f5",
                    borderRadius: 20,
                    fontFamily: "sans",
                    fontSize: 26,
                    fontWeight: 600
                }
            }
        ]
    };
}

module.exports = { TECH_SUMMIT_SHOWCASE_ID, buildTechSummitShowcase };
