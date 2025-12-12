"use client";

import { useEffect, useMemo, useState } from "react";
import { useRoomContext, useLocalParticipant } from "@livekit/components-react";

interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  at: number;
}

export default function ChatPanel() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");

  // Register text stream handler for receiving messages
  useEffect(() => {
    if (!room || !localParticipant) return;

    // Check if registerTextStreamHandler is available (newer API)
    if (
      typeof (localParticipant as any).registerTextStreamHandler === "function"
    ) {
      const unregister = (localParticipant as any).registerTextStreamHandler(
        "chat",
        async (reader: any, participantInfo: any) => {
          try {
            // Read all text from the stream
            const text = await reader.readAll();
            const message: ChatMessage = {
              id: reader.info.id,
              text,
              sender: participantInfo.name || participantInfo.identity || "Unknown",
              at: reader.info.timestamp,
            };
            setMessages((prev) => [...prev, message]);
          } catch (error) {
            console.warn("Failed to read chat message", error);
          }
        },
      );

      return () => {
        if (typeof unregister === "function") {
          unregister();
        }
      };
    } else {
      // Fallback to data packets for older SDK versions
      const decoder = new TextDecoder();
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

      room.on("dataReceived" as any, handler);
      return () => {
        room.off("dataReceived" as any, handler);
      };
    }
  }, [room, localParticipant]);

  const sendMessage = async () => {
    if (!room || !localParticipant || !draft.trim()) return;

    const messageText = draft.trim();
    const senderName =
      localParticipant.name || localParticipant.identity || "Me";

    try {
      // Try using sendText API (newer, better for long messages)
      if (typeof (localParticipant as any).sendText === "function") {
        await (localParticipant as any).sendText(messageText, {
          topic: "chat",
        });

        // Add message to local state immediately for better UX
        const message: ChatMessage = {
          id: crypto.randomUUID(),
          text: messageText,
          sender: senderName,
          at: Date.now(),
        };
        setMessages((prev) => [...prev, message]);
      } else {
        // Fallback to data packets for older SDK versions
        const encoder = new TextEncoder();
        const message: ChatMessage = {
          id: crypto.randomUUID(),
          text: messageText,
          sender: senderName,
          at: Date.now(),
        };
        await localParticipant.publishData(
          encoder.encode(JSON.stringify(message)),
          { reliable: true, topic: "chat" },
        );
        setMessages((prev) => [...prev, message]);
      }
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
