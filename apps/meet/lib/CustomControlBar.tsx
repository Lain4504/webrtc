'use client';

import { Track } from 'livekit-client';
import * as React from 'react';
import {
  DisconnectButton,
  TrackToggle,
  ChatToggle,
  useLocalParticipantPermissions,
  useMaybeLayoutContext,
  MediaDeviceMenu,
} from '@livekit/components-react';
import { supportsScreenSharing } from '@livekit/components-core';
import { RaiseHandButton } from './RaiseHand';
import { ReactionsButton } from './Reactions';

/** @public */
export type CustomControlBarControls = {
  microphone?: boolean;
  camera?: boolean;
  chat?: boolean;
  screenShare?: boolean;
  leave?: boolean;
  settings?: boolean;
  raiseHand?: boolean;
  reactions?: boolean;
  whiteboard?: boolean;
};

const trackSourceToProtocol = (source: Track.Source) => {
  // NOTE: this mapping avoids importing the protocol package as that leads to a significant bundle size increase
  switch (source) {
    case Track.Source.Camera:
      return 1;
    case Track.Source.Microphone:
      return 2;
    case Track.Source.ScreenShare:
      return 3;
    default:
      return 0;
  }
};

/** @public */
export interface CustomControlBarProps extends React.HTMLAttributes<HTMLDivElement> {
  onDeviceError?: (error: { source: Track.Source; error: Error }) => void;
  variation?: 'minimal' | 'verbose' | 'textOnly';
  controls?: CustomControlBarControls;
}

/**
 * Custom ControlBar component that extends LiveKit's ControlBar
 * with RaiseHand and Reactions buttons positioned before the Chat button.
 */
export function CustomControlBar({
  variation = 'verbose',
  controls,
  onDeviceError,
  className,
  ...props
}: CustomControlBarProps) {
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const layoutContext = useMaybeLayoutContext();

  React.useEffect(() => {
    if (layoutContext?.widget.state?.showChat !== undefined) {
      setIsChatOpen(layoutContext?.widget.state?.showChat);
    }
  }, [layoutContext?.widget.state?.showChat]);

  const visibleControls = { leave: true, ...controls };

  const localPermissions = useLocalParticipantPermissions();

  if (!localPermissions) {
    visibleControls.camera = false;
    visibleControls.chat = false;
    visibleControls.microphone = false;
    visibleControls.screenShare = false;
  } else {
    const canPublishSource = (source: Track.Source) => {
      return (
        localPermissions.canPublish &&
        (localPermissions.canPublishSources.length === 0 ||
          localPermissions.canPublishSources.includes(trackSourceToProtocol(source)))
      );
    };
    visibleControls.camera ??= canPublishSource(Track.Source.Camera);
    visibleControls.microphone ??= canPublishSource(Track.Source.Microphone);
    visibleControls.screenShare ??= canPublishSource(Track.Source.ScreenShare);
    visibleControls.chat ??= localPermissions.canPublishData && controls?.chat;
  }

  // Enable RaiseHand, Reactions, and Whiteboard by default
  visibleControls.raiseHand ??= controls?.raiseHand !== false;
  visibleControls.reactions ??= controls?.reactions !== false;
  visibleControls.whiteboard ??= controls?.whiteboard !== false;

  const showIcon = React.useMemo(
    () => variation === 'minimal' || variation === 'verbose',
    [variation],
  );
  const showText = React.useMemo(
    () => variation === 'textOnly' || variation === 'verbose',
    [variation],
  );

  const browserSupportsScreenSharing = supportsScreenSharing();

  const [isScreenShareEnabled, setIsScreenShareEnabled] = React.useState(false);

  const onScreenShareChange = React.useCallback(
    (enabled: boolean) => {
      setIsScreenShareEnabled(enabled);
    },
    [setIsScreenShareEnabled],
  );

  return (
    <div className={`lk-control-bar ${className || ''}`} {...props}>
      {visibleControls.microphone && (
        <div className="lk-button-group">
          <TrackToggle
            source={Track.Source.Microphone}
            showIcon={showIcon}
            onDeviceError={(error) => onDeviceError?.({ source: Track.Source.Microphone, error })}
          >
            {showText && 'Microphone'}
          </TrackToggle>
          <div className="lk-button-group-menu">
            <MediaDeviceMenu kind="audioinput" />
          </div>
        </div>
      )}
      {visibleControls.camera && (
        <div className="lk-button-group">
          <TrackToggle
            source={Track.Source.Camera}
            showIcon={showIcon}
            onDeviceError={(error) => onDeviceError?.({ source: Track.Source.Camera, error })}
          >
            {showText && 'Camera'}
          </TrackToggle>
          <div className="lk-button-group-menu">
            <MediaDeviceMenu kind="videoinput" />
          </div>
        </div>
      )}
      {visibleControls.screenShare && browserSupportsScreenSharing && (
        <TrackToggle
          source={Track.Source.ScreenShare}
          captureOptions={{ audio: true, selfBrowserSurface: 'include' }}
          showIcon={showIcon}
          onChange={onScreenShareChange}
          onDeviceError={(error) => onDeviceError?.({ source: Track.Source.ScreenShare, error })}
        >
          {showText && (isScreenShareEnabled ? 'Stop screen share' : 'Share screen')}
        </TrackToggle>
      )}
      {/* Custom buttons: RaiseHand, Reactions, and Whiteboard before Chat */}
      {visibleControls.raiseHand && <RaiseHandButton />}
      {visibleControls.reactions && <ReactionsButton />}
      {visibleControls.whiteboard && (
        <button
          className="lk-button lk-button-menu"
          onClick={() => {
            const event = new CustomEvent('lk-widget-action', {
              detail: { msg: 'toggle_whiteboard' }
            });
            window.dispatchEvent(event);
          }}
        >
          {showIcon && (
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3 3a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H3zm0 1h14a1 1 0 011 1v7H2V5a1 1 0 011-1zm14 11H3a1 1 0 01-1-1v-1h16v1a1 1 0 01-1 1z"
                fill="currentColor"
              />
            </svg>
          )}
          {showText && 'Whiteboard'}
        </button>
      )}
      {visibleControls.chat && (
        <ChatToggle>
          {showIcon && (
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3 4a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-3.586l-2.707 2.707a1 1 0 01-1.414 0L4.586 14H5a2 2 0 01-2-2V4zm2 0h10v8H5a1 1 0 00-.707.293L3 13.586V4z"
                fill="currentColor"
              />
            </svg>
          )}
          {showText && 'Chat'}
        </ChatToggle>
      )}
      {visibleControls.settings && layoutContext && (
        <button
          className="lk-button lk-button-menu"
          onClick={() => layoutContext.widget.dispatch?.({ msg: 'toggle_settings' })}
        >
          {showIcon && (
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                fill="currentColor"
              />
            </svg>
          )}
          {showText && 'Settings'}
        </button>
      )}
      {visibleControls.leave && (
        <DisconnectButton>
          {showIcon && (
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3 3a2 2 0 00-2 2v10a2 2 0 002 2h5.5a.5.5 0 000-1H3a1 1 0 01-1-1V5a1 1 0 011-1h5.5a.5.5 0 000-1H3zm11.646 4.146a.5.5 0 01.708 0l3 3a.5.5 0 010 .708l-3 3a.5.5 0 01-.708-.708L16.293 10.5H7.5a.5.5 0 010-1h8.793l-1.647-1.646a.5.5 0 010-.708z"
                fill="currentColor"
              />
            </svg>
          )}
          {showText && 'Leave'}
        </DisconnectButton>
      )}
    </div>
  );
}

