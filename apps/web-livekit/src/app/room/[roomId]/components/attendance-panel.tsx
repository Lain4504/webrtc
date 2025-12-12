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
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Điểm danh</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {presentCount} có mặt / {totalCount} tổng
          </p>
        </div>
        {isInstructor && totalCount > 0 && (
          <Button
            onClick={exportAttendance}
            size="sm"
            className="rounded-lg shadow-soft transition-smooth"
          >
            Xuất CSV
          </Button>
        )}
      </div>
      <div className="max-h-64 overflow-y-auto space-y-2 scrollbar-thin">
        {Object.values(attendance)
          .sort((a, b) => b.joinedAt - a.joinedAt)
          .map((record) => (
            <Card key={record.participantIdentity} className="p-3 shadow-soft border-gray-100 rounded-lg hover:shadow-soft-md transition-smooth">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2 w-2 rounded-full flex-shrink-0 ${record.isPresent ? "bg-green-500" : "bg-gray-300"
                      }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{record.participantName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Tham gia: {new Date(record.joinedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={record.isPresent ? "default" : "secondary"}
                  className={`${record.isPresent
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-gray-100 text-gray-600"
                    } px-2.5 py-1 rounded-full text-xs`}
                >
                  {record.isPresent ? "Có mặt" : "Đã rời"}
                </Badge>
              </div>
            </Card>
          ))}

        {totalCount === 0 && (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-gray-400 text-center">
              Chưa có bản ghi điểm danh
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
