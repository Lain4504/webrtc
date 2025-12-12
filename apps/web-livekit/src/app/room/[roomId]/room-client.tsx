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
import { Hand, MoreVertical, Mic, MicOff, Video, VideoOff, Monitor, MessageSquare, Users, Settings, PhoneOff, Smile, X, Palette, FileText, AlertCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTrackToggle } from "@livekit/components-react";
import { Track } from "livekit-client";
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
import SettingsModal from "./components/settings-modal";
import RecordingOptionsModal from "./components/recording-options-modal";
import { useParticipants } from "@livekit/components-react";

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
      <div className="flex min-h-screen items-center justify-center bg-[hsl(215,20%,98%)] text-gray-900">
        <Card className="w-full max-w-md shadow-cloud-lg rounded-2xl border-gray-200">
          <CardHeader className="space-y-3">
            <CardTitle className="text-2xl font-semibold text-gray-900">
              Tham gia phòng: {roomId}
            </CardTitle>
            <CardDescription className="text-base text-gray-600">
              Nhập tên và vai trò của bạn để tham gia lớp học.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="display-name" className="text-sm font-medium text-gray-700">
                Tên hiển thị
              </Label>
              <Input
                id="display-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tên của bạn"
                className="h-11 rounded-xl border-gray-200 focus:border-[hsl(210,100%,60%)] focus:ring-[hsl(210,100%,60%)] transition-smooth"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-medium text-gray-700">
                Vai trò
              </Label>
              <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                <SelectTrigger id="role" className="h-11 rounded-xl border-gray-200 focus:border-[hsl(210,100%,60%)] focus:ring-[hsl(210,100%,60%)] transition-smooth">
                  <SelectValue placeholder="Chọn vai trò" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="student" className="rounded-lg">Học sinh</SelectItem>
                  <SelectItem value="instructor" className="rounded-lg">Giảng viên</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error ? (
              <p className="text-sm text-[hsl(0,65%,60%)] bg-[hsl(0,70%,97%)] px-3 py-2 rounded-lg">{error}</p>
            ) : null}
            <Button
              onClick={handleJoin}
              disabled={loading}
              className="w-full h-11 bg-[hsl(210,100%,60%)] hover:bg-[hsl(210,100%,55%)] text-white rounded-xl shadow-cloud-md transition-smooth font-medium disabled:opacity-50"
            >
              {loading ? "Đang kết nối..." : "Tham gia phòng"}
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
  const participants = useParticipants();
  const { enabled: micEnabled, toggle: toggleMic, pending: micPending } = useTrackToggle({
    source: Track.Source.Microphone,
  });
  const { enabled: camEnabled, toggle: toggleCam, pending: camPending } = useTrackToggle({
    source: Track.Source.Camera,
  });
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [recordingOptionsOpen, setRecordingOptionsOpen] = useState(false);
  const [currentEgressId, setCurrentEgressId] = useState<string | null>(null);


  // Track hand raised state for ALL participants (including remote ones)
  const [participantsHandRaised, setParticipantsHandRaised] = useState<Set<string>>(new Set());

  // Listen for hand raised messages from ALL participants
  useEffect(() => {
    if (!room) return;

    const decoder = new TextDecoder();
    const handleDataReceived = (
      payload: Uint8Array,
      participant: { identity: string; name?: string } | undefined,
      _kind: unknown,
      topic?: string,
    ) => {
      if (topic !== "participant-state") return;
      if (!participant) return;

      try {
        const message = JSON.parse(decoder.decode(payload)) as {
          type: string;
          status: boolean;
          participantIdentity: string;
        };
        
        if (message.type === "handRaised") {
          setParticipantsHandRaised((prev) => {
            const newSet = new Set(prev);
            if (message.status) {
              newSet.add(message.participantIdentity);
            } else {
              newSet.delete(message.participantIdentity);
            }
            return newSet;
          });

          // Update local state if it's from current user
          if (message.participantIdentity === localParticipant?.identity) {
            setIsHandRaised(message.status);
          }
        }
      } catch (error) {
        console.warn("Failed to parse participant state message", error);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, localParticipant]);

  // Sync local hand raised state
  useEffect(() => {
    if (!localParticipant) return;
    const isRaised = participantsHandRaised.has(localParticipant.identity);
    if (isRaised !== isHandRaised) {
      setIsHandRaised(isRaised);
    }
  }, [participantsHandRaised, localParticipant, isHandRaised]);

  const toggleHand = async () => {
    if (!localParticipant || !room) return;
    const newStatus = !isHandRaised;

    // Update local state immediately for better UX
    setIsHandRaised(newStatus);

    try {
      // Use data channel to broadcast hand raised status to all participants
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
      
      // Update participants state
      setParticipantsHandRaised((prev) => {
        const newSet = new Set(prev);
        if (newStatus) {
          newSet.add(localParticipant.identity);
        } else {
          newSet.delete(localParticipant.identity);
        }
        return newSet;
      });
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

  const currentTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  const roomId = room?.name || "";

  const handleLeave = () => {
    if (room) {
      room.disconnect();
    }
    window.location.href = "/";
  };

  // Handler for Participants button - toggle participants, close chat if open
  const handleParticipantsClick = () => {
    if (participantsOpen) {
      // If participants is open, close it
      setParticipantsOpen(false);
    } else {
      // If participants is closed, open it and close chat if open
      setParticipantsOpen(true);
      if (chatOpen) {
        setChatOpen(false);
      }
    }
  };

  // Handler for Chat button - toggle chat, close participants if open
  const handleChatClick = () => {
    if (chatOpen) {
      // If chat is open, close it
      setChatOpen(false);
    } else {
      // If chat is closed, open it and close participants if open
      setChatOpen(true);
      if (participantsOpen) {
        setParticipantsOpen(false);
      }
    }
  };

  const isPanelOpen = chatOpen || participantsOpen;

  return (
    <div className="flex flex-col h-screen bg-[hsl(215,20%,98%)] text-gray-900">
      {/* Main Video Area with Side Panel */}
      <main className="flex-1 flex overflow-hidden min-h-0">
        {/* Video Grid - takes remaining space when panel is open */}
        <div className={`flex-1 flex items-center justify-center p-4 transition-all duration-300 ${isPanelOpen ? "" : ""}`}>
          <div className="w-full h-full rounded-2xl overflow-hidden">
            {showWhiteboard ? <WhiteboardPanel role={role} /> : <VideoGrid />}
          </div>
        </div>


        {/* Chat Panel - slides in from right when open */}
        {chatOpen && (
          <aside className="w-full sm:w-96 border-l border-gray-200 bg-white flex flex-col shadow-cloud-lg animate-in slide-in-from-right duration-300 sm:rounded-l-2xl">
            <div className="px-6 pt-6 pb-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-semibold text-gray-900">Tin nhắn</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 hover:bg-gray-100 rounded-xl transition-smooth"
                onClick={() => setChatOpen(false)}
              >
                <X className="h-5 w-5 text-gray-600" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <Tabs defaultValue="chat" className="flex flex-col h-full">
                <TabsList className="mx-6 mt-4 mb-4 bg-[hsl(215,18%,95%)] p-1.5 rounded-xl flex-shrink-0">
                  <TabsTrigger value="chat" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-cloud-sm data-[state=active]:text-[hsl(210,100%,60%)] font-medium transition-smooth">Chat</TabsTrigger>
                  <TabsTrigger value="filesharing" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-cloud-sm data-[state=active]:text-[hsl(210,100%,60%)] font-medium transition-smooth">File Sharing</TabsTrigger>
                  <TabsTrigger value="poll" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-cloud-sm data-[state=active]:text-[hsl(210,100%,60%)] font-medium transition-smooth">Poll</TabsTrigger>
                </TabsList>
                <TabsContent value="chat" className="flex-1 overflow-hidden flex flex-col px-6 pb-6 mt-0 min-h-0">
                  <ChatPanel />
                </TabsContent>
                <TabsContent value="filesharing" className="flex-1 overflow-y-auto scrollbar-thin px-6 pb-6 mt-0 min-h-0">
                  <FileSharingPanel />
                </TabsContent>
                <TabsContent value="poll" className="flex-1 overflow-y-auto scrollbar-thin px-6 pb-6 mt-0 min-h-0">
                  <div className="space-y-4">
                    <PollPanel />
                    <TimerPanel />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </aside>
        )}


        {/* Participants Panel - slides in from right when open */}
        {participantsOpen && (
          <aside className="w-full sm:w-96 border-l border-gray-200 bg-white flex flex-col shadow-cloud-lg animate-in slide-in-from-right duration-300 sm:rounded-l-2xl">
            <div className="px-6 pt-6 pb-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-semibold text-gray-900">Mọi người</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 hover:bg-gray-100 rounded-xl transition-smooth"
                onClick={() => setParticipantsOpen(false)}
              >
                <X className="h-5 w-5 text-gray-600" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col px-6 pb-6 pt-4 min-h-0">
              <ParticipantsPanel />
            </div>
          </aside>
        )}
      </main>

      {/* Bottom Toolbar - Frosted Glass */}
      <footer className="flex-shrink-0 glass-frosted border-t border-gray-200 shadow-cloud-lg">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 max-w-full">
          {/* Left: Status Info */}
          <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
            <span className="font-medium">{currentTime}</span>
            <span className="text-gray-400">•</span>
            <span className="font-medium truncate max-w-[120px] sm:max-w-none">{roomId}</span>
          </div>

          {/* Center: Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Microphone Control with Device Selection */}
            <div className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`rounded-l-full h-11 w-7 sm:h-12 sm:w-8 transition-smooth shadow-cloud-sm ${micEnabled === false
                      ? "bg-[hsl(0,70%,97%)] text-[hsl(0,65%,60%)] hover:bg-[hsl(0,70%,92%)] border border-[hsl(0,70%,92%)]"
                      : "bg-white/80 hover:bg-white text-gray-700"
                      }`}
                    title="Chọn microphone"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-80 rounded-2xl shadow-cloud-lg p-4 bg-white border-gray-200">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-900">Microphone</div>
                      <Button
                        onClick={() => toggleMic?.()}
                        size="sm"
                        variant="ghost"
                        className="h-8 px-3 text-xs rounded-lg hover:bg-[hsl(215,18%,95%)]"
                      >
                        {micEnabled === false ? "Bật" : "Tắt"}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <DropdownMenuItem className="rounded-xl px-3 py-2.5 hover:bg-[hsl(215,18%,95%)] cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="h-5 w-5 rounded-full border-2 border-[hsl(210,100%,60%)] flex items-center justify-center flex-shrink-0">
                            <div className="h-2.5 w-2.5 rounded-full bg-[hsl(210,100%,60%)]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">Microphone Array</div>
                            <div className="text-xs text-gray-500">Intel® Smart Sound Technology</div>
                          </div>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="rounded-xl px-3 py-2.5 hover:bg-[hsl(215,18%,95%)] cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="h-5 w-5 rounded-full border-2 border-gray-300 flex items-center justify-center flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">Default Microphone</div>
                            <div className="text-xs text-gray-500">System Default</div>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    </div>
                    <div className="h-px bg-gray-200" />
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">Khử tiếng ồn</span>
                      <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-[hsl(210,100%,60%)] focus:ring-[hsl(210,100%,60%)]" />
                    </label>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                onClick={() => toggleMic?.()}
                disabled={micPending}
                variant="ghost"
                size="icon"
                className={`rounded-r-full h-11 w-11 sm:h-12 sm:w-12 transition-smooth shadow-cloud-sm border-l border-gray-300 ${micEnabled === false
                  ? "bg-[hsl(0,70%,97%)] text-[hsl(0,65%,60%)] hover:bg-[hsl(0,70%,92%)] border border-[hsl(0,70%,92%)]"
                  : "bg-white/80 hover:bg-white text-gray-700"
                  }`}
                title={micEnabled === false ? "Bật tiếng" : "Tắt tiếng"}
              >
                {micEnabled === false ? <MicOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Mic className="h-5 w-5 sm:h-6 sm:w-6" />}
              </Button>
            </div>

            {/* Camera Control with Device Selection */}
            <div className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`rounded-l-full h-11 w-7 sm:h-12 sm:w-8 transition-smooth shadow-cloud-sm ${camEnabled === false
                      ? "bg-[hsl(0,70%,97%)] text-[hsl(0,65%,60%)] hover:bg-[hsl(0,70%,92%)] border border-[hsl(0,70%,92%)]"
                      : "bg-white/80 hover:bg-white text-gray-700"
                      }`}
                    title="Chọn camera"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-80 rounded-2xl shadow-cloud-lg p-4 bg-white border-gray-200">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-900">Camera</div>
                      <Button
                        onClick={() => toggleCam?.()}
                        size="sm"
                        variant="ghost"
                        className="h-8 px-3 text-xs rounded-lg hover:bg-[hsl(215,18%,95%)]"
                      >
                        {camEnabled === false ? "Bật" : "Tắt"}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <DropdownMenuItem className="rounded-xl px-3 py-2.5 hover:bg-[hsl(215,18%,95%)] cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="h-5 w-5 rounded-full border-2 border-[hsl(210,100%,60%)] flex items-center justify-center flex-shrink-0">
                            <div className="h-2.5 w-2.5 rounded-full bg-[hsl(210,100%,60%)]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">Integrated Camera</div>
                            <div className="text-xs text-gray-500">Built-in Webcam</div>
                          </div>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="rounded-xl px-3 py-2.5 hover:bg-[hsl(215,18%,95%)] cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="h-5 w-5 rounded-full border-2 border-gray-300 flex items-center justify-center flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">External USB Camera</div>
                            <div className="text-xs text-gray-500">HD Webcam</div>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                onClick={() => toggleCam?.()}
                disabled={camPending}
                variant="ghost"
                size="icon"
                className={`rounded-r-full h-11 w-11 sm:h-12 sm:w-12 transition-smooth shadow-cloud-sm border-l border-gray-300 ${camEnabled === false
                  ? "bg-[hsl(0,70%,97%)] text-[hsl(0,65%,60%)] hover:bg-[hsl(0,70%,92%)] border border-[hsl(0,70%,92%)]"
                  : "bg-white/80 hover:bg-white text-gray-700"
                  }`}
                title={camEnabled === false ? "Bật camera" : "Tắt camera"}
              >
                {camEnabled === false ? <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Video className="h-5 w-5 sm:h-6 sm:w-6" />}
              </Button>
            </div>

            {/* Screen Share */}
            <ScreenShareButton />

            {/* Reactions */}
            <ReactionsPanel />


            {/* Raise Hand */}
            <Button
              onClick={toggleHand}
              variant={isHandRaised ? "default" : "ghost"}
              size="icon"
              className={`rounded-full h-11 w-11 sm:h-12 sm:w-12 transition-smooth shadow-cloud-sm ${isHandRaised
                ? "bg-[hsl(40,95%,97%)] text-[hsl(40,90%,45%)] hover:bg-[hsl(40,95%,92%)] border border-[hsl(40,95%,92%)]"
                : "bg-white/80 hover:bg-white"
                }`}
              title={isHandRaised ? "Hạ tay" : "Giơ tay"}
            >
              <Hand className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>

            {/* Participants */}
            <div className="relative">
              <Button
                variant={participantsOpen ? "default" : "ghost"}
                size="icon"
                className={`rounded-full h-11 w-11 sm:h-12 sm:w-12 transition-smooth shadow-cloud-sm ${participantsOpen
                  ? "bg-[hsl(210,100%,60%)] text-white hover:bg-[hsl(210,100%,55%)]"
                  : "bg-white/80 hover:bg-white"
                  }`}
                onClick={handleParticipantsClick}
                title="Người tham gia"
              >
                <Users className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
              {participants.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center p-0 text-xs bg-gray-700 text-white rounded-full shadow-cloud-sm">
                  {participants.length}
                </Badge>
              )}
            </div>

            {/* Chat */}
            <Button
              variant={chatOpen ? "default" : "ghost"}
              size="icon"
              className={`rounded-full h-11 w-11 sm:h-12 sm:w-12 transition-smooth shadow-cloud-sm ${chatOpen
                ? "bg-[hsl(210,100%,60%)] text-white hover:bg-[hsl(210,100%,55%)]"
                : "bg-white/80 hover:bg-white"
                }`}
              onClick={handleChatClick}
              title="Chat"
            >
              <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>

            {/* More Options */}
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-11 w-11 sm:h-12 sm:w-12 bg-white/80 hover:bg-white transition-smooth shadow-cloud-sm" title="Thêm tùy chọn">
                  <MoreVertical className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-2xl shadow-cloud-lg p-2 bg-white text-gray-900 border-gray-200">
                <DropdownMenuItem className="rounded-lg px-3 py-2.5 hover:bg-[hsl(215,18%,95%)] focus:bg-[hsl(215,18%,95%)] cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Monitor className="h-5 w-5" />
                    <span>Quản lý hoạt động phát trực tuyến</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setRecordingOptionsOpen(true);
                    setMenuOpen(false);
                  }}
                  className="rounded-lg px-3 py-2.5 hover:bg-[hsl(215,18%,95%)] focus:bg-[hsl(215,18%,95%)] cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full border-2 border-gray-900" />
                    </div>
                    <span>Quay record</span>
                  </div>
                </DropdownMenuItem>
                <div className="h-px bg-gray-200 my-2" />
                <DropdownMenuItem className="rounded-lg px-3 py-2.5 hover:bg-[hsl(215,18%,95%)] focus:bg-[hsl(215,18%,95%)] cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 flex items-center justify-center">
                      <div className="grid grid-cols-2 gap-0.5">
                        <div className="w-1.5 h-1.5 bg-gray-900 rounded-sm" />
                        <div className="w-1.5 h-1.5 bg-gray-900 rounded-sm" />
                        <div className="w-1.5 h-1.5 bg-gray-900 rounded-sm" />
                        <div className="w-1.5 h-1.5 bg-gray-900 rounded-sm" />
                      </div>
                    </div>
                    <span>Điều chỉnh chế độ xem</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg px-3 py-2.5 hover:bg-[hsl(215,18%,95%)] focus:bg-[hsl(215,18%,95%)] cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 flex items-center justify-center">
                      <div className="border-2 border-gray-900 w-4 h-4 rounded" />
                    </div>
                    <span>Toàn màn hình</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    onToggleWhiteboard();
                    setMenuOpen(false);
                  }}
                  className="rounded-lg px-3 py-2.5 hover:bg-[hsl(215,18%,95%)] focus:bg-[hsl(215,18%,95%)] cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 flex items-center justify-center">
                      <div className="border-2 border-gray-900 w-4 h-3 rounded-sm" />
                    </div>
                    <span>Mở hình trong hình</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg px-3 py-2.5 hover:bg-[hsl(215,18%,95%)] focus:bg-[hsl(215,18%,95%)] cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Palette className="h-5 w-5" />
                    <span>Nền và hiệu ứng</span>
                  </div>
                </DropdownMenuItem>
                <div className="h-px bg-gray-200 my-2" />
                <DropdownMenuItem className="rounded-lg px-3 py-2.5 hover:bg-[hsl(215,18%,95%)] focus:bg-[hsl(215,18%,95%)] cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5" />
                    <span>Báo cáo sự cố</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg px-3 py-2.5 hover:bg-[hsl(215,18%,95%)] focus:bg-[hsl(215,18%,95%)] cursor-pointer">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5" />
                    <span>Báo vi phạm</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg px-3 py-2.5 hover:bg-[hsl(215,18%,95%)] focus:bg-[hsl(215,18%,95%)] cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Search className="h-5 w-5" />
                    <span>Khắc phục sự cố và trợ giúp</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSettingsOpen(true);
                    setMenuOpen(false);
                  }}
                  className="rounded-lg px-3 py-2.5 hover:bg-[hsl(215,18%,95%)] focus:bg-[hsl(215,18%,95%)] cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Settings className="h-5 w-5" />
                    <span>Cài đặt</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* End Call */}
            <Button
              variant="destructive"
              size="icon"
              className="rounded-full h-11 w-11 sm:h-12 sm:w-12 ml-1 sm:ml-2 bg-[hsl(0,65%,60%)] hover:bg-[hsl(0,70%,50%)] transition-smooth shadow-cloud-sm text-white"
              onClick={handleLeave}
              title="Rời cuộc gọi"
            >
              <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </div>

          {/* Right: Empty space for balance */}
          <div className="min-w-[120px] sm:min-w-[150px]" />
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      
      {/* Recording Options Modal */}
      <RecordingOptionsModal
        open={recordingOptionsOpen}
        onOpenChange={setRecordingOptionsOpen}
        onRecordingStarted={(egressId) => {
          setCurrentEgressId(egressId);
        }}
      />
    </div >
  );
}
