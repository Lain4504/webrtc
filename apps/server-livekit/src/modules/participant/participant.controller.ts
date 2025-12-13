import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ParticipantService } from './participant.service';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { MuteTrackDto } from './dto/mute-track.dto';

@Controller('rooms/:roomId/participants')
export class ParticipantController {
  constructor(private readonly participantService: ParticipantService) {}

  @Get()
  listParticipants(@Param('roomId') roomId: string) {
    return this.participantService.listParticipants(roomId);
  }

  @Get(':identity')
  getParticipant(
    @Param('roomId') roomId: string,
    @Param('identity') identity: string,
  ) {
    return this.participantService.getParticipant(roomId, identity);
  }

  @Patch(':identity')
  updateParticipant(
    @Param('roomId') roomId: string,
    @Param('identity') identity: string,
    @Body() dto: UpdateParticipantDto,
  ) {
    return this.participantService.updateParticipant(roomId, identity, dto);
  }

  @Delete(':identity')
  removeParticipant(
    @Param('roomId') roomId: string,
    @Param('identity') identity: string,
  ): Promise<void> {
    return this.participantService.removeParticipant(roomId, identity);
  }

  @Post(':identity/mute')
  muteTrack(
    @Param('roomId') roomId: string,
    @Param('identity') identity: string,
    @Body() dto: MuteTrackDto,
  ): Promise<void> {
    return this.participantService.mutePublishedTrack(roomId, identity, dto);
  }
}
