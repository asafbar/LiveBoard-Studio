import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from "react";

type UnsavedChangesDialogProps = {
    onStay: () => void;
    onLeave: () => void;
};

function UnsavedChangesDialog({ onStay, onLeave }: UnsavedChangesDialogProps) {
    const stayRef = useRef<HTMLButtonElement>(null);
    const leaveRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        stayRef.current?.focus();
    }, []);

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onStay();
            return;
        }

        if (event.key !== "Tab") {
            return;
        }

        const stay = stayRef.current;
        const leave = leaveRef.current;

        if (stay === null || leave === null) {
            return;
        }

        if (event.shiftKey && document.activeElement === stay) {
            event.preventDefault();
            leave.focus();
            return;
        }

        if (!event.shiftKey && document.activeElement === leave) {
            event.preventDefault();
            stay.focus();
        }
    }

    function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
        if (event.target !== event.currentTarget) {
            return;
        }

        onStay();
    }

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 p-4"
            onMouseDown={handleBackdropMouseDown}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="unsaved-changes-title"
                aria-describedby="unsaved-changes-message"
                onKeyDown={handleKeyDown}
                className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-panel"
            >
                <h2 id="unsaved-changes-title" className="text-base font-semibold text-foreground">
                    Leave this board?
                </h2>
                <p id="unsaved-changes-message" className="mt-2 text-sm leading-5 text-secondary">
                    This board has unsaved changes. If you leave, those edits will be discarded.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                    <button
                        ref={stayRef}
                        type="button"
                        onClick={onStay}
                        className="h-9 rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
                    >
                        Stay
                    </button>
                    <button
                        ref={leaveRef}
                        type="button"
                        onClick={onLeave}
                        className="h-9 rounded-control border border-danger-strong bg-danger-strong px-3 text-sm font-medium text-white transition-colors duration-150 hover:border-danger-strong-hover hover:bg-danger-strong-hover"
                    >
                        Leave
                    </button>
                </div>
            </div>
        </div>
    );
}

export default UnsavedChangesDialog;
