"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
  { ssr: false },
);

const encoder = new TextEncoder();
const decoder = new TextDecoder();

type WhiteboardPayload = {
  sender: string;
  version: number;
  data: {
    elements: unknown;
    appState: unknown;
    files: unknown;
  };
};

export default function WhiteboardPanel() {
  const room = useRoomContext();
  const [whiteboardState, setWhiteboardState] = useState<WhiteboardPayload["data"] | null>(null);
  const [lastVersion, setLastVersion] = useState<number>(0);

  useEffect(() => {
    if (!room) return;
    const handler = (
      payload: Uint8Array,
      _participant: unknown,
      _kind: unknown,
      topic?: string,
    ) => {
      if (topic && topic !== "whiteboard") return;
      try {
        const parsed = JSON.parse(decoder.decode(payload)) as WhiteboardPayload;
        if (parsed.sender === room.localParticipant?.identity) return;
        if (parsed.version <= lastVersion) return;
        setLastVersion(parsed.version);
        setWhiteboardState(parsed.data);
      } catch (error) {
        console.warn("Whiteboard parse error", error);
      }
    };

    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room, lastVersion]);

  const handleChange = (elements: unknown, appState: unknown, files: unknown) => {
    if (!room) return;
    const payload: WhiteboardPayload = {
      sender: room.localParticipant?.identity ?? "local",
      version: Date.now(),
      data: { elements, appState, files },
    };
    setWhiteboardState(payload.data);
    setLastVersion(payload.version);
    void room.localParticipant?.publishData(encoder.encode(JSON.stringify(payload)), {
      reliable: true,
      topic: "whiteboard",
    });
  };

  return (
    <div className="flex flex-col border-t border-slate-800">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-lg font-semibold text-white">Whiteboard</h3>
        <span className="text-xs text-slate-500">Experimental</span>
      </div>
      <div className="h-80 overflow-hidden bg-slate-800/60">
        <Excalidraw
          onChange={handleChange}
          initialData={whiteboardState ?? undefined}
          theme="dark"
        />
      </div>
    </div>
  );
}
