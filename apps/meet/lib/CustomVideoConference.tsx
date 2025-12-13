'use client';

import type {
  TrackReferenceOrPlaceholder,
  WidgetState,
} from '@livekit/components-react';
import { isTrackReference } from '@livekit/components-react';
import { isEqualTrackRef, isWeb } from './lk-utils';
import { RoomEvent, Track } from 'livekit-client';
import * as React from 'react';
import type { MessageFormatter, MessageDecoder, MessageEncoder } from '@livekit/components-react';
import {
  CarouselLayout,
  ConnectionStateToast,
  FocusLayout,
  FocusLayoutContainer,
  GridLayout,
  LayoutContextProvider,
  ParticipantTile,
  RoomAudioRenderer,
  useCreateLayoutContext,
  usePinnedTracks,
  useTracks,
  useRoomContext,
} from '@livekit/components-react';
import { ChatWithTabs } from './ChatWithTabs';
import { CustomControlBar } from './CustomControlBar';
import { CustomParticipantTile } from './CustomParticipantTile';
import { CustomFocusLayout } from './CustomFocusLayout';
import WhiteboardPanel from './WhiteboardPanel';


export interface CustomVideoConferenceProps extends React.HTMLAttributes<HTMLDivElement> {
  chatMessageFormatter?: MessageFormatter;
  chatMessageEncoder?: MessageEncoder;
  chatMessageDecoder?: MessageDecoder;
  SettingsComponent?: React.ComponentType;
  enablePolls?: boolean;
}

/**
 * Custom VideoConference component that extends the default VideoConference
 * with ChatWithTabs (chat + polls in tabs) instead of regular Chat
 */
export function CustomVideoConference({
  chatMessageFormatter,
  chatMessageDecoder,
  chatMessageEncoder,
  SettingsComponent,
  enablePolls = true,
  ...props
}: CustomVideoConferenceProps) {
  const [widgetState, setWidgetState] = React.useState<WidgetState>({
    showChat: false,
    unreadMessages: 0,
    showSettings: false,
  });
  const [showWhiteboard, setShowWhiteboard] = React.useState(false);
  const lastAutoFocusedScreenShareTrack = React.useRef<TrackReferenceOrPlaceholder | null>(null);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false },
  );

  const widgetUpdate = (state: WidgetState) => {
    console.debug('updating widget state', state);
    setWidgetState(state);
  };

  // Handle custom whiteboard toggle
  React.useEffect(() => {
    const handleWhiteboardToggle = (event: CustomEvent) => {
      if (event.detail?.msg === 'toggle_whiteboard') {
        setShowWhiteboard(prev => !prev);
      }
    };

    window.addEventListener('lk-widget-action' as any, handleWhiteboardToggle as any);
    return () => {
      window.removeEventListener('lk-widget-action' as any, handleWhiteboardToggle as any);
    };
  }, []);

  const room = useRoomContext();

  // **APPROACH 2: Track if whiteboard was open before screen share started**
  const whiteboardBeforeScreenShare = React.useRef(false);

  // Broadcast whiteboard state callback
  const broadcastWhiteboardState = React.useCallback((isOpen: boolean) => {
    if (!room) return;

    const encoder = new TextEncoder();
    const message = JSON.stringify({
      type: 'whiteboard-state',
      isOpen
    });
    const data = encoder.encode(message);

    room.localParticipant?.publishData(data, { reliable: true });
  }, [room]);

  // Sync whiteboard state across participants via data channel
  React.useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array, participant?: any) => {
      const decoder = new TextDecoder();
      const message = decoder.decode(payload);

      try {
        const data = JSON.parse(message);
        if (data.type === 'whiteboard-state') {
          setShowWhiteboard(data.isOpen);
        }
      } catch (e) {
        // Not a whiteboard state message, ignore
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room]);

  // Broadcast whiteboard state when it changes
  React.useEffect(() => {
    if (!room) return;

    const encoder = new TextEncoder();
    const message = JSON.stringify({
      type: 'whiteboard-state',
      isOpen: showWhiteboard
    });
    const data = encoder.encode(message);

    // Broadcast to all participants
    room.localParticipant?.publishData(data, { reliable: true });
  }, [showWhiteboard, room]);

  const layoutContext = useCreateLayoutContext();

  // Track whiteboard state - no longer creating virtual track
  const isWhiteboardFocused = React.useRef(false);

  React.useEffect(() => {
    if (showWhiteboard && !isWhiteboardFocused.current) {
      // Mark whiteboard as focused
      isWhiteboardFocused.current = true;
    } else if (!showWhiteboard) {
      isWhiteboardFocused.current = false;
    }
  }, [showWhiteboard]);

  // Use original tracks, no virtual track injection
  const screenShareTracks = tracks
    .filter(isTrackReference)
    .filter((track) => track.publication.source === Track.Source.ScreenShare);

  const focusTrack = usePinnedTracks(layoutContext)?.[0];
  const carouselTracks = tracks.filter((track) => !isEqualTrackRef(track, focusTrack));

  // Clear whiteboard focus when closed
  React.useEffect(() => {
    if (!showWhiteboard && isWhiteboardFocused.current) {
      isWhiteboardFocused.current = false;
    }
  }, [showWhiteboard]);

  React.useEffect(() => {
    // Priority: Screen share > Whiteboard
    // If screen share tracks are published, auto set the screen share
    if (
      screenShareTracks.some((track) => track.publication.isSubscribed) &&
      lastAutoFocusedScreenShareTrack.current === null
    ) {
      console.debug('Auto set screen share focus:', { newScreenShareTrack: screenShareTracks[0] });
      layoutContext.pin.dispatch?.({ msg: 'clear_pin' });
      layoutContext.pin.dispatch?.({ msg: 'set_pin', trackReference: screenShareTracks[0] });
      lastAutoFocusedScreenShareTrack.current = screenShareTracks[0];

      // **APPROACH 2: Auto-close whiteboard when screen share starts**
      if (showWhiteboard) {
        whiteboardBeforeScreenShare.current = true;
        setShowWhiteboard(false);
        broadcastWhiteboardState(false);
      }
    } else if (
      lastAutoFocusedScreenShareTrack.current &&
      !screenShareTracks.some(
        (track) =>
          track.publication.trackSid ===
          lastAutoFocusedScreenShareTrack.current?.publication?.trackSid,
      )
    ) {
      console.debug('Auto clearing screen share focus.');
      layoutContext.pin.dispatch?.({ msg: 'clear_pin' });
      lastAutoFocusedScreenShareTrack.current = null;

      // **APPROACH 2: Auto-resume whiteboard when screen share stops**
      if (whiteboardBeforeScreenShare.current) {
        setShowWhiteboard(true);
        broadcastWhiteboardState(true);
        whiteboardBeforeScreenShare.current = false;
      }
    }

    if (focusTrack && !isTrackReference(focusTrack)) {
      const updatedFocusTrack = tracks.find(
        (tr) =>
          tr.participant.identity === focusTrack.participant.identity &&
          tr.source === focusTrack.source,
      );
      if (updatedFocusTrack !== focusTrack && isTrackReference(updatedFocusTrack)) {
        layoutContext.pin.dispatch?.({ msg: 'set_pin', trackReference: updatedFocusTrack });
      }
    }
  }, [
    screenShareTracks
      .map((ref) => `${ref.publication.trackSid}_${ref.publication.isSubscribed}`)
      .join(),
    focusTrack?.publication?.trackSid,
    tracks,
    layoutContext,
    showWhiteboard,
    broadcastWhiteboardState,
  ]);

  // useWarnAboutMissingStyles(); // Not exported from package, skip for now

  return (
    <div className="lk-video-conference" {...props}>
      {isWeb() && (
        <LayoutContextProvider
          value={layoutContext}
          onWidgetChange={widgetUpdate}
        >
          <div className="lk-video-conference-inner">
            {!focusTrack && !showWhiteboard ? (
              <div className="lk-grid-layout-wrapper">
                <GridLayout tracks={tracks}>
                  <CustomParticipantTile />
                </GridLayout>
              </div>
            ) : !focusTrack && showWhiteboard ? (
              <div className="lk-focus-layout-wrapper">
                <FocusLayoutContainer>
                  <CarouselLayout tracks={carouselTracks}>
                    <CustomParticipantTile />
                  </CarouselLayout>
                  <div className="lk-focus-layout" style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <WhiteboardPanel />
                    <div className="lk-participant-metadata" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10 }}>
                      <div className="lk-participant-metadata-item">
                        <span className="lk-participant-name">Whiteboard</span>
                      </div>
                    </div>
                  </div>
                </FocusLayoutContainer>
              </div>
            ) : (
              <div className="lk-focus-layout-wrapper">
                <FocusLayoutContainer>
                  <CarouselLayout tracks={carouselTracks}>
                    <CustomParticipantTile />
                  </CarouselLayout>
                  {focusTrack && <CustomFocusLayout trackRef={focusTrack} />}
                </FocusLayoutContainer>
              </div>
            )}
            <CustomControlBar controls={{ chat: true, settings: !!SettingsComponent }} />
          </div>
          {/* Use ChatWithTabs instead of regular Chat */}
          <ChatWithTabs
            style={{ display: widgetState.showChat ? 'grid' : 'none' }}
            messageFormatter={chatMessageFormatter}
            messageEncoder={chatMessageEncoder}
            messageDecoder={chatMessageDecoder}
            enablePolls={enablePolls}
          />
          {SettingsComponent && (
            <div
              className="lk-settings-menu-modal"
              style={{ display: widgetState.showSettings ? 'block' : 'none' }}
            >
              <SettingsComponent />
            </div>
          )}
        </LayoutContextProvider>
      )}
      <RoomAudioRenderer />
      <ConnectionStateToast />
    </div>
  );
}
