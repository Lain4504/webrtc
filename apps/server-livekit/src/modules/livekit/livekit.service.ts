import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccessToken,
  RoomServiceClient,
  TrackSource,
} from 'livekit-server-sdk';

export type LivekitRole = 'instructor' | 'student';

export interface CreateTokenInput {
  roomName: string;
  identity: string;
  name: string;
  role: LivekitRole;
}

@Injectable()
export class LivekitService {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly wsUrl: string;
  private readonly httpUrl: string;
  private roomClient: RoomServiceClient | null = null;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.getOrThrow<string>('LIVEKIT_API_KEY');
    this.apiSecret =
      this.configService.getOrThrow<string>('LIVEKIT_API_SECRET');
    this.wsUrl = this.configService.getOrThrow<string>('LIVEKIT_WS_URL');
    this.httpUrl = this.configService.getOrThrow<string>('LIVEKIT_HTTP_URL');
  }

  private getRoomClient(): RoomServiceClient {
    if (!this.roomClient) {
      this.roomClient = new RoomServiceClient(
        this.httpUrl,
        this.apiKey,
        this.apiSecret,
      );
    }
    return this.roomClient;
  }

  async ensureRoom(roomName: string): Promise<void> {
    const client = this.getRoomClient();
    const rooms = await client.listRooms();
    const exists = rooms.some((room) => room.name === roomName);
    if (!exists) {
      await client.createRoom({ name: roomName });
    }
  }

  async createToken(input: CreateTokenInput): Promise<string> {
    const token = new AccessToken(this.apiKey, this.apiSecret, {
      identity: input.identity,
      name: input.name,
    });

    token.addGrant({
      roomJoin: true,
      room: input.roomName,
      canPublish: true,
      canPublishSources: [
        TrackSource.CAMERA,
        TrackSource.MICROPHONE,
        TrackSource.SCREEN_SHARE,
        TrackSource.SCREEN_SHARE_AUDIO,
      ],
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
      roomCreate: input.role === 'instructor',
      roomAdmin: input.role === 'instructor',
    });

    token.metadata = JSON.stringify({
      role: input.role,
    });

    return token.toJwt();
  }

  getWsUrl(): string {
    return this.wsUrl;
  }
}
