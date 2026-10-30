import { io, type Socket } from "socket.io-client";
import apiClient from "../../../api/apiClient.ts";

export type DisplayConnectionState = "connected" | "reconnecting" | "disconnected";

export type DisplayRegistrationState = "inactive" | "registering" | "registered" | "failed";

type JoinAcknowledgement = {
    success: boolean;
    message?: string;
};

type BoardPublishedPayload = {
    boardId?: unknown;
};

type BoardSubscriptionHandlers = {
    onConnectionState: (state: DisplayConnectionState) => void;
    onSubscribed: () => void;
    onSubscribeError: (message: string) => void;
    onBoardPublished: (boardId: string) => void;
};

type Subscription = {
    boardId: string;
    handlers: BoardSubscriptionHandlers;
    joinGeneration: number;
    pendingSocketId: string | null;
    subscribed: boolean;
};

type DisplayRegistrationHandlers = {
    onConnectionState: (state: DisplayConnectionState) => void;
    onRegistrationState: (state: DisplayRegistrationState) => void;
    onRegistrationError: (message: string | null) => void;
};

type DisplayRegistration = {
    displayId: string;
    handlers: DisplayRegistrationHandlers;
    generation: number;
    pendingSocketId: string | null;
    registered: boolean;
};

const JOIN_TIMEOUT_MS = 5000;
const RELEASE_DELAY_MS = 50;
const SUBSCRIBE_ERROR = "This display could not subscribe to publication updates.";
const REGISTER_ERROR = "This display could not be registered.";

let socket: Socket | null = null;
let releaseTimer: ReturnType<typeof setTimeout> | null = null;
const subscriptions = new Set<Subscription>();
const displayRegistrations = new Set<DisplayRegistration>();

function subscribeToBoardPublication(
    boardId: string,
    handlers: BoardSubscriptionHandlers,
): () => void {
    const subscription: Subscription = {
        boardId: boardId.toLowerCase(),
        handlers,
        joinGeneration: 0,
        pendingSocketId: null,
        subscribed: false,
    };

    subscriptions.add(subscription);
    retainSocket();
    queueMicrotask(() => {
        if (!subscriptions.has(subscription)) {
            return;
        }

        reportConnectionState(subscription);

        if (socket?.connected) {
            joinBoard(subscription);
        }
    });

    return () => {
        subscriptions.delete(subscription);
        subscription.joinGeneration += 1;
        subscription.subscribed = false;
        subscription.pendingSocketId = null;

        if (socket?.connected) {
            socket.emit("leaveBoard", subscription.boardId);
        }

        releaseSocketSoon();
    };
}

// Registration is not device authentication. A display id only marks this
// socket present for local development.
function registerDisplayPresence(
    displayId: string,
    handlers: DisplayRegistrationHandlers,
): () => void {
    const registration: DisplayRegistration = {
        displayId: displayId.toLowerCase(),
        handlers,
        generation: 0,
        pendingSocketId: null,
        registered: false,
    };

    displayRegistrations.add(registration);
    retainSocket();
    queueMicrotask(() => {
        if (!displayRegistrations.has(registration)) {
            return;
        }

        reportRegistrationConnection(registration);

        if (socket?.connected) {
            emitRegisterDisplay(registration);
        }
    });

    return () => {
        const currentSocket = socket;
        const socketId = currentSocket?.id;
        const shouldUnregister = registration.registered || registration.pendingSocketId !== null;

        displayRegistrations.delete(registration);
        registration.generation += 1;
        registration.registered = false;
        registration.pendingSocketId = null;

        if (
            shouldUnregister
            && currentSocket?.connected
            && currentSocket.id === socketId
        ) {
            currentSocket.emit("unregisterDisplay", registration.displayId);
        }

        releaseSocketSoon();
    };
}

function retainSocket() {
    if (releaseTimer !== null) {
        clearTimeout(releaseTimer);
        releaseTimer = null;
    }

    ensureSocket();
}

function releaseSocketSoon() {
    if (hasSocketUsers() || releaseTimer !== null) {
        return;
    }

    releaseTimer = setTimeout(() => {
        releaseTimer = null;

        if (hasSocketUsers() || socket === null) {
            return;
        }

        const currentSocket = socket;
        socket = null;
        currentSocket.disconnect();
    }, RELEASE_DELAY_MS);
}

function ensureSocket() {
    if (socket !== null) {
        if (!socket.connected) {
            socket.connect();
        }

        return;
    }

    const baseUrl = apiClient.defaults.baseURL;

    if (typeof baseUrl !== "string" || baseUrl.trim() === "") {
        queueMicrotask(() => {
            for (const subscription of subscriptions) {
                subscription.handlers.onConnectionState("disconnected");
                subscription.handlers.onSubscribeError(SUBSCRIBE_ERROR);
            }

            for (const registration of displayRegistrations) {
                registration.handlers.onConnectionState("disconnected");
                registration.handlers.onRegistrationState("failed");
                registration.handlers.onRegistrationError(REGISTER_ERROR);
            }
        });
        return;
    }

    const nextSocket = io(baseUrl, {
        autoConnect: true,
        reconnection: true,
    });
    socket = nextSocket;

    nextSocket.on("connect", () => {
        for (const subscription of subscriptions) {
            subscription.pendingSocketId = null;
            subscription.subscribed = false;
            subscription.handlers.onConnectionState("connected");
            joinBoard(subscription);
        }

        for (const registration of displayRegistrations) {
            registration.pendingSocketId = null;
            registration.registered = false;
            registration.handlers.onConnectionState("connected");
            emitRegisterDisplay(registration);
        }
    });

    nextSocket.on("disconnect", (reason) => {
        if (reason === "io client disconnect") {
            return;
        }

        for (const subscription of subscriptions) {
            subscription.pendingSocketId = null;
            subscription.subscribed = false;
            subscription.joinGeneration += 1;
        }

        for (const registration of displayRegistrations) {
            registration.pendingSocketId = null;
            registration.registered = false;
            registration.generation += 1;
            registration.handlers.onRegistrationState("inactive");
            registration.handlers.onRegistrationError(null);
        }

        // A server shutdown uses a forced disconnect. Socket.IO does not
        // reconnect after that unless the client starts the connection again.
        if (reason === "io server disconnect" && hasSocketUsers()) {
            nextSocket.connect();
        }

        const state: DisplayConnectionState = nextSocket.active ? "reconnecting" : "disconnected";

        for (const subscription of subscriptions) {
            subscription.handlers.onConnectionState(state);
        }

        for (const registration of displayRegistrations) {
            registration.handlers.onConnectionState(state);
        }
    });

    nextSocket.io.on("reconnect_attempt", () => {
        notifyConnectionState("reconnecting");
    });

    nextSocket.io.on("reconnect_failed", () => {
        notifyConnectionState("disconnected");
    });

    nextSocket.on("connect_error", () => {
        if (nextSocket.connected) {
            return;
        }

        notifyConnectionState(nextSocket.active ? "reconnecting" : "disconnected");
    });

    nextSocket.on("board:published", (payload: BoardPublishedPayload) => {
        if (typeof payload?.boardId !== "string") {
            return;
        }

        const eventBoardId = payload.boardId.toLowerCase();

        for (const subscription of subscriptions) {
            if (!subscription.subscribed || subscription.boardId !== eventBoardId) {
                continue;
            }

            subscription.handlers.onBoardPublished(eventBoardId);
        }
    });
}

function hasSocketUsers(): boolean {
    return subscriptions.size > 0 || displayRegistrations.size > 0;
}

function notifyConnectionState(state: DisplayConnectionState) {
    for (const subscription of subscriptions) {
        subscription.handlers.onConnectionState(state);
    }

    for (const registration of displayRegistrations) {
        registration.handlers.onConnectionState(state);
    }
}

function reportRegistrationConnection(registration: DisplayRegistration) {
    if (socket === null) {
        registration.handlers.onConnectionState("disconnected");
        return;
    }

    if (socket.connected) {
        registration.handlers.onConnectionState("connected");
        return;
    }

    registration.handlers.onConnectionState(socket.active ? "reconnecting" : "disconnected");
}

function emitRegisterDisplay(registration: DisplayRegistration) {
    const currentSocket = socket;

    if (currentSocket === null || !currentSocket.connected) {
        return;
    }

    const socketId = currentSocket.id;

    if (socketId === undefined || registration.pendingSocketId === socketId) {
        return;
    }

    registration.pendingSocketId = socketId;
    registration.registered = false;
    registration.generation += 1;
    const generation = registration.generation;
    registration.handlers.onRegistrationState("registering");
    registration.handlers.onRegistrationError(null);

    currentSocket.timeout(JOIN_TIMEOUT_MS).emit(
        "registerDisplay",
        registration.displayId,
        (error: unknown, response?: JoinAcknowledgement) => {
            const acknowledged = !isJoinFailure(error) && response?.success === true;
            const sameSocket = socket?.connected === true && socket.id === socketId;

            if (
                generation !== registration.generation
                || !displayRegistrations.has(registration)
                || !sameSocket
            ) {
                if (acknowledged && sameSocket) {
                    socket?.emit("unregisterDisplay", registration.displayId);
                }

                return;
            }

            if (!acknowledged) {
                registration.pendingSocketId = null;
                registration.registered = false;
                const message = response?.message?.trim();
                registration.handlers.onRegistrationState("failed");
                registration.handlers.onRegistrationError(
                    message !== undefined && message !== ""
                        ? message
                        : REGISTER_ERROR,
                );
                return;
            }

            registration.registered = true;
            registration.handlers.onRegistrationState("registered");
            registration.handlers.onRegistrationError(null);
        },
    );
}

function reportConnectionState(subscription: Subscription) {
    if (socket === null) {
        subscription.handlers.onConnectionState("disconnected");
        return;
    }

    if (socket.connected) {
        subscription.handlers.onConnectionState("connected");
        return;
    }

    subscription.handlers.onConnectionState(socket.active ? "reconnecting" : "disconnected");
}

function joinBoard(subscription: Subscription) {
    const currentSocket = socket;

    if (currentSocket === null || !currentSocket.connected) {
        return;
    }

    const socketId = currentSocket.id;

    if (socketId === undefined || subscription.pendingSocketId === socketId) {
        return;
    }

    subscription.pendingSocketId = socketId;
    subscription.subscribed = false;
    subscription.joinGeneration += 1;
    const generation = subscription.joinGeneration;

    currentSocket.timeout(JOIN_TIMEOUT_MS).emit(
        "joinBoard",
        subscription.boardId,
        (error: unknown, response?: JoinAcknowledgement) => {
            if (
                generation !== subscription.joinGeneration
                || !subscriptions.has(subscription)
                || socket?.id !== socketId
            ) {
                return;
            }

            if (isJoinFailure(error) || response?.success !== true) {
                subscription.pendingSocketId = null;
                subscription.subscribed = false;
                const message = response?.message?.trim();
                subscription.handlers.onSubscribeError(
                    message !== undefined && message !== ""
                        ? message
                        : SUBSCRIBE_ERROR,
                );
                return;
            }

            subscription.subscribed = true;
            subscription.handlers.onSubscribed();
        },
    );
}

function isJoinFailure(error: unknown): boolean {
    return error !== null && error !== undefined;
}

export {
    registerDisplayPresence,
    subscribeToBoardPublication,
};
