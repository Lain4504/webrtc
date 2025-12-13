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
    // This is required because listRecordings requires room to exist in RoomService's Map
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
    if (!createRoomResponse.ok && createRoomResponse.status !== 409) {
      const errorText = await createRoomResponse.text().catch(() => 'Unknown error');
      console.warn('Room creation warning when stopping recording:', errorText);
    }

    // List recordings for the room to find active egress
    const listResponse = await fetch(
      `${serverLiveKitUrl}/rooms/${encodeURIComponent(roomName)}/recording`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error('Failed to list recordings from server-livekit:', {
        status: listResponse.status,
        error: errorText,
        roomName,
      });
      return new NextResponse(
        JSON.stringify({ message: `Failed to list recordings: ${errorText}` }),
        {
          status: listResponse.status,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const recordings = await listResponse.json();
    // Filter active recordings
    // Status can be: number (0=EGRESS_STARTING, 1=EGRESS_ACTIVE, 2=EGRESS_COMPLETE, 3=EGRESS_FAILED)
    // Or string: "EGRESS_STARTING", "EGRESS_ACTIVE", etc.
    const activeRecordings = recordings.filter((recording: any) => {
      const status = recording.status;
      if (typeof status === 'number') {
        return status < 2; // 0 or 1 means active
      }
      if (typeof status === 'string') {
        return status === 'EGRESS_STARTING' || status === 'EGRESS_ACTIVE';
      }
      return false;
    });

    if (activeRecordings.length === 0) {
      // Return 200 with message instead of 404, as this is a valid state
      return new NextResponse(JSON.stringify({ message: 'No active recording found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Stop all active recordings
    const stopResults = await Promise.allSettled(
      activeRecordings.map(async (recording: any) => {
        const stopResponse = await fetch(
          `${serverLiveKitUrl}/rooms/recording/${recording.egressId}/stop`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );
        if (!stopResponse.ok) {
          const errorText = await stopResponse.text();
          throw new Error(`Failed to stop recording ${recording.egressId}: ${errorText}`);
        }
        return recording.egressId;
      }),
    );

    // Check if any failed
    const failures = stopResults.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      const errorMessages = failures.map((f: any) => f.reason?.message || 'Unknown error').join('; ');
      console.error('Some recordings failed to stop:', errorMessages);
      return new NextResponse(
        JSON.stringify({ message: `Some recordings failed to stop: ${errorMessages}` }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    return new NextResponse(
      JSON.stringify({
        message: `Successfully stopped ${activeRecordings.length} recording(s)`,
        stoppedCount: activeRecordings.length,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 500 });
    }
    return new NextResponse('Internal server error', { status: 500 });
  }
}
