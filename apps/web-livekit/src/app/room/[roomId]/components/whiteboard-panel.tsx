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

export default function WhiteboardPanel() {
  const room = useRoomContext();
  const [whiteboardState, setWhiteboardState] = useState<string | null>(null);

  useEffect(() => {
    if (!room) return;
    const handler = (
      payload: Uint8Array,
      _participant: unknown,
      _kind: unknown,
      topic?: string,
    ) => {
      if (topic && topic !== "whiteboard") return;
      setWhiteboardState(decoder.decode(payload));
    };

    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room]);

  const handleChange = (elements: unknown, appState: unknown, files: unknown) => {
    if (!room) return;
    const payload = JSON.stringify({ elements, appState, files });
    setWhiteboardState(payload);
    void room.localParticipant?.publishData(encoder.encode(payload), {
      reliable: true,
      topic: "whiteboard",
    });
  };

  const parsedInitial = whiteboardState ? JSON.parse(whiteboardState) : undefined;

  return (
    <div className="flex flex-col border-t border-slate-800">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-lg font-semibold text-white">Whiteboard</h3>
        <span className="text-xs text-slate-500">Experimental</span>
      </div>
      <div className="h-80 overflow-hidden bg-slate-800/60">
        <Excalidraw
          onChange={handleChange}
          initialData={parsedInitial}
          theme="dark"
        />
      </div>
    </div>
  );
}
