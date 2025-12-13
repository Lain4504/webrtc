import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { RequestTokenDto } from './dto/request-token.dto';
import { StartRecordingDto } from './dto/start-recording.dto';
import type { RoomRecord } from './room.service';
import { RoomService } from './room.service';

@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get()
  listRooms() {
    return this.roomService.listRooms();
  }

  @Post()
  createRoom(@Body() dto: CreateRoomDto): Promise<RoomRecord> {
    return this.roomService.createRoom(dto);
  }

  @Get(':id')
  getRoom(@Param('id') id: string): RoomRecord {
    return this.roomService.getRoom(id);
  }

  @Delete(':id')
  deleteRoom(@Param('id') id: string): Promise<void> {
    return this.roomService.deleteRoom(id);
  }

  @Post(':id/token')
  requestToken(
    @Param('id') id: string,
    @Body() dto: RequestTokenDto,
  ): Promise<{ token: string; wsUrl: string }> {
    return this.roomService.createToken(id, dto);
  }

  @Post(':id/recording/start')
  startRecording(
    @Param('id') id: string,
    @Body() dto?: StartRecordingDto,
  ): Promise<{ egressId: string }> {
    return this.roomService.startRecording(id, dto);
  }

  @Post('recording/:egressId/stop')
  stopRecording(@Param('egressId') egressId: string): Promise<void> {
    return this.roomService.stopRecording(egressId);
  }

  @Get('recording')
  listRecordings(@Param('id') id?: string): Promise<any[]> {
    return this.roomService.listRecordings(id);
  }

  @Get(':id/recording')
  listRoomRecordings(@Param('id') id: string): Promise<any[]> {
    return this.roomService.listRecordings(id);
  }
}
