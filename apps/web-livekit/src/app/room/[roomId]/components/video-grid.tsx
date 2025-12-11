import { GridLayout, ParticipantTile, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";

export default function VideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: true },
    ],
    { onlySubscribed: false },
  );

  return (
    <div className="h-full w-full overflow-hidden bg-slate-900">
      <GridLayout className="h-full w-full" tracks={tracks}>
        {(track) => (
          <ParticipantTile
            key={`${track.participant.identity}-${track.source ?? "unknown"}`}
            trackRef={track}
          />
        )}
      </GridLayout>
    </div>
  );
}
