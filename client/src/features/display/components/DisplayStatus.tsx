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

function DisplayConnectionStatus({ connectionState, detail }: DisplayConnectionStatusProps) {
    return (
        <div className="pointer-events-none fixed bottom-4 left-4 z-20 flex max-w-xs flex-col items-start gap-2 font-sans">
            <p
                role="status"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/90 px-3 py-1.5 text-xs font-medium text-secondary shadow-panel"
            >
                <span
                    className={`size-1.5 rounded-full ${connectionDotClassName[connectionState]}`}
                    aria-hidden="true"
                />
                {connectionLabel[connectionState]}
            </p>
            {detail !== null ? (
                <p
                    role="status"
                    className="rounded-control border border-border bg-surface/90 px-3 py-2 text-xs leading-4 text-secondary shadow-panel"
                >
                    {detail}
                </p>
            ) : null}
        </div>
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

function ScreenPresenceStatus({
    connectionState,
    registrationState,
    details,
}: ScreenPresenceStatusProps) {
    const connection = readScreenConnection(connectionState, registrationState);

    return (
        <div className="pointer-events-none fixed bottom-4 left-4 z-20 flex max-w-xs flex-col items-start gap-2 font-sans">
            <p
                role="status"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/90 px-3 py-1.5 text-xs font-medium text-secondary shadow-panel"
            >
                <span
                    className={`size-1.5 rounded-full ${connection.dotClassName}`}
                    aria-hidden="true"
                />
                {connection.label}
            </p>
            {details.map((detail) => (
                <p
                    key={detail}
                    role="status"
                    className="rounded-control border border-border bg-surface/90 px-3 py-2 text-xs leading-4 text-secondary shadow-panel"
                >
                    {detail}
                </p>
            ))}
        </div>
    );
}

export {
    DisplayConnectionStatus,
    DisplayStatus,
    ScreenPresenceStatus,
};
