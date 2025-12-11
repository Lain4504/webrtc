import { useParticipants } from "@livekit/components-react";

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
          <li
            key={p.identity}
            className="flex items-center justify-between rounded-md bg-slate-800/50 px-3 py-2 text-sm text-slate-200"
          >
            <span>{p.name || p.identity}</span>
            <span className="text-xs text-slate-400">{p.isSpeaking ? "Speaking" : ""}</span>
          </li>
        ))}
        {participants.length === 0 ? (
          <li className="text-sm text-slate-500">Waiting for others...</li>
        ) : null}
      </ul>
    </div>
  );
}
