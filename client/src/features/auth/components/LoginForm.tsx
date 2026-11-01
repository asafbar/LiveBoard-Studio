import { useRef, useState, type FormEvent, type MouseEvent } from "react";
import StudioIcon from "../../editor/components/StudioIcon.tsx";
import { AuthRequestError } from "../api/authApi.ts";
import { useAuthSession } from "../session/authSessionContext.ts";

type LoginFormProps = {
    submitLabel: string;
    pendingLabel: string;
    onSuccess?: () => void;
};

const fieldClassName = "h-9 w-full rounded-control border border-border bg-surface-raised px-3 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-60";
const passwordFieldClassName = "h-9 w-full rounded-control border border-border bg-surface-raised pr-10 pl-3 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-60";

function LoginForm({ submitLabel, pendingLabel, onSuccess }: LoginFormProps) {
    const { login } = useAuthSession();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const submittingRef = useRef(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (submittingRef.current) {
            return;
        }

        setFormError(null);
        submittingRef.current = true;
        setSubmitting(true);

        try {
            await login(username, password);
            onSuccess?.();
        } catch (error: unknown) {
            setFormError(readLoginError(error));
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={(event) => {
            void handleSubmit(event);
        }} className="flex flex-col gap-4">
            <div>
                <label htmlFor="admin-username" className="mb-1.5 block text-sm font-medium text-secondary">
                    Username
                </label>
                <input
                    id="admin-username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    autoFocus
                    required
                    maxLength={64}
                    value={username}
                    disabled={submitting}
                    onChange={(event) => {
                        setUsername(event.target.value);
                    }}
                    className={fieldClassName}
                />
            </div>
            <div>
                <label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium text-secondary">
                    Password
                </label>
                <div className="relative">
                    <input
                        id="admin-password"
                        name="password"
                        type={passwordVisible ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        maxLength={128}
                        value={password}
                        disabled={submitting}
                        onChange={(event) => {
                            setPassword(event.target.value);
                        }}
                        className={passwordFieldClassName}
                    />
                    <button
                        type="button"
                        aria-pressed={passwordVisible}
                        aria-label={passwordVisible ? "Hide password" : "Show password"}
                        disabled={submitting}
                        onMouseDown={(event: MouseEvent<HTMLButtonElement>) => {
                            event.preventDefault();
                        }}
                        onClick={() => {
                            setPasswordVisible((current) => !current);
                        }}
                        className="absolute inset-y-0 right-0 inline-flex w-9 items-center justify-center rounded-control text-secondary transition-colors duration-150 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 active:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <StudioIcon name={passwordVisible ? "eye-off" : "eye"} />
                    </button>
                </div>
            </div>
            {formError !== null ? (
                <p role="alert" className="text-sm leading-5 text-danger">
                    {formError}
                </p>
            ) : null}
            <button
                type="submit"
                disabled={submitting}
                aria-busy={submitting}
                className={
                    submitting
                        ? "inline-flex h-9 cursor-not-allowed items-center justify-center rounded-control bg-accent/40 px-3 text-sm font-medium text-white opacity-60"
                        : "inline-flex h-9 items-center justify-center rounded-control bg-accent px-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
                }
            >
                {submitting ? pendingLabel : submitLabel}
            </button>
        </form>
    );
}

function readLoginError(error: unknown): string {
    if (error instanceof AuthRequestError) {
        if (error.statusCode === 401) {
            return "The username or password is incorrect.";
        }

        if (error.statusCode === 429) {
            return "Too many sign-in attempts. Wait a few minutes and try again.";
        }

        if (error.statusCode === 400) {
            return "Check the username and password, then try again.";
        }

        if (error.statusCode === null) {
            return "The sign-in service could not be reached. Check that the API is running, then try again.";
        }
    }

    return "The sign-in service could not be reached. Check that the API is running, then try again.";
}

export default LoginForm;
