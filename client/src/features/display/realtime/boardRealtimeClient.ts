import { io, type Socket } from "socket.io-client";
import apiClient from "../../../api/apiClient.ts";

export type DisplayConnectionState = "connected" | "reconnecting" | "disconnected";

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

const JOIN_TIMEOUT_MS = 5000;
const RELEASE_DELAY_MS = 50;
const SUBSCRIBE_ERROR = "This display could not subscribe to publication updates.";

let socket: Socket | null = null;
let releaseTimer: ReturnType<typeof setTimeout> | null = null;
const subscriptions = new Set<Subscription>();

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

function retainSocket() {
    if (releaseTimer !== null) {
        clearTimeout(releaseTimer);
        releaseTimer = null;
    }

    ensureSocket();
}

function releaseSocketSoon() {
    if (subscriptions.size > 0 || releaseTimer !== null) {
        return;
    }

    releaseTimer = setTimeout(() => {
        releaseTimer = null;

        if (subscriptions.size > 0 || socket === null) {
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

        // A server shutdown uses a forced disconnect. Socket.IO does not
        // reconnect after that unless the client starts the connection again.
        if (reason === "io server disconnect" && subscriptions.size > 0) {
            nextSocket.connect();
        }

        const state: DisplayConnectionState = nextSocket.active ? "reconnecting" : "disconnected";

        for (const subscription of subscriptions) {
            subscription.handlers.onConnectionState(state);
        }
    });

    nextSocket.io.on("reconnect_attempt", () => {
        for (const subscription of subscriptions) {
            subscription.handlers.onConnectionState("reconnecting");
        }
    });

    nextSocket.io.on("reconnect_failed", () => {
        for (const subscription of subscriptions) {
            subscription.handlers.onConnectionState("disconnected");
        }
    });

    nextSocket.on("connect_error", () => {
        if (nextSocket.connected) {
            return;
        }

        const state: DisplayConnectionState = nextSocket.active ? "reconnecting" : "disconnected";

        for (const subscription of subscriptions) {
            subscription.handlers.onConnectionState(state);
        }
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
    subscribeToBoardPublication,
};
