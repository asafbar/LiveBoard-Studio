import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { setUnauthorizedListener } from "../../../api/apiClient.ts";
import {
    AuthRequestError,
    getSession,
    login as loginRequest,
    logout as logoutRequest,
} from "../api/authApi.ts";
import {
    AuthSessionContext,
    type AuthSessionContextValue,
    type AuthStatus,
    type LogoutResult,
} from "./authSessionContext.ts";

type AuthSessionProviderProps = {
    children: ReactNode;
};

type AuthSnapshot = {
    status: AuthStatus;
    username: string | null;
    unavailableMessage: string | null;
};

const signedOutSnapshot: AuthSnapshot = {
    status: "unauthenticated",
    username: null,
    unavailableMessage: null,
};

function AuthSessionProvider({ children }: AuthSessionProviderProps) {
    const [snapshot, setSnapshot] = useState<AuthSnapshot>({
        status: "checking",
        username: null,
        unavailableMessage: null,
    });
    const [checkAttempt, setCheckAttempt] = useState(0);
    const logoutInFlightRef = useRef(false);

    useEffect(() => {
        setUnauthorizedListener((requestUrl) => {
            if (requestUrl.includes("/api/auth/login") || requestUrl.includes("/api/auth/logout")) {
                return;
            }

            if (logoutInFlightRef.current) {
                return;
            }

            setSnapshot((current) => {
                if (current.status !== "authenticated") {
                    return current;
                }

                return {
                    status: "expired",
                    username: current.username,
                    unavailableMessage: null,
                };
            });
        });

        return () => {
            setUnauthorizedListener(null);
        };
    }, []);

    useEffect(() => {
        let active = true;

        getSession()
            .then((session) => {
                if (!active) {
                    return;
                }

                setSnapshot({
                    status: "authenticated",
                    username: session.username,
                    unavailableMessage: null,
                });
            })
            .catch((error: unknown) => {
                if (!active) {
                    return;
                }

                if (isUnauthorized(error)) {
                    setSnapshot((current) => {
                        if (current.status === "authenticated" || current.status === "expired") {
                            return {
                                status: "expired",
                                username: current.username,
                                unavailableMessage: null,
                            };
                        }

                        return signedOutSnapshot;
                    });
                    return;
                }

                setSnapshot({
                    status: "unavailable",
                    username: null,
                    unavailableMessage: readAuthMessage(
                        error,
                        "The session could not be confirmed. Check that the API is running, then try again.",
                    ),
                });
            });

        return () => {
            active = false;
        };
    }, [checkAttempt]);

    const login = useCallback(async (username: string, password: string) => {
        const session = await loginRequest(username, password);

        setSnapshot({
            status: "authenticated",
            username: session.username,
            unavailableMessage: null,
        });
    }, []);

    const logout = useCallback(async (): Promise<LogoutResult> => {
        logoutInFlightRef.current = true;

        try {
            await logoutRequest();
            setSnapshot(signedOutSnapshot);
            return "signed-out";
        } catch (error: unknown) {
            if (isUnauthorized(error)) {
                setSnapshot(signedOutSnapshot);
                return "signed-out";
            }

            return "failed";
        } finally {
            logoutInFlightRef.current = false;
        }
    }, []);

    const retrySessionCheck = useCallback(() => {
        setSnapshot({
            status: "checking",
            username: null,
            unavailableMessage: null,
        });
        setCheckAttempt((currentAttempt) => currentAttempt + 1);
    }, []);

    const value = useMemo<AuthSessionContextValue>(() => ({
        status: snapshot.status,
        username: snapshot.username,
        unavailableMessage: snapshot.unavailableMessage,
        login,
        logout,
        retrySessionCheck,
    }), [snapshot, login, logout, retrySessionCheck]);

    return (
        <AuthSessionContext.Provider value={value}>
            {children}
        </AuthSessionContext.Provider>
    );
}

function isUnauthorized(error: unknown): boolean {
    return error instanceof AuthRequestError && error.statusCode === 401;
}

function readAuthMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim() !== "") {
        return error.message;
    }

    return fallback;
}

export default AuthSessionProvider;
