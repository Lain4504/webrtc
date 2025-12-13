import { Module } from '@nestjs/common';
import { ParticipantController } from './participant.controller';
import { ParticipantService } from './participant.service';
import { LivekitModule } from '../livekit/livekit.module';
import { RoomModule } from '../room/room.module';

@Module({
  imports: [LivekitModule, RoomModule],
  controllers: [ParticipantController],
  providers: [ParticipantService],
})
export class ParticipantModule {}
