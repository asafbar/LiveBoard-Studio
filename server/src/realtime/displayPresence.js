const displayRepository = require("../repositories/displayRepository");

// Presence is ephemeral process memory for local development.
// Registration is not authentication. A display id does not prove
// which device connected, and this API must not be exposed publicly
// until device authentication exists.

const REGISTER_DISPLAY_EVENT = "registerDisplay";
const UNREGISTER_DISPLAY_EVENT = "unregisterDisplay";
const DISPLAY_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const socketsByDisplay = new Map();
const displaysBySocket = new Map();

function attachDisplayPresence(io) {
    io.on("connection", (socket) => {
        socket.on(REGISTER_DISPLAY_EVENT, (displayId, acknowledge) => {
            registerDisplay(socket, displayId, acknowledge);
        });

        socket.on(UNREGISTER_DISPLAY_EVENT, (displayId, acknowledge) => {
            unregisterDisplay(socket, displayId, acknowledge);
        });

        socket.on("disconnect", () => {
            clearSocket(socket.id);
        });
    });
}

async function registerDisplay(socket, displayId, acknowledge) {
    const normalizedDisplayId = normalizeDisplayId(displayId);

    if (normalizedDisplayId === null) {
        respond(acknowledge, false, "Display id must be a UUID.");
        return;
    }

    try {
        const display = await displayRepository.findDisplayById(normalizedDisplayId);

        if (display === null) {
            respond(acknowledge, false, "Display not found.");
            return;
        }

        if (socket.disconnected) {
            respond(acknowledge, false, "Display registration could not be completed.");
            return;
        }

        addRegistration(socket.id, normalizedDisplayId);

        if (socket.disconnected) {
            clearSocket(socket.id);
            respond(acknowledge, false, "Display registration could not be completed.");
            return;
        }

        respond(acknowledge, true);
    } catch (error) {
        console.error("Display registration failed.");
        respond(acknowledge, false, "Display registration could not be completed.");
    }
}

async function unregisterDisplay(socket, displayId, acknowledge) {
    const normalizedDisplayId = normalizeDisplayId(displayId);

    if (normalizedDisplayId === null) {
        respond(acknowledge, false, "Display id must be a UUID.");
        return;
    }

    if (hasRegistration(socket.id, normalizedDisplayId)) {
        removeRegistration(socket.id, normalizedDisplayId);
        respond(acknowledge, true);
        return;
    }

    try {
        const display = await displayRepository.findDisplayById(normalizedDisplayId);

        if (display === null) {
            respond(acknowledge, false, "Display not found.");
            return;
        }

        respond(acknowledge, true);
    } catch (error) {
        console.error("Display unregistration failed.");
        respond(acknowledge, false, "Display unregistration could not be completed.");
    }
}

function isDisplayOnline(displayId) {
    const normalizedDisplayId = normalizeDisplayId(displayId);

    if (normalizedDisplayId === null) {
        return false;
    }

    const socketIds = socketsByDisplay.get(normalizedDisplayId);

    return socketIds !== undefined && socketIds.size > 0;
}

function resetDisplayPresence() {
    socketsByDisplay.clear();
    displaysBySocket.clear();
}

function addRegistration(socketId, displayId) {
    let displayIds = displaysBySocket.get(socketId);

    if (displayIds === undefined) {
        displayIds = new Set();
        displaysBySocket.set(socketId, displayIds);
    }

    displayIds.add(displayId);

    let socketIds = socketsByDisplay.get(displayId);

    if (socketIds === undefined) {
        socketIds = new Set();
        socketsByDisplay.set(displayId, socketIds);
    }

    socketIds.add(socketId);
}

function removeRegistration(socketId, displayId) {
    const displayIds = displaysBySocket.get(socketId);

    if (displayIds !== undefined) {
        displayIds.delete(displayId);

        if (displayIds.size === 0) {
            displaysBySocket.delete(socketId);
        }
    }

    const socketIds = socketsByDisplay.get(displayId);

    if (socketIds !== undefined) {
        socketIds.delete(socketId);

        if (socketIds.size === 0) {
            socketsByDisplay.delete(displayId);
        }
    }
}

function hasRegistration(socketId, displayId) {
    const displayIds = displaysBySocket.get(socketId);

    return displayIds !== undefined && displayIds.has(displayId);
}

function clearSocket(socketId) {
    const displayIds = displaysBySocket.get(socketId);

    if (displayIds === undefined) {
        return;
    }

    for (const displayId of displayIds) {
        const socketIds = socketsByDisplay.get(displayId);

        if (socketIds === undefined) {
            continue;
        }

        socketIds.delete(socketId);

        if (socketIds.size === 0) {
            socketsByDisplay.delete(displayId);
        }
    }

    displaysBySocket.delete(socketId);
}

function normalizeDisplayId(value) {
    if (typeof value !== "string" || !DISPLAY_ID_PATTERN.test(value)) {
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
    attachDisplayPresence,
    isDisplayOnline,
    resetDisplayPresence
};
