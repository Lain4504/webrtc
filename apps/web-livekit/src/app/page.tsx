"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("demo-room");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!roomId.trim()) return;
    router.push(`/room/${encodeURIComponent(roomId.trim())}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 text-gray-900">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <p className="text-sm uppercase tracking-wide text-blue-600">LiveKit Demo</p>
          <CardTitle className="text-3xl">Join a classroom</CardTitle>
          <CardDescription>
            Enter a room name to start a LiveKit video classroom. You will pick your display
            name and role on the next screen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room-name">Room name</Label>
              <Input
                id="room-name"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="e.g. math-class"
              />
            </div>
            <Button type="submit" className="w-full">
              Continue to room
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
