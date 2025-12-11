"use client";

import { useState, useEffect } from "react";
import { BACKEND_URL } from "@/lib/config";

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
        return "text-green-400";
      case "egress_complete":
        return "text-blue-400";
      case "egress_failed":
      case "egress_aborted":
        return "text-red-400";
      default:
        return "text-slate-400";
    }
  };

  return (
    <div className="flex flex-col border-b border-slate-800">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <h3 className="text-lg font-semibold text-white">Recordings</h3>
        <button
          onClick={loadRecordings}
          className="text-xs text-blue-400 hover:text-blue-300"
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto px-4 py-3 space-y-2">
        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
            {error}
          </p>
        )}

        {recordings.length === 0 && !loading && (
          <p className="text-sm text-slate-500 text-center py-4">
            No recordings available yet
          </p>
        )}

        {recordings.map((recording) => (
          <div
            key={recording.egressId}
            className="rounded-md bg-slate-800/50 px-3 py-2 text-sm"
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={`text-xs font-medium ${getStatusColor(recording.status)}`}
              >
                {recording.status.replace("EGRESS_", "").replace("_", " ")}
              </span>
              <span className="text-xs text-slate-400">
                {formatDate(recording.startedAt)}
              </span>
            </div>
            {recording.filepath && (
              <p className="text-xs text-slate-400 truncate">
                {recording.filepath}
              </p>
            )}
            {recording.url && (
              <a
                href={recording.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
              >
                View Recording →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
