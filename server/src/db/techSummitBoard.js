// Mirrors client/src/features/boards/data/techSummitBoard.ts.
// Image paths such as /media/tech-summit/conference-hero.png are static files
// served by the React client. PostgreSQL stores those path strings only.

// Stable boards.id for the seeded Tech Summit board. Do not change it:
// repeated seeds recognize this row and leave its draft untouched.
const TECH_SUMMIT_BOARD_ID = "7c2a9e14-5b31-4f0a-9d6e-2f8b1c4a0e77";

const techSummitBoard = {
    id: "tech-summit-2026",
    name: "Tech Summit 2026",
    width: 1920,
    height: 1080,
    background: {
        type: "gradient",
        from: "color-mix(in srgb, var(--accent) 28%, var(--background))",
        to: "color-mix(in srgb, var(--cyan) 16%, var(--canvas-board))",
        angle: 155
    },
    widgets: [
        {
            id: "welcome-line",
            type: "text",
            layout: { x: 140, y: 360, width: 560, height: 90 },
            settings: {
                text: "Welcome to",
                tone: "default",
                size: "title"
            }
        },
        {
            id: "summit-title",
            type: "text",
            layout: { x: 140, y: 450, width: 960, height: 170 },
            settings: {
                text: "Tech Summit 2026",
                tone: "accent",
                size: "display"
            }
        },
        {
            id: "summit-clock",
            type: "clock",
            layout: { x: 1220, y: 72, width: 580, height: 190 },
            settings: {
                timeZone: "Asia/Jerusalem",
                showDate: true,
                showSeconds: true,
                align: "right"
            }
        },
        {
            id: "conference-hero",
            type: "image",
            layout: { x: 1124, y: 296, width: 676, height: 380 },
            settings: {
                src: "/media/tech-summit/conference-hero.png",
                alt: "Speaker presenting at the Tech Summit",
                objectFit: "cover",
                borderRadius: 28,
                fallbackBackgroundColor: "var(--canvas-board)"
            }
        },
        {
            id: "summit-networking",
            type: "image",
            layout: { x: 1388, y: 700, width: 412, height: 280 },
            settings: {
                src: "/media/tech-summit/networking.png",
                alt: "Attendees networking at the Tech Summit",
                objectFit: "cover",
                borderRadius: 28,
                fallbackBackgroundColor: "var(--canvas-board)"
            }
        },
        {
            id: "next-session",
            type: "information-card",
            layout: { x: 140, y: 700, width: 600, height: 280 },
            settings: {
                badge: "NEXT SESSION",
                subtitle: "1:00 PM - 2:00 PM",
                title: "The Future of AI",
                description: "Opportunities, Risks and What Comes Next",
                imageSrc: "/media/tech-summit/next-session.png",
                backgroundColor: "color-mix(in srgb, var(--accent) 24%, var(--canvas-board))",
                textColor: "var(--foreground)",
                borderRadius: 24
            }
        },
        {
            id: "summit-announcements",
            type: "announcements",
            layout: { x: 764, y: 700, width: 600, height: 280 },
            settings: {
                title: "ANNOUNCEMENTS",
                backgroundColor: "color-mix(in srgb, var(--accent) 24%, var(--canvas-board))",
                textColor: "var(--foreground)",
                borderRadius: 24,
                items: [
                    {
                        id: "networking-lunch",
                        title: "Networking Lunch",
                        description: "Today at 12:30 PM",
                        meta: "Main Hall",
                        icon: "food"
                    },
                    {
                        id: "workshop-rooms",
                        title: "Workshop Rooms Open",
                        description: "Starting at 2:00 PM",
                        meta: "Rooms A, B, C",
                        icon: "people"
                    },
                    {
                        id: "after-party",
                        title: "After Party",
                        description: "From 6:00 PM",
                        meta: "Riverside Lounge",
                        icon: "music"
                    }
                ]
            }
        }
    ]
};

module.exports = {
    TECH_SUMMIT_BOARD_ID,
    techSummitBoard
};
