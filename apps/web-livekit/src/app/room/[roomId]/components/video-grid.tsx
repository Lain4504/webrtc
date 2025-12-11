import {
  FocusLayout,
  ParticipantTile,
  useTracks,
  TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { Track } from "livekit-client";

export default function VideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.ScreenShare, withPlaceholder: true },
      { source: Track.Source.Camera, withPlaceholder: true },
    ],
    { onlySubscribed: false },
  );

  const screenTracks = tracks.filter((t) => t.source === Track.Source.ScreenShare);
  const cameraTracks = tracks.filter((t) => t.source !== Track.Source.ScreenShare);

  return (
    <div className="h-full w-full overflow-hidden bg-slate-900">
      {screenTracks.length > 0 ? (
        <FocusLayout
          trackRef={screenTracks[0]}
          className="h-full w-full"
        >
          {cameraTracks.map((track) => (
            <ParticipantTile
              key={`${track.participant.identity}-${track.source ?? "cam"}`}
              trackRef={track}
            />
          ))}
        </FocusLayout>
      ) : (
        <div className="grid h-full w-full grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 p-2">
          {tracks.map((track: TrackReferenceOrPlaceholder) => (
            <ParticipantTile
              key={`${track.participant.identity}-${track.source ?? "unknown"}`}
              trackRef={track}
            />
          ))}
        </div>
      )}
    </div>
  );
}
