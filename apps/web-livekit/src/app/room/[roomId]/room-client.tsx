"use client";

import { useMemo, useState, useEffect } from "react";
import {
  ControlBar,
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import { ConnectionState, RoomEvent } from "livekit-client";
import { BACKEND_URL, DEFAULT_WS_URL } from "@/lib/config";
import ChatPanel from "./components/chat-panel";
import ParticipantsPanel from "./components/participants-panel";
import ScreenShareButton from "./components/screen-share-button";
import VideoGrid from "./components/video-grid";
import WhiteboardPanel from "./components/whiteboard-panel";
import PollPanel from "./components/poll-panel";
import FileSharingPanel from "./components/file-sharing-panel";
import ReactionsPanel from "./components/reactions-panel";
import TimerPanel from "./components/timer-panel";
import AttendancePanel from "./components/attendance-panel";

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
      options={{
        dynacast: true,
        adaptiveStream: true,
      }}
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
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "polls" | "files" | "attendance">("chat");

  // Sync hand raised state from attributes and data channel
  useEffect(() => {
    if (!localParticipant || !room) return;

    const checkHandRaised = () => {
      const handRaised = localParticipant.attributes?.handRaised === "true";
      setIsHandRaised(handRaised);
    };

    // Check initial state from attributes
    checkHandRaised();

    // Listen to local participant attribute changes
    const handleAttributeChange = () => {
      checkHandRaised();
    };

    localParticipant.on("participantAttributesChanged" as any, handleAttributeChange);

    // Also listen to data channel as fallback
    const decoder = new TextDecoder();
    const handleDataReceived = (
      payload: Uint8Array,
      participant: { identity: string },
      _kind: unknown,
      topic?: string,
    ) => {
      if (topic !== "participant-state") return;
      if (participant.identity !== localParticipant.identity) return;

      try {
        const message = JSON.parse(decoder.decode(payload)) as {
          type: string;
          status: boolean;
          participantIdentity: string;
        };
        if (message.type === "handRaised" && message.participantIdentity === localParticipant.identity) {
          setIsHandRaised(message.status);
        }
      } catch (error) {
        console.warn("Failed to parse hand raised message", error);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);

    return () => {
      localParticipant.off("participantAttributesChanged" as any, handleAttributeChange);
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [localParticipant, room]);

  const toggleHand = async () => {
    if (!localParticipant || !room) return;
    const newStatus = !isHandRaised;
    
    // Update local state immediately for better UX
    setIsHandRaised(newStatus);
    
    try {
      // Try to update attributes first (preferred method)
      try {
        await localParticipant.setAttributes({
          handRaised: newStatus ? "true" : "",
        });
        console.log("Hand raised status updated via attributes:", newStatus);
      } catch (attrError) {
        // Fallback: use data channel if attributes don't work
        console.warn("Attributes update failed, using data channel fallback:", attrError);
        const encoder = new TextEncoder();
        const message = {
          type: "handRaised",
          status: newStatus,
          participantIdentity: localParticipant.identity,
          participantName: localParticipant.name || localParticipant.identity,
        };
        await localParticipant.publishData(
          encoder.encode(JSON.stringify(message)),
          { reliable: true, topic: "participant-state" },
        );
        console.log("Hand raised status updated via data channel:", newStatus);
      }
    } catch (error) {
      console.error("Failed to update hand raised status", error);
      // Revert state on error
      setIsHandRaised(!newStatus);
    }
  };

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ControlBar variation="verbose" />
              <ReactionsPanel />
              <button
                onClick={toggleHand}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isHandRaised
                    ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/50"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                }`}
                title={isHandRaised ? "Lower Hand" : "Raise Hand"}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0 0V11m0 0V11"
                  />
                </svg>
                <span className="hidden sm:inline">
                  {isHandRaised ? "Lower Hand" : "Raise Hand"}
                </span>
              </button>
            </div>
            <ScreenShareButton />
          </div>
        </footer>
      </main>
      <aside className="col-span-12 lg:col-span-3 flex flex-col border-l border-slate-800 bg-slate-900/50">
        <ParticipantsPanel />
        <AttendancePanel />
        
        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "chat"
                ? "bg-slate-800 text-white border-b-2 border-blue-500"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab("polls")}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "polls"
                ? "bg-slate-800 text-white border-b-2 border-blue-500"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            Polls
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "files"
                ? "bg-slate-800 text-white border-b-2 border-blue-500"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            Files
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "chat" && <ChatPanel />}
          {activeTab === "polls" && <PollPanel />}
          {activeTab === "files" && <FileSharingPanel />}
        </div>

        {/* Timer Panel at bottom */}
        <div className="border-t border-slate-800 p-2">
          <TimerPanel />
        </div>
      </aside>
    </div>
  );
}
