import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from "react";

type DeleteWidgetDialogProps = {
    onCancel: () => void;
    onConfirm: () => void;
};

function DeleteWidgetDialog({ onCancel, onConfirm }: DeleteWidgetDialogProps) {
    const cancelRef = useRef<HTMLButtonElement>(null);
    const confirmRef = useRef<HTMLButtonElement>(null);

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
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
            onMouseDown={handleBackdropMouseDown}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-widget-title"
                aria-describedby="delete-widget-message"
                onKeyDown={handleKeyDown}
                className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-panel"
            >
                <h2 id="delete-widget-title" className="text-base font-semibold text-foreground">
                    Delete Widget?
                </h2>
                <p id="delete-widget-message" className="mt-2 text-sm leading-5 text-secondary">
                    Are you sure you want to delete this widget?
                    You can undo this until the editing history is cleared.
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
                        className="h-9 rounded-control border border-danger-strong bg-danger-strong px-3 text-sm font-medium text-white transition-colors duration-150 hover:border-danger-strong-hover hover:bg-danger-strong-hover"
                    >
                        Delete Widget
                    </button>
                </div>
            </div>
        </div>
    );
}

export default DeleteWidgetDialog;
