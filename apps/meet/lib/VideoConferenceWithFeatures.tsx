'use client';

import * as React from 'react';
import { ReactionsOverlay } from './Reactions';
import { RaisedHandsIndicator } from './RaisedHandsIndicator';
import { CustomVideoConference } from './CustomVideoConference';

// Re-export for convenience
export { RaiseHandButton, useRaiseHand } from './RaiseHand';
export { ReactionsButton, ReactionsOverlay } from './Reactions';
export { PollsButton, PollsPanel, usePolls } from './Polls';
export { RaisedHandsIndicator } from './RaisedHandsIndicator';

export interface VideoConferenceWithFeaturesProps extends React.ComponentProps<typeof CustomVideoConference> {
  enableRaiseHand?: boolean;
  enableReactions?: boolean;
  enablePolls?: boolean;
  enableWhiteboard?: boolean;
}

/**
 * VideoConferenceWithFeatures component that wraps CustomVideoConference
 * with additional features like reactions overlay and raised hands indicator.
 * 
 * Note: RaiseHand and Reactions buttons are now integrated into CustomControlBar,
 * so no portal injection is needed.
 */
export function VideoConferenceWithFeatures({
  enableRaiseHand = true,
  enableReactions = true,
  enablePolls = true,
  enableWhiteboard = true,
  ...videoConferenceProps
}: VideoConferenceWithFeaturesProps) {
  return (
    <div className="lk-video-conference-with-features" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <CustomVideoConference
        {...videoConferenceProps}
        enablePolls={enablePolls}
      />

      {/* Reactions Overlay */}
      {enableReactions && <ReactionsOverlay />}

      {/* Raised Hands Indicator */}
      {enableRaiseHand && <RaisedHandsIndicator />}
    </div>
  );
}

