'use client';

import * as React from 'react';
import { useRoomContext, useLocalParticipant, useParticipants } from '@livekit/components-react';
import { RoomEvent, ParticipantEvent } from 'livekit-client';

const RAISE_HAND_ATTRIBUTE = 'raiseHand';

export function useRaiseHand() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();

  const [isRaised, setIsRaised] = React.useState(false);
  const [raisedParticipants, setRaisedParticipants] = React.useState<string[]>([]);

  // Helper function to update state from current participant data
  const updateState = React.useCallback(() => {
    if (localParticipant) {
      setIsRaised(localParticipant.attributes?.[RAISE_HAND_ATTRIBUTE] === 'true');
    }

    const raised = participants
      .filter((p) => p.attributes?.[RAISE_HAND_ATTRIBUTE] === 'true' && !p.isLocal)
      .map((p) => p.identity);
    setRaisedParticipants(raised);
  }, [localParticipant, participants]);

  // Initialize and update state when participants change
  React.useEffect(() => {
    updateState();
  }, [updateState]);

  // Listen to room events for real-time updates
  React.useEffect(() => {
    room.on(RoomEvent.ParticipantAttributesChanged, updateState);
    room.on(RoomEvent.ParticipantConnected, updateState);
    room.on(RoomEvent.ParticipantDisconnected, updateState);

    return () => {
      room.off(RoomEvent.ParticipantAttributesChanged, updateState);
      room.off(RoomEvent.ParticipantConnected, updateState);
      room.off(RoomEvent.ParticipantDisconnected, updateState);
    };
  }, [room, updateState]);

  const toggleRaiseHand = React.useCallback(async () => {
    if (!localParticipant) return;

    const newState = !isRaised;
    try {
      await localParticipant.setAttributes({
        [RAISE_HAND_ATTRIBUTE]: newState ? 'true' : 'false',
      });
      setIsRaised(newState);
    } catch (error) {
      console.error('Failed to toggle raise hand:', error);
    }
  }, [localParticipant, isRaised]);

  return {
    isRaised,
    raisedParticipants,
    toggleRaiseHand,
  };
}

export interface RaiseHandButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function RaiseHandButton({ className, ...props }: RaiseHandButtonProps) {
  const { isRaised, toggleRaiseHand } = useRaiseHand();

  return (
    <button
      className={`lk-button lk-control-bar-button ${className || ''}`}
      onClick={toggleRaiseHand}
      aria-pressed={isRaised}
      title={isRaised ? 'Lower hand' : 'Raise hand'}
      style={{
        backgroundColor: isRaised ? 'rgba(255, 99, 82, 0.2)' : undefined,
        borderColor: isRaised ? 'rgba(255, 99, 82, 0.5)' : undefined,
      }}
      {...props}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ transform: isRaised ? 'rotate(0deg)' : 'rotate(-20deg)' }}
      >
        <path
          d="M13 1.07V9h7c0 4.08-3.06 7.44-7 7.93v2.81c0 .45-.54.67-.85.35L9.29 17.7a.996.996 0 0 0-1.41 0c-.39.39-.39 1.02 0 1.41l3.58 3.59c.39.39 1.02.39 1.41 0l3.58-3.59c.39-.39.39-1.02 0-1.41a.996.996 0 0 0-1.41 0l-1.58 1.58v-2.81c-3.94-.49-7-3.85-7-7.93h7V1.07c0-.59.51-1.07 1.14-1.07.63 0 1.14.48 1.14 1.07z"
          fill="currentColor"
        />
      </svg>
      <span className="lk-button-text">{isRaised ? 'Lower hand' : 'Raise hand'}</span>
    </button>
  );
}
