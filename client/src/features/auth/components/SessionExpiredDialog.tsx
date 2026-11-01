import { useEffect, useRef, type KeyboardEvent } from "react";
import LoginForm from "./LoginForm.tsx";

function SessionExpiredDialog() {
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        dialogRef.current?.querySelector<HTMLInputElement>("#admin-username")?.focus();
    }, []);

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        if (event.key !== "Tab") {
            return;
        }

        const dialog = dialogRef.current;

        if (dialog === null) {
            return;
        }

        const focusable = [...dialog.querySelectorAll<HTMLElement>(
            "button:not([disabled]), input:not([disabled])",
        )];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (first === undefined || last === undefined) {
            event.preventDefault();
            return;
        }

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
            return;
        }

        if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 p-4">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="session-expired-title"
                aria-describedby="session-expired-message"
                tabIndex={-1}
                onKeyDown={handleKeyDown}
                className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-panel"
            >
                <h2 id="session-expired-title" className="text-base font-semibold text-foreground">
                    Session expired
                </h2>
                <p id="session-expired-message" className="mt-2 text-sm leading-5 text-secondary">
                    Your session expired. Sign in again to continue. Edits that are still open in this tab stay in the editor, and you can save them after you sign in.
                </p>
                <div className="mt-5">
                    <LoginForm
                        submitLabel="Sign in again"
                        pendingLabel="Signing in..."
                    />
                </div>
            </div>
        </div>
    );
}

export default SessionExpiredDialog;
