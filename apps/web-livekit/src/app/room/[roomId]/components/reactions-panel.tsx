"use client";

import { useState, useEffect } from "react";
import { useRoomContext, useLocalParticipant } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { Smile } from "lucide-react";

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
    <>
      <Popover open={showPanel} onOpenChange={setShowPanel}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full h-11 w-11 sm:h-12 sm:w-12 bg-white/80 hover:bg-white transition-smooth shadow-cloud-sm" title="Phản ứng">
            <Smile className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3 rounded-2xl shadow-cloud-lg border-gray-200" align="start">
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
                className="text-2xl hover:scale-110 transition-smooth h-auto w-auto p-2.5 rounded-xl hover:bg-[hsl(215,18%,95%)]"
                title={emoji}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Display active reactions - Meet/Zoom style */}
      {reactions.length > 0 && (
        <div className="fixed top-20 right-4 z-50 space-y-2 pointer-events-none max-w-sm">
          {reactions.slice(-5).map((reaction, idx) => (
            <Card
              key={`${reaction.timestamp}-${idx}`}
              className="bg-black/80 backdrop-blur-md px-4 py-3 shadow-xl border border-white/20 rounded-full animate-in slide-in-from-right duration-300"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl animate-bounce">{reaction.emoji}</span>
                <span className="text-sm font-semibold text-white">{reaction.participantName}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
