const { Server } = require("socket.io");
const env = require("../config/env");

// Subscriptions are public in this local-development foundation.
// Socket.IO cannot publish a board. Publishing stays on the REST API.

const JOIN_BOARD_EVENT = "joinBoard";
const LEAVE_BOARD_EVENT = "leaveBoard";
const BOARD_PUBLISHED_EVENT = "board:published";
const BOARD_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let io = null;

function attachBoardRealtime(httpServer) {
    if (io !== null) {
        return io;
    }

    io = new Server(httpServer, {
        cors: {
            origin(origin, callback) {
                if (!origin || origin === env.clientUrl) {
                    callback(null, true);
                    return;
                }

                callback(null, false);
            }
        }
    });

    io.on("connection", (socket) => {
        socket.on(JOIN_BOARD_EVENT, (boardId, acknowledge) => {
            const normalizedBoardId = normalizeBoardId(boardId);

            if (normalizedBoardId === null) {
                respond(acknowledge, false, "Board id must be a UUID.");
                return;
            }

            socket.join(boardRoom(normalizedBoardId));
            respond(acknowledge, true);
        });

        socket.on(LEAVE_BOARD_EVENT, (boardId, acknowledge) => {
            const normalizedBoardId = normalizeBoardId(boardId);

            if (normalizedBoardId === null) {
                respond(acknowledge, false, "Board id must be a UUID.");
                return;
            }

            socket.leave(boardRoom(normalizedBoardId));
            respond(acknowledge, true);
        });
    });

    return io;
}

function notifyBoardPublished(boardId) {
    const normalizedBoardId = normalizeBoardId(boardId);

    if (io === null || normalizedBoardId === null) {
        return;
    }

    io.to(boardRoom(normalizedBoardId)).emit(BOARD_PUBLISHED_EVENT, {
        boardId: normalizedBoardId
    });
}

function closeBoardRealtime() {
    if (io === null) {
        return;
    }

    const current = io;
    io = null;
    current.disconnectSockets(true);
}

function boardRoom(boardId) {
    return `board:${boardId}`;
}

function normalizeBoardId(value) {
    if (typeof value !== "string" || !BOARD_ID_PATTERN.test(value)) {
        return null;
    }

    return value.toLowerCase();
}

function respond(acknowledge, success, message) {
    if (typeof acknowledge !== "function") {
        return;
    }

    if (success) {
        acknowledge({ success: true });
        return;
    }

    acknowledge({
        success: false,
        message
    });
}

module.exports = {
    attachBoardRealtime,
    closeBoardRealtime,
    notifyBoardPublished
};
