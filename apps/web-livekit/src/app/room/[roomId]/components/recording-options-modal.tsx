"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRoomContext, useLocalParticipant } from "@livekit/components-react";
import { BACKEND_URL } from "@/lib/config";
import { Circle, CircleDot, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RecordingOptionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecordingStarted?: (egressId: string) => void;
}

export default function RecordingOptionsModal({
  open,
  onOpenChange,
  onRecordingStarted,
}: RecordingOptionsModalProps) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [layout, setLayout] = useState<string>("speaker");
  const [filepath, setFilepath] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [currentEgressId, setCurrentEgressId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if user is instructor
  const [isInstructor, setIsInstructor] = useState(false);

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

  // Reset form when modal opens
  useEffect(() => {
    if (open && room) {
      setFilepath(`recordings/${room.name}-{time}.mp4`);
      setLayout("speaker");
      setError(null);
    }
  }, [open, room]);

  const handleStartRecording = async () => {
    if (!room || !localParticipant) return;
    if (!isInstructor) {
      setError("Chỉ có giảng viên mới có thể bắt đầu quay record");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const backendUrl = BACKEND_URL.replace(/\/$/, "");
      const roomName = room.name;

      const res = await fetch(`${backendUrl}/rooms/${roomName}/recording/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layout: layout,
          filepath: filepath || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Không thể bắt đầu quay record (${res.status})`,
        );
      }

      const data = (await res.json()) as { egressId: string };
      setCurrentEgressId(data.egressId);
      setIsRecording(true);
      
      if (onRecordingStarted) {
        onRecordingStarted(data.egressId);
      }

      // Close modal after starting recording
      setTimeout(() => {
        onOpenChange(false);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể bắt đầu quay record");
      console.error("Failed to start recording", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStopRecording = async () => {
    if (!currentEgressId) return;

    setLoading(true);
    setError(null);

    try {
      const backendUrl = BACKEND_URL.replace(/\/$/, "");

      const res = await fetch(
        `${backendUrl}/rooms/recording/${currentEgressId}/stop`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!res.ok) {
        throw new Error(`Không thể dừng quay record (${res.status})`);
      }

      setIsRecording(false);
      setCurrentEgressId(null);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể dừng quay record");
      console.error("Failed to stop recording", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isInstructor) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quay record</DialogTitle>
            <DialogDescription>
              Chỉ có giảng viên mới có thể quay record cuộc họp.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quay record cuộc họp</DialogTitle>
          <DialogDescription>
            Cấu hình các tùy chọn để bắt đầu quay record cuộc họp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {isRecording && currentEgressId ? (
            <div className="space-y-4">
              <Alert>
                <CircleDot className="h-4 w-4 text-red-500 animate-pulse" />
                <AlertDescription>
                  Đang quay record... Để dừng, nhấn nút dưới đây.
                </AlertDescription>
              </Alert>
              <Button
                onClick={handleStopRecording}
                disabled={loading}
                variant="destructive"
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang dừng...
                  </>
                ) : (
                  <>
                    <CircleDot className="h-4 w-4 mr-2" />
                    Dừng quay record
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="layout">Bố cục video</Label>
                <Select value={layout} onValueChange={setLayout}>
                  <SelectTrigger id="layout" className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="speaker">Speaker (Người đang nói)</SelectItem>
                    <SelectItem value="grid">Grid (Lưới)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filepath">Đường dẫn file</Label>
                <Input
                  id="filepath"
                  value={filepath}
                  onChange={(e) => setFilepath(e.target.value)}
                  placeholder="recordings/{roomName}-{time}.mp4"
                  className="rounded-xl"
                />
                <p className="text-xs text-gray-500">
                  Sử dụng {"{time}"} để tự động thêm timestamp
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 rounded-xl"
                  disabled={loading}
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleStartRecording}
                  disabled={loading}
                  variant="destructive"
                  className="flex-1 rounded-xl"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Đang bắt đầu...
                    </>
                  ) : (
                    <>
                      <Circle className="h-4 w-4 mr-2" />
                      Bắt đầu quay record
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}