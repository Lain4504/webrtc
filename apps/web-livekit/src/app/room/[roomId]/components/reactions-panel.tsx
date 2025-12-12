"use client";

import { useState, useEffect } from "react";
import { useRoomContext, useLocalParticipant } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card } from "@/components/ui/card";

interface Reaction {
  emoji: string;
  participantIdentity: string;
  participantName: string;
  timestamp: number;
}

interface ReactionMessage {
  type: "reaction";
  emoji: string;
  participantIdentity: string;
  participantName: string;
}

const REACTION_EMOJIS = ["👍", "👎", "❤️", "🎉", "👏", "🤔", "✅", "❌", "🔥", "💯"];

export default function ReactionsPanel() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    if (!room) return;

    const decoder = new TextDecoder();
    const handler = (
      payload: Uint8Array,
      participant: { identity: string; name?: string } | undefined,
      _kind: unknown,
      topic?: string,
    ) => {
      if (topic !== "reactions") return;
      if (!participant) return;

      try {
        const message = JSON.parse(decoder.decode(payload)) as ReactionMessage;

        if (message.type === "reaction") {
          const reaction: Reaction = {
            emoji: message.emoji,
            participantIdentity: message.participantIdentity,
            participantName: message.participantName,
            timestamp: Date.now(),
          };

          setReactions((prev) => [...prev, reaction]);

          // Remove reaction after 3 seconds
          setTimeout(() => {
            setReactions((prev) =>
              prev.filter((r) => r.timestamp !== reaction.timestamp),
            );
          }, 3000);
        }
      } catch (error) {
        console.warn("Failed to parse reaction message", error);
      }
    };

    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room]);

  const sendReaction = async (emoji: string) => {
    if (!room || !localParticipant) return;

    const message: ReactionMessage = {
      type: "reaction",
      emoji,
      participantIdentity: localParticipant.identity,
      participantName: localParticipant.name || localParticipant.identity,
    };

    const encoder = new TextEncoder();
    await localParticipant.publishData(encoder.encode(JSON.stringify(message)), {
      reliable: false, // Lossy for faster delivery
      topic: "reactions",
    });

    // Add local reaction immediately
    const reaction: Reaction = {
      emoji,
      participantIdentity: localParticipant.identity,
      participantName: localParticipant.name || localParticipant.identity,
      timestamp: Date.now(),
    };
    setReactions((prev) => [...prev, reaction]);

    // Remove after 3 seconds
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.timestamp !== reaction.timestamp));
    }, 3000);
  };

  return (
    <div className="relative">
      <Popover open={showPanel} onOpenChange={setShowPanel}>
        <PopoverTrigger asChild>
          <Button variant="outline" title="Reactions">
            <span className="text-lg">😊</span>
            <span className="hidden sm:inline ml-2">Reactions</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="grid grid-cols-5 gap-2">
            {REACTION_EMOJIS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="icon"
                onClick={() => {
                  sendReaction(emoji);
                  setShowPanel(false);
                }}
                className="text-2xl hover:scale-125 transition-transform h-auto w-auto p-2"
                title={emoji}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Display active reactions */}
      {reactions.length > 0 && (
        <div className="fixed top-20 right-4 z-40 space-y-2 pointer-events-none">
          {reactions.slice(-5).map((reaction, idx) => (
            <Card
              key={`${reaction.timestamp}-${idx}`}
              className="bg-white/90 backdrop-blur-sm px-4 py-2 shadow-lg animate-bounce-in"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{reaction.emoji}</span>
                <span className="text-sm">{reaction.participantName}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
