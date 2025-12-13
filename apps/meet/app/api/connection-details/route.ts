import { randomString } from '@/lib/client-utils';
import { ConnectionDetails } from '@/lib/types';
import { getServerLiveKitUrl } from '@/lib/config';
import { NextRequest, NextResponse } from 'next/server';

const COOKIE_KEY = 'random-participant-postfix';

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const roomName = request.nextUrl.searchParams.get('roomName');
    const participantName = request.nextUrl.searchParams.get('participantName');
    const metadata = request.nextUrl.searchParams.get('metadata') ?? '';
    const region = request.nextUrl.searchParams.get('region');
    const role = request.nextUrl.searchParams.get('role') || 'student'; // Default to student
    
    const serverLiveKitUrl = getServerLiveKitUrl();
    let randomParticipantPostfix = request.cookies.get(COOKIE_KEY)?.value;

    if (typeof roomName !== 'string') {
      return new NextResponse('Missing required query parameter: roomName', { status: 400 });
    }
    if (participantName === null) {
      return new NextResponse('Missing required query parameter: participantName', { status: 400 });
    }

    // Generate participant identity with random postfix
    if (!randomParticipantPostfix) {
      randomParticipantPostfix = randomString(4);
    }
    const participantIdentity = `${participantName}__${randomParticipantPostfix}`;

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
    // The token request will handle the actual room validation
    if (!createRoomResponse.ok && createRoomResponse.status !== 409) {
      // Log non-conflict errors but continue
      const errorText = await createRoomResponse.text().catch(() => 'Unknown error');
      console.warn('Room creation warning:', errorText);
    }

    // Request token from server-livekit
    const tokenResponse = await fetch(`${serverLiveKitUrl}/rooms/${encodeURIComponent(roomName)}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        participantName: participantName,
        participantIdentity: participantIdentity,
        role: role as 'instructor' | 'student',
        ...(metadata && { metadata }), // Include metadata if provided
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Failed to get token: ${errorText}`);
    }

    const { token, wsUrl } = await tokenResponse.json();

    // Return connection details
    const data: ConnectionDetails = {
      serverUrl: wsUrl,
      roomName: roomName,
      participantToken: token,
      participantName: participantName,
    };
    return new NextResponse(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `${COOKIE_KEY}=${randomParticipantPostfix}; Path=/; HttpOnly; SameSite=Strict; Secure; Expires=${getCookieExpirationTime()}`,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 500 });
    }
    return new NextResponse('Internal server error', { status: 500 });
  }
}

function getCookieExpirationTime(): string {
  var now = new Date();
  var time = now.getTime();
  var expireTime = time + 60 * 120 * 1000;
  now.setTime(expireTime);
  return now.toUTCString();
}
