import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { RequestTokenDto } from './dto/request-token.dto';
import type { RoomRecord } from './room.service';
import { RoomService } from './room.service';

@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  createRoom(@Body() dto: CreateRoomDto): Promise<RoomRecord> {
    return this.roomService.createRoom(dto);
  }

  @Get(':id')
  getRoom(@Param('id') id: string): RoomRecord {
    return this.roomService.getRoom(id);
  }

  @Post(':id/token')
  requestToken(
    @Param('id') id: string,
    @Body() dto: RequestTokenDto,
  ): Promise<{ token: string; wsUrl: string }> {
    return this.roomService.createToken(id, dto);
  }
}
