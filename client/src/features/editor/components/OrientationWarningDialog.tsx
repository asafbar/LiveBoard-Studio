import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from "react";
import type { BoardOrientation } from "../../boards/boardOrientation.ts";

type OrientationWarningDialogProps = {
    orientation: BoardOrientation;
    outsideCount: number;
    onCancel: () => void;
    onConfirm: () => void;
};

function OrientationWarningDialog({
    orientation,
    outsideCount,
    onCancel,
    onConfirm,
}: OrientationWarningDialogProps) {
    const cancelRef = useRef<HTMLButtonElement>(null);
    const confirmRef = useRef<HTMLButtonElement>(null);
    const label = orientation === "portrait" ? "portrait" : "landscape";
    const widgetLabel = outsideCount === 1 ? "widget extends" : "widgets extend";

    useEffect(() => {
        cancelRef.current?.focus();
    }, []);

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onCancel();
            return;
        }

        if (event.key !== "Tab") {
            return;
        }

        const cancel = cancelRef.current;
        const confirm = confirmRef.current;

        if (cancel === null || confirm === null) {
            return;
        }

        if (event.shiftKey && document.activeElement === cancel) {
            event.preventDefault();
            confirm.focus();
            return;
        }

        if (!event.shiftKey && document.activeElement === confirm) {
            event.preventDefault();
            cancel.focus();
        }
    }

    function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
        if (event.target !== event.currentTarget) {
            return;
        }

        onCancel();
    }

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 p-4"
            onMouseDown={handleBackdropMouseDown}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="orientation-warning-title"
                tabIndex={-1}
                onKeyDown={handleKeyDown}
                className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-panel outline-none"
            >
                <h2 id="orientation-warning-title" className="text-base font-semibold text-foreground">
                    Widgets sit outside the {label} board
                </h2>
                <p className="mt-2 text-sm leading-5 text-secondary">
                    {outsideCount} {widgetLabel} past the {label} edges. They stay where they are and can be clipped. Move them back onto the board when you want them fully visible.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                    <button
                        ref={cancelRef}
                        type="button"
                        onClick={onCancel}
                        className="h-9 rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
                    >
                        Cancel
                    </button>
                    <button
                        ref={confirmRef}
                        type="button"
                        onClick={onConfirm}
                        className="h-9 rounded-control bg-accent px-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
                    >
                        {orientation === "portrait" ? "Use portrait" : "Use landscape"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default OrientationWarningDialog;
