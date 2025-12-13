"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import {
    createTLStore,
    type TLStore,
    type Editor,
    getSnapshot,
    loadSnapshot,
} from "tldraw";
import "tldraw/tldraw.css";

const Tldraw = dynamic(() => import("tldraw").then((mod) => mod.Tldraw), {
    ssr: false,
});

const encoder = new TextEncoder();
const decoder = new TextDecoder();

interface WhiteboardMessage {
    type: "drawing-update" | "state-sync" | "request-state";
    sender: string;
    data: {
        snapshot?: { document: unknown; session: unknown };
    };
    timestamp: number;
}

export default function WhiteboardPanel() {
    const room = useRoomContext();
    const [store] = useState<TLStore>(() => createTLStore());
    const [lastSyncTimestamp, setLastSyncTimestamp] = useState(0);
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isApplyingRemoteUpdate = useRef(false);
    const editorRef = useRef<Editor | null>(null);
    const unsubscribeRef = useRef<(() => void) | null>(null);

    // Handle incoming whiteboard updates from data channel
    useEffect(() => {
        if (!room || !store) return;

        const handler = (
            payload: Uint8Array,
            participant: { identity: string } | undefined,
            _kind: unknown,
            topic?: string,
        ) => {
            if (topic !== "whiteboard") return;
            if (!participant || participant.identity === room.localParticipant?.identity) return;

            try {
                const message = JSON.parse(decoder.decode(payload)) as WhiteboardMessage;

                // Handle request-state: any participant with current state should respond
                if (message.type === "request-state" && editorRef.current) {
                    const snapshot = getSnapshot(editorRef.current.store);
                    const response: WhiteboardMessage = {
                        type: "state-sync",
                        sender: room.localParticipant?.identity ?? "unknown",
                        data: {
                            snapshot,
                        },
                        timestamp: Date.now(),
                    };

                    void room.localParticipant?.publishData(
                        encoder.encode(JSON.stringify(response)),
                        {
                            reliable: true,
                            topic: "whiteboard",
                        },
                    );
                    return;
                }

                // Ignore old messages
                if (message.timestamp <= lastSyncTimestamp) return;

                setLastSyncTimestamp(message.timestamp);
                isApplyingRemoteUpdate.current = true;

                // Update TLDraw store with received snapshot
                if (message.type === "drawing-update" || message.type === "state-sync") {
                    if (message.data.snapshot) {
                        try {
                            loadSnapshot(store, message.data.snapshot as any);
                        } catch (error) {
                            console.warn("Failed to load snapshot", error);
                        }
                    }
                }
            } catch (error) {
                console.warn("Whiteboard sync error", error);
            } finally {
                setTimeout(() => {
                    isApplyingRemoteUpdate.current = false;
                }, 100);
            }
        };

        room.on(RoomEvent.DataReceived, handler);
        return () => {
            room.off(RoomEvent.DataReceived, handler);
        };
    }, [room, store, lastSyncTimestamp]);

    // Broadcast whiteboard changes
    const handleChange = useCallback(() => {
        if (!room || isApplyingRemoteUpdate.current || !editorRef.current) return;

        // Throttle updates to avoid flooding the data channel
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
        }

        syncTimeoutRef.current = setTimeout(() => {
            if (!editorRef.current || isApplyingRemoteUpdate.current) return;

            const snapshot = getSnapshot(editorRef.current.store);

            const message: WhiteboardMessage = {
                type: "drawing-update",
                sender: room.localParticipant?.identity ?? "unknown",
                data: {
                    snapshot,
                },
                timestamp: Date.now(),
            };

            void room.localParticipant?.publishData(
                encoder.encode(JSON.stringify(message)),
                {
                    reliable: true,
                    topic: "whiteboard",
                },
            );

            setLastSyncTimestamp(message.timestamp);
        }, 150); // Throttle to 150ms
    }, [room]);

    // Setup editor and subscribe to changes
    const handleMount = useCallback(
        (editor: Editor) => {
            editorRef.current = editor;

            // Subscribe to store changes
            unsubscribeRef.current = editor.store.listen(
                () => {
                    handleChange();
                },
                { source: "user", scope: "document" },
            );
        },
        [handleChange],
    );

    // Cleanup listener on unmount
    useEffect(() => {
        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
        };
    }, []);

    // Request latest state when joining
    useEffect(() => {
        if (!room) return;

        const requestState = () => {
            const message: WhiteboardMessage = {
                type: "request-state",
                sender: room.localParticipant?.identity ?? "unknown",
                data: {},
                timestamp: Date.now(),
            };

            void room.localParticipant?.publishData(
                encoder.encode(JSON.stringify(message)),
                {
                    reliable: true,
                    topic: "whiteboard",
                },
            );
        };

        // Request state after a short delay to ensure connection is ready
        const timeout = setTimeout(requestState, 1000);
        return () => clearTimeout(timeout);
    }, [room]);

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#fff',
            overflow: 'hidden'
        }}>
            <Tldraw
                store={store}
                onMount={handleMount}
            />
        </div>
    );
}
