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
    <div className="flex min-h-screen items-center justify-center bg-[hsl(215,20%,98%)] px-4 text-gray-900">
      <Card className="w-full max-w-xl shadow-cloud-lg rounded-2xl border-gray-200">
        <CardHeader className="space-y-3">
          <div className="inline-flex items-center gap-2">
            <span className="text-sm font-medium uppercase tracking-wide px-3 py-1 rounded-full bg-gradient-to-r from-pink-50 to-pink-100 text-pink-600 border border-pink-200">
              LiveKit E-Learning
            </span>
          </div>
          <CardTitle className="text-3xl font-semibold text-gray-900">
            Tham gia lớp học
          </CardTitle>
          <CardDescription className="text-base text-gray-600 leading-relaxed">
            Nhập tên phòng để bắt đầu lớp học video LiveKit. Bạn sẽ chọn tên hiển thị và vai trò ở màn hình tiếp theo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="room-name" className="text-sm font-medium text-gray-700">
                Tên phòng
              </Label>
              <Input
                id="room-name"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="vd: lop-toan-hoc"
                className="h-11 rounded-xl border-gray-200 focus:border-[hsl(210,100%,60%)] focus:ring-[hsl(210,100%,60%)] transition-smooth"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-[hsl(210,100%,60%)] hover:bg-[hsl(210,100%,55%)] text-white rounded-xl shadow-cloud-md transition-smooth font-medium"
            >
              Tiếp tục vào phòng
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
