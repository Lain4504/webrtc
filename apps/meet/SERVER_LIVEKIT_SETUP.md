# Server LiveKit Integration Setup

Dự án Meet đã được cập nhật để sử dụng APIs từ `server-livekit` thay vì tự tạo tokens và quản lý recordings trực tiếp.

## Cấu hình

### 1. Environment Variables

Thêm vào file `.env.local`:

```env
# URL của server-livekit backend
NEXT_PUBLIC_SERVER_LIVEKIT_URL=http://localhost:3001

# Recording endpoint - relative path to API routes for recording
# Khi set biến này, tính năng recording sẽ được kích hoạt trong SettingsMenu
NEXT_PUBLIC_LK_RECORD_ENDPOINT=/api/record

# Optional: Explicitly enable settings menu (tự động enable nếu có NEXT_PUBLIC_LK_RECORD_ENDPOINT)
# NEXT_PUBLIC_SHOW_SETTINGS_MENU=true
```

**Lưu ý:** 
- `NEXT_PUBLIC_SERVER_LIVEKIT_URL` phải trỏ đến địa chỉ của `server-livekit` backend
- Port mặc định của `server-livekit` là 3001
- Nếu bạn chạy `server-livekit` trên port khác, hãy cập nhật URL tương ứng
- `NEXT_PUBLIC_LK_RECORD_ENDPOINT` là relative path đến API routes (`/api/record`), không phải full URL
- Khi set `NEXT_PUBLIC_LK_RECORD_ENDPOINT`, SettingsMenu sẽ tự động được enable để hiển thị tab Recording

### 2. Các API Routes đã được cập nhật

#### `/api/connection-details`
- **Trước:** Tự tạo token trực tiếp từ LiveKit SDK
- **Sau:** Gọi `POST /rooms/:id/token` từ `server-livekit`

#### `/api/record/start`
- **Trước:** Tự khởi động recording trực tiếp từ LiveKit EgressClient
- **Sau:** Gọi `POST /rooms/:id/recording/start` từ `server-livekit`

#### `/api/record/stop`
- **Trước:** Tự dừng recording trực tiếp từ LiveKit EgressClient
- **Sau:** Gọi `GET /rooms/:id/recording` để lấy danh sách, sau đó gọi `POST /rooms/recording/:egressId/stop` từ `server-livekit`

### 3. Recording Feature trong UI

Khi `NEXT_PUBLIC_LK_RECORD_ENDPOINT` được set:
- SettingsMenu sẽ tự động được enable và hiển thị tab "Recording"
- Tab Recording hiển thị trạng thái recording hiện tại
- Có nút "Start Recording" / "Stop Recording" để điều khiển
- Sử dụng `useIsRecording()` hook từ `@livekit/components-react` để detect trạng thái

## Cách hoạt động

### Connection Details Flow:
1. Frontend gọi `/api/connection-details?roomName=xxx&participantName=yyy`
2. API route tự động tạo room trong `server-livekit` (nếu chưa tồn tại)
3. API route gọi `POST /rooms/:id/token` từ `server-livekit` với:
   - `participantName`: Tên người tham gia
   - `participantIdentity`: Tên + random postfix (để tránh trùng)
   - `role`: 'instructor' hoặc 'student' (mặc định là 'student')
4. Nhận về `token` và `wsUrl`, trả về cho frontend

### Recording Flow:
1. **Start Recording:**
   - Frontend gọi `/api/record/start?roomName=xxx`
   - API route tự động tạo room (nếu chưa tồn tại)
   - API route gọi `POST /rooms/:id/recording/start` từ `server-livekit`
   - `server-livekit` sẽ xử lý S3 config từ environment variables nếu có

2. **Stop Recording:**
   - Frontend gọi `/api/record/stop?roomName=xxx`
   - API route gọi `GET /rooms/:id/recording` để lấy danh sách recordings
   - Tìm các recording đang active (status < 2)
   - Gọi `POST /rooms/recording/:egressId/stop` cho mỗi active recording

## Yêu cầu

- `server-livekit` phải đang chạy và accessible từ `meet` app
- `server-livekit` phải được cấu hình đúng với LiveKit server credentials
- Đảm bảo CORS được cấu hình đúng trong `server-livekit` (đã có sẵn trong code)

## Testing

1. Đảm bảo `server-livekit` đang chạy:
   ```bash
   cd apps/server-livekit
   npm run start:dev
   ```

2. Đảm bảo `meet` app có environment variable đúng:
   ```bash
   cd apps/meet
   # Kiểm tra .env.local có NEXT_PUBLIC_SERVER_LIVEKIT_URL
   ```

3. Chạy `meet` app:
   ```bash
   cd apps/meet
   pnpm dev
   ```

4. Test connection: Truy cập room và kiểm tra xem có thể join được không
5. Test recording: 
   - Đảm bảo `NEXT_PUBLIC_LK_RECORD_ENDPOINT=/api/record` đã được set
   - Mở Settings menu (biểu tượng gear/settings) trong room
   - Tab "Recording" sẽ xuất hiện nếu env variable được set đúng
   - Click "Start Recording" để bắt đầu quay (chỉ instructor role mới có thể record)
   - Click "Stop Recording" để dừng quay
