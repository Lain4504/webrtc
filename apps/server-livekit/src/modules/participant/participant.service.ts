import { Injectable, NotFoundException } from '@nestjs/common';
import { LivekitService } from '../livekit/livekit.service';
import { RoomService } from '../room/room.service';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { MuteTrackDto } from './dto/mute-track.dto';

@Injectable()
export class ParticipantService {
  constructor(
    private readonly livekitService: LivekitService,
    private readonly roomService: RoomService,
  ) {}

  async listParticipants(roomId: string) {
    const room = this.roomService.getRoom(roomId);
    return this.livekitService.listParticipants(room.name);
  }

  async getParticipant(roomId: string, identity: string) {
    const room = this.roomService.getRoom(roomId);
    return this.livekitService.getParticipant(room.name, identity);
  }

  async updateParticipant(
    roomId: string,
    identity: string,
    dto: UpdateParticipantDto,
  ) {
    const room = this.roomService.getRoom(roomId);
    return this.livekitService.updateParticipant(room.name, identity, {
      name: dto.name,
      metadata: dto.metadata,
      permission: dto.permission
        ? {
            canSubscribe: dto.permission.canSubscribe,
            canPublish: dto.permission.canPublish,
            canPublishData: dto.permission.canPublishData,
            hidden: dto.permission.hidden,
            recorder: dto.permission.recorder,
          }
        : undefined,
    });
  }

  async removeParticipant(roomId: string, identity: string): Promise<void> {
    const room = this.roomService.getRoom(roomId);
    await this.livekitService.removeParticipant(room.name, identity);
  }

  async mutePublishedTrack(
    roomId: string,
    identity: string,
    dto: MuteTrackDto,
  ): Promise<void> {
    const room = this.roomService.getRoom(roomId);
    await this.livekitService.mutePublishedTrack(
      room.name,
      identity,
      dto.trackSid,
      dto.muted,
    );
  }
}
