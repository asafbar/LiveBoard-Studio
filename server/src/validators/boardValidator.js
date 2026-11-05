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

const WIDGET_TYPES = ["text", "clock", "image", "information-card", "announcements", "ticker", "vertical-announcements", "weather", "news", "countdown", "qr"];
const COUNTDOWN_PRESETS = ["digital", "minimal"];
const COUNTDOWN_TIME_ZONES = [
    "Asia/Jerusalem",
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Asia/Dubai",
    "Asia/Tokyo",
    "Australia/Sydney"
];
const MAX_COUNTDOWN_TITLE_LENGTH = 80;
const MAX_COUNTDOWN_MESSAGE_LENGTH = 120;
const QR_PRESETS = ["classic", "split"];
const QR_DIRECTIONS = ["auto", "ltr", "rtl"];
const QR_ALIGNS = ["start", "center", "end", "left", "right"];
const QR_FONT_FAMILIES = ["sans", "serif", "mono"];
const QR_FONT_WEIGHTS = [400, 500, 600, 700];
const MAX_QR_CONTENT_LENGTH = 512;
const MAX_QR_TITLE_LENGTH = 80;
const MAX_QR_SUBTITLE_LENGTH = 120;
const MIN_QR_CONTRAST = 7;
const UNSAFE_QR_SCHEMES = new Set(["javascript", "data", "vbscript", "file", "blob"]);
const WIDGET_KEYS = ["id", "type", "layout", "settings", "layerName", "visible", "locked"];
const TEXT_TONES = ["default", "accent"];
const TEXT_SIZES = ["title", "display"];
const CLOCK_TIME_ZONES = ["Asia/Jerusalem", "UTC", "America/New_York", "Europe/London"];
const CLOCK_ALIGNMENTS = ["left", "right"];
const WEATHER_UNITS = ["celsius", "fahrenheit"];
const WEATHER_LAYOUTS = ["compact", "expanded"];
const WEATHER_PRESETS = ["classic", "minimal", "horizontal", "forecast"];
const WEATHER_DIRECTIONS = ["auto", "ltr", "rtl"];
const WEATHER_ALIGNS = ["start", "center", "end", "left", "right"];
const WEATHER_FONT_FAMILIES = ["sans", "serif", "mono"];
const WEATHER_FONT_WEIGHTS = [400, 500, 600, 700];
const MIN_WEATHER_FONT_SIZE = 12;
const MAX_WEATHER_FONT_SIZE = 96;
const MIN_WEATHER_TITLE_FONT_SIZE = 12;
const MAX_WEATHER_TITLE_FONT_SIZE = 72;
const MAX_WEATHER_OPACITY = 100;
const MAX_WEATHER_PADDING = 48;
const MAX_WEATHER_TITLE_SPACING = 64;
const WEATHER_REFRESH_MINUTES = [10, 30, 60, 1440];
const NEWS_SOURCES = ["sample", "usgs"];
const NEWS_CATEGORIES = ["israel", "breaking", "business", "technology", "earthquakes"];
const NEWS_PRESETS = ["ticker", "cards", "list"];
const NEWS_TICKER_MOTIONS = ["scroll", "slide"];
const NEWS_SCROLL_DIRECTIONS = ["ltr", "rtl"];
const MIN_NEWS_HEADLINES = 1;
const MAX_NEWS_HEADLINES = 10;
const MIN_NEWS_ROTATION_SECONDS = 4;
const MAX_NEWS_ROTATION_SECONDS = 30;
const MIN_NEWS_SCROLL_SPEED = 20;
const MAX_NEWS_SCROLL_SPEED = 160;
const MAX_NEWS_TITLE_LENGTH = 80;
const WEATHER_TIME_ZONE_PATTERN = /^(?:UTC|GMT|[A-Za-z][A-Za-z0-9+-]*(?:\/[A-Za-z0-9+_-]+){1,2})$/;
const MAX_WEATHER_TITLE_LENGTH = 80;
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

    if (type === "weather") {
        return sanitizeWeatherSettings(settings, path, errors);
    }

    if (type === "news") {
        return sanitizeNewsSettings(settings, path, errors);
    }

    if (type === "countdown") {
        return sanitizeCountdownSettings(settings, path, errors);
    }

    if (type === "qr") {
        return sanitizeQrSettings(settings, path, errors);
    }

    return null;
}

function sanitizeCountdownSettings(settings, path, errors) {
    rejectUnknownKeys(settings, [
        "title",
        "targetDate",
        "targetTime",
        "timeZone",
        "showDays",
        "showHours",
        "showMinutes",
        "showSeconds",
        "completionMessage",
        "preset",
        "direction",
        "align",
        "titleAlign",
        "backgroundColor",
        "backgroundOpacity",
        "textColor",
        "textOpacity",
        "titleColor",
        "titleOpacity",
        "accentColor",
        "accentOpacity",
        "borderRadius",
        "padding",
        "titleSpacing",
        "fontFamily",
        "fontSize",
        "fontWeight",
        "titleFontFamily",
        "titleFontSize",
        "titleFontWeight"
    ], path, errors);

    const targetDate = readCountdownDate(settings.targetDate, `${path}.targetDate`, errors);
    const targetTime = readCountdownTime(settings.targetTime, `${path}.targetTime`, errors);
    const showDays = readBoolean(settings.showDays, `${path}.showDays`, errors);
    const showHours = readBoolean(settings.showHours, `${path}.showHours`, errors);
    const showMinutes = readBoolean(settings.showMinutes, `${path}.showMinutes`, errors);
    const showSeconds = readBoolean(settings.showSeconds, `${path}.showSeconds`, errors);

    if (showDays === false && showHours === false && showMinutes === false && showSeconds === false) {
        errors.push({
            path: `${path}.showDays`,
            message: "At least one countdown unit is required."
        });
    }

    const nextSettings = {
        targetDate,
        targetTime,
        timeZone: readChoice(settings.timeZone, `${path}.timeZone`, COUNTDOWN_TIME_ZONES, errors),
        showDays,
        showHours,
        showMinutes,
        showSeconds,
        preset: readChoice(settings.preset, `${path}.preset`, COUNTDOWN_PRESETS, errors),
        backgroundColor: readColor(settings.backgroundColor, `${path}.backgroundColor`, errors),
        textColor: readColor(settings.textColor, `${path}.textColor`, errors),
        accentColor: readColor(settings.accentColor, `${path}.accentColor`, errors),
        borderRadius: readNumberInRange(settings.borderRadius, `${path}.borderRadius`, 0, MAX_BORDER_RADIUS, errors)
    };

    if (settings.title !== undefined) {
        const title = readRequiredText(settings.title, `${path}.title`, MAX_COUNTDOWN_TITLE_LENGTH, errors, true);

        if (title) {
            nextSettings.title = title;
        }
    }

    if (settings.completionMessage !== undefined) {
        const completionMessage = readRequiredText(
            settings.completionMessage,
            `${path}.completionMessage`,
            MAX_COUNTDOWN_MESSAGE_LENGTH,
            errors,
            true
        );

        if (completionMessage) {
            nextSettings.completionMessage = completionMessage;
        }
    }

    assignWeatherChoice(nextSettings, "direction", settings.direction, `${path}.direction`, WEATHER_DIRECTIONS, errors);
    assignWeatherChoice(nextSettings, "align", settings.align, `${path}.align`, WEATHER_ALIGNS, errors);
    assignWeatherChoice(nextSettings, "titleAlign", settings.titleAlign, `${path}.titleAlign`, WEATHER_ALIGNS, errors);
    assignWeatherChoice(nextSettings, "fontFamily", settings.fontFamily, `${path}.fontFamily`, WEATHER_FONT_FAMILIES, errors);
    assignWeatherChoice(nextSettings, "titleFontFamily", settings.titleFontFamily, `${path}.titleFontFamily`, WEATHER_FONT_FAMILIES, errors);
    assignWeatherFontWeight(nextSettings, "fontWeight", settings.fontWeight, `${path}.fontWeight`, errors);
    assignWeatherFontWeight(nextSettings, "titleFontWeight", settings.titleFontWeight, `${path}.titleFontWeight`, errors);
    assignWeatherFontSize(
        nextSettings,
        "fontSize",
        settings.fontSize,
        `${path}.fontSize`,
        MIN_WEATHER_FONT_SIZE,
        MAX_WEATHER_FONT_SIZE,
        errors
    );
    assignWeatherFontSize(
        nextSettings,
        "titleFontSize",
        settings.titleFontSize,
        `${path}.titleFontSize`,
        MIN_WEATHER_TITLE_FONT_SIZE,
        MAX_WEATHER_TITLE_FONT_SIZE,
        errors
    );
    assignWeatherOpacity(nextSettings, settings.backgroundOpacity, `${path}.backgroundOpacity`, errors);
    assignOptionalOpacity(nextSettings, "textOpacity", settings.textOpacity, `${path}.textOpacity`, errors);
    assignOptionalOpacity(nextSettings, "titleOpacity", settings.titleOpacity, `${path}.titleOpacity`, errors);
    assignOptionalOpacity(nextSettings, "accentOpacity", settings.accentOpacity, `${path}.accentOpacity`, errors);
    assignWeatherPadding(nextSettings, settings.padding, `${path}.padding`, errors);
    assignWeatherTitleSpacing(nextSettings, settings.titleSpacing, `${path}.titleSpacing`, errors);

    if (settings.titleColor !== undefined) {
        nextSettings.titleColor = readColor(settings.titleColor, `${path}.titleColor`, errors);
    }

    if (
        nextSettings.targetDate === null
        || nextSettings.targetTime === null
        || nextSettings.timeZone === null
        || nextSettings.showDays === null
        || nextSettings.showHours === null
        || nextSettings.showMinutes === null
        || nextSettings.showSeconds === null
        || nextSettings.preset === null
        || nextSettings.backgroundColor === null
        || nextSettings.textColor === null
        || nextSettings.accentColor === null
        || nextSettings.borderRadius === null
    ) {
        return null;
    }

    return nextSettings;
}

function readCountdownDate(value, path, errors) {
    if (typeof value !== "string" || !/^(\d{4})-(\d{2})-(\d{2})$/.test(value)) {
        errors.push({
            path,
            message: "Target date must use YYYY-MM-DD."
        });
        return null;
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (match === null) {
        return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const probe = new Date(Date.UTC(year, month - 1, day));

    if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
        errors.push({
            path,
            message: "Target date must be a real calendar date."
        });
        return null;
    }

    return value;
}

function readCountdownTime(value, path, errors) {
    if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) {
        errors.push({
            path,
            message: "Target time must use HH:mm or HH:mm:ss."
        });
        return null;
    }

    return value.length === 5 ? `${value}:00` : value;
}

function sanitizeQrSettings(settings, path, errors) {
    rejectUnknownKeys(settings, [
        "content",
        "title",
        "subtitle",
        "preset",
        "direction",
        "align",
        "titleAlign",
        "foregroundColor",
        "codeBackgroundColor",
        "backgroundColor",
        "backgroundOpacity",
        "textColor",
        "textOpacity",
        "titleColor",
        "titleOpacity",
        "borderRadius",
        "padding",
        "titleSpacing",
        "fontFamily",
        "fontSize",
        "fontWeight",
        "titleFontFamily",
        "titleFontSize",
        "titleFontWeight"
    ], path, errors);

    const content = readQrContent(settings.content, `${path}.content`, errors);
    const foregroundColor = readOpaqueHex(settings.foregroundColor, `${path}.foregroundColor`, errors);
    const codeBackgroundColor = readOpaqueHex(settings.codeBackgroundColor, `${path}.codeBackgroundColor`, errors);
    const backgroundColor = readColor(settings.backgroundColor, `${path}.backgroundColor`, errors);
    const textColor = readColor(settings.textColor, `${path}.textColor`, errors);
    const borderRadius = readNumberInRange(settings.borderRadius, `${path}.borderRadius`, 0, MAX_BORDER_RADIUS, errors);
    const preset = readChoice(settings.preset, `${path}.preset`, QR_PRESETS, errors);

    if (
        content === null
        || foregroundColor === null
        || codeBackgroundColor === null
        || backgroundColor === null
        || textColor === null
        || borderRadius === null
        || preset === null
    ) {
        return null;
    }

    if (!qrColorsAreReadable(foregroundColor, codeBackgroundColor)) {
        errors.push({
            path: `${path}.foregroundColor`,
            message: "QR colors need more contrast so the code stays scannable."
        });
        return null;
    }

    const sanitized = {
        content,
        preset,
        foregroundColor,
        codeBackgroundColor,
        backgroundColor,
        textColor,
        borderRadius
    };

    if (settings.title !== undefined) {
        const title = readRequiredText(settings.title, `${path}.title`, MAX_QR_TITLE_LENGTH, errors, true);

        if (title) {
            sanitized.title = title;
        }
    }

    if (settings.subtitle !== undefined) {
        const subtitle = readRequiredText(settings.subtitle, `${path}.subtitle`, MAX_QR_SUBTITLE_LENGTH, errors, true);

        if (subtitle) {
            sanitized.subtitle = subtitle;
        }
    }

    assignWeatherChoice(sanitized, "direction", settings.direction, `${path}.direction`, QR_DIRECTIONS, errors);
    assignWeatherChoice(sanitized, "align", settings.align, `${path}.align`, QR_ALIGNS, errors);
    assignWeatherChoice(sanitized, "titleAlign", settings.titleAlign, `${path}.titleAlign`, QR_ALIGNS, errors);
    assignWeatherChoice(sanitized, "fontFamily", settings.fontFamily, `${path}.fontFamily`, QR_FONT_FAMILIES, errors);
    assignWeatherChoice(sanitized, "titleFontFamily", settings.titleFontFamily, `${path}.titleFontFamily`, QR_FONT_FAMILIES, errors);
    assignWeatherFontWeight(sanitized, "fontWeight", settings.fontWeight, `${path}.fontWeight`, errors);
    assignWeatherFontWeight(sanitized, "titleFontWeight", settings.titleFontWeight, `${path}.titleFontWeight`, errors);
    assignWeatherFontSize(sanitized, "fontSize", settings.fontSize, `${path}.fontSize`, 12, 72, errors);
    assignWeatherFontSize(sanitized, "titleFontSize", settings.titleFontSize, `${path}.titleFontSize`, 12, 72, errors);
    assignWeatherPadding(sanitized, settings.padding, `${path}.padding`, errors);
    assignWeatherTitleSpacing(sanitized, settings.titleSpacing, `${path}.titleSpacing`, errors);
    assignOptionalOpacity(sanitized, "backgroundOpacity", settings.backgroundOpacity, `${path}.backgroundOpacity`, errors);
    assignOptionalOpacity(sanitized, "textOpacity", settings.textOpacity, `${path}.textOpacity`, errors);
    assignOptionalOpacity(sanitized, "titleOpacity", settings.titleOpacity, `${path}.titleOpacity`, errors);

    if (settings.titleColor !== undefined) {
        sanitized.titleColor = readColor(settings.titleColor, `${path}.titleColor`, errors);
    }

    return sanitized;
}

function readQrContent(value, path, errors) {
    if (typeof value !== "string") {
        errors.push({ path, message: "Add a URL or some text." });
        return null;
    }

    const text = value.trim();

    if (text.length === 0) {
        errors.push({ path, message: "Add a URL or some text." });
        return null;
    }

    if (text.length > MAX_QR_CONTENT_LENGTH) {
        errors.push({
            path,
            message: "Use 512 characters or fewer so the code stays scannable."
        });
        return null;
    }

    if (qrContentHasIllegalControl(text)) {
        errors.push({ path, message: "Enter a valid http or https link." });
        return null;
    }

    const scheme = readQrScheme(text);

    if (scheme === null) {
        return text;
    }

    if (UNSAFE_QR_SCHEMES.has(scheme.scheme)) {
        errors.push({ path, message: "Only http and https links are allowed." });
        return null;
    }

    const looksLikeUrl = scheme.scheme === "http"
        || scheme.scheme === "https"
        || scheme.remainder.startsWith("//");

    if (!looksLikeUrl) {
        return text;
    }

    if (scheme.scheme !== "http" && scheme.scheme !== "https") {
        errors.push({ path, message: "Only http and https links are allowed." });
        return null;
    }

    let url;

    try {
        url = new URL(text);
    } catch {
        errors.push({ path, message: "Enter a valid http or https link." });
        return null;
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
        errors.push({ path, message: "Only http and https links are allowed." });
        return null;
    }

    if (url.hostname.trim().length === 0) {
        errors.push({ path, message: "Enter a valid http or https link." });
        return null;
    }

    if (url.username.length > 0 || url.password.length > 0) {
        errors.push({ path, message: "Links with a username or password are not allowed." });
        return null;
    }

    return text;
}

function readQrScheme(value) {
    const match = /^([a-z][a-z0-9+.-]*):/i.exec(value);

    if (match === null) {
        return null;
    }

    return {
        scheme: match[1].toLowerCase(),
        remainder: value.slice(match[0].length)
    };
}

function qrContentHasIllegalControl(value) {
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);

        if (code === 10 || code === 13) {
            continue;
        }

        if (code <= 31 || code === 127) {
            return true;
        }
    }

    return false;
}

function readOpaqueHex(value, path, errors) {
    if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value.trim())) {
        errors.push({
            path,
            message: "QR colors must be an opaque six-digit color."
        });
        return null;
    }

    return value.trim().toLowerCase();
}

function channelLuminance(channel) {
    const normalized = channel / 255;

    if (normalized <= 0.03928) {
        return normalized / 12.92;
    }

    return ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex) {
    const red = Number.parseInt(hex.slice(1, 3), 16);
    const green = Number.parseInt(hex.slice(3, 5), 16);
    const blue = Number.parseInt(hex.slice(5, 7), 16);

    return (0.2126 * channelLuminance(red))
        + (0.7152 * channelLuminance(green))
        + (0.0722 * channelLuminance(blue));
}

function qrColorsAreReadable(foreground, background) {
    const first = relativeLuminance(foreground);
    const second = relativeLuminance(background);
    const lighter = Math.max(first, second);
    const darker = Math.min(first, second);

    return ((lighter + 0.05) / (darker + 0.05)) >= MIN_QR_CONTRAST;
}

function sanitizeNewsSettings(settings, path, errors) {
    rejectUnknownKeys(settings, [
        "source",
        "category",
        "preset",
        "maxHeadlines",
        "rotationSeconds",
        "tickerMotion",
        "scrollDirection",
        "scrollSpeed",
        "refreshIntervalMinutes",
        "title",
        "backgroundColor",
        "textColor",
        "accentColor",
        "borderRadius",
        "padding",
        "titleSpacing",
        "backgroundOpacity",
        "textOpacity",
        "titleOpacity",
        "accentOpacity",
        "titleColor",
        "titleAlign",
        "direction",
        "align",
        "fontFamily",
        "fontSize",
        "fontWeight",
        "titleFontFamily",
        "titleFontSize",
        "titleFontWeight"
    ], path, errors);

    const nextSettings = {
        source: readChoice(settings.source, `${path}.source`, NEWS_SOURCES, errors),
        category: readChoice(settings.category, `${path}.category`, NEWS_CATEGORIES, errors),
        preset: readChoice(settings.preset, `${path}.preset`, NEWS_PRESETS, errors),
        maxHeadlines: readIntegerInRange(
            settings.maxHeadlines,
            `${path}.maxHeadlines`,
            MIN_NEWS_HEADLINES,
            MAX_NEWS_HEADLINES,
            errors
        ),
        rotationSeconds: readIntegerInRange(
            settings.rotationSeconds,
            `${path}.rotationSeconds`,
            MIN_NEWS_ROTATION_SECONDS,
            MAX_NEWS_ROTATION_SECONDS,
            errors
        ),
        backgroundColor: readColor(settings.backgroundColor, `${path}.backgroundColor`, errors),
        textColor: readColor(settings.textColor, `${path}.textColor`, errors),
        accentColor: readColor(settings.accentColor, `${path}.accentColor`, errors),
        borderRadius: readNumberInRange(settings.borderRadius, `${path}.borderRadius`, 0, MAX_BORDER_RADIUS, errors)
    };

    if (
        (nextSettings.source === "usgs" && nextSettings.category !== "earthquakes")
        || (nextSettings.source === "sample" && nextSettings.category === "earthquakes")
    ) {
        errors.push({
            path: `${path}.category`,
            message: "This source and category are not available."
        });
    }

    if (settings.title !== undefined) {
        const title = readRequiredText(settings.title, `${path}.title`, MAX_NEWS_TITLE_LENGTH, errors, true);

        if (title) {
            nextSettings.title = title;
        }
    }

    assignWeatherChoice(nextSettings, "direction", settings.direction, `${path}.direction`, WEATHER_DIRECTIONS, errors);
    assignWeatherChoice(nextSettings, "tickerMotion", settings.tickerMotion, `${path}.tickerMotion`, NEWS_TICKER_MOTIONS, errors);
    assignWeatherChoice(nextSettings, "scrollDirection", settings.scrollDirection, `${path}.scrollDirection`, NEWS_SCROLL_DIRECTIONS, errors);
    assignWeatherFontSize(
        nextSettings,
        "scrollSpeed",
        settings.scrollSpeed,
        `${path}.scrollSpeed`,
        MIN_NEWS_SCROLL_SPEED,
        MAX_NEWS_SCROLL_SPEED,
        errors
    );
    assignWeatherChoice(nextSettings, "align", settings.align, `${path}.align`, WEATHER_ALIGNS, errors);
    assignWeatherChoice(nextSettings, "titleAlign", settings.titleAlign, `${path}.titleAlign`, WEATHER_ALIGNS, errors);
    assignWeatherChoice(nextSettings, "fontFamily", settings.fontFamily, `${path}.fontFamily`, WEATHER_FONT_FAMILIES, errors);
    assignWeatherChoice(nextSettings, "titleFontFamily", settings.titleFontFamily, `${path}.titleFontFamily`, WEATHER_FONT_FAMILIES, errors);
    assignWeatherFontWeight(nextSettings, "fontWeight", settings.fontWeight, `${path}.fontWeight`, errors);
    assignWeatherFontWeight(nextSettings, "titleFontWeight", settings.titleFontWeight, `${path}.titleFontWeight`, errors);
    assignWeatherFontSize(
        nextSettings,
        "fontSize",
        settings.fontSize,
        `${path}.fontSize`,
        MIN_WEATHER_FONT_SIZE,
        MAX_WEATHER_FONT_SIZE,
        errors
    );
    assignWeatherFontSize(
        nextSettings,
        "titleFontSize",
        settings.titleFontSize,
        `${path}.titleFontSize`,
        MIN_WEATHER_TITLE_FONT_SIZE,
        MAX_WEATHER_TITLE_FONT_SIZE,
        errors
    );
    assignWeatherOpacity(nextSettings, settings.backgroundOpacity, `${path}.backgroundOpacity`, errors);
    assignOptionalOpacity(nextSettings, "textOpacity", settings.textOpacity, `${path}.textOpacity`, errors);
    assignOptionalOpacity(nextSettings, "titleOpacity", settings.titleOpacity, `${path}.titleOpacity`, errors);
    assignOptionalOpacity(nextSettings, "accentOpacity", settings.accentOpacity, `${path}.accentOpacity`, errors);
    assignWeatherPadding(nextSettings, settings.padding, `${path}.padding`, errors);
    assignWeatherTitleSpacing(nextSettings, settings.titleSpacing, `${path}.titleSpacing`, errors);
    assignWeatherRefresh(nextSettings, settings.refreshIntervalMinutes, `${path}.refreshIntervalMinutes`, errors);

    if (settings.titleColor !== undefined) {
        nextSettings.titleColor = readColor(settings.titleColor, `${path}.titleColor`, errors);
    }

    return nextSettings;
}

function sanitizeWeatherSettings(settings, path, errors) {
    rejectUnknownKeys(settings, [
        "location",
        "unit",
        "layout",
        "showFeelsLike",
        "showForecast",
        "title",
        "backgroundColor",
        "textColor",
        "accentColor",
        "borderRadius",
        "padding",
        "titleSpacing",
        "refreshIntervalMinutes",
        "backgroundOpacity",
        "textOpacity",
        "titleOpacity",
        "accentOpacity",
        "titleColor",
        "titleAlign",
        "preset",
        "direction",
        "align",
        "fontFamily",
        "fontSize",
        "fontWeight",
        "titleFontFamily",
        "titleFontSize",
        "titleFontWeight"
    ], path, errors);

    const nextSettings = {
        location: sanitizeWeatherLocation(settings.location, `${path}.location`, errors),
        unit: readChoice(settings.unit, `${path}.unit`, WEATHER_UNITS, errors),
        layout: readChoice(settings.layout, `${path}.layout`, WEATHER_LAYOUTS, errors),
        showFeelsLike: readBoolean(settings.showFeelsLike, `${path}.showFeelsLike`, errors),
        showForecast: readBoolean(settings.showForecast, `${path}.showForecast`, errors),
        backgroundColor: readColor(settings.backgroundColor, `${path}.backgroundColor`, errors),
        textColor: readColor(settings.textColor, `${path}.textColor`, errors),
        accentColor: readColor(settings.accentColor, `${path}.accentColor`, errors),
        borderRadius: readNumberInRange(settings.borderRadius, `${path}.borderRadius`, 0, MAX_BORDER_RADIUS, errors)
    };

    if (settings.title !== undefined) {
        const title = readRequiredText(settings.title, `${path}.title`, MAX_WEATHER_TITLE_LENGTH, errors, true);

        if (title) {
            nextSettings.title = title;
        }
    }

    assignWeatherChoice(nextSettings, "preset", settings.preset, `${path}.preset`, WEATHER_PRESETS, errors);
    assignWeatherChoice(nextSettings, "direction", settings.direction, `${path}.direction`, WEATHER_DIRECTIONS, errors);
    assignWeatherChoice(nextSettings, "align", settings.align, `${path}.align`, WEATHER_ALIGNS, errors);
    assignWeatherChoice(nextSettings, "titleAlign", settings.titleAlign, `${path}.titleAlign`, WEATHER_ALIGNS, errors);
    assignWeatherChoice(nextSettings, "fontFamily", settings.fontFamily, `${path}.fontFamily`, WEATHER_FONT_FAMILIES, errors);
    assignWeatherChoice(nextSettings, "titleFontFamily", settings.titleFontFamily, `${path}.titleFontFamily`, WEATHER_FONT_FAMILIES, errors);
    assignWeatherFontSize(
        nextSettings,
        "fontSize",
        settings.fontSize,
        `${path}.fontSize`,
        MIN_WEATHER_FONT_SIZE,
        MAX_WEATHER_FONT_SIZE,
        errors
    );
    assignWeatherFontSize(
        nextSettings,
        "titleFontSize",
        settings.titleFontSize,
        `${path}.titleFontSize`,
        MIN_WEATHER_TITLE_FONT_SIZE,
        MAX_WEATHER_TITLE_FONT_SIZE,
        errors
    );
    assignWeatherOpacity(nextSettings, settings.backgroundOpacity, `${path}.backgroundOpacity`, errors);
    assignOptionalOpacity(nextSettings, "textOpacity", settings.textOpacity, `${path}.textOpacity`, errors);
    assignOptionalOpacity(nextSettings, "titleOpacity", settings.titleOpacity, `${path}.titleOpacity`, errors);
    assignOptionalOpacity(nextSettings, "accentOpacity", settings.accentOpacity, `${path}.accentOpacity`, errors);
    assignWeatherPadding(nextSettings, settings.padding, `${path}.padding`, errors);
    assignWeatherTitleSpacing(nextSettings, settings.titleSpacing, `${path}.titleSpacing`, errors);
    assignWeatherRefresh(nextSettings, settings.refreshIntervalMinutes, `${path}.refreshIntervalMinutes`, errors);

    if (settings.titleColor !== undefined) {
        nextSettings.titleColor = readColor(settings.titleColor, `${path}.titleColor`, errors);
    }
    assignWeatherFontWeight(nextSettings, "fontWeight", settings.fontWeight, `${path}.fontWeight`, errors);
    assignWeatherFontWeight(nextSettings, "titleFontWeight", settings.titleFontWeight, `${path}.titleFontWeight`, errors);

    return nextSettings;
}

function sanitizeWeatherLocation(location, path, errors) {
    if (!isPlainObject(location)) {
        errors.push({
            path,
            message: "Weather location is required."
        });
        return null;
    }

    rejectUnknownKeys(location, [
        "id",
        "name",
        "label",
        "latitude",
        "longitude",
        "timezone",
        "country",
        "countryCode",
        "admin1"
    ], path, errors);

    const nextLocation = {
        name: readRequiredText(location.name, `${path}.name`, MAX_SHORT_TEXT_LENGTH, errors, false),
        label: readRequiredText(location.label, `${path}.label`, MAX_SHORT_TEXT_LENGTH, errors, false),
        latitude: readNumberInRange(location.latitude, `${path}.latitude`, -90, 90, errors),
        longitude: readNumberInRange(location.longitude, `${path}.longitude`, -180, 180, errors),
        timezone: readWeatherTimeZone(location.timezone, `${path}.timezone`, errors)
    };

    assignOptionalText(nextLocation, "country", location.country, `${path}.country`, errors);
    assignOptionalText(nextLocation, "admin1", location.admin1, `${path}.admin1`, errors);
    omitBlankText(nextLocation, "country");
    omitBlankText(nextLocation, "admin1");

    if (location.countryCode !== undefined) {
        nextLocation.countryCode = readCountryCode(location.countryCode, `${path}.countryCode`, errors);
    }

    if (location.id !== undefined) {
        nextLocation.id = readWeatherLocationId(location.id, `${path}.id`, errors);
    }

    return nextLocation;
}

function assignWeatherChoice(target, key, value, path, choices, errors) {
    if (value === undefined) {
        return;
    }

    target[key] = readChoice(value, path, choices, errors);
}

function assignWeatherFontSize(target, key, value, path, minimum, maximum, errors) {
    if (value === undefined) {
        return;
    }

    target[key] = readIntegerInRange(value, path, minimum, maximum, errors);
}

function assignOptionalOpacity(target, key, value, path, errors) {
    if (value === undefined) {
        return;
    }

    target[key] = readIntegerInRange(value, path, 0, MAX_WEATHER_OPACITY, errors);
}

function assignWeatherOpacity(target, value, path, errors) {
    if (value === undefined) {
        return;
    }

    target.backgroundOpacity = readIntegerInRange(value, path, 0, MAX_WEATHER_OPACITY, errors);
}

function assignWeatherPadding(target, value, path, errors) {
    if (value === undefined) {
        return;
    }

    target.padding = readIntegerInRange(value, path, 0, MAX_WEATHER_PADDING, errors);
}

function assignWeatherTitleSpacing(target, value, path, errors) {
    if (value === undefined) {
        return;
    }

    target.titleSpacing = readIntegerInRange(value, path, 0, MAX_WEATHER_TITLE_SPACING, errors);
}

function assignWeatherRefresh(target, value, path, errors) {
    if (value === undefined) {
        return;
    }

    if (!WEATHER_REFRESH_MINUTES.includes(value)) {
        errors.push({
            path,
            message: "Value is not supported."
        });
        target.refreshIntervalMinutes = null;
        return;
    }

    target.refreshIntervalMinutes = value;
}

function readWeatherLocationId(value, path, errors) {
    if (typeof value !== "string" || !/^[0-9]{1,12}$/.test(value)) {
        errors.push({
            path,
            message: "Location id is not supported."
        });
        return null;
    }

    return value;
}

function assignWeatherFontWeight(target, key, value, path, errors) {
    if (value === undefined) {
        return;
    }

    if (!WEATHER_FONT_WEIGHTS.includes(value)) {
        errors.push({
            path,
            message: "Value is not supported."
        });
        target[key] = null;
        return;
    }

    target[key] = value;
}

function readWeatherTimeZone(value, path, errors) {
    if (typeof value !== "string" || value.length > 80 || !WEATHER_TIME_ZONE_PATTERN.test(value)) {
        errors.push({
            path,
            message: "Time zone is not supported."
        });
        return null;
    }

    return value;
}

function readCountryCode(value, path, errors) {
    if (typeof value !== "string" || !/^[A-Za-z]{2}$/.test(value)) {
        errors.push({
            path,
            message: "Country code is not supported."
        });
        return null;
    }

    return value.toUpperCase();
}

function omitBlankText(target, key) {
    if (target[key] === "") {
        delete target[key];
    }
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
        ["title", "subtitle", "description", "badge", "imageSrc", "backgroundColor", "backgroundOpacity", "textColor", "textOpacity", "borderRadius"],
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

    assignOptionalOpacity(nextSettings, "backgroundOpacity", settings.backgroundOpacity, `${path}.backgroundOpacity`, errors);
    assignOptionalOpacity(nextSettings, "textOpacity", settings.textOpacity, `${path}.textOpacity`, errors);

    return nextSettings;
}

function sanitizeAnnouncementsSettings(settings, path, errors) {
    rejectUnknownKeys(
        settings,
        ["title", "items", "backgroundColor", "backgroundOpacity", "textColor", "textOpacity", "borderRadius"],
        path,
        errors
    );

    const nextSettings = {
        title: readRequiredText(settings.title, `${path}.title`, MAX_SHORT_TEXT_LENGTH, errors, true),
        items: sanitizeAnnouncementItems(settings.items, `${path}.items`, errors),
        backgroundColor: readColor(settings.backgroundColor, `${path}.backgroundColor`, errors),
        textColor: readColor(settings.textColor, `${path}.textColor`, errors),
        borderRadius: readNumberInRange(settings.borderRadius, `${path}.borderRadius`, 0, MAX_BORDER_RADIUS, errors)
    };

    assignOptionalOpacity(nextSettings, "backgroundOpacity", settings.backgroundOpacity, `${path}.backgroundOpacity`, errors);
    assignOptionalOpacity(nextSettings, "textOpacity", settings.textOpacity, `${path}.textOpacity`, errors);

    return nextSettings;
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
            "backgroundOpacity",
            "textColor",
            "textOpacity",
            "accentColor",
            "accentOpacity",
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

    assignOptionalOpacity(nextSettings, "backgroundOpacity", settings.backgroundOpacity, `${path}.backgroundOpacity`, errors);
    assignOptionalOpacity(nextSettings, "textOpacity", settings.textOpacity, `${path}.textOpacity`, errors);
    assignOptionalOpacity(nextSettings, "accentOpacity", settings.accentOpacity, `${path}.accentOpacity`, errors);

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
            "backgroundOpacity",
            "textColor",
            "textOpacity",
            "accentColor",
            "accentOpacity",
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

    assignOptionalOpacity(nextSettings, "backgroundOpacity", settings.backgroundOpacity, `${path}.backgroundOpacity`, errors);
    assignOptionalOpacity(nextSettings, "textOpacity", settings.textOpacity, `${path}.textOpacity`, errors);
    assignOptionalOpacity(nextSettings, "accentOpacity", settings.accentOpacity, `${path}.accentOpacity`, errors);

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
