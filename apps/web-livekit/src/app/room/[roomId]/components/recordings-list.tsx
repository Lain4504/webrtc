"use client";

import { useState, useEffect } from "react";
import { BACKEND_URL } from "@/lib/config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RecordingItem {
  egressId: string;
  roomName: string;
  status: string;
  startedAt?: number;
  endedAt?: number;
  filepath?: string;
  url?: string;
}

export default function RecordingsList({ roomId }: { roomId: string }) {
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecordings();
  }, [roomId]);

  const loadRecordings = async () => {
    setLoading(true);
    setError(null);
    try {
      const backendUrl = BACKEND_URL.replace(/\/$/, "");
      const res = await fetch(`${backendUrl}/rooms/${roomId}/recording`);

      if (!res.ok) {
        throw new Error(`Failed to load recordings (${res.status})`);
      }

      const data = (await res.json()) as RecordingItem[];
      setRecordings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recordings");
      console.error("Failed to load recordings", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Unknown";
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "egress_active":
      case "egress_starting":
        return "bg-green-100 text-green-700";
      case "egress_complete":
        return "bg-blue-100 text-blue-700";
      case "egress_failed":
      case "egress_aborted":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Recordings</CardTitle>
          <Button
            onClick={loadRecordings}
            variant="ghost"
            size="sm"
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="max-h-64 overflow-y-auto space-y-2 p-0">
        <div className="px-4 py-3 space-y-2">
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {recordings.length === 0 && !loading && (
            <p className="text-sm text-gray-500 text-center py-4">
              No recordings available yet
            </p>
          )}

          {recordings.map((recording) => (
            <Card key={recording.egressId} className="p-3">
              <div className="flex items-center justify-between mb-1">
                <Badge className={getStatusColor(recording.status)}>
                  {recording.status.replace("EGRESS_", "").replace("_", " ")}
                </Badge>
                <span className="text-xs text-gray-600">
                  {formatDate(recording.startedAt)}
                </span>
              </div>
              {recording.filepath && (
                <CardDescription className="text-xs truncate mt-1">
                  {recording.filepath}
                </CardDescription>
              )}
              {recording.url && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 mt-1"
                  asChild
                >
                  <a
                    href={recording.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Recording →
                  </a>
                </Button>
              )}
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
