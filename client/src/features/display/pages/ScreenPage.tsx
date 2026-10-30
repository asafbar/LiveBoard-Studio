import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
    getDisplay,
    isDisplayId,
    type DisplayRecord,
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
    display: DisplayRecord;
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
    const [display, setDisplay] = useState<DisplayRecord | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loadAttempt, setLoadAttempt] = useState(0);
    const serialRef = useRef(0);

    useEffect(() => {
        const serial = ++serialRef.current;

        getDisplay(displayId)
            .then((record) => {
                if (serial !== serialRef.current) {
                    return;
                }

                setDisplay(record);
                setLoadError(null);
            })
            .catch((error: unknown) => {
                if (serial !== serialRef.current) {
                    return;
                }

                setDisplay(null);
                setLoadError(readLoadError(error));
            });

        return () => {
            serialRef.current += 1;
        };
    }, [displayId, loadAttempt]);

    function handleRetry() {
        setLoadError(null);
        setLoadAttempt((currentAttempt) => currentAttempt + 1);
    }

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

    if (display === null) {
        return (
            <DisplayStatus
                title="Loading screen"
                message="The display is being loaded."
            />
        );
    }

    return <RegisteredScreen display={display} />;
}

function RegisteredScreen({ display }: RegisteredScreenProps) {
    const registration = useDisplayRegistration(display.id);
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
