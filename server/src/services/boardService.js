const { randomUUID } = require("crypto");
const boardRepository = require("../repositories/boardRepository");
const { MEDIA_REFERENCE_MISSING } = boardRepository;
const { notifyBoardPublished } = require("../realtime/boardRealtime");
const { sanitizeDraft } = require("../validators/boardValidator");
const { createHttpError } = require("../utils/httpError");

const BOARD_NAME_MAX_LENGTH = 200;
const BOARD_NAME_CONSTRAINT = "boards_name_key";
const COPY_NAME_ATTEMPTS = 1000;
const DUPLICATE_INSERT_ATTEMPTS = 8;

async function listBoards() {
    return boardRepository.listBoards();
}

async function getBoard(id) {
    const board = await boardRepository.findBoardById(id);

    if (board === null) {
        throw createHttpError(404, "Board not found.");
    }

    return board;
}

async function getPublishedBoard(id) {
    const board = await boardRepository.findPublishedBoardById(id);

    if (board === null) {
        throw createHttpError(404, "Board not found.");
    }

    return board;
}

async function publishBoard(id) {
    const board = await boardRepository.publishDraft(id);

    if (board === null) {
        throw createHttpError(404, "Board not found.");
    }

    notifyBoardPublished(board.id);
    return board;
}

async function renameBoard(id, name) {
    const current = await boardRepository.findBoardById(id);

    if (current === null) {
        throw createHttpError(404, "Board not found.");
    }

    if (current.name !== name) {
        const identities = await boardRepository.listBoardIdentities();
        assertBoardNameAvailable(name, identities);
    }

    try {
        const board = await boardRepository.renameBoard(id, name);

        if (board === null) {
            throw createHttpError(404, "Board not found.");
        }

        return board;
    } catch (error) {
        throw mapBoardNameConflict(error);
    }
}

async function replaceDraft(id, draft) {
    try {
        const board = await boardRepository.replaceDraft(id, draft);

        if (board === null) {
            throw createHttpError(404, "Board not found.");
        }

        return board;
    } catch (error) {
        throw mapBoardWriteError(error);
    }
}

async function createBoard(name, size = { width: 1920, height: 1080 }) {
    const identities = await boardRepository.listBoardIdentities();

    assertBoardNameAvailable(name, identities);

    const draft = buildEmptyDraft(name, createDraftId(identities), size);

    try {
        return await boardRepository.insertBoard(name, draft);
    } catch (error) {
        throw mapBoardWriteError(error);
    }
}

async function duplicateBoard(id) {
    const source = await boardRepository.findBoardById(id);

    if (source === null) {
        throw createHttpError(404, "Board not found.");
    }

    let identities = await boardRepository.listBoardIdentities();

    for (let attempt = 1; attempt <= DUPLICATE_INSERT_ATTEMPTS; attempt += 1) {
        const name = createCopyName(source.name, identities);
        const draft = buildDuplicateDraft(source.draft, createDraftId(identities), name);

        try {
            return await boardRepository.insertBoard(name, draft);
        } catch (error) {
            if (isMediaReferenceMissing(error) || !isBoardNameConflict(error) || attempt === DUPLICATE_INSERT_ATTEMPTS) {
                throw mapBoardWriteError(error);
            }

            identities = await boardRepository.listBoardIdentities();
        }
    }
}

function isBoardNameConflict(error) {
    return Boolean(error)
        && error.code === "23505"
        && error.constraint === BOARD_NAME_CONSTRAINT;
}

function mapBoardWriteError(error) {
    if (isMediaReferenceMissing(error)) {
        throw createHttpError(409, "A media asset used by this board is no longer available.", [{
            path: "draft",
            message: "A media asset used by this board is no longer available."
        }]);
    }

    return mapBoardNameConflict(error);
}

function isMediaReferenceMissing(error) {
    return Boolean(error) && error.code === MEDIA_REFERENCE_MISSING;
}

function mapBoardNameConflict(error) {
    if (!isBoardNameConflict(error)) {
        throw error;
    }

    throw createHttpError(409, "A board with this name already exists.", [{
        path: "name",
        message: "A board with this name already exists."
    }]);
}

function assertBoardNameAvailable(name, identities) {
    const taken = identities.some((identity) => identity.name === name);

    if (!taken) {
        return;
    }

    throw createHttpError(409, "A board with this name already exists.", [{
        path: "name",
        message: "A board with this name already exists."
    }]);
}

function createDraftId(identities) {
    const draftIds = new Set();

    identities.forEach((identity) => {
        if (typeof identity.draft_id === "string" && identity.draft_id !== "") {
            draftIds.add(identity.draft_id);
        }
    });

    let draftId = randomUUID();

    while (draftIds.has(draftId)) {
        draftId = randomUUID();
    }

    return draftId;
}

function createCopyName(sourceName, identities) {
    const names = new Set(identities.map((identity) => identity.name));

    for (let index = 1; index <= COPY_NAME_ATTEMPTS; index += 1) {
        const suffix = index === 1 ? " (Copy)" : ` (Copy ${index})`;
        const maxBaseLength = BOARD_NAME_MAX_LENGTH - suffix.length;

        if (maxBaseLength < 1) {
            break;
        }

        const base = sourceName.length > maxBaseLength
            ? sourceName.slice(0, maxBaseLength).trimEnd()
            : sourceName;
        const candidate = `${base}${suffix}`;

        if (base !== "" && !names.has(candidate)) {
            return candidate;
        }
    }

    throw createHttpError(409, "A unique board name could not be created.", [{
        path: "name",
        message: "A unique board name could not be created."
    }]);
}

function buildEmptyDraft(name, draftId, size) {
    return requireValidDraft({
        id: draftId,
        name,
        width: size.width,
        height: size.height,
        background: size.background === undefined
            ? {
                type: "solid",
                color: "var(--canvas-board)"
            }
            : size.background,
        widgets: size.widgets === undefined ? [] : size.widgets
    });
}

function buildDuplicateDraft(sourceDraft, draftId, name) {
    if (sourceDraft === null || typeof sourceDraft !== "object" || Array.isArray(sourceDraft)) {
        throw createHttpError(400, "Validation failed.", [{
            path: "draft",
            message: "The source board draft could not be copied."
        }]);
    }

    const draft = JSON.parse(JSON.stringify(sourceDraft));

    draft.id = draftId;
    draft.name = name;

    return requireValidDraft(draft);
}

function requireValidDraft(draft) {
    const errors = [];
    const sanitized = sanitizeDraft(draft, errors);

    if (sanitized === null || errors.length > 0) {
        throw createHttpError(400, "Validation failed.", errors);
    }

    return sanitized;
}

module.exports = {
    listBoards,
    getBoard,
    getPublishedBoard,
    publishBoard,
    replaceDraft,
    createBoard,
    duplicateBoard,
    renameBoard
};
