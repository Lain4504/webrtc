"use client";

import { useMemo, useState } from "react";
import {
  ControlBar,
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { BACKEND_URL, DEFAULT_WS_URL } from "@/lib/config";
import ChatPanel from "./components/chat-panel";
import ParticipantsPanel from "./components/participants-panel";
import VideoGrid from "./components/video-grid";
import WhiteboardPanel from "./components/whiteboard-panel";

type Role = "instructor" | "student";

interface TokenResponse {
  token: string;
  wsUrl: string;
}

interface RoomClientProps {
  roomId: string;
}

function randomIdentity() {
  return `user-${Math.random().toString(36).slice(2, 8)}`;
}

export default function RoomClient({ roomId }: RoomClientProps) {
  const [name, setName] = useState("Guest");
  const [identity] = useState(() => randomIdentity());
  const [role, setRole] = useState<Role>("student");
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const backendUrl = useMemo(() => BACKEND_URL.replace(/\/$/, ""), []);

  const handleJoin = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetch(`${backendUrl}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roomId }),
      });

      const res = await fetch(`${backendUrl}/rooms/${roomId}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantName: name || "Guest",
          participantIdentity: identity,
          role,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch token (${res.status})`);
      }

      const data = (await res.json()) as TokenResponse;
      setTokenData({
        token: data.token,
        wsUrl: data.wsUrl || DEFAULT_WS_URL,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to join room");
    } finally {
      setLoading(false);
    }
  };

  if (!tokenData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <h1 className="text-2xl font-semibold">Join room: {roomId}</h1>
          <p className="mt-2 text-sm text-slate-400">
            Enter your name and role to join the classroom.
          </p>
          <div className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-slate-200">
              Display name
              <input
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-400"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </label>
            <label className="block text-sm font-medium text-slate-200">
              Role
              <select
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-400"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
              </select>
            </label>
          </div>
          {error ? (
            <p className="mt-3 text-sm text-red-400">{error}</p>
          ) : null}
          <button
            onClick={handleJoin}
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center rounded-md bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-600 disabled:opacity-70"
          >
            {loading ? "Connecting..." : "Join Room"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video
      audio
      token={tokenData.token}
      serverUrl={tokenData.wsUrl}
      connect
      dataChannel
    >
      <RoomAudioRenderer />
      <InRoomLayout
        showWhiteboard={showWhiteboard}
        onToggleWhiteboard={() => setShowWhiteboard((v) => !v)}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        role={role}
      />
    </LiveKitRoom>
  );
}

function InRoomLayout({
  showWhiteboard,
  onToggleWhiteboard,
  menuOpen,
  setMenuOpen,
  role,
}: {
  showWhiteboard: boolean;
  onToggleWhiteboard: () => void;
  menuOpen: boolean;
  setMenuOpen: (val: boolean) => void;
  role: Role;
}) {
  const connectionState = useConnectionState();

  const statusText =
    connectionState === ConnectionState.Connected
      ? "Connected"
      : connectionState === ConnectionState.Connecting
        ? "Connecting..."
        : "Disconnected";

  return (
    <div className="grid min-h-screen grid-cols-12 bg-slate-950 text-white">
      <main className="col-span-12 lg:col-span-9 flex flex-col relative">
        <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3 relative z-20 bg-slate-950">
          <div>
            <p className="text-sm text-slate-400">LiveKit Classroom</p>
            <p className="text-lg font-semibold">Room</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{statusText}</span>
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-lg"
                title="More"
              >
                ⋯
              </button>
              {menuOpen ? (
                <div className="absolute right-0 mt-2 w-44 rounded-lg border border-slate-700 bg-slate-800/90 p-2 shadow-lg z-30">
                  <button
                    onClick={() => {
                      onToggleWhiteboard();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-white hover:bg-slate-700"
                  >
                    Whiteboard {showWhiteboard ? "(hide)" : "(show)"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <section className="flex-1 overflow-hidden">
          {showWhiteboard ? <WhiteboardPanel role={role} /> : <VideoGrid />}
        </section>
        <footer className="border-t border-slate-800 px-4 py-3">
          <ControlBar variation="verbose" />
        </footer>
      </main>
      <aside className="col-span-12 lg:col-span-3 flex flex-col border-l border-slate-800 bg-slate-900/50">
        <ParticipantsPanel />
        <ChatPanel />
      </aside>
    </div>
  );
}
