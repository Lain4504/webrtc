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
  const handlerRegisteredRef = useRef<boolean>(false);

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

    // Prevent double registration in React Strict Mode
    if (handlerRegisteredRef.current) {
      console.log("Handler already registered, skipping...");
      return;
    }

    let unregisterFn: (() => void) | undefined;
    let metadataHandler: ((...args: any[]) => void) | undefined;

    // Check if registerByteStreamHandler is available
    if (typeof (room as any).registerByteStreamHandler === "function") {
      try {
        console.log("Registering byte stream handler for topic 'file-sharing'");
        // Register byte stream handler for receiving files (according to LiveKit docs)
        unregisterFn = (room as any).registerByteStreamHandler(
          "file-sharing",
          async (reader: any, participantInfo: any) => {
            console.log("Byte stream handler invoked for file-sharing topic", {
              participant: participantInfo?.identity,
              hasReader: !!reader,
            });
            try {
              const info = reader.info;
              console.log("Received file stream:", {
                name: info.name,
                id: info.id,
                size: info.size,
                mimeType: info.mimeType,
                from: participantInfo.identity,
              });

              // Optional: Set progress handler (according to LiveKit docs)
              if (reader.onProgress !== undefined) {
                reader.onProgress = (progress: number | undefined) => {
                  if (progress !== undefined) {
                    console.log(`File transfer progress: ${(progress * 100).toFixed(0)}%`);
                  }
                };
              }

              // Option 2: Get the entire file after the stream completes (recommended by docs)
              // This is simpler and more reliable than processing chunks
              const chunks = await reader.readAll();
              
              // Convert chunks array to Uint8Array
              const totalLength = chunks.reduce((acc: number, chunk: Uint8Array) => acc + chunk.length, 0);
              const fileData = new Uint8Array(totalLength);
              let offset = 0;
              for (const chunk of chunks) {
                fileData.set(chunk, offset);
                offset += chunk.length;
              }

              // Create SharedFile from received data
              const sharedFile: SharedFile = {
                id: info.id || crypto.randomUUID(),
                name: info.name || "unnamed-file",
                size: fileData.length || info.size || 0,
                type: info.mimeType || "application/octet-stream",
                sharedBy: participantInfo.name || participantInfo.identity || "Unknown",
                sharedAt: info.timestamp || Date.now(),
                data: fileData,
              };

              console.log("File received and processed:", {
                id: sharedFile.id,
                name: sharedFile.name,
                size: sharedFile.size,
                type: sharedFile.type,
              });

              setFiles((prev) => {
                const exists = prev.some((f) => f.id === sharedFile.id);
                if (exists) {
                  console.warn("File already exists in list, skipping:", sharedFile.id);
                  return prev;
                }
                return [...prev, sharedFile];
              });
            } catch (error) {
              console.error("Failed to read file stream", error);
            }
          },
        );
        handlerRegisteredRef.current = true;
        console.log("Byte stream handler registered successfully for 'file-sharing'");
      } catch (error) {
        // If handler already exists, mark as registered and use fallback
        if (error instanceof Error && error.message.includes("already been set")) {
          handlerRegisteredRef.current = true;
          console.warn("Byte stream handler already registered by another instance, using data packet fallback", error);
          // Fall through to data packet handler
        } else {
          console.error("Failed to register byte stream handler", error);
          // Fall through to data packet handler
        }
      }
    } else {
      console.warn("registerByteStreamHandler not available, using data packet fallback only");
    }

    // Listen for file metadata and chunks via data packets (for backward compatibility and fallback)
    const decoder = new TextDecoder();
    const fileChunksMap = new Map<string, { chunks: Uint8Array[], totalChunks: number, file: SharedFile }>();
    
    metadataHandler = (
      payload: Uint8Array,
      participant: { identity: string; name?: string } | undefined,
      _kind: unknown,
      topic?: string,
    ) => {
      if (!participant) return;
      if (participant.identity === room.localParticipant?.identity) return;

      try {
        const parsed = JSON.parse(decoder.decode(payload));
        
        // Handle file metadata
        if (topic === "file-sharing" && parsed.type === "share" && parsed.file) {
          const message = parsed as FileMessage;
          console.log("Received file metadata:", message.file);
          
          // Initialize chunks map for this file
          fileChunksMap.set(message.file!.id, {
            chunks: [],
            totalChunks: 0,
            file: message.file!,
          });
          
          setFiles((prev) => {
            const exists = prev.some((f) => f.id === message.file!.id);
            if (exists) return prev;
            return [...prev, message.file!];
          });
        }
        
        // Handle file chunks
        if (topic === "file-data" && parsed.type === "file-chunk") {
          const { fileId, chunkIndex, totalChunks, data } = parsed;
          console.log(`Received chunk ${chunkIndex + 1}/${totalChunks} for file ${fileId}`);
          
          const fileInfo = fileChunksMap.get(fileId);
          if (!fileInfo) {
            console.warn("Received chunk for unknown file:", fileId);
            return;
          }
          
          // Convert array back to Uint8Array
          const chunkData = new Uint8Array(data);
          fileInfo.chunks[chunkIndex] = chunkData;
          fileInfo.totalChunks = totalChunks;
          
          // Check if all chunks received
          if (fileInfo.chunks.length === totalChunks && 
              fileInfo.chunks.every(chunk => chunk !== undefined)) {
            // Combine all chunks
            const totalLength = fileInfo.chunks.reduce((acc, chunk) => acc + chunk.length, 0);
            const fileData = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of fileInfo.chunks) {
              fileData.set(chunk, offset);
              offset += chunk.length;
            }
            
            // Update file with data
            fileInfo.file.data = fileData;
            fileInfo.file.size = fileData.length;
            
            // Update files list
            setFiles((prev) => {
              return prev.map(f => f.id === fileId ? fileInfo.file : f);
            });
            
            // Clean up chunks map
            fileChunksMap.delete(fileId);
            console.log(`File ${fileId} completely received and assembled`);
          }
        }
      } catch (error) {
        console.warn("Failed to parse file message", error);
      }
    };

    room.on(RoomEvent.DataReceived, metadataHandler);
    console.log("File sharing handlers registered - byte stream:", !!unregisterFn, "data packet:", !!metadataHandler);
    
    return () => {
      // Cleanup: unregister byte stream handler if it was registered
      if (typeof unregisterFn === "function") {
        try {
          console.log("Unregistering byte stream handler");
          unregisterFn();
          handlerRegisteredRef.current = false;
        } catch (error) {
          console.warn("Failed to unregister byte stream handler", error);
        }
      }
      
      // Cleanup: remove metadata handler if it was registered
      if (metadataHandler) {
        room.off(RoomEvent.DataReceived, metadataHandler);
      }
      
      handlerRegisteredRef.current = false;
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

      // Check if byte stream handler is registered (if not, use data packets)
      let useByteStream = handlerRegisteredRef.current && 
        typeof (localParticipant as any).sendFile === "function" &&
        file &&
        typeof file === "object" &&
        "name" in file &&
        "size" in file &&
        "type" in file;

      if (useByteStream) {
        console.log("Sending file using sendFile API (byte stream):", {
          name: file.name,
          size: file.size,
          type: file.type,
        });

        try {
          // Send file using sendFile API with proper options
          const info = await (localParticipant as any).sendFile(file, {
            topic: "file-sharing",
            mimeType: file.type,
            onProgress: (progress: number) => {
              // Optional: show upload progress
              console.log(`Uploading file: ${Math.ceil(progress * 100)}%`);
            },
          });
          
          // Update file with stream ID from server response
          sharedFile.id = info?.id || sharedFile.id;
          console.log(`File sent successfully with stream ID: ${info?.id}`, info);
          
          // Add to local files list immediately
          setFiles((prev) => [...prev, sharedFile]);
        } catch (error) {
          console.error("Failed to send file via byte stream, falling back to data packets", error);
          // Fall through to data packet method
          useByteStream = false;
        }
      }

      // Fallback: send file via data packets with chunking (when byte stream not available or failed)
      if (!useByteStream) {
        console.log("Using data packet method for file sharing (with chunking)");
        
        // Send file metadata first
        await sendFileMessage({ type: "share", file: sharedFile });
        
        // Send file data in chunks via data packets (15KB chunks as per LiveKit docs)
        const chunkSize = 15 * 1024; // 15KB chunks (safe for reliable delivery)
        const totalChunks = Math.ceil(data.length / chunkSize);
        
        console.log(`Sending file in ${totalChunks} chunks of ${chunkSize} bytes`);
        
        for (let i = 0; i < data.length; i += chunkSize) {
          const chunk = data.slice(i, i + chunkSize);
          const chunkMessage = {
            type: "file-chunk" as const,
            fileId: sharedFile.id,
            chunkIndex: Math.floor(i / chunkSize),
            totalChunks: totalChunks,
            data: Array.from(chunk), // Convert to array for JSON serialization
          };
          
          const encoder = new TextEncoder();
          await localParticipant.publishData(
            encoder.encode(JSON.stringify(chunkMessage)),
            { reliable: true, topic: "file-data" }, // Use different topic for file data
          );
          
          console.log(`Sent chunk ${Math.floor(i / chunkSize) + 1}/${totalChunks}`);
        }
        
        console.log("File sent successfully via data packets");
        setFiles((prev) => [...prev, sharedFile]);
      }
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
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Tệp đã chia sẻ</h3>
        {isInstructor && (
          <label>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.mp4,.mp3,.txt"
            />
            <Button size="sm" asChild className="rounded-lg shadow-soft transition-smooth">
              <span className="cursor-pointer flex items-center">
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Chia sẻ
              </span>
            </Button>
          </label>
        )}
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
        {files.map((file) => (
          <Card
            key={file.id}
            className="p-3 cursor-pointer hover:bg-gray-50/80 transition-smooth shadow-soft hover:shadow-soft-md border-gray-100 rounded-lg"
            onClick={() => downloadFile(file)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  {getFileIcon(file.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatFileSize(file.size)} • {file.sharedBy} •{" "}
                    {new Date(file.sharedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
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
                title="Tải xuống"
                className="h-9 w-9 rounded-lg hover:bg-gray-100 transition-smooth flex-shrink-0"
              >
                <Download className="h-4 w-4 text-gray-600" />
              </Button>
            </div>
          </Card>
        ))}
        {files.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-gray-400 text-center">
              {isInstructor
                ? "Chia sẻ tệp với học viên"
                : "Chưa có tệp nào được chia sẻ"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
