import { Module } from '@nestjs/common';
import { LivekitModule } from '../livekit/livekit.module';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';

@Module({
  imports: [LivekitModule],
  controllers: [RoomController],
  providers: [RoomService],
  exports: [RoomService], // Export RoomService để các module khác có thể sử dụng
})
export class RoomModule {}
