"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRoomContext, useLocalParticipant } from "@livekit/components-react";
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
  role: "instructor" | "student";
  data: {
    snapshot?: { document: unknown; session: unknown };
  };
  timestamp: number;
}

interface WhiteboardPanelProps {
  role?: "instructor" | "student";
}

export default function WhiteboardPanel({ role = "student" }: WhiteboardPanelProps) {
  const room = useRoomContext();
  const localParticipant = useLocalParticipant();
  const [store] = useState<TLStore>(() => createTLStore());
  const [isReadOnly, setIsReadOnly] = useState(role !== "instructor");
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState(0);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isApplyingRemoteUpdate = useRef(false);
  const editorRef = useRef<Editor | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Get role from participant metadata if not provided as prop
  useEffect(() => {
    if (!role && localParticipant?.localParticipant?.metadata) {
      try {
        const metadata = JSON.parse(localParticipant.localParticipant.metadata);
        if (metadata.role) {
          setIsReadOnly(metadata.role !== "instructor");
        }
      } catch (e) {
        console.warn("Failed to parse participant metadata", e);
      }
    } else {
      setIsReadOnly(role !== "instructor");
    }
  }, [role, localParticipant]);

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

        // Handle request-state: instructor should respond with current state
        if (message.type === "request-state" && !isReadOnly && editorRef.current) {
          const snapshot = getSnapshot(editorRef.current.store);
          const response: WhiteboardMessage = {
            type: "state-sync",
            sender: room.localParticipant?.identity ?? "unknown",
            role: "instructor",
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

        // Only process instructor updates for students
        if (message.role !== "instructor" || !isReadOnly) return;

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
  }, [room, store, lastSyncTimestamp, isReadOnly]);

  // Broadcast whiteboard changes (instructor only)
  const handleChange = useCallback(() => {
    if (!room || isReadOnly || isApplyingRemoteUpdate.current || !editorRef.current) return;

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
        role: "instructor",
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
  }, [room, isReadOnly]);

  // Setup editor and subscribe to changes
  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;

      // Subscribe to store changes using editor.store.listen()
      if (!isReadOnly) {
        unsubscribeRef.current = editor.store.listen(
          () => {
            handleChange();
          },
          { source: "user", scope: "document" },
        );
      }
    },
    [handleChange, isReadOnly],
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

  // Request latest state when joining (students only)
  useEffect(() => {
    if (!room || !isReadOnly) return;

    const requestState = () => {
      const message: WhiteboardMessage = {
        type: "request-state",
        sender: room.localParticipant?.identity ?? "unknown",
        role: "student",
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
  }, [room, isReadOnly]);

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">Whiteboard</h3>
          {isReadOnly && (
            <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700 border border-gray-300">
              View Only
            </span>
          )}
        </div>
        {!isReadOnly && (
          <span className="text-xs text-gray-600">Instructor Mode</span>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <Tldraw
          store={store}
          onMount={handleMount}
          {...({ readOnly: isReadOnly } as any)}
        />
      </div>
    </div>
  );
}
