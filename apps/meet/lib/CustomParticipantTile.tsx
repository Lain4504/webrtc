'use client';

import * as React from 'react';
import { ParticipantTile } from '@livekit/components-react';
import type { ParticipantTileProps } from '@livekit/components-react';
import WhiteboardPanel from './WhiteboardPanel';

/**
 * Custom ParticipantTile wrapper that renders WhiteboardPanel for whiteboard tracks
 */
export function CustomParticipantTile(props: ParticipantTileProps) {
    // Check if this is a whiteboard track
    const isWhiteboardTrack = props.trackRef?.participant?.identity === 'whiteboard';

    if (isWhiteboardTrack) {
        return (
            <div className="lk-participant-tile" data-lk-source="whiteboard" style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <WhiteboardPanel />
                <div className="lk-participant-metadata" style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 10
                }}>
                    <div className="lk-participant-metadata-item">
                        <span className="lk-participant-name">Whiteboard</span>
                    </div>
                </div>
            </div>
        );
    }

    // Render normal participant tile for regular tracks
    return <ParticipantTile {...props} />;
}
