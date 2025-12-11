"use client";

import { useState, useEffect, useRef } from "react";
import { useRoomContext, useLocalParticipant } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";

interface SharedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  sharedBy: string;
  sharedAt: number;
  data?: Uint8Array;
}

interface FileMessage {
  type: "share" | "request";
  file?: SharedFile;
  fileId?: string;
}

export default function FileSharingPanel() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [isInstructor, setIsInstructor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!room) return;

    const decoder = new TextDecoder();
    const handler = (
      payload: Uint8Array,
      participant: { identity: string },
      _kind: unknown,
      topic?: string,
    ) => {
      if (topic !== "file-sharing") return;
      if (participant.identity === room.localParticipant?.identity) return;

      try {
        const message = JSON.parse(decoder.decode(payload)) as FileMessage;

        if (message.type === "share" && message.file) {
          setFiles((prev) => [...prev, message.file!]);
        }
      } catch (error) {
        console.warn("Failed to parse file message", error);
      }
    };

    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room]);

  const sendFileMessage = async (message: FileMessage) => {
    if (!room || !localParticipant) return;
    const encoder = new TextEncoder();
    await localParticipant.publishData(encoder.encode(JSON.stringify(message)), {
      reliable: true,
      topic: "file-sharing",
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !room || !localParticipant) return;

    // Check file size (max 10MB for demo)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);

      const sharedFile: SharedFile = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        sharedBy: localParticipant.name || localParticipant.identity,
        sharedAt: Date.now(),
      };

      // Send file metadata first
      await sendFileMessage({ type: "share", file: sharedFile });

      // Then send file data in chunks (using byte streams if available)
      if (
        typeof localParticipant.sendFile === "function" &&
        file instanceof File
      ) {
        // Use sendFile API if available
        await localParticipant.sendFile(file, {
          topic: "file-data",
          mimeType: file.type,
        });
      } else {
        // Fallback: send file data via data packets in chunks
        const chunkSize = 15 * 1024; // 15KB chunks
        for (let i = 0; i < data.length; i += chunkSize) {
          const chunk = data.slice(i, i + chunkSize);
          const chunkMessage = {
            type: "file-chunk" as const,
            fileId: sharedFile.id,
            chunkIndex: Math.floor(i / chunkSize),
            totalChunks: Math.ceil(data.length / chunkSize),
            data: Array.from(chunk),
          };
          const encoder = new TextEncoder();
          await localParticipant.publishData(
            encoder.encode(JSON.stringify(chunkMessage)),
            { reliable: true, topic: "file-data" },
          );
        }
      }

      setFiles((prev) => [...prev, sharedFile]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Failed to share file", error);
      alert("Failed to share file. Please try again.");
    }
  };

  const downloadFile = (file: SharedFile) => {
    if (file.url) {
      window.open(file.url, "_blank");
    } else if (file.data) {
      const blob = new Blob([file.data], { type: file.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return "🖼️";
    if (type.startsWith("video/")) return "🎥";
    if (type.includes("pdf")) return "📄";
    if (type.includes("word")) return "📝";
    if (type.includes("excel") || type.includes("spreadsheet")) return "📊";
    return "📎";
  };

  return (
    <div className="flex h-64 flex-col border-b border-slate-800">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <h3 className="text-lg font-semibold text-white">Shared Files</h3>
        {isInstructor && (
          <label className="cursor-pointer rounded-md bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.mp4,.mp3,.txt"
            />
            + Share File
          </label>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between rounded-md bg-slate-800/50 px-3 py-2 hover:bg-slate-800/70 transition-colors cursor-pointer"
            onClick={() => downloadFile(file)}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-2xl">{getFileIcon(file.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{file.name}</p>
                <p className="text-xs text-slate-400">
                  {formatFileSize(file.size)} • {file.sharedBy} •{" "}
                  {new Date(file.sharedAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadFile(file);
              }}
              className="ml-2 text-blue-400 hover:text-blue-300"
              title="Download"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </button>
          </div>
        ))}
        {files.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">
            {isInstructor
              ? "Share files with your students"
              : "No files shared yet"}
          </p>
        )}
      </div>
    </div>
  );
}
