"use client";

import { useState, useEffect } from "react";
import { useParticipants, useLocalParticipant } from "@livekit/components-react";

interface AttendanceRecord {
  participantIdentity: string;
  participantName: string;
  joinedAt: number;
  lastSeen: number;
  isPresent: boolean;
}

export default function AttendancePanel() {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [isInstructor, setIsInstructor] = useState(false);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    if (!localParticipant) return;
    try {
      const metadata = localParticipant.metadata
        ? JSON.parse(localParticipant.metadata)
        : {};
      setIsInstructor(metadata.role === "instructor");
    } catch {
      setIsInstructor(false);
    }
  }, [localParticipant]);

  useEffect(() => {
    const now = Date.now();
    const newAttendance: Record<string, AttendanceRecord> = {};

    participants.forEach((participant) => {
      const existing = attendance[participant.identity];
      newAttendance[participant.identity] = {
        participantIdentity: participant.identity,
        participantName: participant.name || participant.identity,
        joinedAt: existing?.joinedAt || now,
        lastSeen: now,
        isPresent: true,
      };
    });

    // Mark participants who left as absent but keep their record
    Object.keys(attendance).forEach((identity) => {
      if (!newAttendance[identity]) {
        newAttendance[identity] = {
          ...attendance[identity],
          isPresent: false,
        };
      }
    });

    setAttendance(newAttendance);
  }, [participants]);

  const exportAttendance = () => {
    const records = Object.values(attendance);
    const csv = [
      ["Name", "Identity", "Joined At", "Last Seen", "Status"],
      ...records.map((record) => [
        record.participantName,
        record.participantIdentity,
        new Date(record.joinedAt).toLocaleString(),
        new Date(record.lastSeen).toLocaleString(),
        record.isPresent ? "Present" : "Absent",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const presentCount = Object.values(attendance).filter((r) => r.isPresent).length;
  const totalCount = Object.keys(attendance).length;

  return (
    <div className="flex flex-col border-b border-slate-800">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-semibold text-white">Attendance</h3>
          <p className="text-xs text-slate-400">
            {presentCount} present / {totalCount} total
          </p>
        </div>
        {isInstructor && totalCount > 0 && (
          <button
            onClick={exportAttendance}
            className="rounded-md bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600"
          >
            Export CSV
          </button>
        )}
      </div>

      <div className="max-h-64 overflow-y-auto px-4 py-3 space-y-2">
        {Object.values(attendance)
          .sort((a, b) => b.joinedAt - a.joinedAt)
          .map((record) => (
            <div
              key={record.participantIdentity}
              className="flex items-center justify-between rounded-md bg-slate-800/50 px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-2 w-2 rounded-full ${
                    record.isPresent ? "bg-green-400" : "bg-slate-500"
                  }`}
                />
                <div>
                  <p className="text-sm text-white">{record.participantName}</p>
                  <p className="text-xs text-slate-400">
                    Joined: {new Date(record.joinedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  record.isPresent
                    ? "bg-green-500/20 text-green-400"
                    : "bg-slate-700 text-slate-400"
                }`}
              >
                {record.isPresent ? "Present" : "Left"}
              </span>
            </div>
          ))}

        {totalCount === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">
            No attendance records yet
          </p>
        )}
      </div>
    </div>
  );
}
