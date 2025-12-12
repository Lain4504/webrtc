# Đánh giá Code Server LiveKit

## Tổng quan
So sánh code backend hiện tại với tài liệu chính thức của LiveKit về:
- Token generation
- Room management  
- Participant management
- Webhooks

---

## ✅ 1. TOKEN GENERATION - ĐÃ HOÀN CHỈNH

### Code hiện tại (`livekit.service.ts`)
```typescript
async createToken(input: CreateTokenInput): Promise<string> {
  const token = new AccessToken(this.apiKey, this.apiSecret, {
    identity: input.identity,
    name: input.name,
  });

  token.addGrant({
    roomJoin: true,
    room: input.roomName,
    canPublish: true,
    canPublishSources: [...],
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: true,
    roomCreate: input.role === 'instructor',
    roomAdmin: input.role === 'instructor',
    roomRecord: input.role === 'instructor',
  });

  token.metadata = JSON.stringify({
    role: input.role,
  });

  return token.toJwt();
}
```

### So sánh với Docs
✅ **Đúng format**: Sử dụng `AccessToken` từ `livekit-server-sdk`  
✅ **Đúng cấu trúc**: `apiKey`, `apiSecret`, `identity`, `name`  
✅ **Đúng grants**: `roomJoin`, `room`, và các permissions  
✅ **Có metadata**: Lưu role vào metadata  
✅ **TTL**: Mặc định sử dụng TTL mặc định (có thể thêm tùy chọn)

### Đề xuất cải thiện
- [ ] Thêm TTL (Time-To-Live) tùy chọn cho token
- [ ] Validate roomName trước khi tạo token

---

## ⚠️ 2. ROOM MANAGEMENT - THIẾU MỘT SỐ TÍNH NĂNG

### ✅ Đã có

#### Create Room
```typescript
// room.service.ts
async createRoom(dto: CreateRoomDto): Promise<RoomRecord> {
  await this.livekitService.ensureRoom(dto.name);
  // ...
}

// livekit.service.ts  
async ensureRoom(roomName: string): Promise<void> {
  const client = this.getRoomClient();
  const rooms = await client.listRooms();
  const exists = rooms.some((room) => room.name === roomName);
  if (!exists) {
    await client.createRoom({ name: roomName });
  }
}
```

✅ **Đúng format**: Sử dụng `RoomServiceClient.createRoom()`  
✅ **Có validation**: Kiểm tra room đã tồn tại trước khi tạo

### ❌ Thiếu

#### List Rooms
**Theo docs:**
```typescript
roomService.listRooms().then((rooms: Room[]) => {
  console.log('existing rooms', rooms);
});
```

**Code hiện tại:** Chỉ dùng `listRooms()` trong `ensureRoom()`, không có endpoint public.

**Cần thêm:**
```typescript
// room.controller.ts
@Get()
async listRooms(): Promise<Room[]> {
  return this.roomService.listRooms();
}

// room.service.ts
async listRooms(): Promise<Room[]> {
  const client = this.livekitService.getRoomClient();
  return client.listRooms();
}
```

#### Delete Room
**Theo docs:**
```typescript
roomService.deleteRoom('myroom').then(() => {
  console.log('room deleted');
});
```

**Code hiện tại:** Không có.

**Cần thêm:**
```typescript
// room.controller.ts
@Delete(':id')
async deleteRoom(@Param('id') id: string): Promise<void> {
  return this.roomService.deleteRoom(id);
}

// room.service.ts
async deleteRoom(roomId: string): Promise<void> {
  const room = this.getRoom(roomId);
  const client = this.livekitService.getRoomClient();
  await client.deleteRoom(room.name);
  this.rooms.delete(roomId);
}
```

### Đề xuất cải thiện
- [ ] Thêm endpoint `GET /rooms` để list tất cả rooms
- [ ] Thêm endpoint `DELETE /rooms/:id` để xóa room
- [ ] Thêm options cho `createRoom`: `emptyTimeout`, `maxParticipants`
- [ ] Expose `getRoomClient()` method trong `LivekitService` hoặc tạo wrapper methods

---

## ❌ 3. PARTICIPANT MANAGEMENT - HOÀN TOÀN THIẾU

### Theo tài liệu LiveKit, cần có:

#### List Participants
```typescript
const res = await roomService.listParticipants(roomName);
```

#### Get Participant Details
```typescript
const res = await roomService.getParticipant(roomName, identity);
```

#### Update Participant (Permissions/Metadata)
```typescript
await roomService.updateParticipant(roomName, identity, undefined, {
  canPublish: true,
  canSubscribe: true,
  canPublishData: true,
});
```

#### Remove Participant
```typescript
await roomService.removeParticipant(roomName, identity);
```

#### Mute/Unmute Participant Track
```typescript
await roomService.mutePublishedTrack(roomName, identity, 'track_sid', true);
```

### Code hiện tại: KHÔNG CÓ

### Cần implement:

**1. Tạo Participant Controller:**
```typescript
// participant.controller.ts
@Controller('rooms/:roomId/participants')
export class ParticipantController {
  @Get()
  async listParticipants(@Param('roomId') roomId: string) { }

  @Get(':identity')
  async getParticipant(@Param('roomId') roomId: string, @Param('identity') identity: string) { }

  @Patch(':identity')
  async updateParticipant(@Param('roomId') roomId: string, @Param('identity') identity: string, @Body() dto: UpdateParticipantDto) { }

  @Delete(':identity')
  async removeParticipant(@Param('roomId') roomId: string, @Param('identity') identity: string) { }

  @Post(':identity/mute')
  async muteTrack(@Param('roomId') roomId: string, @Param('identity') identity: string, @Body() dto: MuteTrackDto) { }
}
```

**2. Thêm methods vào LivekitService:**
```typescript
async listParticipants(roomName: string) { }
async getParticipant(roomName: string, identity: string) { }
async updateParticipant(roomName: string, identity: string, options: UpdateParticipantOptions) { }
async removeParticipant(roomName: string, identity: string) { }
async mutePublishedTrack(roomName: string, identity: string, trackSid: string, muted: boolean) { }
```

---

## ❌ 4. WEBHOOKS - HOÀN TOÀN THIẾU

### Theo tài liệu LiveKit:

Webhooks cho phép LiveKit gửi thông báo đến server khi có events:
- `room_started`
- `room_finished`
- `participant_joined`
- `participant_left`
- `track_published`
- `track_unpublished`
- `egress_started`
- `egress_updated`
- `egress_ended`

### Code hiện tại: KHÔNG CÓ

### Cần implement:

**1. Tạo Webhook Controller:**
```typescript
// webhook.controller.ts
import { WebhookReceiver } from 'livekit-server-sdk';
import { Controller, Post, Req, Headers, RawBodyRequest } from '@nestjs/common';

@Controller('webhooks')
export class WebhookController {
  private receiver: WebhookReceiver;

  constructor(private configService: ConfigService) {
    this.receiver = new WebhookReceiver(
      this.configService.get('LIVEKIT_API_KEY'),
      this.configService.get('LIVEKIT_API_SECRET'),
    );
  }

  @Post('livekit')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('authorization') auth: string,
  ) {
    const event = await this.receiver.receive(req.body, auth);
    
    switch (event.event) {
      case 'room_started':
        // Handle room started
        break;
      case 'room_finished':
        // Handle room finished
        break;
      case 'participant_joined':
        // Handle participant joined
        break;
      // ... other events
    }
  }
}
```

**2. Cấu hình Express để nhận raw body:**
```typescript
// main.ts
app.use('/webhooks/livekit', express.raw({ type: 'application/webhook+json' }));
```

**3. Cấu hình webhook URL trong LiveKit config:**
```yaml
webhook:
  api_key: 'api-key-to-sign-with'
  urls:
    - 'https://yourhost/webhooks/livekit'
```

---

## 📊 TỔNG KẾT

| Tính năng | Trạng thái | Độ hoàn chỉnh |
|-----------|------------|---------------|
| Token Generation | ✅ Hoàn chỉnh | 100% |
| Room Management - Create | ✅ Hoàn chỉnh | 100% |
| Room Management - List | ❌ Thiếu | 0% |
| Room Management - Delete | ❌ Thiếu | 0% |
| Participant Management | ❌ Thiếu hoàn toàn | 0% |
| Webhooks | ❌ Thiếu hoàn toàn | 0% |

### Đánh giá tổng thể: **40% hoàn chỉnh**

---

## 🎯 ƯU TIÊN IMPLEMENT

### Priority 1 (Quan trọng)
1. ✅ Token Generation - Đã có
2. ⚠️ List Rooms - Cần thêm endpoint
3. ⚠️ Delete Room - Cần thêm endpoint
4. ❌ Webhooks - Cần implement để track events

### Priority 2 (Hữu ích)
5. ❌ Participant Management - List, Get, Remove
6. ❌ Participant Management - Update permissions/metadata
7. ❌ Participant Management - Mute/Unmute tracks

---

## 📝 GHI CHÚ

1. **Token TTL**: Hiện tại sử dụng TTL mặc định. Có thể thêm option để set TTL tùy chỉnh.

2. **Room Options**: `createRoom` hiện tại chỉ set `name`. Có thể thêm `emptyTimeout`, `maxParticipants` từ DTO.

3. **Error Handling**: Cần thêm error handling cho các API calls đến LiveKit.

4. **Validation**: Cần validate roomName, identity, trackSid trước khi gọi LiveKit APIs.

5. **Security**: Webhook endpoint cần được bảo vệ bằng authentication (đã có trong WebhookReceiver).
