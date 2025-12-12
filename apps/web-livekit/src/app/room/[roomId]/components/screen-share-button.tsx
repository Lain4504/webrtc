"use client";

import { useLocalParticipant } from "@livekit/components-react";
import { useState, useEffect } from "react";
import { Track } from "livekit-client";
import { Monitor, MonitorOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ScreenShareButton() {
  const { localParticipant } = useLocalParticipant();
  const [isSharing, setIsSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Listen to screen share state changes
  useEffect(() => {
    if (!localParticipant) return;

    const checkScreenShare = () => {
      const screenShareTrack = localParticipant
        .getTrackPublications()
        .find(
          (pub) =>
            pub.kind === "video" && pub.source === Track.Source.ScreenShare,
        );
      setIsSharing(!!screenShareTrack);
    };

    checkScreenShare();

    // Listen to track published/unpublished events
    const handleTrackPublished = () => checkScreenShare();
    const handleTrackUnpublished = () => checkScreenShare();

    localParticipant.on("trackPublished", handleTrackPublished);
    localParticipant.on("trackUnpublished", handleTrackUnpublished);

    return () => {
      localParticipant.off("trackPublished", handleTrackPublished);
      localParticipant.off("trackUnpublished", handleTrackUnpublished);
    };
  }, [localParticipant]);

  const handleToggleScreenShare = async () => {
    if (!localParticipant) return;

    setIsLoading(true);
    try {
      if (isSharing) {
        // Stop screen sharing
        await localParticipant.setScreenShareEnabled(false);
      } else {
        // Start screen sharing with audio support (browser tab audio sharing)
        // According to LiveKit docs: use createScreenTracks with audio: true for browser tab audio
        try {
          // Try using createScreenTracks with audio support (for browser tab audio)
          if (typeof (localParticipant as any).createScreenTracks === "function") {
            const tracks = await (localParticipant as any).createScreenTracks({
              audio: true, // Enable audio sharing for browser tabs
            });
            
            // Publish the tracks
            for (const track of tracks) {
              await localParticipant.publishTrack(track);
            }
          } else {
            // Fallback to simple setScreenShareEnabled (no audio)
            await localParticipant.setScreenShareEnabled(true);
          }
        } catch (audioError) {
          // If audio sharing fails, fallback to video-only screen share
          console.warn("Audio sharing not available, using video-only screen share", audioError);
          await localParticipant.setScreenShareEnabled(true);
        }
      }
    } catch (error) {
      console.error("Failed to toggle screen share", error);
      alert("Failed to share screen. Please check browser permissions.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <Button
        onClick={handleToggleScreenShare}
        disabled={isLoading}
        variant="ghost"
        size="icon"
        className={`rounded-full h-11 w-11 sm:h-12 sm:w-12 transition-smooth shadow-cloud-sm ${isSharing
          ? "bg-[hsl(210,100%,60%)] text-white hover:bg-[hsl(210,100%,55%)]"
          : "bg-white/80 hover:bg-white text-gray-700"
          }`}
        title={isSharing ? "Dừng chia sẻ màn hình" : "Chia sẻ màn hình"}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
        ) : isSharing ? (
          <MonitorOff className="h-5 w-5 sm:h-6 sm:w-6" />
        ) : (
          <Monitor className="h-5 w-5 sm:h-6 sm:w-6" />
        )}
      </Button>
      {isSharing && (
        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-[hsl(210,100%,60%)] text-white rounded-full shadow-cloud-sm border-0">
          !
        </Badge>
      )}
    </div>
  );
}
