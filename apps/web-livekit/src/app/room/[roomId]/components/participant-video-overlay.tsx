"use client";

import { useEffect, useState } from "react";
import { useRoomContext, useLocalParticipant } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { Hand } from "lucide-react";

interface ParticipantVideoOverlayProps {
  participantIdentity: string;
  participantName?: string;
}

interface ReactionMessage {
  type: "reaction";
  emoji: string;
  participantIdentity: string;
  participantName: string;
}

interface ParticipantStateMessage {
  type: "handRaised";
  status: boolean;
  participantIdentity: string;
  participantName: string;
}

export default function ParticipantVideoOverlay({
  participantIdentity,
  participantName,
}: ParticipantVideoOverlayProps) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [reaction, setReaction] = useState<string | null>(null);
  const [isHandRaised, setIsHandRaised] = useState(false);

  useEffect(() => {
    if (!room) return;

    const decoder = new TextDecoder();
    
    // Listen for reactions
    const reactionHandler = (
      payload: Uint8Array,
      participant: { identity: string; name?: string } | undefined,
      _kind: unknown,
      topic?: string,
    ) => {
      if (topic !== "reactions") return;
      if (!participant || participant.identity !== participantIdentity) return;

      try {
        const message = JSON.parse(decoder.decode(payload)) as ReactionMessage;
        if (message.type === "reaction" && message.participantIdentity === participantIdentity) {
          setReaction(message.emoji);
          // Clear reaction after 3 seconds
          setTimeout(() => setReaction(null), 3000);
        }
      } catch (error) {
        console.warn("Failed to parse reaction message", error);
      }
    };

    // Listen for hand raised state
    const handRaisedHandler = (
      payload: Uint8Array,
      participant: { identity: string; name?: string } | undefined,
      _kind: unknown,
      topic?: string,
    ) => {
      if (topic !== "participant-state") return;
      if (!participant) return;

      try {
        const message = JSON.parse(decoder.decode(payload)) as ParticipantStateMessage;
        if (message.type === "handRaised" && message.participantIdentity === participantIdentity) {
          setIsHandRaised(message.status);
        }
      } catch (error) {
        console.warn("Failed to parse hand raised message", error);
      }
    };

    room.on(RoomEvent.DataReceived, reactionHandler);
    room.on(RoomEvent.DataReceived, handRaisedHandler);

    return () => {
      room.off(RoomEvent.DataReceived, reactionHandler);
      room.off(RoomEvent.DataReceived, handRaisedHandler);
    };
  }, [room, participantIdentity]);

  if (!reaction && !isHandRaised) return null;

  return (
    <div 
      className="fixed pointer-events-none z-50"
      style={{
        // Position will be handled by CSS or we'll need to calculate from video tile position
        // For now, show at bottom center of viewport
        bottom: '120px',
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    >
      <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-full px-4 py-2 shadow-lg border border-white/20">
        {/* Reaction Emoji */}
        {reaction && (
          <div className="text-3xl animate-bounce">
            {reaction}
          </div>
        )}
        
        {/* Hand Raised Indicator */}
        {isHandRaised && (
          <div className="flex items-center gap-2 text-yellow-400">
            <Hand className="h-5 w-5 fill-yellow-400 animate-pulse" />
            <span className="text-sm font-semibold text-white">
              {participantName || participantIdentity}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}