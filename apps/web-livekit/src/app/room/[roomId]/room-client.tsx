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
import { Hand, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
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
import RecordingPanel from "./components/recording-panel";
import RecordingsList from "./components/recordings-list";

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
      <div className="flex min-h-screen items-center justify-center bg-white text-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Join room: {roomId}</CardTitle>
            <CardDescription>
              Enter your name and role to join the classroom.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display-name">Display name</Label>
              <Input
                id="display-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="instructor">Instructor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : null}
            <Button
              onClick={handleJoin}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Connecting..." : "Join Room"}
            </Button>
          </CardContent>
        </Card>
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
  const [activeTab, setActiveTab] = useState<"chat" | "polls" | "files" | "recordings">("chat");

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
      participant: { identity: string } | undefined,
      _kind: unknown,
      topic?: string,
    ) => {
      if (topic !== "participant-state") return;
      if (!participant || participant.identity !== localParticipant.identity) return;

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
    <div className="grid min-h-screen grid-cols-12 bg-white text-gray-900">
      <main className="col-span-12 lg:col-span-9 flex flex-col relative">
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 relative z-20 bg-white">
          <div>
            <p className="text-sm text-gray-600">LiveKit Classroom</p>
            <p className="text-lg font-semibold">Room</p>
          </div>
          <div className="flex items-center gap-3">
            <RecordingPanel role={role} />
            <Badge variant="outline">{statusText}</Badge>
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  onToggleWhiteboard();
                  setMenuOpen(false);
                }}>
                  Whiteboard {showWhiteboard ? "(hide)" : "(show)"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <section className="flex-1 overflow-hidden">
          {showWhiteboard ? <WhiteboardPanel role={role} /> : <VideoGrid />}
        </section>
        <footer className="border-t border-gray-200 px-4 py-3 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ControlBar variation="verbose" />
              <ReactionsPanel />
              <Button
                onClick={toggleHand}
                variant={isHandRaised ? "default" : "outline"}
                className={isHandRaised ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-300" : ""}
                title={isHandRaised ? "Lower Hand" : "Raise Hand"}
              >
                <Hand className="h-5 w-5" />
                <span className="hidden sm:inline">
                  {isHandRaised ? "Lower Hand" : "Raise Hand"}
                </span>
              </Button>
            </div>
            <ScreenShareButton />
          </div>
        </footer>
      </main>
      <aside className="col-span-12 lg:col-span-3 flex flex-col border-l border-gray-200 bg-gray-50">
        <ParticipantsPanel />
        <AttendancePanel />

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="polls">Polls</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="recordings">Recordings</TabsTrigger>
          </TabsList>
          <div className="flex-1 overflow-hidden">
            <TabsContent value="chat" className="h-full m-0">
              <ChatPanel />
            </TabsContent>
            <TabsContent value="polls" className="h-full m-0">
              <PollPanel />
            </TabsContent>
            <TabsContent value="files" className="h-full m-0">
              <FileSharingPanel />
            </TabsContent>
            <TabsContent value="recordings" className="h-full m-0">
              {room && <RecordingsList roomId={room.name} />}
            </TabsContent>
          </div>
        </Tabs>

        {/* Timer Panel at bottom */}
        <div className="border-t border-gray-200 p-2">
          <TimerPanel />
        </div>
      </aside>
    </div>
  );
}
