"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("demo-room");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!roomId.trim()) return;
    router.push(`/room/${encodeURIComponent(roomId.trim())}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <p className="text-sm uppercase tracking-wide text-blue-400">LiveKit Demo</p>
        <h1 className="mt-2 text-3xl font-bold">Join a classroom</h1>
        <p className="mt-2 text-slate-400">
          Enter a room name to start a LiveKit video classroom. You will pick your display
          name and role on the next screen.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <label className="block text-sm font-medium text-slate-200">
            Room name
            <input
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="e.g. math-class"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-500 px-4 py-3 text-center font-semibold text-white hover:bg-blue-600"
          >
            Continue to room
          </button>
        </form>
      </div>
    </div>
  );
}
