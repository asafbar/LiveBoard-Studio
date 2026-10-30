import { useEffect, useRef, useState } from "react";
import {
    registerDisplayPresence,
    type DisplayConnectionState,
    type DisplayRegistrationState,
} from "../realtime/boardRealtimeClient.ts";

type DisplayRegistration = {
    connectionState: DisplayConnectionState;
    registrationState: DisplayRegistrationState;
    registrationError: string | null;
};

function useDisplayRegistration(
    displayId: string,
    onAssignmentRefresh: () => void,
): DisplayRegistration {
    const [connectionState, setConnectionState] = useState<DisplayConnectionState>("reconnecting");
    const [registrationState, setRegistrationState] = useState<DisplayRegistrationState>("inactive");
    const [registrationError, setRegistrationError] = useState<string | null>(null);
    const refreshRef = useRef(onAssignmentRefresh);

    useEffect(() => {
        refreshRef.current = onAssignmentRefresh;
    }, [onAssignmentRefresh]);

    useEffect(() => {
        return registerDisplayPresence(displayId, {
            onConnectionState: (state) => {
                setConnectionState(state);

                if (state !== "connected") {
                    setRegistrationState("inactive");
                    setRegistrationError(null);
                }
            },
            onRegistrationState: setRegistrationState,
            onRegistrationError: setRegistrationError,
            onAssignmentChanged: () => {
                refreshRef.current();
            },
        });
    }, [displayId]);

    return {
        connectionState,
        registrationState,
        registrationError,
    };
}

export default useDisplayRegistration;
