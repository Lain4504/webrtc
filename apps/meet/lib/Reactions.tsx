'use client';

import * as React from 'react';
import { useRoomContext, useLocalParticipant, useParticipants } from '@livekit/components-react';
import { RoomEvent, DataPacket_Kind } from 'livekit-client';

export type ReactionType = '👋' | '👍' | '👎' | '❤️' | '🎉' | '😂' | '😮' | '🔥';

interface ReactionEvent {
  emoji: ReactionType;
  participantIdentity: string;
  participantName: string;
  timestamp: number;
}

const REACTIONS: ReactionType[] = ['👋', '👍', '👎', '❤️', '🎉', '😂', '😮', '🔥'];
const REACTION_TOPIC = 'reaction';

export function useReactions() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const [activeReactions, setActiveReactions] = React.useState<ReactionEvent[]>([]);

  React.useEffect(() => {
    const handleDataReceived = (payload: Uint8Array, participant?: any, kind?: DataPacket_Kind) => {
      if (kind === DataPacket_Kind.RELIABLE || kind === DataPacket_Kind.LOSSY) {
        try {
          const decoder = new TextDecoder();
          const text = decoder.decode(payload);
          const data = JSON.parse(text);

          if (data.topic === REACTION_TOPIC && data.emoji) {
            const participantName =
              participants.find((p) => p.identity === data.participantIdentity)?.name ||
              data.participantName ||
              data.participantIdentity;

            const reaction: ReactionEvent = {
              emoji: data.emoji,
              participantIdentity: data.participantIdentity,
              participantName,
              timestamp: data.timestamp || Date.now(),
            };

            setActiveReactions((prev) => [...prev, reaction]);

            // Remove reaction after 3 seconds
            setTimeout(() => {
              setActiveReactions((prev) => prev.filter((r) => r !== reaction));
            }, 3000);
          }
        } catch (error) {
          console.error('Failed to parse reaction data:', error);
        }
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, participants]);

  const sendReaction = React.useCallback(
    async (emoji: ReactionType) => {
      if (!localParticipant) return;

      try {
        const reactionData = {
          topic: REACTION_TOPIC,
          emoji,
          participantIdentity: localParticipant.identity,
          participantName: localParticipant.name || localParticipant.identity,
          timestamp: Date.now(),
        };

        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(reactionData));

        await localParticipant.publishData(data, { reliable: true });

        // Also show locally
        const participantName = localParticipant.name || localParticipant.identity;
        const reaction: ReactionEvent = {
          emoji,
          participantIdentity: localParticipant.identity,
          participantName,
          timestamp: Date.now(),
        };

        setActiveReactions((prev) => [...prev, reaction]);

        // Remove after 3 seconds
        setTimeout(() => {
          setActiveReactions((prev) => prev.filter((r) => r !== reaction));
        }, 3000);
      } catch (error) {
        console.error('Failed to send reaction:', error);
      }
    },
    [localParticipant],
  );

  return {
    reactions: activeReactions,
    sendReaction,
    availableReactions: REACTIONS,
  };
}

export interface ReactionsButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onReactionSelect?: (emoji: ReactionType) => void;
}

export function ReactionsButton({ className, onReactionSelect, ...props }: ReactionsButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { sendReaction, availableReactions } = useReactions();
  const buttonRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleReactionClick = React.useCallback(
    (emoji: ReactionType) => {
      sendReaction(emoji);
      if (onReactionSelect) {
        onReactionSelect(emoji);
      }
      setIsOpen(false);
    },
    [sendReaction, onReactionSelect],
  );

  return (
    <div className="lk-reactions-container" style={{ position: 'relative' }} ref={buttonRef}>
      <button
        className={`lk-button lk-control-bar-button ${className || ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        title="Add reaction"
        {...props}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-3.5-9c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm7 0c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"
            fill="currentColor"
          />
        </svg>
        <span className="lk-button-text">Reactions</span>
      </button>
      {isOpen && (
        <div
          className="lk-reactions-menu"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px',
            backgroundColor: 'var(--lk-bg-secondary, #1a1a1a)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '8px',
            display: 'flex',
            gap: '4px',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
        >
          {availableReactions.map((emoji) => (
            <button
              key={emoji}
              className="lk-reaction-emoji-button"
              onClick={() => handleReactionClick(emoji)}
              style={{
                fontSize: '24px',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export interface ReactionsOverlayProps extends React.HTMLAttributes<HTMLDivElement> { }

export function ReactionsOverlay({ className, ...props }: ReactionsOverlayProps) {
  const { reactions } = useReactions();

  return (
    <div
      className={`lk-reactions-overlay ${className || ''}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
      {...props}
    >
      {reactions.map((reaction, index) => (
        <div
          key={`${reaction.participantIdentity}-${reaction.timestamp}-${index}`}
          className="lk-reaction-item"
          style={{
            position: 'absolute',
            fontSize: '48px',
            animation: 'reaction-fly-up 3s ease-out forwards',
            pointerEvents: 'none',
            left: `${50 + (Math.random() - 0.5) * 20}%`,
            bottom: '20%',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div>{reaction.emoji}</div>
            {reaction.participantName && (
              <div
                style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginTop: '4px',
                }}
              >
                {reaction.participantName}
              </div>
            )}
          </div>
        </div>
      ))}
      <style>
        {`
          @keyframes reaction-fly-up {
            0% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
            100% {
              opacity: 0;
              transform: translateY(-200px) scale(1.5);
            }
          }
        `}
      </style>
    </div>
  );
}
