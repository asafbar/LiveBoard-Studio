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
    | "eye"
    | "eye-off"
    | "publish"
    | "save"
    | "open-display"
    | "menu"
    | "boards"
    | "displays"
    | "logout"
    | "more"
    | "move-forward"
    | "move-backward"
    | "bring-front"
    | "send-back"
    | "chevron-down"
    | "grip"
    | "lock"
    | "unlock"
    | "revert";

type StudioIconProps = {
    name: StudioIconName;
    className?: string;
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
    eye: (
        <>
            <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z" />
            <circle cx="12" cy="12" r="2.5" />
        </>
    ),
    "eye-off": (
        <>
            <path d="M3.5 4.5 20.5 19.5" />
            <path d="M9.9 5.6A10 10 0 0 1 12 5.2c6 0 9.5 5.5 9.5 5.5a17 17 0 0 1-3.1 3.5" />
            <path d="M6.5 7.1C4.1 8.8 2.5 12 2.5 12S6 17.5 12 17.5c1.4 0 2.6-.3 3.7-.9" />
            <path d="M9.9 10a2.5 2.5 0 0 0 3.3 3.3" />
        </>
    ),
    publish: (
        <>
            <path d="M12 16V5" />
            <path d="m8 8 4-4 4 4" />
            <path d="M5 19h14" />
        </>
    ),
    save: (
        <>
            <path d="M6 4h9l3 3v13H6V4Z" />
            <path d="M8 4v5h7" />
            <path d="M8 16h8" />
        </>
    ),
    "open-display": (
        <>
            <path d="M14 5h5v5" />
            <path d="M19 5 10 14" />
            <path d="M17 13.5V18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4.5" />
        </>
    ),
    menu: (
        <>
            <path d="M4 7h16" />
            <path d="M4 12h16" />
            <path d="M4 17h16" />
        </>
    ),
    boards: (
        <>
            <rect x="4" y="5" width="16" height="14" rx="2" />
            <path d="M8 9h8" />
            <path d="M8 13h5" />
        </>
    ),
    displays: (
        <>
            <rect x="3" y="4" width="18" height="12" rx="2" />
            <path d="M8 20h8" />
            <path d="M12 16v4" />
        </>
    ),
    logout: (
        <>
            <path d="M10 7V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-2" />
            <path d="M4 12h10" />
            <path d="m11 9 3 3-3 3" />
        </>
    ),
    more: (
        <>
            <circle cx="6" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="18" cy="12" r="1" fill="currentColor" stroke="none" />
        </>
    ),
    "move-forward": (
        <path d="m6 14 6-6 6 6" />
    ),
    "move-backward": (
        <path d="m6 10 6 6 6-6" />
    ),
    "bring-front": (
        <>
            <path d="M5 6h14" />
            <path d="m8 16 4-4 4 4" />
        </>
    ),
    "send-back": (
        <>
            <path d="M5 18h14" />
            <path d="m8 8 4 4 4-4" />
        </>
    ),
    "chevron-down": (
        <path d="m6 9 6 6 6-6" />
    ),
    grip: (
        <>
            <circle cx="9" cy="8" r="1" fill="currentColor" stroke="none" />
            <circle cx="15" cy="8" r="1" fill="currentColor" stroke="none" />
            <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
            <circle cx="9" cy="16" r="1" fill="currentColor" stroke="none" />
            <circle cx="15" cy="16" r="1" fill="currentColor" stroke="none" />
        </>
    ),
    lock: (
        <>
            <rect x="6" y="11" width="12" height="8" rx="1.5" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </>
    ),
    unlock: (
        <>
            <rect x="6" y="11" width="12" height="8" rx="1.5" />
            <path d="M8 11V8a4 4 0 0 1 7.2-2" />
        </>
    ),
    revert: (
        <>
            <path d="M4 9h9a4 4 0 1 1 0 8H9" />
            <path d="M7 6 4 9l3 3" />
        </>
    ),
};

function StudioIcon({ name, className = "size-5" }: StudioIconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={className}
        >
            {iconPaths[name]}
        </svg>
    );
}

export default StudioIcon;
