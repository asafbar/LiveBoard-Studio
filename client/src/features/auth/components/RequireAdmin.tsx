import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthSession } from "../session/authSessionContext.ts";
import AuthScreen from "./AuthScreen.tsx";
import SessionExpiredDialog from "./SessionExpiredDialog.tsx";

function RequireAdmin() {
    const { status, unavailableMessage, retrySessionCheck } = useAuthSession();
    const location = useLocation();

    if (status === "checking") {
        return (
            <AuthScreen
                title="Checking session"
                message="Confirming your administrator session."
            />
        );
    }

    if (status === "unavailable") {
        return (
            <AuthScreen
                title="Session unavailable"
                message={unavailableMessage ?? "The session could not be confirmed. Check that the API is running, then try again."}
                actionLabel="Retry"
                onAction={retrySessionCheck}
            />
        );
    }

    if (status === "unauthenticated") {
        const next = `${location.pathname}${location.search}${location.hash}`;

        return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
    }

    return (
        <>
            <Outlet />
            {status === "expired" ? <SessionExpiredDialog /> : null}
        </>
    );
}

export default RequireAdmin;
