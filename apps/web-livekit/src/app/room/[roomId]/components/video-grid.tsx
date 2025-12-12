"use client";

import {
  GridLayout,
  ParticipantTile,
  useTracks,
  TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import ParticipantVideoOverlay from "./participant-video-overlay";

export default function VideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <div className="h-full w-full relative">
      <GridLayout tracks={tracks} className="gap-4">
        <ParticipantTile className="rounded-2xl overflow-hidden shadow-cloud-md relative" />
      </GridLayout>
      
      {/* Overlays for reactions and hand raised - positioned absolutely based on participant tiles */}
      {tracks
        .filter((track) => track.participant && track.source === Track.Source.Camera)
        .map((track) => (
          <ParticipantVideoOverlay
            key={track.participant?.identity}
            participantIdentity={track.participant!.identity}
            participantName={track.participant!.name}
          />
        ))}
    </div>
  );
}
