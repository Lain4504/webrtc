# Webhook Setup Guide

## Cấu hình Webhook cho LiveKit

Sau khi đã implement webhook handler, bạn cần cấu hình LiveKit server để gửi webhooks đến backend.

### 1. Cấu hình LiveKit Server (Self-hosted)

Thêm vào file config của LiveKit (`livekit.yaml`):

```yaml
webhook:
  # API key để sign webhook messages
  # Phải match với LIVEKIT_API_KEY trong backend
  api_key: 'your-api-key'
  urls:
    - 'https://your-backend-domain.com/webhooks/livekit'
    # Hoặc cho development:
    # - 'http://localhost:3000/webhooks/livekit' (nếu dùng ngrok/tunneling)
```

### 2. Cấu hình LiveKit Cloud

Nếu bạn dùng LiveKit Cloud:

1. Đăng nhập vào [LiveKit Cloud Dashboard](https://cloud.livekit.io)
2. Vào **Settings** → **Webhooks**
3. Thêm webhook URL: `https://your-backend-domain.com/webhooks/livekit`
4. Chọn events cần nhận (hoặc chọn tất cả):
   - ✅ Room Started
   - ✅ Room Finished
   - ✅ Participant Joined
   - ✅ Participant Left
   - ✅ Track Published
   - ✅ Track Unpublished
   - ✅ Egress Started
   - ✅ Egress Updated
   - ✅ Egress Ended

### 3. Environment Variables

Đảm bảo backend có các biến môi trường:

```env
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
LIVEKIT_WS_URL=wss://your-livekit-server.com
LIVEKIT_HTTP_URL=https://your-livekit-server.com
```

### 4. Testing Webhooks (Development)

Để test webhooks trong development, bạn có thể:

#### Option 1: Sử dụng ngrok
```bash
# Install ngrok
npm install -g ngrok

# Start ngrok tunnel
ngrok http 3000

# Sử dụng URL từ ngrok trong LiveKit config
# Ví dụ: https://abc123.ngrok.io/webhooks/livekit
```

#### Option 2: Sử dụng localtunnel
```bash
# Install localtunnel
npm install -g localtunnel

# Start tunnel
lt --port 3000

# Sử dụng URL từ localtunnel trong LiveKit config
```

### 5. Verify Webhook Signature

Webhook handler tự động verify signature từ LiveKit. Nếu signature không hợp lệ, request sẽ bị reject.

### 6. Webhook Events được xử lý

Backend hiện tại xử lý các events sau:

- `room_started` - Khi room bắt đầu
- `room_finished` - Khi room kết thúc
- `participant_joined` - Khi participant join
- `participant_left` - Khi participant leave
- `participant_connection_aborted` - Khi connection bị abort
- `track_published` - Khi track được publish
- `track_unpublished` - Khi track được unpublish
- `egress_started` - Khi recording bắt đầu
- `egress_updated` - Khi recording update
- `egress_ended` - Khi recording kết thúc
- `ingress_started` - Khi ingress bắt đầu
- `ingress_ended` - Khi ingress kết thúc

### 7. Next Steps

Để lưu trữ data từ webhooks, bạn cần:

1. **Setup Database** (PostgreSQL/MongoDB)
2. **Create Entities/Schemas** cho:
   - Room sessions
   - Attendance records
   - Recording metadata
3. **Update WebhookService** để lưu vào database thay vì chỉ log

Xem TODO comments trong `webhook.service.ts` để biết chỗ cần implement.

### 8. Error Handling

Webhook handler có error handling và logging. Nếu có lỗi, check logs để debug:

```bash
# Xem logs
npm run start:dev
# Hoặc trong production
pm2 logs server-livekit
```

### 9. Webhook Retry

LiveKit tự động retry nếu webhook delivery fails. Backend nên handle idempotency để tránh duplicate data.
