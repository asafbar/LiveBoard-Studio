import { createContext, useContext } from "react";

type AuthStatus = "checking" | "authenticated" | "unauthenticated" | "unavailable" | "expired";

type LogoutResult = "signed-out" | "failed";

type AuthSessionContextValue = {
    status: AuthStatus;
    username: string | null;
    unavailableMessage: string | null;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<LogoutResult>;
    retrySessionCheck: () => void;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

function useAuthSession(): AuthSessionContextValue {
    const value = useContext(AuthSessionContext);

    if (value === null) {
        throw new Error("useAuthSession must be used within AuthSessionProvider.");
    }

    return value;
}

export { AuthSessionContext, useAuthSession };
export type { AuthStatus, AuthSessionContextValue, LogoutResult };
