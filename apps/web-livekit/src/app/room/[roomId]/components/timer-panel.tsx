"use client";

import { useState, useEffect, useRef } from "react";
import { useRoomContext, useLocalParticipant } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";

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
    <div className="flex flex-col items-center gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
      <div className="text-center">
        <h3 className="text-sm font-semibold text-slate-400 mb-2">Timer</h3>
        <div
          className={`text-4xl font-mono font-bold ${isCritical
              ? "text-red-400 animate-pulse"
              : isWarning
                ? "text-yellow-400"
                : "text-white"
            }`}
        >
          {formatTime(timer.remaining)}
        </div>
      </div>

      {timer.isInstructor && (
        <div className="flex flex-col gap-2 w-full">
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max="60"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(parseInt(e.target.value) || 1)}
              className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-white outline-none focus:border-blue-400"
              placeholder="Minutes"
            />
            <button
              onClick={setCustomTimer}
              className="rounded-md bg-blue-500 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-600"
            >
              Set
            </button>
          </div>

          <div className="flex gap-2">
            {timer.isRunning ? (
              <button
                onClick={pauseTimer}
                className="flex-1 rounded-md bg-yellow-500 px-3 py-2 text-sm font-semibold text-white hover:bg-yellow-600"
              >
                Pause
              </button>
            ) : (
              <button
                onClick={startTimer}
                className="flex-1 rounded-md bg-green-500 px-3 py-2 text-sm font-semibold text-white hover:bg-green-600"
              >
                Start
              </button>
            )}
            <button
              onClick={resetTimer}
              className="flex-1 rounded-md bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {!timer.isInstructor && timer.remaining === 0 && (
        <p className="text-xs text-red-400 animate-pulse">Time's up!</p>
      )}
    </div>
  );
}
