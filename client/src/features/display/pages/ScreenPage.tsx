import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
    getDisplay,
    isDisplayId,
    type PublicDisplayRecord,
} from "../api/displayApi.ts";
import {
    DisplayStatus,
    ScreenPresenceStatus,
} from "../components/DisplayStatus.tsx";
import useDisplayRegistration from "../hooks/useDisplayRegistration.ts";
import {
    PublishedDisplay,
    type PublishedDisplayStatus,
} from "./DisplayPage.tsx";

type ScreenSessionProps = {
    displayId: string;
};

type RegisteredScreenProps = {
    display: PublicDisplayRecord;
    registration: ReturnType<typeof useDisplayRegistration>;
};

function ScreenPage() {
    const { displayId } = useParams();

    if (!isDisplayId(displayId)) {
        return (
            <DisplayStatus
                title="Display unavailable"
                message="This display address is not valid."
            />
        );
    }

    return <ScreenSession key={displayId} displayId={displayId} />;
}

function ScreenSession({ displayId }: ScreenSessionProps) {
    const [display, setDisplay] = useState<PublicDisplayRecord | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loadAttempt, setLoadAttempt] = useState(0);
    const serialRef = useRef(0);
    const displayRef = useRef<PublicDisplayRecord | null>(null);
    const refreshAssignment = useCallback(() => {
        const serial = ++serialRef.current;

        getDisplay(displayId)
            .then((record) => {
                if (serial !== serialRef.current) {
                    return;
                }

                displayRef.current = record;
                setDisplay(record);
                setLoadError(null);
            })
            .catch((error: unknown) => {
                if (serial !== serialRef.current || displayRef.current !== null) {
                    return;
                }

                setLoadError(readLoadError(error));
            });
    }, [displayId]);
    const registration = useDisplayRegistration(displayId, refreshAssignment);

    useEffect(() => {
        refreshAssignment();

        return () => {
            serialRef.current += 1;
        };
    }, [displayId, loadAttempt, refreshAssignment]);

    function handleRetry() {
        setLoadError(null);
        setLoadAttempt((currentAttempt) => currentAttempt + 1);
    }

    if (display === null) {
        if (loadError !== null) {
            return (
                <DisplayStatus
                    title="Display unavailable"
                    message={loadError}
                    actionLabel="Retry"
                    onAction={handleRetry}
                />
            );
        }

        return (
            <DisplayStatus
                title="Loading screen"
                message="The display is being loaded."
            />
        );
    }

    return <RegisteredScreen display={display} registration={registration} />;
}

function RegisteredScreen({ display, registration }: RegisteredScreenProps) {
    const registrationDetails = registration.registrationError === null
        ? []
        : [registration.registrationError];

    if (display.boardId === null) {
        return (
            <>
                <DisplayStatus
                    title="No board assigned"
                    message={`${display.name} is ready. Assign a board to this display to start presenting.`}
                />
                <ScreenPresenceStatus
                    connectionState={registration.connectionState}
                    registrationState={registration.registrationState}
                    details={registrationDetails}
                />
            </>
        );
    }

    return (
        <PublishedDisplay
            key={display.boardId}
            boardId={display.boardId}
            renderConnectionStatus={(status) => (
                <ScreenPresenceStatus
                    connectionState={status.connectionState}
                    registrationState={registration.registrationState}
                    details={readStatusDetails(status, registration.registrationError)}
                />
            )}
        />
    );
}

function readStatusDetails(status: PublishedDisplayStatus, registrationError: string | null): string[] {
    const details: string[] = [];

    if (status.detail !== null) {
        details.push(status.detail);
    }

    if (registrationError !== null && registrationError !== status.detail) {
        details.push(registrationError);
    }

    return details;
}

function readLoadError(error: unknown): string {
    if (error instanceof Error && error.message.trim() !== "") {
        return error.message;
    }

    return "The display could not be loaded. Check that the API is running, then try again.";
}

export default ScreenPage;
