"use client";

import { useEffect, useMemo, useState } from "react";
import { useRoomContext, useLocalParticipant } from "@livekit/components-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    <Card className="flex h-80 flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Chat</CardTitle>
          <Badge variant="secondary">
            {sortedMessages.length} message{sortedMessages.length === 1 ? "" : "s"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
          {sortedMessages.map((m) => (
            <Card key={m.id} className="p-3">
              <div className="text-xs text-gray-600 mb-1">
                {m.sender} • {new Date(m.at).toLocaleTimeString()}
              </div>
              <p className="text-sm">{m.text}</p>
            </Card>
          ))}
          {sortedMessages.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No messages yet.</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-3 py-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="Type a message"
            className="flex-1"
          />
          <Button onClick={() => void sendMessage()}>
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
