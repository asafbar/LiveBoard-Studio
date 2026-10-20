import type { Board } from "../types/boardTypes.ts";

export const techSummitBoard: Board = {
    id: "tech-summit-2026",
    name: "Tech Summit 2026",
    width: 1920,
    height: 1080,
    background: {
        type: "gradient",
        from: "color-mix(in srgb, var(--accent) 28%, var(--background))",
        to: "color-mix(in srgb, var(--cyan) 16%, var(--canvas-board))",
        angle: 155,
    },
    widgets: [
        {
            id: "welcome-line",
            type: "text",
            layout: { x: 140, y: 360, width: 1200, height: 90 },
            settings: {
                text: "Welcome to",
                tone: "default",
                size: "title",
            },
        },
        {
            id: "summit-title",
            type: "text",
            layout: { x: 140, y: 450, width: 1500, height: 170 },
            settings: {
                text: "Tech Summit 2026",
                tone: "accent",
                size: "display",
            },
        },
        {
            id: "summit-clock",
            type: "clock",
            layout: { x: 1220, y: 72, width: 580, height: 190 },
            settings: {
                timeZone: "Asia/Jerusalem",
                showDate: true,
                showSeconds: true,
                align: "right",
            },
        },
        {
            id: "summit-visual",
            type: "image",
            layout: { x: 1260, y: 300, width: 520, height: 680 },
            settings: {
                src: "",
                alt: "Tech Summit visual",
                objectFit: "cover",
                borderRadius: 28,
                fallbackBackgroundColor: "var(--surface-raised)",
            },
        },
        {
            id: "next-session",
            type: "information-card",
            layout: { x: 140, y: 740, width: 1040, height: 240 },
            settings: {
                badge: "NEXT SESSION",
                subtitle: "1:00 PM - 2:00 PM",
                title: "The Future of AI",
                description: "Opportunities, Risks and What Comes Next",
                backgroundColor: "color-mix(in srgb, var(--accent) 24%, var(--canvas-board))",
                textColor: "var(--foreground)",
                borderRadius: 24,
            },
        },
    ],
};
