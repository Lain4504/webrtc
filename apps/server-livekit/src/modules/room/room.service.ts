import { Injectable, NotFoundException } from '@nestjs/common';
import { LivekitService } from '../livekit/livekit.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { RequestTokenDto } from './dto/request-token.dto';

export interface RoomRecord {
  id: string;
  name: string;
  maxParticipants?: number;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class RoomService {
  private readonly rooms = new Map<string, RoomRecord>();

  constructor(private readonly livekitService: LivekitService) {}

  async createRoom(dto: CreateRoomDto): Promise<RoomRecord> {
    await this.livekitService.ensureRoom(dto.name);
    const room: RoomRecord = {
      id: dto.name,
      name: dto.name,
      maxParticipants: dto.maxParticipants,
      metadata: dto.metadata,
    };
    this.rooms.set(room.id, room);
    return room;
  }

  getRoom(id: string): RoomRecord {
    const room = this.rooms.get(id);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }

  async createToken(
    roomId: string,
    dto: RequestTokenDto,
  ): Promise<{ token: string; wsUrl: string }> {
    const room = this.getRoom(roomId);
    const token = await this.livekitService.createToken({
      roomName: room.name,
      identity: dto.participantIdentity,
      name: dto.participantName,
      role: dto.role,
    });

    return {
      token,
      wsUrl: this.livekitService.getWsUrl(),
    };
  }
}
