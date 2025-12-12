"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRoomContext, useLocalParticipant } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";

interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  senderIdentity: string;
  at: number;
}

export default function ChatPanel() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const handlerRegisteredRef = useRef<boolean>(false);

  // Register text stream handler for receiving chat messages (according to LiveKit docs)
  useEffect(() => {
    if (!room) return;

    // Prevent double registration in React Strict Mode
    if (handlerRegisteredRef.current) {
      console.log("Chat handler already registered, skipping...");
      return;
    }

    let unregisterFn: (() => void) | undefined;
    let dataHandler: ((...args: any[]) => void) | undefined;

    // Check if registerTextStreamHandler is available
    if (typeof (room as any).registerTextStreamHandler === "function") {
      try {
        // Register handler using registerTextStreamHandler (recommended by LiveKit docs)
        unregisterFn = (room as any).registerTextStreamHandler(
          "chat",
          async (reader: any, participantInfo: any) => {
            try {
              // Get the entire text after the stream completes
              const text = await reader.readAll();
              
              // Parse the JSON message from the text
              const parsed = JSON.parse(text) as ChatMessage;
              
              // Ensure we have all required fields
              if (parsed.text && parsed.senderIdentity) {
                setMessages((prev) => {
                  // Avoid duplicates by checking if message already exists
                  const exists = prev.some((m) => m.id === parsed.id);
                  if (exists) return prev;
                  return [...prev, parsed];
                });
              }
            } catch (error) {
              console.warn("Failed to read chat message", error);
            }
          },
        );
        handlerRegisteredRef.current = true;
        console.log("Text stream handler registered successfully for 'chat'");
      } catch (error) {
        // If handler already exists, mark as registered and use fallback
        if (error instanceof Error && error.message.includes("already been set")) {
          handlerRegisteredRef.current = true;
          console.warn("Text stream handler already registered by another instance, using data packet fallback");
          // Fall through to data packet handler
        } else {
          console.warn("Failed to register text stream handler", error);
          // Fall through to data packet handler
        }
      }
    }

    // Fallback to data packets if registerTextStreamHandler is not available or failed
    if (!unregisterFn) {
      const decoder = new TextDecoder();
      dataHandler = (
        payload: Uint8Array,
        participant: { identity: string; name?: string } | undefined,
        _kind: unknown,
        topic?: string,
      ) => {
        if (topic && topic !== "chat") return;
        if (!participant) return;

        try {
          const parsed = JSON.parse(decoder.decode(payload)) as ChatMessage;
          if (parsed.text && parsed.senderIdentity) {
            setMessages((prev) => {
              const exists = prev.some((m) => m.id === parsed.id);
              if (exists) return prev;
              return [...prev, parsed];
            });
          }
        } catch (error) {
          console.warn("Failed to parse chat payload", error);
        }
      };

      room.on(RoomEvent.DataReceived, dataHandler);
    }

    return () => {
      // Cleanup: unregister text stream handler if it was registered
      if (typeof unregisterFn === "function") {
        try {
          unregisterFn();
          handlerRegisteredRef.current = false;
        } catch (error) {
          console.warn("Failed to unregister text stream handler", error);
        }
      }
      
      // Cleanup: remove data packet handler if it was registered
      if (dataHandler) {
        room.off(RoomEvent.DataReceived, dataHandler);
      }
      
      handlerRegisteredRef.current = false;
    };
  }, [room]);

  const sendMessage = async () => {
    if (!room || !localParticipant || !draft.trim()) return;

    const messageText = draft.trim();
    const senderName =
      localParticipant.name || localParticipant.identity || "Me";

    try {
      const message: ChatMessage = {
        id: crypto.randomUUID(),
        text: messageText,
        sender: senderName,
        senderIdentity: localParticipant.identity,
        at: Date.now(),
      };

      // Use sendText API (recommended by LiveKit docs for text messages)
      if (typeof (localParticipant as any).sendText === "function") {
        // Send the message as JSON string using sendText
        await (localParticipant as any).sendText(JSON.stringify(message), {
          topic: "chat",
        });

        // Add message to local state immediately for better UX
        setMessages((prev) => [...prev, message]);
      } else {
        // Fallback to data packets if sendText is not available
        const encoder = new TextEncoder();
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

  // Helper function to get initials for avatar
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-3 sm:mb-4 flex-shrink-0">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Chat</h3>
        <Badge variant="secondary" className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-[hsl(215,18%,95%)] text-gray-700 rounded-full text-xs font-medium">
          {sortedMessages.length}
        </Badge>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto mb-3 sm:mb-4 min-h-0 scrollbar-thin pr-1">
        {sortedMessages.map((m) => {
          const isCurrentUser = m.senderIdentity === localParticipant?.identity;

          return (
            <div
              key={m.id}
              className={`flex gap-2 ${isCurrentUser ? "justify-end" : "justify-start"}`}
            >
              {/* Avatar for other users */}
              {!isCurrentUser && (
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-[hsl(210,100%,60%)] to-[hsl(210,100%,50%)] flex items-center justify-center text-white font-semibold text-xs shadow-cloud-sm">
                  {getInitials(m.sender)}
                </div>
              )}

              {/* Message bubble */}
              <div className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"} max-w-[75%]`}>
                {/* Sender name and time */}
                {!isCurrentUser && (
                  <div className="text-xs text-gray-500 mb-1 px-1 font-medium">
                    {m.sender} • {new Date(m.at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}

                {/* Message content */}
                <div
                  className={`px-3 py-2 rounded-2xl shadow-cloud-sm transition-smooth ${isCurrentUser
                      ? "bg-[hsl(210,100%,60%)] text-white rounded-tr-sm"
                      : "bg-white border border-gray-200 text-gray-900 rounded-tl-sm"
                    }`}
                >
                  <p className="text-sm leading-relaxed break-words">{m.text}</p>
                </div>

                {/* Time for current user */}
                {isCurrentUser && (
                  <div className="text-xs text-gray-400 mt-1 px-1">
                    {new Date(m.at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {sortedMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400 text-center">Chưa có tin nhắn nào</p>
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2 border-t border-gray-200 pt-3 sm:pt-4 pb-1 sm:pb-2 flex-shrink-0">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void sendMessage();
            }
          }}
          placeholder="Gửi tin nhắn"
          className="flex-1 h-9 sm:h-10 text-sm rounded-xl border-gray-200 focus:border-[hsl(210,100%,60%)] focus:ring-[hsl(210,100%,60%)] transition-smooth"
        />
        <Button
          onClick={() => void sendMessage()}
          size="icon"
          className="rounded-xl bg-[hsl(210,100%,60%)] hover:bg-[hsl(210,100%,55%)] text-white shadow-cloud-sm transition-smooth h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
          disabled={!draft.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
