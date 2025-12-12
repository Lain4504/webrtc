"use client";

import { useState, useEffect, useRef } from "react";
import { useRoomContext, useLocalParticipant } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { Download, FileImage, FileVideo, FileText, FileSpreadsheet, File, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
      participant: { identity: string } | undefined,
      _kind: unknown,
      topic?: string,
    ) => {
      if (topic !== "file-sharing") return;
      if (!participant || participant.identity === room.localParticipant?.identity) return;

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
        typeof (localParticipant as any).sendFile === "function" &&
        file instanceof File
      ) {
        // Use sendFile API if available
        await (localParticipant as any).sendFile(file, {
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
      const blob = new Blob([file.data as any], { type: file.type });
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
    if (type.startsWith("image/")) return <FileImage className="h-6 w-6 text-blue-600" />;
    if (type.startsWith("video/")) return <FileVideo className="h-6 w-6 text-purple-600" />;
    if (type.includes("pdf")) return <FileText className="h-6 w-6 text-red-600" />;
    if (type.includes("word")) return <FileText className="h-6 w-6 text-blue-600" />;
    if (type.includes("excel") || type.includes("spreadsheet")) return <FileSpreadsheet className="h-6 w-6 text-green-600" />;
    return <File className="h-6 w-6 text-gray-600" />;
  };

  return (
    <Card className="flex h-64 flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Shared Files</CardTitle>
          {isInstructor && (
            <label>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.mp4,.mp3,.txt"
              />
              <Button size="sm" asChild>
                <span className="cursor-pointer flex items-center">
                  <Upload className="h-3 w-3 mr-1" />
                  Share File
                </span>
              </Button>
            </label>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-2 p-0">
        <div className="px-4 py-3 space-y-2">
          {files.map((file) => (
            <Card
              key={file.id}
              className="p-3 cursor-pointer hover:bg-gray-50"
              onClick={() => downloadFile(file)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{file.name}</p>
                    <p className="text-xs text-gray-600">
                      {formatFileSize(file.size)} • {file.sharedBy} •{" "}
                      {new Date(file.sharedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadFile(file);
                  }}
                  title="Download"
                >
                  <Download className="h-5 w-5" />
                </Button>
              </div>
            </Card>
          ))}
          {files.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              {isInstructor
                ? "Share files with your students"
                : "No files shared yet"}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
