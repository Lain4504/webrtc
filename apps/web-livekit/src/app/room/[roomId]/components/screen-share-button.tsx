"use client";

import { useLocalParticipant } from "@livekit/components-react";
import { useState, useEffect } from "react";
import { Track } from "livekit-client";

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
    <button
      onClick={handleToggleScreenShare}
      disabled={isLoading}
      className="flex items-center gap-2 rounded-md bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50"
      title={isSharing ? "Stop sharing screen" : "Share screen"}
    >
      {isLoading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <span>Loading...</span>
        </>
      ) : isSharing ? (
        <>
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <span>Stop Sharing</span>
        </>
      ) : (
        <>
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <span>Share Screen</span>
        </>
      )}
    </button>
  );
}
