type DisplayActionNoticeProps = {
    message: string;
    onDismiss: () => void;
};

function DisplayActionNotice({ message, onDismiss }: DisplayActionNoticeProps) {
    return (
        <div className="pointer-events-none fixed right-4 bottom-4 z-40 font-sans">
            <div
                role="status"
                className="pointer-events-auto flex items-center gap-3 rounded-control border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground shadow-panel"
            >
                <span>{message}</span>
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Dismiss notification"
                    className="inline-flex size-7 items-center justify-center rounded-control text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
                >
                    <span aria-hidden="true">×</span>
                </button>
            </div>
        </div>
    );
}

export default DisplayActionNotice;
