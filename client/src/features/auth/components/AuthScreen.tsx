type AuthScreenProps = {
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
};

function AuthScreen({ title, message, actionLabel, onAction }: AuthScreenProps) {
    return (
        <div className="flex h-dvh items-center justify-center bg-background p-6 font-sans text-foreground antialiased">
            <div className="w-full max-w-md rounded-lg border border-border bg-surface p-5 text-center shadow-panel">
                <h1 className="text-base font-semibold text-foreground">{title}</h1>
                <p className="mt-2 text-sm leading-5 text-secondary">{message}</p>
                {actionLabel && onAction ? (
                    <button
                        type="button"
                        onClick={onAction}
                        className="mt-5 h-9 rounded-control bg-accent px-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
                    >
                        {actionLabel}
                    </button>
                ) : null}
            </div>
        </div>
    );
}

export default AuthScreen;
