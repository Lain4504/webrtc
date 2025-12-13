import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RoomModule } from './modules/room/room.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { ParticipantModule } from './modules/participant/participant.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RoomModule,
    WebhookModule,
    ParticipantModule,
  ],
})
export class AppModule {}
