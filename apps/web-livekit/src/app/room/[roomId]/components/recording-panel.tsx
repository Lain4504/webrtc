"use client";

import { useState, useEffect, useCallback } from "react";
import { useRoomContext, useLocalParticipant, useConnectionState } from "@livekit/components-react";
import { ConnectionState, RoomEvent } from "livekit-client";
import { BACKEND_URL } from "@/lib/config";
import { Circle, CircleDot, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RecordingInfo {
  egressId: string;
  roomName: string;
  status: string;
  startedAt?: number;
  filepath?: string;
}

interface RecordingPanelProps {
  role?: "instructor" | "student";
}

export default function RecordingPanel({ role: roleProp }: RecordingPanelProps = {}) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const connectionState = useConnectionState();
  const [isRecording, setIsRecording] = useState(false);
  const [currentEgressId, setCurrentEgressId] = useState<string | null>(null);
  const [isInstructor, setIsInstructor] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Check if there's an active recording in the room (for students to see status)
  const [roomHasActiveRecording, setRoomHasActiveRecording] = useState(false);

  useEffect(() => {
    if (!localParticipant) {
      console.log("RecordingPanel: No localParticipant yet");
      // Use roleProp as fallback if available
      if (roleProp) {
        setIsInstructor(roleProp === "instructor");
      }
      return;
    }
    try {
      const metadata = localParticipant.metadata
        ? JSON.parse(localParticipant.metadata)
        : {};
      const roleFromMetadata = metadata.role;
      // Use roleProp as fallback if metadata doesn't have role
      const role = roleFromMetadata || roleProp;
      const isInstructorRole = role === "instructor";
      console.log("RecordingPanel: Checking role", {
        metadata: localParticipant.metadata,
        parsedMetadata: metadata,
        roleFromMetadata,
        roleProp,
        finalRole: role,
        isInstructorRole,
      });
      setIsInstructor(isInstructorRole);
    } catch (err) {
      console.error("RecordingPanel: Failed to parse metadata", err);
      // Use roleProp as fallback
      if (roleProp) {
        setIsInstructor(roleProp === "instructor");
      } else {
        setIsInstructor(false);
      }
    }
  }, [localParticipant, roleProp]);

  // Check for active recordings in the room (only for students to see status)
  useEffect(() => {
    if (!room || isInstructor || !room.name) return; // Only check for students, and room must have a name

    const checkActiveRecordings = async () => {
      try {
        const backendUrl = BACKEND_URL.replace(/\/$/, "");
        const res = await fetch(`${backendUrl}/rooms/${room.name}/recording`);
        if (res.ok) {
          const recordings = await res.json();
          const hasActive = recordings.some(
            (r: any) =>
              r.status === "EGRESS_ACTIVE" || r.status === "EGRESS_STARTING",
          );
          setRoomHasActiveRecording(hasActive);
        }
      } catch (err) {
        console.warn("Failed to check active recordings:", err);
      }
    };

    checkActiveRecordings();
    // Check every 5 seconds for students
    const interval = setInterval(checkActiveRecordings, 5000);
    return () => clearInterval(interval);
  }, [room, isInstructor]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const stopRecording = useCallback(async () => {
    if (!currentEgressId) return;

    setError(null);
    try {
      const backendUrl = BACKEND_URL.replace(/\/$/, "");

      const res = await fetch(
        `${backendUrl}/rooms/recording/${currentEgressId}/stop`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!res.ok) {
        throw new Error(`Failed to stop recording (${res.status})`);
      }

      setIsRecording(false);
      setCurrentEgressId(null);
      setRecordingTime(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop recording");
      console.error("Failed to stop recording", err);
    }
  }, [currentEgressId]);

  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording]);

  // Auto-stop recording when connection disconnects or room ends
  useEffect(() => {
    if (!isRecording || !currentEgressId) return;

    // Stop recording if connection is disconnected
    if (connectionState === ConnectionState.Disconnected) {
      console.log("Connection disconnected, stopping recording...");
      stopRecording();
      return;
    }

    // Listen for room disconnect events
    const handleDisconnected = () => {
      console.log("Room disconnected, stopping recording...");
      stopRecording();
    };

    room.on(RoomEvent.Disconnected, handleDisconnected);

    return () => {
      room.off(RoomEvent.Disconnected, handleDisconnected);
    };
  }, [isRecording, currentEgressId, connectionState, room, stopRecording]);

  // Cleanup: Stop recording when component unmounts (user leaves page)
  useEffect(() => {
    return () => {
      if (isRecording && currentEgressId) {
        // Try to stop recording on unmount, but don't wait for it
        stopRecording().catch((err) => {
          console.warn("Failed to stop recording on unmount:", err);
        });
      }
    };
  }, [isRecording, currentEgressId, stopRecording]);

  // Start recording - ONLY called when instructor clicks "Start Recording" button
  // This is the ONLY way to start recording - no automatic recording
  const startRecording = async () => {
    if (!room || !localParticipant) return;
    if (!isInstructor) {
      console.warn("Only instructors can start recording");
      return;
    }

    setError(null);
    try {
      const backendUrl = BACKEND_URL.replace(/\/$/, "");
      const roomName = room.name;

      const res = await fetch(`${backendUrl}/rooms/${roomName}/recording/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layout: "speaker", // or "grid" for grid layout
          filepath: `recordings/${roomName}-{time}.mp4`,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to start recording (${res.status})`,
        );
      }

      const data = (await res.json()) as { egressId: string };
      setCurrentEgressId(data.egressId);
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start recording");
      console.error("Failed to start recording", err);
      setIsRecording(false);
      setCurrentEgressId(null);
    }
  };

  // Ensure recording state is reset on mount (no auto-start)
  useEffect(() => {
    // Explicitly ensure we don't auto-start recording
    // Recording only starts when instructor clicks "Start Recording"
    if (!isInstructor) {
      setIsRecording(false);
      setCurrentEgressId(null);
    }
  }, [isInstructor]);

  // Determine if user is instructor - use roleProp as primary source, metadata as fallback
  const isUserInstructor = roleProp === "instructor" || isInstructor;

  // Wait for localParticipant to be ready, but if roleProp says instructor, show panel anyway
  if (!localParticipant && !roleProp) {
    return (
      <Card>
        <CardContent className="p-3">
          <p className="text-xs text-gray-600">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  // For students: show simple indicator only if recording is active
  if (!isUserInstructor) {
    if (!roomHasActiveRecording) {
      return null; // Don't show anything if no recording is active
    }
    return (
      <Alert className="bg-gray-100 border-gray-300">
        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <AlertDescription>Recording in progress...</AlertDescription>
      </Alert>
    );
  }

  // Always show panel for instructor (for debugging, we'll show it even if isInstructor check fails)
  // This ensures the component is visible

  // For instructors: show full control panel
  // Recording ONLY starts when instructor clicks "Start Recording" button
  // No automatic recording on page load or room join
  const hasActiveRecording = isRecording && currentEgressId !== null;

  // Debug: Log render state
  console.log("RecordingPanel render:", {
    isInstructor,
    hasActiveRecording,
    isRecording,
    currentEgressId,
    localParticipantExists: !!localParticipant,
    metadata: localParticipant?.metadata,
  });

  // Fallback: If somehow isInstructor is false but we're rendering instructor panel,
  // show a debug message
  if (!isInstructor && localParticipant) {
    console.warn("RecordingPanel: isInstructor is false but rendering instructor panel. Metadata:", localParticipant.metadata);
  }

  return (
    <Card className="min-w-[200px] z-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Recording</CardTitle>
          {hasActiveRecording && (
            <Badge variant="destructive" className="gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-mono">{formatTime(recordingTime)}</span>
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {!hasActiveRecording ? (
          <Button
            onClick={startRecording}
            variant="destructive"
            className="w-full"
          >
            <Circle className="h-4 w-4 mr-2" />
            Start Recording
          </Button>
        ) : (
          <Button
            onClick={stopRecording}
            disabled={!currentEgressId}
            variant="destructive"
            className="w-full"
          >
            <CircleDot className="h-4 w-4 mr-2" />
            Stop Recording
          </Button>
        )}

        {hasActiveRecording && (
          <CardDescription className="text-xs text-center space-y-1">
            <p>Recording will be saved automatically when stopped</p>
            <p className="text-gray-500">
              Auto-stops when room ends or connection lost
            </p>
            {currentEgressId && (
              <p className="text-gray-400 text-[10px] font-mono">
                ID: {currentEgressId.slice(0, 8)}...
              </p>
            )}
          </CardDescription>
        )}
      </CardContent>
    </Card>
  );
}
