import {
  GridLayout,
  ParticipantTile,
  useTracks,
  TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { Track } from "livekit-client";

export default function VideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <div className="h-full w-full bg-gray-100 p-2">
      <GridLayout tracks={tracks}>
        <ParticipantTile />
      </GridLayout>
    </div>
  );
}
