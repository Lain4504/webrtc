"use client";

import { useState, useEffect } from "react";
import { useParticipants, useLocalParticipant } from "@livekit/components-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    <Card className="border-b border-gray-200 rounded-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Attendance</CardTitle>
            <CardDescription>
              {presentCount} present / {totalCount} total
            </CardDescription>
          </div>
          {isInstructor && totalCount > 0 && (
            <Button onClick={exportAttendance} size="sm">
              Export CSV
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="max-h-64 overflow-y-auto space-y-2">
        {Object.values(attendance)
          .sort((a, b) => b.joinedAt - a.joinedAt)
          .map((record) => (
            <Card key={record.participantIdentity} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      record.isPresent ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                  <div>
                    <p className="text-sm">{record.participantName}</p>
                    <p className="text-xs text-gray-600">
                      Joined: {new Date(record.joinedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={record.isPresent ? "default" : "secondary"}
                  className={record.isPresent ? "bg-green-100 text-green-700" : ""}
                >
                  {record.isPresent ? "Present" : "Left"}
                </Badge>
              </div>
            </Card>
          ))}

        {totalCount === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            No attendance records yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
