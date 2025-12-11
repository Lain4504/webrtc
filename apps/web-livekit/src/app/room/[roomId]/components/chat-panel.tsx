"use client";

import { useEffect, useMemo, useState } from "react";
import { RoomEvent } from "livekit-client";
import { useRoomContext } from "@livekit/components-react";

interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  at: number;
}

const decoder = new TextDecoder();
const encoder = new TextEncoder();

export default function ChatPanel() {
  const room = useRoomContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!room) return;
    const handler = (
      payload: Uint8Array,
      participant: { identity: string; name?: string },
      _kind: unknown,
      topic?: string,
    ) => {
      if (topic && topic !== "chat") return;
      try {
        const parsed = JSON.parse(decoder.decode(payload)) as ChatMessage;
        setMessages((prev) => [...prev, parsed]);
      } catch (error) {
        console.warn("Failed to parse chat payload", error);
      }
    };

    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room]);

  const sendMessage = async () => {
    if (!room || !draft.trim()) return;
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      text: draft.trim(),
      sender: room.localParticipant?.name || room.localParticipant?.identity || "Me",
      at: Date.now(),
    };
    try {
      await room.localParticipant?.publishData(
        encoder.encode(JSON.stringify(message)),
        { reliable: true, topic: "chat" },
      );
      setMessages((prev) => [...prev, message]);
      setDraft("");
    } catch (error) {
      console.warn("Failed to send chat message", error);
    }
  };

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => a.at - b.at),
    [messages],
  );

  return (
    <div className="flex h-80 flex-col border-b border-slate-800">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-lg font-semibold text-white">Chat</h3>
        <span className="text-xs text-slate-500">
          {sortedMessages.length} message{sortedMessages.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
        {sortedMessages.map((m) => (
          <div key={m.id} className="rounded-md bg-slate-800/60 px-3 py-2 text-sm text-slate-100">
            <div className="text-xs text-slate-400">
              {m.sender} • {new Date(m.at).toLocaleTimeString()}
            </div>
            <p className="mt-1">{m.text}</p>
          </div>
        ))}
        {sortedMessages.length === 0 ? (
          <p className="text-sm text-slate-500">No messages yet.</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2 border-t border-slate-800 bg-slate-900/80 px-3 py-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void sendMessage();
            }
          }}
          placeholder="Type a message"
          className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
        />
        <button
          onClick={() => void sendMessage()}
          className="rounded-md bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-600"
        >
          Send
        </button>
      </div>
    </div>
  );
}
