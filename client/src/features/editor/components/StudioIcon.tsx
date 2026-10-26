import type { ReactNode } from "react";

export type StudioIconName =
    | "text"
    | "clock"
    | "image"
    | "information-card"
    | "video"
    | "announcements"
    | "gallery"
    | "countdown"
    | "qr"
    | "preview"
    | "publish";

type StudioIconProps = {
    name: StudioIconName;
};

const iconPaths: Record<StudioIconName, ReactNode> = {
    text: (
        <>
            <path d="M5 6h14" />
            <path d="M12 6v12" />
            <path d="M8 18h8" />
        </>
    ),
    clock: (
        <>
            <circle cx="12" cy="12" r="8" />
            <path d="M12 8v4l3 2" />
        </>
    ),
    image: (
        <>
            <rect x="4" y="5" width="16" height="14" rx="2" />
            <circle cx="9" cy="10" r="1.25" />
            <path d="m4 16 4.5-4.5 3 3L15 11l5 5" />
        </>
    ),
    "information-card": (
        <>
            <rect x="4" y="5" width="16" height="14" rx="2" />
            <path d="M8 10h8" />
            <path d="M8 13h6" />
            <path d="M8 16h3" />
        </>
    ),
    video: (
        <>
            <rect x="3" y="7" width="12" height="10" rx="2" />
            <path d="m15 10 6-3v10l-6-3" />
        </>
    ),
    announcements: (
        <>
            <path d="M5 10v4h3l8 4V6L8 10H5Z" />
            <path d="M8 14.5V17a2 2 0 0 0 2 2" />
        </>
    ),
    gallery: (
        <>
            <rect x="4" y="4" width="7" height="7" rx="1.5" />
            <rect x="13" y="4" width="7" height="7" rx="1.5" />
            <rect x="4" y="13" width="7" height="7" rx="1.5" />
            <rect x="13" y="13" width="7" height="7" rx="1.5" />
        </>
    ),
    countdown: (
        <>
            <path d="M9 3h6" />
            <path d="M12 3v2" />
            <circle cx="12" cy="14" r="7" />
            <path d="M12 11v3l2 2" />
        </>
    ),
    qr: (
        <>
            <rect x="4" y="4" width="6" height="6" rx="1" />
            <rect x="14" y="4" width="6" height="6" rx="1" />
            <rect x="4" y="14" width="6" height="6" rx="1" />
            <path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" />
        </>
    ),
    preview: (
        <>
            <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z" />
            <circle cx="12" cy="12" r="2.5" />
        </>
    ),
    publish: (
        <>
            <path d="M12 16V5" />
            <path d="m8 8 4-4 4 4" />
            <path d="M5 19h14" />
        </>
    ),
};

function StudioIcon({ name }: StudioIconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="size-5"
        >
            {iconPaths[name]}
        </svg>
    );
}

export default StudioIcon;
