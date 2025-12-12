"use client";

import { useState, useEffect } from "react";
import { useRoomContext, useLocalParticipant } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";

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
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="flex items-center gap-2 rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 border border-slate-700"
        title="Reactions"
      >
        <span className="text-lg">😊</span>
        <span className="hidden sm:inline">Reactions</span>
      </button>

      {showPanel && (
        <div className="absolute bottom-full left-0 mb-2 bg-slate-800 rounded-lg p-3 shadow-xl border border-slate-700 z-50">
          <div className="grid grid-cols-5 gap-2">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  sendReaction(emoji);
                  setShowPanel(false);
                }}
                className="text-2xl hover:scale-125 transition-transform p-2 rounded hover:bg-slate-700"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Display active reactions */}
      {reactions.length > 0 && (
        <div className="fixed top-20 right-4 z-40 space-y-2 pointer-events-none">
          {reactions.slice(-5).map((reaction, idx) => (
            <div
              key={`${reaction.timestamp}-${idx}`}
              className="bg-slate-800/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg animate-bounce-in"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{reaction.emoji}</span>
                <span className="text-sm text-white">{reaction.participantName}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
