import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccessToken,
  RoomServiceClient,
  TrackSource,
  EgressClient,
  EncodedFileOutput,
  S3Upload,
  EncodingOptionsPreset,
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
  private egressClient: EgressClient | null = null;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.getOrThrow<string>('LIVEKIT_API_KEY');
    this.apiSecret =
      this.configService.getOrThrow<string>('LIVEKIT_API_SECRET');
    this.wsUrl = this.configService.getOrThrow<string>('LIVEKIT_WS_URL');
    this.httpUrl = this.configService.getOrThrow<string>('LIVEKIT_HTTP_URL');
  }

  getRoomClientInstance(): RoomServiceClient {
    if (!this.roomClient) {
      this.roomClient = new RoomServiceClient(
        this.httpUrl,
        this.apiKey,
        this.apiSecret,
      );
    }
    return this.roomClient;
  }

  private getRoomClient(): RoomServiceClient {
    return this.getRoomClientInstance();
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
      roomRecord: input.role === 'instructor', // Only instructors can record
    });

    token.metadata = JSON.stringify({
      role: input.role,
    });

    return token.toJwt();
  }

  getWsUrl(): string {
    return this.wsUrl;
  }

  // Expose room client for use in other services
  getRoomClientPublic(): RoomServiceClient {
    return this.getRoomClientInstance();
  }

  // Room Management
  async listRooms() {
    const client = this.getRoomClient();
    return client.listRooms();
  }

  async deleteRoom(roomName: string): Promise<void> {
    const client = this.getRoomClient();
    await client.deleteRoom(roomName);
  }

  // Participant Management
  async listParticipants(roomName: string) {
    const client = this.getRoomClient();
    return client.listParticipants(roomName);
  }

  async getParticipant(roomName: string, identity: string) {
    const client = this.getRoomClient();
    return client.getParticipant(roomName, identity);
  }

  async updateParticipant(
    roomName: string,
    identity: string,
    options: {
      metadata?: string;
      name?: string;
      permission?: {
        canSubscribe?: boolean;
        canPublish?: boolean;
        canPublishData?: boolean;
        canPublishSources?: TrackSource[];
        hidden?: boolean;
        recorder?: boolean;
      };
    },
  ) {
    const client = this.getRoomClient();
    // LiveKit SDK supports two overloads:
    // 1. updateParticipant(room, identity, options: UpdateParticipantOptions)
    // 2. updateParticipant(room, identity, metadata?, permission?, name?)
    // Using the first overload with options object for clarity
    return client.updateParticipant(roomName, identity, {
      metadata: options.metadata,
      name: options.name,
      permission: options.permission as any, // Type assertion for permission object
    });
  }

  async removeParticipant(roomName: string, identity: string): Promise<void> {
    const client = this.getRoomClient();
    await client.removeParticipant(roomName, identity);
  }

  async mutePublishedTrack(
    roomName: string,
    identity: string,
    trackSid: string,
    muted: boolean,
  ): Promise<void> {
    const client = this.getRoomClient();
    await client.mutePublishedTrack(roomName, identity, trackSid, muted);
  }

  private getEgressClient(): EgressClient {
    if (!this.egressClient) {
      this.egressClient = new EgressClient(
        this.httpUrl,
        this.apiKey,
        this.apiSecret,
      );
    }
    return this.egressClient;
  }

  async startRecording(
    roomName: string,
    options?: {
      layout?: string;
      filepath?: string;
      s3Config?: {
        accessKey: string;
        secret: string;
        bucket: string;
        region?: string;
        endpoint?: string;
        forcePathStyle?: boolean;
      };
    },
  ): Promise<{ egressId: string }> {
    const client = this.getEgressClient();

    // Check for S3 config from environment variables if not provided
    const s3AccessKey =
      options?.s3Config?.accessKey ||
      this.configService.get<string>('S3_ACCESS_KEY');
    const s3Secret =
      options?.s3Config?.secret ||
      this.configService.get<string>('S3_SECRET_KEY');
    const s3Bucket =
      options?.s3Config?.bucket || this.configService.get<string>('S3_BUCKET');
    const s3Region =
      options?.s3Config?.region || this.configService.get<string>('S3_REGION');
    const s3Endpoint =
      options?.s3Config?.endpoint ||
      this.configService.get<string>('S3_ENDPOINT');
    const s3ForcePathStyle =
      options?.s3Config?.forcePathStyle ??
      this.configService.get<string>('S3_FORCE_PATH_STYLE') === 'true';

    // Configure file output
    let fileOutput: EncodedFileOutput;
    if (s3AccessKey && s3Secret && s3Bucket) {
      // Use S3 storage
      const s3Upload = new S3Upload({
        accessKey: s3AccessKey,
        secret: s3Secret,
        bucket: s3Bucket,
        ...(s3Region && { region: s3Region }),
        ...(s3Endpoint && { endpoint: s3Endpoint }),
        forcePathStyle: s3ForcePathStyle,
      });

      // Create EncodedFileOutput with S3 output
      // Using type assertion due to protobuf oneof type system
      fileOutput = new EncodedFileOutput({
        filepath: options?.filepath || `recordings/${roomName}-{time}.mp4`,
      });

      // Set S3 output using the output property with oneof pattern
      (fileOutput as any).output = {
        case: 's3',
        value: s3Upload,
      };
    } else {
      // Default: record to file without cloud storage (for local testing)
      // In production, you should configure S3/GCP/Azure via environment variables
      fileOutput = new EncodedFileOutput({
        filepath: options?.filepath || `recordings/${roomName}-{time}.mp4`,
      });
    }

    // Start room composite egress
    // Use overload 2: (roomName, output, layout?, options?, audioOnly?, videoOnly?, customBaseUrl?, audioMixing?)
    const info = await client.startRoomCompositeEgress(
      roomName,
      fileOutput,
      options?.layout || 'speaker',
      EncodingOptionsPreset.H264_1080P_30,
      false, // audioOnly
      false, // videoOnly
    );

    return { egressId: info.egressId };
  }

  async stopRecording(egressId: string): Promise<void> {
    const client = this.getEgressClient();
    await client.stopEgress(egressId);
  }

  async listRecordings(roomName?: string): Promise<any[]> {
    const client = this.getEgressClient();
    const list = await client.listEgress(roomName);
    return list || [];
  }
}
