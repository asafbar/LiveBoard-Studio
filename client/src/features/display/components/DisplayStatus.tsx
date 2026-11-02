import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type {
    DisplayConnectionState,
    DisplayRegistrationState,
} from "../realtime/boardRealtimeClient.ts";

type DisplayStatusProps = {
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
};

type DisplayConnectionStatusProps = {
    connectionState: DisplayConnectionState;
    detail: string | null;
};

type ScreenPresenceStatusProps = {
    connectionState: DisplayConnectionState;
    registrationState: DisplayRegistrationState;
    details: string[];
};

const connectionBannerDelayMs = 400;

const connectionLabel: Record<DisplayConnectionState, string> = {
    connected: "Connected",
    reconnecting: "Reconnecting",
    disconnected: "Disconnected",
};

const connectionDotClassName: Record<DisplayConnectionState, string> = {
    connected: "bg-cyan",
    reconnecting: "bg-secondary",
    disconnected: "bg-danger",
};

type ScreenConnectionPresentation = {
    label: string;
    dotClassName: string;
};

function DisplayStatus({ title, message, actionLabel, onAction }: DisplayStatusProps) {
    return (
        <div className="flex h-dvh items-center justify-center bg-canvas p-6 font-sans text-foreground antialiased">
            <div className="w-full max-w-md rounded-lg border border-border bg-surface p-5 text-center shadow-panel">
                <h1 className="text-base font-semibold text-foreground">{title}</h1>
                <p className="mt-2 text-sm leading-5 text-secondary">{message}</p>
                {actionLabel && onAction ? (
                    <button
                        type="button"
                        onClick={onAction}
                        className="mt-5 h-9 rounded-control bg-accent px-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
                    >
                        {actionLabel}
                    </button>
                ) : null}
            </div>
        </div>
    );
}

function useDisplayDiagnostic(): boolean {
    const [searchParams] = useSearchParams();

    return searchParams.get("debug") === "1";
}

// A fast first connection should not flash a status over the board.
function useDelayedVisibility(active: boolean): boolean {
    const [revealed, setRevealed] = useState(false);

    useEffect(() => {
        if (!active) {
            return;
        }

        const timer = window.setTimeout(() => {
            setRevealed(true);
        }, connectionBannerDelayMs);

        return () => {
            window.clearTimeout(timer);
        };
    }, [active]);

    return active && revealed;
}

type ConnectionBannerProps = {
    label: string | null;
    dotClassName: string;
    details: string[];
};

function ConnectionBanner({
    label,
    dotClassName,
    details,
}: ConnectionBannerProps) {
    return (
        <div className="pointer-events-none fixed top-4 left-1/2 z-20 flex w-max max-w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 flex-col items-center gap-2 font-sans">
            {label !== null ? (
                <p
                    role="status"
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/90 px-3 py-1.5 text-xs font-medium text-secondary shadow-panel"
                >
                    <span
                        className={`size-1.5 rounded-full ${dotClassName}`}
                        aria-hidden="true"
                    />
                    {label}
                </p>
            ) : null}
            {details.map((detail) => (
                <p
                    key={detail}
                    role="status"
                    className="rounded-control border border-border bg-surface/90 px-3 py-2 text-center text-xs leading-4 text-secondary shadow-panel"
                >
                    {detail}
                </p>
            ))}
        </div>
    );
}

function DisplayConnectionStatus({ connectionState, detail }: DisplayConnectionStatusProps) {
    const diagnostic = useDisplayDiagnostic();
    const connectionProblem = connectionState !== "connected";
    const showConnectionProblem = useDelayedVisibility(connectionProblem);
    const showConnection = diagnostic || showConnectionProblem;
    const details = detail === null ? [] : [detail];

    if (!showConnection && details.length === 0) {
        return null;
    }

    return (
        <ConnectionBanner
            label={showConnection ? connectionLabel[connectionState] : null}
            dotClassName={connectionDotClassName[connectionState]}
            details={details}
        />
    );
}

function readScreenConnection(
    connectionState: DisplayConnectionState,
    registrationState: DisplayRegistrationState,
): ScreenConnectionPresentation {
    if (connectionState === "reconnecting") {
        return {
            label: "Reconnecting",
            dotClassName: "bg-secondary",
        };
    }

    if (connectionState === "disconnected") {
        return {
            label: "Disconnected",
            dotClassName: "bg-danger",
        };
    }

    if (registrationState === "failed") {
        return {
            label: "Registration failed",
            dotClassName: "bg-danger",
        };
    }

    if (registrationState === "registered") {
        return {
            label: "Connected",
            dotClassName: "bg-cyan",
        };
    }

    return {
        label: "Connecting",
        dotClassName: "bg-secondary",
    };
}

function screenConnectionNeedsAttention(
    connectionState: DisplayConnectionState,
    registrationState: DisplayRegistrationState,
): boolean {
    if (connectionState !== "connected" || registrationState === "failed") {
        return true;
    }

    return registrationState !== "registered";
}

function ScreenPresenceStatus({
    connectionState,
    registrationState,
    details,
}: ScreenPresenceStatusProps) {
    const diagnostic = useDisplayDiagnostic();
    const connection = readScreenConnection(connectionState, registrationState);
    const immediate = registrationState === "failed" || details.length > 0;
    const showConnectionProblem = useDelayedVisibility(
        screenConnectionNeedsAttention(connectionState, registrationState) && !immediate,
    );
    const showConnection = diagnostic || immediate || showConnectionProblem;

    if (!showConnection && details.length === 0) {
        return null;
    }

    return (
        <ConnectionBanner
            label={showConnection ? connection.label : null}
            dotClassName={connection.dotClassName}
            details={details}
        />
    );
}

export {
    DisplayConnectionStatus,
    DisplayStatus,
    ScreenPresenceStatus,
};
