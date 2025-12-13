'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { VideoConference } from '@livekit/components-react';
import { ReactionsOverlay } from './Reactions';
import { RaiseHandButton } from './RaiseHand';
import { ReactionsButton } from './Reactions';
import { PollsButton, PollsPanel } from './Polls';
import { RaisedHandsIndicator } from './RaisedHandsIndicator';

// Re-export for convenience
export { RaiseHandButton, useRaiseHand } from './RaiseHand';
export { ReactionsButton, ReactionsOverlay } from './Reactions';
export { PollsButton, PollsPanel, usePolls } from './Polls';
export { RaisedHandsIndicator } from './RaisedHandsIndicator';

export interface VideoConferenceWithFeaturesProps extends React.ComponentProps<typeof VideoConference> {
  enableRaiseHand?: boolean;
  enableReactions?: boolean;
  enablePolls?: boolean;
}

export function VideoConferenceWithFeatures({
  enableRaiseHand = true,
  enableReactions = true,
  enablePolls = true,
  ...videoConferenceProps
}: VideoConferenceWithFeaturesProps) {
  const [showPolls, setShowPolls] = React.useState(false);
  const [controlBarElement, setControlBarElement] = React.useState<HTMLElement | null>(null);

  // Find and observe the control bar
  React.useEffect(() => {
    const findControlBar = () => {
      const controlBar = document.querySelector('.lk-control-bar') as HTMLElement;
      if (controlBar && controlBar !== controlBarElement) {
        setControlBarElement(controlBar);
      }
    };

    // Try immediately
    findControlBar();

    // Try with intervals
    const interval = setInterval(findControlBar, 500);

    // Also use MutationObserver for more responsive updates
    const observer = new MutationObserver(findControlBar);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, [controlBarElement]);

  // Create container for custom buttons
  React.useEffect(() => {
    if (!controlBarElement) return;

    let container = controlBarElement.querySelector('.lk-custom-buttons-wrapper') as HTMLElement;

    if (!container) {
      container = document.createElement('div');
      container.className = 'lk-custom-buttons-wrapper';
      container.style.cssText = `
        display: flex;
        gap: 8px;
        align-items: center;
        margin-right: auto;
      `;

      // Find a good insertion point - usually before leave button
      const leaveButton = controlBarElement.querySelector(
        '.lk-button[aria-label*="Leave"], .lk-button[title*="Leave"], .lk-button[aria-label*="leave"], .lk-button[title*="leave"]',
      );

      if (leaveButton && leaveButton.parentNode) {
        // Insert before leave button
        leaveButton.parentNode.insertBefore(container, leaveButton);
      } else {
        // Insert at the start if no leave button found
        controlBarElement.insertBefore(container, controlBarElement.firstChild);
      }
    }
  }, [controlBarElement]);

  const buttonsContainer = controlBarElement?.querySelector('.lk-custom-buttons-wrapper');

  return (
    <>
      <div className="lk-video-conference-with-features" style={{ position: 'relative', width: '100%', height: '100%' }}>
        <VideoConference {...videoConferenceProps} />

        {/* Reactions Overlay */}
        {enableReactions && <ReactionsOverlay />}

        {/* Raised Hands Indicator */}
        {enableRaiseHand && <RaisedHandsIndicator />}

        {/* Custom Control Bar Buttons */}
        {buttonsContainer &&
          createPortal(
            <>
              {enableRaiseHand && <RaiseHandButton />}
              {enableReactions && <ReactionsButton />}
              {enablePolls && <PollsButton onOpenPolls={() => setShowPolls(true)} />}
            </>,
            buttonsContainer,
          )}
      </div>

      {/* Polls Panel Modal */}
      {showPolls && enablePolls && (
        <div
          className="lk-polls-panel-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPolls(false);
            }
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              maxHeight: '80vh',
              width: '90%',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <PollsPanel onClose={() => setShowPolls(false)} />
          </div>
        </div>
      )}
    </>
  );
}
