import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { readSafeNextPath } from "../returnPath.ts";
import { useAuthSession, type AuthStatus } from "../session/authSessionContext.ts";
import AuthScreen from "../components/AuthScreen.tsx";
import LoginForm from "../components/LoginForm.tsx";

function LoginPage() {
    const { status, unavailableMessage, logout } = useAuthSession();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const logoutRequested = isLogoutState(location.state);
    const nextPath = readSafeNextPath(searchParams.get("next"));
    const [logoutPhase, setLogoutPhase] = useState<"working" | "done" | "failed">(
        logoutRequested ? "working" : "done",
    );
    const [logoutError, setLogoutError] = useState<string | null>(null);
    const [logoutStatus, setLogoutStatus] = useState<AuthStatus | null>(null);
    const sessionAtLogout = logoutRequested && logoutStatus === null && status !== "checking"
        ? status
        : logoutStatus;

    if (logoutRequested && logoutStatus === null && status !== "checking") {
        setLogoutStatus(status);
    }

    useEffect(() => {
        if (!logoutRequested || logoutPhase !== "working") {
            return;
        }

        if (sessionAtLogout !== "authenticated" && sessionAtLogout !== "expired") {
            return;
        }

        let active = true;

        void logout().then((result) => {
            if (!active) {
                return;
            }

            if (result === "failed") {
                setLogoutError("The session could not be ended. Check that the API is running, then try again.");
                setLogoutPhase("failed");
                return;
            }

            setLogoutPhase("done");
        });

        return () => {
            active = false;
        };
    }, [logout, logoutPhase, logoutRequested, sessionAtLogout]);

    const endingSession = logoutRequested
        && logoutPhase === "working"
        && (
            status === "checking"
            || sessionAtLogout === null
            || sessionAtLogout === "authenticated"
            || sessionAtLogout === "expired"
        );

    if (endingSession) {
        return (
            <AuthScreen
                title="Signing out"
                message="Ending the administrator session."
            />
        );
    }

    if (logoutRequested && logoutPhase === "failed") {
        return (
            <AuthScreen
                title="Sign out failed"
                message={logoutError ?? "The session could not be ended. Check that the API is running, then try again."}
                actionLabel="Try again"
                onAction={() => {
                    setLogoutError(null);
                    setLogoutPhase("working");
                }}
            />
        );
    }

    if (status === "checking") {
        return (
            <AuthScreen
                title="Checking session"
                message="Confirming your administrator session."
            />
        );
    }

    if (status === "authenticated") {
        return <Navigate to={nextPath} replace />;
    }

    return (
        <div className="flex h-dvh items-center justify-center bg-background p-6 font-sans text-foreground antialiased">
            <main className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-panel">
                <div className="mb-5 flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-control bg-linear-to-br from-accent to-cyan text-[11px] font-semibold tracking-wide text-background">
                        LB
                    </span>
                    <h1 className="text-base font-semibold tracking-tight text-foreground">
                        Sign in
                    </h1>
                </div>
                {status === "unavailable" && unavailableMessage !== null ? (
                    <p role="alert" className="mb-4 text-sm leading-5 text-warning">
                        {unavailableMessage}
                    </p>
                ) : null}
                <LoginForm
                    submitLabel="Sign in"
                    pendingLabel="Signing in..."
                    onSuccess={() => {
                        navigate(nextPath, { replace: true });
                    }}
                />
            </main>
        </div>
    );
}

function isLogoutState(value: unknown): boolean {
    return typeof value === "object"
        && value !== null
        && "logout" in value
        && value.logout === true;
}

export default LoginPage;
