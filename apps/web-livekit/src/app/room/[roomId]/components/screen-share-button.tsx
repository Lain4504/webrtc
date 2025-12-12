"use client";

import { useLocalParticipant } from "@livekit/components-react";
import { useState, useEffect } from "react";
import { Track } from "livekit-client";
import { Monitor, MonitorOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        await localParticipant.setScreenShareEnabled(false);
      } else {
        await localParticipant.setScreenShareEnabled(true);
      }
    } catch (error) {
      console.error("Failed to toggle screen share", error);
      alert("Failed to share screen. Please check browser permissions.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleToggleScreenShare}
      disabled={isLoading}
      variant="outline"
      title={isSharing ? "Stop sharing screen" : "Share screen"}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading...</span>
        </>
      ) : isSharing ? (
        <>
          <MonitorOff className="h-4 w-4" />
          <span>Stop Sharing</span>
        </>
      ) : (
        <>
          <Monitor className="h-4 w-4" />
          <span>Share Screen</span>
        </>
      )}
    </Button>
  );
}
