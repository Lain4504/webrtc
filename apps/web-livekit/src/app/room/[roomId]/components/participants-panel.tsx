import { useParticipants, useParticipantInfo, useTracks } from "@livekit/components-react";
import { ConnectionQuality, Track } from "livekit-client";

export default function ParticipantsPanel() {
  const participants = useParticipants();

  return (
    <div className="border-b border-slate-800 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Participants</h3>
        <span className="text-sm text-slate-400">{participants.length}</span>
      </div>
      <ul className="mt-3 space-y-2">
        {participants.map((p) => (
          <ParticipantItem key={p.identity} participant={p} />
        ))}
        {participants.length === 0 ? (
          <li className="text-sm text-slate-500">Waiting for others...</li>
        ) : null}
      </ul>
    </div>
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

  let connectionColor = "text-green-500";
  if (connectionQuality === ConnectionQuality.Poor) {
    connectionColor = "text-red-500";
  } else if (connectionQuality === ConnectionQuality.Excellent) {
    connectionColor = "text-green-500";
  }

  return (
    <li className="flex items-center justify-between rounded-md bg-slate-800/50 px-3 py-2 text-sm text-slate-200">
      <div className="flex items-center gap-2">
        <div title={`Connection: ${(ConnectionQuality as any)[connectionQuality]}`}>
          <svg className={`h-3 w-3 ${connectionColor}`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14h2v2h-2zm0-10h2v8h-2z" />
          </svg>
        </div>
        <span>{name || identity}</span>
        {role === "instructor" && (
          <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs">
            Instructor
          </span>
        )}
        {isSpeaking && (
          <span className="rounded-full bg-green-500 px-2 py-0.5 text-xs">
            Speaking
          </span>
        )}
        {handRaised && (
          <span className="flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400 border border-yellow-500/50">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11"
              />
            </svg>
            Hand Raised
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {audioTrack?.publication?.isMuted ? (
          <svg
            className="h-4 w-4 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a4 4 0 01-4-4V6a4 4 0 014-4v2a2 2 0 002 2h2a2 2 0 002-2v-.5M12 18V6"
            />
          </svg>
        ) : (
          <svg
            className="h-4 w-4 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a4 4 0 01-4-4V6a4 4 0 014-4v2a2 2 0 002 2h2a2 2 0 002-2v-.5"
            />
          </svg>
        )}
        {videoTrack?.publication?.isMuted ? (
          <svg
            className="h-4 w-4 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 12V6a2 2 0 012-2h4a2 2 0 012 2v6m-6 0h6m-6 0H6m6 0v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6m6 0H4"
            />
          </svg>
        ) : (
          <svg
            className="h-4 w-4 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 12V6a2 2 0 012-2h4a2 2 0 012 2v6m-6 0h6m-6 0H6m6 0v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6m6 0H4"
            />
          </svg>
        )}
      </div>
    </li>
  );
}
