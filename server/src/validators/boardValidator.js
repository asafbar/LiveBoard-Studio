const { createHttpError } = require("../utils/httpError");

const BOARD_WIDTH = 1920;
const BOARD_HEIGHT = 1080;
const MIN_WIDGET_WIDTH = 100;
const MIN_WIDGET_HEIGHT = 60;
const MAX_WIDGETS = 100;
const MAX_ANNOUNCEMENT_ITEMS = 30;
const MAX_TICKER_MESSAGES = 30;
const MIN_TICKER_SPEED = 20;
const MAX_TICKER_SPEED = 400;
const MIN_TICKER_FONT_SIZE = 12;
const MAX_TICKER_FONT_SIZE = 160;
const MAX_VERTICAL_ANNOUNCEMENTS = 40;
const MIN_VERTICAL_SPEED = 20;
const MAX_VERTICAL_SPEED = 400;
const MIN_VERTICAL_PAUSE_SECONDS = 0;
const MAX_VERTICAL_PAUSE_SECONDS = 30;
const MIN_VERTICAL_TITLE_FONT_SIZE = 12;
const MAX_VERTICAL_TITLE_FONT_SIZE = 120;
const MIN_VERTICAL_DESCRIPTION_FONT_SIZE = 12;
const MAX_VERTICAL_DESCRIPTION_FONT_SIZE = 96;
const MAX_VERTICAL_TITLE_LENGTH = 200;
const MAX_VERTICAL_DESCRIPTION_LENGTH = 500;
const MAX_VERTICAL_LABEL_LENGTH = 80;
const MAX_BORDER_RADIUS = 240;
const MAX_TEXT_LENGTH = 4000;
const MAX_SHORT_TEXT_LENGTH = 200;
const MAX_SOURCE_LENGTH = 2000;
const MAX_ID_LENGTH = 80;
const MAX_LAYER_NAME_LENGTH = 80;
const MAX_COLOR_LENGTH = 200;

const WIDGET_TYPES = ["text", "clock", "image", "information-card", "announcements", "ticker", "vertical-announcements"];
const WIDGET_KEYS = ["id", "type", "layout", "settings", "layerName", "visible", "locked"];
const TEXT_TONES = ["default", "accent"];
const TEXT_SIZES = ["title", "display"];
const CLOCK_TIME_ZONES = ["Asia/Jerusalem", "UTC", "America/New_York", "Europe/London"];
const CLOCK_ALIGNMENTS = ["left", "right"];
const OBJECT_FITS = ["cover", "contain"];
const ANNOUNCEMENT_ICONS = ["food", "people", "music", "info"];
const TICKER_DIRECTIONS = ["rtl", "ltr"];
const TICKER_FONT_FAMILIES = ["sans", "serif", "mono"];
const TICKER_FONT_WEIGHTS = [400, 500, 600, 700];
const IMAGE_SOURCE_SCHEMES = ["http", "https", "javascript", "data", "blob", "file", "vbscript"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const BOARD_KEYS = ["id", "name", "width", "height", "background", "widgets"];
const FORBIDDEN_BODY_KEYS = ["published", "createdAt", "created_at", "updatedAt", "updated_at"];

function validateBoardId(req, res, next) {
    if (typeof req.params.id === "string" && UUID_PATTERN.test(req.params.id)) {
        next();
        return;
    }

    next(createHttpError(400, "Validation failed.", [{
        path: "id",
        message: "Board id must be a UUID."
    }]));
}

function validateCreateBoard(req, res, next) {
    const errors = [];
    const body = readRequestBody(req.body, errors);

    if (body !== null) {
        Object.keys(body).forEach((key) => {
            if (key !== "name") {
                errors.push({
                    path: key,
                    message: "Unknown field."
                });
            }
        });

        const name = readRequiredText(body.name, "name", MAX_SHORT_TEXT_LENGTH, errors);

        if (errors.length === 0) {
            req.boardName = name;
        }
    }

    if (errors.length > 0) {
        next(createHttpError(400, "Validation failed.", errors));
        return;
    }

    next();
}

function validateDraft(req, res, next) {
    const errors = [];
    const draft = sanitizeDraft(req.body, errors);

    if (errors.length > 0) {
        next(createHttpError(400, "Validation failed.", errors));
        return;
    }

    req.draft = draft;
    next();
}

function sanitizeDraft(body, errors) {
    if (!isPlainObject(body)) {
        errors.push({
            path: "",
            message: "Draft must be an object."
        });
        return null;
    }

    rejectForbiddenKeys(body, errors);
    rejectUnknownKeys(body, BOARD_KEYS, "", errors);

    const draft = {
        id: readId(body.id, "id", errors),
        name: readRequiredText(body.name, "name", MAX_SHORT_TEXT_LENGTH, errors),
        width: readExactInteger(body.width, "width", BOARD_WIDTH, errors),
        height: readExactInteger(body.height, "height", BOARD_HEIGHT, errors),
        background: sanitizeBackground(body.background, errors),
        widgets: sanitizeWidgets(body.widgets, errors)
    };

    if (errors.length > 0) {
        return null;
    }

    return draft;
}

function sanitizeBackground(background, errors) {
    if (!isPlainObject(background) || typeof background.type !== "string") {
        errors.push({
            path: "background",
            message: "Background must be a solid color, gradient, or image."
        });
        return null;
    }

    if (background.type === "solid") {
        rejectUnknownKeys(background, ["type", "color"], "background", errors);

        return {
            type: "solid",
            color: readColor(background.color, "background.color", errors)
        };
    }

    if (background.type === "gradient") {
        rejectUnknownKeys(background, ["type", "from", "to", "angle"], "background", errors);

        return {
            type: "gradient",
            from: readColor(background.from, "background.from", errors),
            to: readColor(background.to, "background.to", errors),
            angle: readNumberInRange(background.angle, "background.angle", 0, 360, errors)
        };
    }

    if (background.type === "image") {
        rejectUnknownKeys(
            background,
            ["type", "src", "fit", "position", "fallbackColor"],
            "background",
            errors
        );

        return {
            type: "image",
            src: readImageSource(background.src, "background.src", false, errors),
            fit: readChoice(background.fit, "background.fit", OBJECT_FITS, errors),
            position: readRequiredText(background.position, "background.position", MAX_SHORT_TEXT_LENGTH, errors),
            fallbackColor: readColor(background.fallbackColor, "background.fallbackColor", errors)
        };
    }

    errors.push({
        path: "background.type",
        message: "Background type is not supported."
    });
    return null;
}

function sanitizeWidgets(widgets, errors) {
    if (!Array.isArray(widgets)) {
        errors.push({
            path: "widgets",
            message: "Widgets must be an array."
        });
        return [];
    }

    if (widgets.length > MAX_WIDGETS) {
        errors.push({
            path: "widgets",
            message: `A board can contain at most ${MAX_WIDGETS} widgets.`
        });
        return [];
    }

    const ids = new Set();
    const sanitized = [];

    widgets.forEach((widget, index) => {
        const path = `widgets.${index}`;
        const nextWidget = sanitizeWidget(widget, path, errors);

        if (nextWidget === null) {
            return;
        }

        if (ids.has(nextWidget.id)) {
            errors.push({
                path: `${path}.id`,
                message: "Widget ids must be unique."
            });
        }

        ids.add(nextWidget.id);
        sanitized.push(nextWidget);
    });

    return sanitized;
}

function sanitizeWidget(widget, path, errors) {
    if (!isPlainObject(widget)) {
        errors.push({
            path,
            message: "Widget must be an object."
        });
        return null;
    }

    rejectUnknownKeys(widget, WIDGET_KEYS, path, errors);

    const id = readId(widget.id, `${path}.id`, errors);
    const type = readChoice(widget.type, `${path}.type`, WIDGET_TYPES, errors);
    const layout = sanitizeLayout(widget.layout, `${path}.layout`, errors);
    const settings = sanitizeSettings(type, widget.settings, `${path}.settings`, errors);
    const errorCount = errors.length;
    const layerName = readOptionalLayerName(widget.layerName, `${path}.layerName`, errors);
    const visible = readOptionalBoolean(widget.visible, `${path}.visible`, errors);
    const locked = readOptionalBoolean(widget.locked, `${path}.locked`, errors);

    if (id === null || type === null || layout === null || settings === null || errors.length !== errorCount) {
        return null;
    }

    const nextWidget = {
        id,
        type,
        layout,
        settings
    };

    if (layerName !== undefined) {
        nextWidget.layerName = layerName;
    }

    if (visible !== undefined) {
        nextWidget.visible = visible;
    }

    if (locked !== undefined) {
        nextWidget.locked = locked;
    }

    return nextWidget;
}

function sanitizeLayout(layout, path, errors) {
    if (!isPlainObject(layout)) {
        errors.push({
            path,
            message: "Widget layout is required."
        });
        return null;
    }

    rejectUnknownKeys(layout, ["x", "y", "width", "height"], path, errors);

    const x = readInteger(layout.x, `${path}.x`, errors);
    const y = readInteger(layout.y, `${path}.y`, errors);
    const width = readInteger(layout.width, `${path}.width`, errors);
    const height = readInteger(layout.height, `${path}.height`, errors);

    if (x === null || y === null || width === null || height === null) {
        return null;
    }

    if (x < 0 || y < 0) {
        errors.push({
            path,
            message: "Widget position must stay on the board."
        });
    }

    if (width < MIN_WIDGET_WIDTH || height < MIN_WIDGET_HEIGHT) {
        errors.push({
            path,
            message: `Widget size must be at least ${MIN_WIDGET_WIDTH} by ${MIN_WIDGET_HEIGHT}.`
        });
    }

    if (x + width > BOARD_WIDTH || y + height > BOARD_HEIGHT) {
        errors.push({
            path,
            message: "Widget must fit inside the board."
        });
    }

    return { x, y, width, height };
}

function sanitizeSettings(type, settings, path, errors) {
    if (!isPlainObject(settings)) {
        errors.push({
            path,
            message: "Widget settings are required."
        });
        return null;
    }

    if (type === "text") {
        return sanitizeTextSettings(settings, path, errors);
    }

    if (type === "clock") {
        return sanitizeClockSettings(settings, path, errors);
    }

    if (type === "image") {
        return sanitizeImageSettings(settings, path, errors);
    }

    if (type === "information-card") {
        return sanitizeInformationCardSettings(settings, path, errors);
    }

    if (type === "announcements") {
        return sanitizeAnnouncementsSettings(settings, path, errors);
    }

    if (type === "ticker") {
        return sanitizeTickerSettings(settings, path, errors);
    }

    if (type === "vertical-announcements") {
        return sanitizeVerticalAnnouncementsSettings(settings, path, errors);
    }

    return null;
}

function sanitizeTextSettings(settings, path, errors) {
    rejectUnknownKeys(settings, ["text", "tone", "size"], path, errors);

    return {
        text: readRequiredText(settings.text, `${path}.text`, MAX_TEXT_LENGTH, errors, true),
        tone: readChoice(settings.tone, `${path}.tone`, TEXT_TONES, errors),
        size: readChoice(settings.size, `${path}.size`, TEXT_SIZES, errors)
    };
}

function sanitizeClockSettings(settings, path, errors) {
    rejectUnknownKeys(settings, ["timeZone", "showDate", "showSeconds", "align"], path, errors);

    return {
        timeZone: readChoice(settings.timeZone, `${path}.timeZone`, CLOCK_TIME_ZONES, errors),
        showDate: readBoolean(settings.showDate, `${path}.showDate`, errors),
        showSeconds: readBoolean(settings.showSeconds, `${path}.showSeconds`, errors),
        align: readChoice(settings.align, `${path}.align`, CLOCK_ALIGNMENTS, errors)
    };
}

function sanitizeImageSettings(settings, path, errors) {
    rejectUnknownKeys(
        settings,
        ["src", "alt", "objectFit", "borderRadius", "fallbackBackgroundColor"],
        path,
        errors
    );

    return {
        src: readImageSource(settings.src, `${path}.src`, true, errors),
        alt: readRequiredText(settings.alt, `${path}.alt`, MAX_SHORT_TEXT_LENGTH, errors, true),
        objectFit: readChoice(settings.objectFit, `${path}.objectFit`, OBJECT_FITS, errors),
        borderRadius: readNumberInRange(settings.borderRadius, `${path}.borderRadius`, 0, MAX_BORDER_RADIUS, errors),
        fallbackBackgroundColor: readColor(settings.fallbackBackgroundColor, `${path}.fallbackBackgroundColor`, errors)
    };
}

function sanitizeInformationCardSettings(settings, path, errors) {
    rejectUnknownKeys(
        settings,
        ["title", "subtitle", "description", "badge", "imageSrc", "backgroundColor", "textColor", "borderRadius"],
        path,
        errors
    );

    const nextSettings = {
        title: readRequiredText(settings.title, `${path}.title`, MAX_SHORT_TEXT_LENGTH, errors, true),
        backgroundColor: readColor(settings.backgroundColor, `${path}.backgroundColor`, errors),
        textColor: readColor(settings.textColor, `${path}.textColor`, errors),
        borderRadius: readNumberInRange(settings.borderRadius, `${path}.borderRadius`, 0, MAX_BORDER_RADIUS, errors)
    };

    assignOptionalText(nextSettings, "subtitle", settings.subtitle, `${path}.subtitle`, errors);
    assignOptionalText(nextSettings, "description", settings.description, `${path}.description`, errors);
    assignOptionalText(nextSettings, "badge", settings.badge, `${path}.badge`, errors);

    if (settings.imageSrc !== undefined) {
        nextSettings.imageSrc = readImageSource(settings.imageSrc, `${path}.imageSrc`, true, errors);
    }

    return nextSettings;
}

function sanitizeAnnouncementsSettings(settings, path, errors) {
    rejectUnknownKeys(
        settings,
        ["title", "items", "backgroundColor", "textColor", "borderRadius"],
        path,
        errors
    );

    return {
        title: readRequiredText(settings.title, `${path}.title`, MAX_SHORT_TEXT_LENGTH, errors, true),
        items: sanitizeAnnouncementItems(settings.items, `${path}.items`, errors),
        backgroundColor: readColor(settings.backgroundColor, `${path}.backgroundColor`, errors),
        textColor: readColor(settings.textColor, `${path}.textColor`, errors),
        borderRadius: readNumberInRange(settings.borderRadius, `${path}.borderRadius`, 0, MAX_BORDER_RADIUS, errors)
    };
}

function sanitizeAnnouncementItems(items, path, errors) {
    if (!Array.isArray(items)) {
        errors.push({
            path,
            message: "Announcement items must be an array."
        });
        return [];
    }

    if (items.length > MAX_ANNOUNCEMENT_ITEMS) {
        errors.push({
            path,
            message: `An announcements widget can contain at most ${MAX_ANNOUNCEMENT_ITEMS} items.`
        });
        return [];
    }

    const ids = new Set();

    return items.map((item, index) => {
        const itemPath = `${path}.${index}`;

        if (!isPlainObject(item)) {
            errors.push({
                path: itemPath,
                message: "Announcement item must be an object."
            });
            return null;
        }

        rejectUnknownKeys(item, ["id", "title", "description", "meta", "icon"], itemPath, errors);

        const id = readId(item.id, `${itemPath}.id`, errors);

        if (id !== null && ids.has(id)) {
            errors.push({
                path: `${itemPath}.id`,
                message: "Announcement item ids must be unique."
            });
        }

        if (id !== null) {
            ids.add(id);
        }

        const nextItem = {
            id,
            title: readRequiredText(item.title, `${itemPath}.title`, MAX_SHORT_TEXT_LENGTH, errors, true)
        };

        assignOptionalText(nextItem, "description", item.description, `${itemPath}.description`, errors);
        assignOptionalText(nextItem, "meta", item.meta, `${itemPath}.meta`, errors);

        if (item.icon !== undefined) {
            nextItem.icon = readChoice(item.icon, `${itemPath}.icon`, ANNOUNCEMENT_ICONS, errors);
        }

        return nextItem;
    });
}

function sanitizeTickerSettings(settings, path, errors) {
    rejectUnknownKeys(
        settings,
        [
            "messages",
            "direction",
            "speed",
            "backgroundColor",
            "textColor",
            "accentColor",
            "borderRadius",
            "fontFamily",
            "fontSize",
            "fontWeight"
        ],
        path,
        errors
    );

    const nextSettings = {
        messages: sanitizeTickerMessages(settings.messages, `${path}.messages`, errors),
        direction: readChoice(settings.direction, `${path}.direction`, TICKER_DIRECTIONS, errors),
        speed: readIntegerInRange(settings.speed, `${path}.speed`, MIN_TICKER_SPEED, MAX_TICKER_SPEED, errors),
        backgroundColor: readColor(settings.backgroundColor, `${path}.backgroundColor`, errors),
        textColor: readColor(settings.textColor, `${path}.textColor`, errors),
        accentColor: readColor(settings.accentColor, `${path}.accentColor`, errors),
        borderRadius: readNumberInRange(settings.borderRadius, `${path}.borderRadius`, 0, MAX_BORDER_RADIUS, errors)
    };

    if (settings.fontFamily !== undefined) {
        nextSettings.fontFamily = readChoice(
            settings.fontFamily,
            `${path}.fontFamily`,
            TICKER_FONT_FAMILIES,
            errors
        );
    }

    if (settings.fontSize !== undefined) {
        nextSettings.fontSize = readIntegerInRange(
            settings.fontSize,
            `${path}.fontSize`,
            MIN_TICKER_FONT_SIZE,
            MAX_TICKER_FONT_SIZE,
            errors
        );
    }

    if (settings.fontWeight !== undefined) {
        const weight = readInteger(settings.fontWeight, `${path}.fontWeight`, errors);

        if (weight !== null && !TICKER_FONT_WEIGHTS.includes(weight)) {
            errors.push({
                path: `${path}.fontWeight`,
                message: "Value is not supported."
            });
        }

        if (weight !== null) {
            nextSettings.fontWeight = weight;
        }
    }

    return nextSettings;
}

function sanitizeVerticalAnnouncementsSettings(settings, path, errors) {
    rejectUnknownKeys(
        settings,
        [
            "items",
            "speed",
            "backgroundColor",
            "textColor",
            "accentColor",
            "borderRadius",
            "pauseSeconds",
            "fontFamily",
            "titleFontSize",
            "descriptionFontSize",
            "fontWeight"
        ],
        path,
        errors
    );

    const nextSettings = {
        items: sanitizeVerticalAnnouncementItems(settings.items, `${path}.items`, errors),
        speed: readIntegerInRange(settings.speed, `${path}.speed`, MIN_VERTICAL_SPEED, MAX_VERTICAL_SPEED, errors),
        backgroundColor: readColor(settings.backgroundColor, `${path}.backgroundColor`, errors),
        textColor: readColor(settings.textColor, `${path}.textColor`, errors),
        accentColor: readColor(settings.accentColor, `${path}.accentColor`, errors),
        borderRadius: readNumberInRange(settings.borderRadius, `${path}.borderRadius`, 0, MAX_BORDER_RADIUS, errors)
    };

    if (settings.pauseSeconds !== undefined) {
        nextSettings.pauseSeconds = readIntegerInRange(
            settings.pauseSeconds,
            `${path}.pauseSeconds`,
            MIN_VERTICAL_PAUSE_SECONDS,
            MAX_VERTICAL_PAUSE_SECONDS,
            errors
        );
    }

    if (settings.fontFamily !== undefined) {
        nextSettings.fontFamily = readChoice(
            settings.fontFamily,
            `${path}.fontFamily`,
            TICKER_FONT_FAMILIES,
            errors
        );
    }

    if (settings.titleFontSize !== undefined) {
        nextSettings.titleFontSize = readIntegerInRange(
            settings.titleFontSize,
            `${path}.titleFontSize`,
            MIN_VERTICAL_TITLE_FONT_SIZE,
            MAX_VERTICAL_TITLE_FONT_SIZE,
            errors
        );
    }

    if (settings.descriptionFontSize !== undefined) {
        nextSettings.descriptionFontSize = readIntegerInRange(
            settings.descriptionFontSize,
            `${path}.descriptionFontSize`,
            MIN_VERTICAL_DESCRIPTION_FONT_SIZE,
            MAX_VERTICAL_DESCRIPTION_FONT_SIZE,
            errors
        );
    }

    if (settings.fontWeight !== undefined) {
        const weight = readInteger(settings.fontWeight, `${path}.fontWeight`, errors);

        if (weight !== null && !TICKER_FONT_WEIGHTS.includes(weight)) {
            errors.push({
                path: `${path}.fontWeight`,
                message: "Value is not supported."
            });
        }

        if (weight !== null) {
            nextSettings.fontWeight = weight;
        }
    }

    return nextSettings;
}

function sanitizeVerticalAnnouncementItems(items, path, errors) {
    if (!Array.isArray(items)) {
        errors.push({
            path,
            message: "Announcements must be an array."
        });
        return [];
    }

    if (items.length > MAX_VERTICAL_ANNOUNCEMENTS) {
        errors.push({
            path,
            message: `A vertical announcements widget can contain at most ${MAX_VERTICAL_ANNOUNCEMENTS} items.`
        });
        return [];
    }

    const ids = new Set();

    return items.map((item, index) => {
        const itemPath = `${path}.${index}`;

        if (!isPlainObject(item)) {
            errors.push({
                path: itemPath,
                message: "Announcement must be an object."
            });
            return null;
        }

        rejectUnknownKeys(item, ["id", "title", "description", "label"], itemPath, errors);

        const id = readId(item.id, `${itemPath}.id`, errors);

        if (id !== null && ids.has(id)) {
            errors.push({
                path: `${itemPath}.id`,
                message: "Announcement ids must be unique."
            });
        }

        if (id !== null) {
            ids.add(id);
        }

        const nextItem = {
            id,
            title: readRequiredText(item.title, `${itemPath}.title`, MAX_VERTICAL_TITLE_LENGTH, errors, true)
        };

        if (item.description !== undefined) {
            nextItem.description = readRequiredText(
                item.description,
                `${itemPath}.description`,
                MAX_VERTICAL_DESCRIPTION_LENGTH,
                errors,
                true,
                true
            );
        }

        if (item.label !== undefined) {
            nextItem.label = readRequiredText(
                item.label,
                `${itemPath}.label`,
                MAX_VERTICAL_LABEL_LENGTH,
                errors,
                true
            );
        }

        return nextItem;
    });
}

function sanitizeTickerMessages(messages, path, errors) {
    if (!Array.isArray(messages)) {
        errors.push({
            path,
            message: "Ticker messages must be an array."
        });
        return [];
    }

    if (messages.length > MAX_TICKER_MESSAGES) {
        errors.push({
            path,
            message: `A ticker can contain at most ${MAX_TICKER_MESSAGES} messages.`
        });
        return [];
    }

    const ids = new Set();

    return messages.map((message, index) => {
        const messagePath = `${path}.${index}`;

        if (!isPlainObject(message)) {
            errors.push({
                path: messagePath,
                message: "Ticker message must be an object."
            });
            return null;
        }

        rejectUnknownKeys(message, ["id", "text"], messagePath, errors);

        const id = readId(message.id, `${messagePath}.id`, errors);

        if (id !== null && ids.has(id)) {
            errors.push({
                path: `${messagePath}.id`,
                message: "Ticker message ids must be unique."
            });
        }

        if (id !== null) {
            ids.add(id);
        }

        return {
            id,
            text: readRequiredText(message.text, `${messagePath}.text`, MAX_SHORT_TEXT_LENGTH, errors, true)
        };
    });
}

function readIntegerInRange(value, path, minimum, maximum, errors) {
    const integer = readInteger(value, path, errors);

    if (integer === null) {
        return null;
    }

    if (integer < minimum || integer > maximum) {
        errors.push({
            path,
            message: `Value must be an integer from ${minimum} to ${maximum}.`
        });
        return null;
    }

    return integer;
}

function readRequestBody(body, errors) {
    if (!isPlainObject(body)) {
        errors.push({
            path: "",
            message: "Request body must be an object."
        });
        return null;
    }

    return body;
}

function rejectForbiddenKeys(body, errors) {
    FORBIDDEN_BODY_KEYS.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(body, key)) {
            errors.push({
                path: key,
                message: "This field cannot be changed through the draft API."
            });
        }
    });
}

function rejectUnknownKeys(value, allowedKeys, path, errors) {
    Object.keys(value).forEach((key) => {
        if (allowedKeys.includes(key) || FORBIDDEN_BODY_KEYS.includes(key)) {
            return;
        }

        errors.push({
            path: path === "" ? key : `${path}.${key}`,
            message: "Unknown field."
        });
    });
}

function readId(value, path, errors) {
    if (typeof value !== "string" || value.trim() === "" || value.trim().length > MAX_ID_LENGTH || hasControlCharacter(value)) {
        errors.push({
            path,
            message: "Id must be a non-empty string."
        });
        return null;
    }

    return value.trim();
}

function readRequiredText(value, path, maxLength, errors, allowEmpty = false, allowNewlines = false) {
    if (typeof value !== "string") {
        errors.push({
            path,
            message: "Text is required."
        });
        return null;
    }

    if (hasDisallowedControlCharacter(value, allowNewlines)) {
        errors.push({
            path,
            message: "Text contains unsupported characters."
        });
        return null;
    }

    const text = value.trim();

    if (!allowEmpty && text === "") {
        errors.push({
            path,
            message: "Text is required."
        });
        return null;
    }

    if (text.length > maxLength) {
        errors.push({
            path,
            message: `Text must be at most ${maxLength} characters.`
        });
        return null;
    }

    return text;
}

function assignOptionalText(target, key, value, path, errors) {
    if (value === undefined) {
        return;
    }

    target[key] = readRequiredText(value, path, MAX_TEXT_LENGTH, errors, true);
}

function readOptionalLayerName(value, path, errors) {
    if (value === undefined) {
        return undefined;
    }

    const name = readRequiredText(value, path, MAX_LAYER_NAME_LENGTH, errors, true);

    if (name === null || name === "") {
        return undefined;
    }

    return name;
}

function readOptionalBoolean(value, path, errors) {
    if (value === undefined) {
        return undefined;
    }

    const booleanValue = readBoolean(value, path, errors);

    return booleanValue === null ? undefined : booleanValue;
}

function readBoolean(value, path, errors) {
    if (typeof value !== "boolean") {
        errors.push({
            path,
            message: "Value must be true or false."
        });
        return null;
    }

    return value;
}

function readChoice(value, path, choices, errors) {
    if (typeof value !== "string" || !choices.includes(value)) {
        errors.push({
            path,
            message: "Value is not supported."
        });
        return null;
    }

    return value;
}

function readInteger(value, path, errors) {
    if (typeof value !== "number" || !Number.isInteger(value)) {
        errors.push({
            path,
            message: "Value must be a finite integer."
        });
        return null;
    }

    return value;
}

function readExactInteger(value, path, expected, errors) {
    const integer = readInteger(value, path, errors);

    if (integer === null) {
        return null;
    }

    if (integer !== expected) {
        errors.push({
            path,
            message: `Value must be ${expected}.`
        });
    }

    return integer;
}

function readNumberInRange(value, path, minimum, maximum, errors) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
        errors.push({
            path,
            message: `Value must be a number from ${minimum} to ${maximum}.`
        });
        return null;
    }

    return value;
}

function readColor(value, path, errors) {
    if (typeof value !== "string") {
        errors.push({
            path,
            message: "Color is required."
        });
        return null;
    }

    const color = value.trim();

    if (!isSupportedColor(color)) {
        errors.push({
            path,
            message: "Color is not supported."
        });
        return null;
    }

    return color;
}

function isSupportedColor(color) {
    if (color.length === 0 || color.length > MAX_COLOR_LENGTH || hasControlCharacter(color)) {
        return false;
    }

    if (/^#[0-9a-fA-F]{6}$/.test(color)) {
        return true;
    }

    if (/^var\(--[A-Za-z0-9-_]+\)$/.test(color)) {
        return true;
    }

    return /^color-mix\(in srgb, var\(--[A-Za-z0-9-_]+\) \d{1,3}%, var\(--[A-Za-z0-9-_]+\)\)$/.test(color);
}

function readImageSource(value, path, allowEmpty, errors) {
    if (typeof value !== "string") {
        errors.push({
            path,
            message: "Image source must be a string."
        });
        return null;
    }

    const source = normalizeImageSource(value);

    if (source === null || (!allowEmpty && source === "") || source.length > MAX_SOURCE_LENGTH) {
        errors.push({
            path,
            message: "Image source is not allowed."
        });
        return null;
    }

    return source;
}

function normalizeImageSource(value) {
    const source = value.trim();

    if (source.length === 0) {
        return "";
    }

    if (hasControlCharacter(source) || source.startsWith("//") || source.includes("\\")) {
        return null;
    }

    const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(source);

    if (schemeMatch !== null) {
        const scheme = schemeMatch[1].toLowerCase();

        if (scheme !== "http" && scheme !== "https") {
            return null;
        }

        try {
            const url = new URL(source);

            if (url.protocol !== "http:" && url.protocol !== "https:") {
                return null;
            }
        } catch (error) {
            return null;
        }

        return source;
    }

    const lower = source.toLowerCase();
    const incompleteScheme = IMAGE_SOURCE_SCHEMES.some((scheme) => scheme.startsWith(lower));

    if (incompleteScheme) {
        return null;
    }

    return source;
}

function hasControlCharacter(value) {
    return hasDisallowedControlCharacter(value, false);
}

function hasDisallowedControlCharacter(value, allowNewlines) {
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        const newline = code === 10 || code === 13;

        if (allowNewlines && newline) {
            continue;
        }

        if (code <= 31 || code === 127) {
            return true;
        }
    }

    return false;
}

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

module.exports = {
    sanitizeDraft,
    validateBoardId,
    validateCreateBoard,
    validateDraft
};
