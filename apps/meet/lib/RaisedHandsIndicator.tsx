'use client';

import * as React from 'react';
import { useRoomContext, useParticipants } from '@livekit/components-react';
import { useRaiseHand } from './RaiseHand';

export interface RaisedHandsIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  maxVisible?: number;
}

export function RaisedHandsIndicator({ className, maxVisible = 3, ...props }: RaisedHandsIndicatorProps) {
  const { raisedParticipants } = useRaiseHand();
  const participants = useParticipants();

  if (raisedParticipants.length === 0) {
    return null;
  }

  const visibleRaised = raisedParticipants.slice(0, maxVisible);
  const remainingCount = Math.max(0, raisedParticipants.length - maxVisible);

  const getParticipantName = (identity: string) => {
    const participant = participants.find((p) => p.identity === identity);
    return participant?.name || participant?.identity || identity;
  };

  return (
    <div
      className={`lk-raised-hands-indicator ${className || ''}`}
      style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        backgroundColor: 'rgba(255, 99, 82, 0.9)',
        borderRadius: '8px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: 1000,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        maxWidth: '300px',
      }}
      {...props}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M13 1.07V9h7c0 4.08-3.06 7.44-7 7.93v2.81c0 .45-.54.67-.85.35L9.29 17.7a.996.996 0 0 0-1.41 0c-.39.39-.39 1.02 0 1.41l3.58 3.59c.39.39 1.02.39 1.41 0l3.58-3.59c.39-.39.39-1.02 0-1.41a.996.996 0 0 0-1.41 0l-1.58 1.58v-2.81c-3.94-.49-7-3.85-7-7.93h7V1.07c0-.59.51-1.07 1.14-1.07.63 0 1.14.48 1.14 1.07z"
          fill="currentColor"
        />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
          {raisedParticipants.length} Hand{raisedParticipants.length !== 1 ? 's' : ''} Raised
        </div>
        <div style={{ fontSize: '12px', opacity: 0.9 }}>
          {visibleRaised.map((identity) => getParticipantName(identity)).join(', ')}
          {remainingCount > 0 && ` +${remainingCount} more`}
        </div>
      </div>
    </div>
  );
}
