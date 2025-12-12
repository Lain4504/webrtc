"use client";

import { useState, useEffect, useRef } from "react";
import { useRoomContext, useLocalParticipant } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TimerState {
  isRunning: boolean;
  duration: number; // in seconds
  remaining: number; // in seconds
  startedAt?: number;
  isInstructor: boolean;
}

interface TimerMessage {
  type: "start" | "pause" | "reset" | "set";
  duration?: number;
  remaining?: number;
  startedAt?: number;
}

export default function TimerPanel() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [timer, setTimer] = useState<TimerState>({
    isRunning: false,
    duration: 300, // 5 minutes default
    remaining: 300,
    isInstructor: false,
  });
  const [customMinutes, setCustomMinutes] = useState(5);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!localParticipant) return;
    try {
      const metadata = localParticipant.metadata
        ? JSON.parse(localParticipant.metadata)
        : {};
      setTimer((prev) => ({ ...prev, isInstructor: metadata.role === "instructor" }));
    } catch {
      setTimer((prev) => ({ ...prev, isInstructor: false }));
    }
  }, [localParticipant]);

  useEffect(() => {
    if (!room) return;

    const decoder = new TextDecoder();
    const handler = (
      payload: Uint8Array,
      participant: { identity: string } | undefined,
      _kind: unknown,
      topic?: string,
    ) => {
      if (topic !== "timer") return;
      if (!participant || participant.identity === room.localParticipant?.identity) return;

      try {
        const message = JSON.parse(decoder.decode(payload)) as TimerMessage;

        if (message.type === "start") {
          setTimer((prev) => ({
            ...prev,
            isRunning: true,
            remaining: message.remaining || prev.remaining,
            startedAt: message.startedAt,
          }));
        } else if (message.type === "pause") {
          setTimer((prev) => ({
            ...prev,
            isRunning: false,
            remaining: message.remaining || prev.remaining,
          }));
        } else if (message.type === "reset") {
          setTimer((prev) => ({
            ...prev,
            isRunning: false,
            remaining: prev.duration,
            startedAt: undefined,
          }));
        } else if (message.type === "set") {
          setTimer((prev) => ({
            ...prev,
            duration: message.duration || prev.duration,
            remaining: message.duration || prev.duration,
            isRunning: false,
            startedAt: undefined,
          }));
        }
      } catch (error) {
        console.warn("Failed to parse timer message", error);
      }
    };

    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room]);

  useEffect(() => {
    if (timer.isRunning && timer.remaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimer((prev) => {
          const newRemaining = prev.remaining - 1;
          if (newRemaining <= 0) {
            // Timer finished
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            // Play sound or show notification
            playTimerSound();
            return {
              ...prev,
              isRunning: false,
              remaining: 0,
            };
          }
          return { ...prev, remaining: newRemaining };
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timer.isRunning, timer.remaining]);

  const sendTimerMessage = async (message: TimerMessage) => {
    if (!room || !localParticipant) return;
    const encoder = new TextEncoder();
    await localParticipant.publishData(encoder.encode(JSON.stringify(message)), {
      reliable: true,
      topic: "timer",
    });
  };

  const startTimer = () => {
    const startedAt = Date.now();
    setTimer((prev) => ({
      ...prev,
      isRunning: true,
      startedAt,
    }));
    sendTimerMessage({
      type: "start",
      remaining: timer.remaining,
      startedAt,
    });
  };

  const pauseTimer = () => {
    setTimer((prev) => ({ ...prev, isRunning: false }));
    sendTimerMessage({
      type: "pause",
      remaining: timer.remaining,
    });
  };

  const resetTimer = () => {
    setTimer((prev) => ({
      ...prev,
      isRunning: false,
      remaining: prev.duration,
      startedAt: undefined,
    }));
    sendTimerMessage({ type: "reset" });
  };

  const setCustomTimer = () => {
    const duration = customMinutes * 60;
    setTimer((prev) => ({
      ...prev,
      duration,
      remaining: duration,
      isRunning: false,
      startedAt: undefined,
    }));
    sendTimerMessage({ type: "set", duration });
  };

  const playTimerSound = () => {
    // Create a simple beep sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isWarning = timer.remaining <= 60 && timer.remaining > 0;
  const isCritical = timer.remaining <= 10 && timer.remaining > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-center">Timer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-center">
          <div
            className={`text-4xl font-mono font-bold ${isCritical
                ? "text-red-600 animate-pulse"
                : isWarning
                  ? "text-yellow-600"
                  : "text-gray-900"
              }`}
          >
            {formatTime(timer.remaining)}
          </div>
        </div>

        {timer.isInstructor && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Input
                type="number"
                min="1"
                max="60"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(parseInt(e.target.value) || 1)}
                placeholder="Minutes"
                className="flex-1"
              />
              <Button onClick={setCustomTimer} size="sm">
                Set
              </Button>
            </div>

            <div className="flex gap-2">
              {timer.isRunning ? (
                <Button
                  onClick={pauseTimer}
                  variant="default"
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600"
                >
                  Pause
                </Button>
              ) : (
                <Button
                  onClick={startTimer}
                  variant="default"
                  className="flex-1 bg-green-500 hover:bg-green-600"
                >
                  Start
                </Button>
              )}
              <Button
                onClick={resetTimer}
                variant="outline"
                className="flex-1"
              >
                Reset
              </Button>
            </div>
          </div>
        )}

        {!timer.isInstructor && timer.remaining === 0 && (
          <Alert variant="destructive">
            <AlertDescription className="text-xs animate-pulse">Time's up!</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
