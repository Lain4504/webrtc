import { useParticipants, useParticipantInfo, useTracks } from "@livekit/components-react";
import { ConnectionQuality, Track } from "livekit-client";
import { Hand, Mic, MicOff, Video, VideoOff, Wifi, WifiOff, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ParticipantsPanel() {
  const participants = useParticipants();

  return (
    <Card className="border-b border-gray-200 rounded-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Participants</CardTitle>
          <Badge variant="secondary">{participants.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {participants.map((p) => (
          <ParticipantItem key={p.identity} participant={p} />
        ))}
        {participants.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-2">Waiting for others...</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface ParticipantItemProps {
  participant: ReturnType<typeof useParticipants>[number];
}

function ParticipantItem({ participant }: ParticipantItemProps) {
  const { identity, name, isSpeaking, connectionQuality, attributes } = participant;
  const { metadata } = useParticipantInfo({ participant });

  const handRaised = attributes?.handRaised === "true";

  const audioTrack = useTracks(
    [Track.Source.Microphone],
    { onlySubscribed: false },
  ).find((t) => t.participant.identity === participant.identity);
  const videoTrack = useTracks(
    [Track.Source.Camera],
    { onlySubscribed: false },
  ).find((t) => t.participant.identity === participant.identity);

  const role = metadata ? JSON.parse(metadata)?.role : "student";

  let ConnectionIcon = Wifi;
  let connectionColor = "text-green-600";
  if (connectionQuality === ConnectionQuality.Poor) {
    ConnectionIcon = WifiOff;
    connectionColor = "text-red-600";
  } else if (connectionQuality === ConnectionQuality.Excellent) {
    ConnectionIcon = Wifi;
    connectionColor = "text-green-600";
  }

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div title={`Connection: ${(ConnectionQuality as any)[connectionQuality]}`}>
            {connectionQuality === ConnectionQuality.Poor ? (
              <AlertCircle className={`h-3 w-3 ${connectionColor}`} />
            ) : (
              <ConnectionIcon className={`h-3 w-3 ${connectionColor}`} />
            )}
          </div>
          <span className="text-sm">{name || identity}</span>
          {role === "instructor" && (
            <Badge variant="default" className="bg-blue-100 text-blue-700">Instructor</Badge>
          )}
          {isSpeaking && (
            <Badge variant="default" className="bg-green-100 text-green-700">Speaking</Badge>
          )}
          {handRaised && (
            <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
              <Hand className="h-3 w-3 mr-1" />
              Hand Raised
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {audioTrack?.publication?.isMuted ? (
            <MicOff className="h-4 w-4 text-red-600" />
          ) : (
            <Mic className="h-4 w-4 text-green-600" />
          )}
          {videoTrack?.publication?.isMuted ? (
            <VideoOff className="h-4 w-4 text-red-600" />
          ) : (
            <Video className="h-4 w-4 text-green-600" />
          )}
        </div>
      </div>
    </Card>
  );
}
