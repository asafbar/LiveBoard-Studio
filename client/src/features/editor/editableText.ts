import type { Board } from "../boards/types/boardTypes.ts";

type EditableTextUpdate =
    | { action: "clear" }
    | { action: "keep" }
    | { action: "replace"; text: string };

function hasControlCharacter(value: string): boolean {
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);

        if (code <= 31 || code === 127) {
            return true;
        }
    }

    return false;
}

function readEditableText(value: string, maximum: number): EditableTextUpdate {
    if (hasControlCharacter(value)) {
        return { action: "keep" };
    }

    if (value.length === 0) {
        return { action: "clear" };
    }

    if (value.trim().length > maximum) {
        return { action: "keep" };
    }

    return {
        action: "replace",
        text: value,
    };
}

function commitEditableText(value: string): string {
    return value.trim();
}

function commitOptionalText(value: string | undefined): string | undefined {
    if (value === undefined) {
        return undefined;
    }

    const committed = commitEditableText(value);

    return committed === "" ? undefined : committed;
}

function commitBoardEditableText(board: Board): Board {
    let changed = false;
    const widgets = board.widgets.map((widget) => {
        if (widget.type === "countdown") {
            const title = commitOptionalText(widget.settings.title);
            const completionMessage = commitOptionalText(widget.settings.completionMessage);

            if (title === widget.settings.title && completionMessage === widget.settings.completionMessage) {
                return widget;
            }

            changed = true;
            const settings = { ...widget.settings };

            if (title === undefined) {
                delete settings.title;
            } else {
                settings.title = title;
            }

            if (completionMessage === undefined) {
                delete settings.completionMessage;
            } else {
                settings.completionMessage = completionMessage;
            }

            return {
                ...widget,
                settings,
            };
        }

        if (widget.type === "qr") {
            const content = commitEditableText(widget.settings.content);
            const title = commitOptionalText(widget.settings.title);
            const subtitle = commitOptionalText(widget.settings.subtitle);

            if (
                content === widget.settings.content
                && title === widget.settings.title
                && subtitle === widget.settings.subtitle
            ) {
                return widget;
            }

            changed = true;
            const settings = { ...widget.settings, content };

            if (title === undefined) {
                delete settings.title;
            } else {
                settings.title = title;
            }

            if (subtitle === undefined) {
                delete settings.subtitle;
            } else {
                settings.subtitle = subtitle;
            }

            return {
                ...widget,
                settings,
            };
        }

        if (widget.type === "news") {
            const title = commitOptionalText(widget.settings.title);

            if (title === widget.settings.title) {
                return widget;
            }

            changed = true;
            const settings = { ...widget.settings };

            if (title === undefined) {
                delete settings.title;
            } else {
                settings.title = title;
            }

            return { ...widget, settings };
        }

        if (widget.type === "weather") {
            const title = commitOptionalText(widget.settings.title);

            if (title === widget.settings.title) {
                return widget;
            }

            changed = true;
            const settings = { ...widget.settings };

            if (title === undefined) {
                delete settings.title;
            } else {
                settings.title = title;
            }

            return { ...widget, settings };
        }

        return widget;
    });

    if (!changed) {
        return board;
    }

    return {
        ...board,
        widgets,
    };
}

export type { EditableTextUpdate };
export {
    commitBoardEditableText,
    commitEditableText,
    readEditableText,
};
