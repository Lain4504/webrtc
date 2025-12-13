import { getServerLiveKitUrl } from '@/lib/config';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const roomName = req.nextUrl.searchParams.get('roomName');

    /**
     * CAUTION:
     * for simplicity this implementation does not authenticate users and therefore allows anyone with knowledge of a roomName
     * to start/stop recordings for that room.
     * DO NOT USE THIS FOR PRODUCTION PURPOSES AS IS
     */

    if (roomName === null) {
      return new NextResponse('Missing roomName parameter', { status: 403 });
    }

    const serverLiveKitUrl = getServerLiveKitUrl();

    // First, ensure room exists (create if not exists)
    // This will create the room in both LiveKit server and RoomService's Map
    const createRoomResponse = await fetch(`${serverLiveKitUrl}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: roomName,
      }),
    });
    // If room already exists or creation failed, continue anyway
    // The recording request will handle the actual room validation
    if (!createRoomResponse.ok && createRoomResponse.status !== 409) {
      // Log non-conflict errors but continue
      const errorText = await createRoomResponse.text().catch(() => 'Unknown error');
      console.warn('Room creation warning:', errorText);
    }

    // Start recording via server-livekit
    const response = await fetch(
      `${serverLiveKitUrl}/rooms/${encodeURIComponent(roomName)}/recording/start`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          layout: 'speaker',
          filepath: `${new Date(Date.now()).toISOString()}-${roomName}.mp4`,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return new NextResponse(errorText, { status: response.status });
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 500 });
    }
    return new NextResponse('Internal server error', { status: 500 });
  }
}
