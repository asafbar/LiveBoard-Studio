import { useEffect, useState } from "react";
import {
    subscribeToBoardPublication,
    type DisplayConnectionState,
} from "../realtime/boardRealtimeClient.ts";

type PublishedBoardUpdates = {
    connectionState: DisplayConnectionState;
    subscriptionError: string | null;
};

function usePublishedBoardUpdates(
    boardId: string,
    onUpdate: () => void,
): PublishedBoardUpdates {
    const [connectionState, setConnectionState] = useState<DisplayConnectionState>("reconnecting");
    const [subscriptionError, setSubscriptionError] = useState<string | null>(null);

    useEffect(() => {
        return subscribeToBoardPublication(boardId, {
            onConnectionState: setConnectionState,
            onSubscribed: () => {
                setSubscriptionError(null);
                onUpdate();
            },
            onSubscribeError: setSubscriptionError,
            onBoardPublished: (eventBoardId) => {
                if (eventBoardId !== boardId.toLowerCase()) {
                    return;
                }

                onUpdate();
            },
        });
    }, [boardId, onUpdate]);

    return {
        connectionState,
        subscriptionError,
    };
}

export default usePublishedBoardUpdates;
