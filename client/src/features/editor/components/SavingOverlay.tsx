import { useLayoutEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import styles from "./SavingOverlay.module.css";

type SavingOverlayProps = {
    restoreTarget: HTMLElement | null;
};

function SavingOverlay({ restoreTarget }: SavingOverlayProps) {
    const dialogRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const previous = restoreTarget;
        dialogRef.current?.focus();

        function handleDocumentKeyDown(event: KeyboardEvent) {
            const dialog = dialogRef.current;

            if (dialog === null) {
                return;
            }

            const target = event.target instanceof Node ? event.target : null;
            const focusIsInside = target !== null && dialog.contains(target);

            if (event.key === "Tab" || !focusIsInside) {
                event.preventDefault();
                event.stopPropagation();
                dialog.focus();
            }
        }

        document.addEventListener("keydown", handleDocumentKeyDown, true);

        return () => {
            document.removeEventListener("keydown", handleDocumentKeyDown, true);

            // The dialog is removed in this commit. Restore focus on the next frame
            // so the browser does not move it back to the document body.
            requestAnimationFrame(() => {
                if (
                    previous !== null
                    && previous.isConnected
                    && !previous.hasAttribute("disabled")
                ) {
                    previous.focus();
                    return;
                }

                document.querySelector<HTMLElement>("[aria-label='Board canvas']")?.focus();
            });
        };
    }, [restoreTarget]);

    function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
        if (event.key === "Tab") {
            event.preventDefault();
            dialogRef.current?.focus();
        }
    }

    return (
        <div className={styles.backdrop}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="saving-overlay-title"
                aria-describedby="saving-overlay-message"
                tabIndex={-1}
                onKeyDown={handleKeyDown}
                className={styles.panel}
            >
                <div className={styles.spinner} aria-hidden="true" />
                <h2 id="saving-overlay-title" className={styles.title}>
                    Saving your changes
                </h2>
                <p id="saving-overlay-message" className={styles.message}>
                    Updating your board...
                </p>
            </div>
        </div>
    );
}

export default SavingOverlay;
