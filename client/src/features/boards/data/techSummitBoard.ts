import type { Board } from "../types/boardTypes.ts";

export const techSummitBoard: Board = {
    id: "tech-summit-2026",
    name: "Tech Summit 2026",
    width: 1920,
    height: 1080,
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
    ],
};
