import { useState, useMemo, useEffect } from "react";
import { useParticipants, useParticipantInfo, useTracks, useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { ConnectionQuality, Track, RoomEvent } from "livekit-client";
import { MicOff, UserPlus, Search, ChevronUp, ChevronDown, MoreVertical, Hand } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function ParticipantsPanel() {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [groupExpanded, setGroupExpanded] = useState(true);
  const [handRaisedParticipants, setHandRaisedParticipants] = useState<Set<string>>(new Set());

  // Track hand raised state from data channel
  useEffect(() => {
    if (!room) return;

    const decoder = new TextDecoder();
    const handler = (
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
          setHandRaisedParticipants((prev) => {
            const newSet = new Set(prev);
            if (message.status) {
              newSet.add(message.participantIdentity);
            } else {
              newSet.delete(message.participantIdentity);
            }
            return newSet;
          });
        }
      } catch (error) {
        console.warn("Failed to parse participant state message", error);
      }
    };

    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room]);

  // Filter participants by search query
  const filteredParticipants = useMemo(() => {
    if (!searchQuery.trim()) return participants;
    const query = searchQuery.toLowerCase();
    return participants.filter(
      (p) =>
        p.name?.toLowerCase().includes(query) ||
        p.identity.toLowerCase().includes(query)
    );
  }, [participants, searchQuery]);

  // Group participants (for now, just one group "Cộng tác viên")
  const groupedParticipants = useMemo(() => {
    return {
      "Cộng tác viên": filteredParticipants,
    };
  }, [filteredParticipants]);

  const handleMuteAll = async () => {
    // TODO: Implement mute all functionality
    // This would require sending a signal to all participants or using backend API
    console.log("Mute all participants");
  };

  const handleAddPerson = () => {
    // TODO: Implement add person functionality
    console.log("Add person");
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Action Buttons */}
      <div className="flex gap-2 mb-3 sm:mb-4 flex-shrink-0">
        <Button
          onClick={handleMuteAll}
          className="flex-1 bg-[hsl(210,100%,60%)] hover:bg-[hsl(210,100%,55%)] text-white text-xs sm:text-sm py-2 sm:py-2.5 rounded-xl shadow-cloud-sm transition-smooth"
        >
          <MicOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
          <span className="hidden sm:inline">Đã tắt tiếng của tất cả</span>
          <span className="sm:hidden">Tắt tiếng</span>
        </Button>
        <Button
          onClick={handleAddPerson}
          className="flex-1 bg-[hsl(210,100%,65%)] hover:bg-[hsl(210,100%,60%)] text-white text-xs sm:text-sm py-2 sm:py-2.5 rounded-xl shadow-cloud-sm transition-smooth"
        >
          <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
          <span className="hidden sm:inline">Thêm người</span>
          <span className="sm:hidden">Thêm</span>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-3 sm:mb-5 flex-shrink-0">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Tìm người"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 py-2 sm:py-2.5 h-9 sm:h-10 text-sm rounded-xl border-gray-200 focus:border-[hsl(210,100%,60%)] focus:ring-[hsl(210,100%,60%)] transition-smooth"
        />
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
        <div className="space-y-3 sm:space-y-4">
          {/* Section Title */}
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 sm:mb-3">
            TRONG CUỘC HỌP
          </div>

          {/* Group: Cộng tác viên */}
          {Object.entries(groupedParticipants).map(([groupName, groupParticipants]) => (
            <div key={groupName} className="space-y-2 sm:space-y-2.5">
              {/* Group Header */}
              <button
                onClick={() => setGroupExpanded(!groupExpanded)}
                className="flex items-center justify-between w-full text-left py-1 hover:bg-[hsl(215,20%,98%)] rounded-lg px-1 transition-smooth"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{groupName}</span>
                  <Badge variant="secondary" className="text-xs px-1.5 sm:px-2 py-0.5 bg-[hsl(215,18%,95%)] text-gray-700 rounded-full font-medium">
                    {groupParticipants.length}
                  </Badge>
                </div>
                {groupExpanded ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </button>

              {/* Participants in Group */}
              {groupExpanded && (
                <div className="space-y-1.5">
                  {groupParticipants.map((p) => (
                    <ParticipantItem 
                      key={p.identity} 
                      participant={p}
                      isHandRaised={handRaisedParticipants.has(p.identity)}
                    />
                  ))}
                  {groupParticipants.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Không có người tham gia
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ParticipantItemProps {
  participant: ReturnType<typeof useParticipants>[number];
  isHandRaised?: boolean;
}

function ParticipantItem({ participant, isHandRaised = false }: ParticipantItemProps) {
  const { identity, name } = participant;
  const { localParticipant } = useLocalParticipant();
  const { metadata } = useParticipantInfo({ participant });

  const audioTrack = useTracks(
    [Track.Source.Microphone],
    { onlySubscribed: false },
  ).find((t) => t.participant.identity === participant.identity);

  const isMuted = audioTrack?.publication?.isMuted ?? false;
  const isLocal = localParticipant?.identity === participant.identity;
  const role = metadata ? JSON.parse(metadata)?.role : "student";
  const isOrganizer = role === "instructor";

  // Get initials for avatar
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const displayName = name || identity;
  const initials = getInitials(displayName);

  return (
    <Card className="p-2 sm:p-3 hover:bg-[hsl(215,20%,98%)] transition-smooth border-gray-200 shadow-cloud-sm hover:shadow-cloud-md rounded-xl">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        {/* Left side: Avatar and Info */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className="flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-br from-[hsl(210,100%,60%)] to-[hsl(210,100%,50%)] flex items-center justify-center text-white font-semibold text-xs sm:text-sm shadow-cloud-sm">
            {initials}
          </div>

          {/* Name and Role */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                {displayName}
              </span>
              {isLocal && <span className="text-xs text-gray-500 flex-shrink-0">(Bạn)</span>}
            </div>
            {isOrganizer && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">Người tổ chức</p>
            )}
          </div>
        </div>

        {/* Right side: Mute Status and More Options */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {/* Mute Status Icon */}
          {isMuted && (
            <div className="p-1 sm:p-1.5 rounded-full bg-[hsl(215,18%,95%)]">
              <MicOff className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-600" />
            </div>
          )}
          
          {/* Hand Raised Indicator */}
          {isHandRaised && (
            <div className="p-1 sm:p-1.5 rounded-full bg-yellow-400/20 border border-yellow-400/40">
              <Hand className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-yellow-600 fill-yellow-600" />
            </div>
          )}

          {/* More Options Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-[hsl(215,18%,95%)] transition-smooth rounded-full">
                <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl shadow-cloud-lg">
              <DropdownMenuItem className="rounded-lg text-sm">
                {isMuted ? "Bật tiếng" : "Tắt tiếng"}
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg text-sm">
                Ghim video
              </DropdownMenuItem>
              {!isLocal && (
                <DropdownMenuItem className="text-[hsl(0,65%,60%)] rounded-lg text-sm">
                  Xóa khỏi cuộc họp
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}
