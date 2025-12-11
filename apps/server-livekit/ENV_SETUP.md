# Cấu hình Environment Variables cho Recording

## ✅ Biến môi trường BẮT BUỘC (đã có sẵn)

Thêm vào file `.env` của `apps/server-livekit/`:

```env
# LiveKit Server Configuration
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
LIVEKIT_WS_URL=wss://your-livekit-server.com
LIVEKIT_HTTP_URL=https://your-livekit-server.com

# Server Port
PORT=3000
```

## 🔧 Biến môi trường TÙY CHỌN cho S3 Storage

**Nếu muốn lưu recordings lên S3**, thêm các biến sau:

```env
# AWS S3 Configuration (Optional)
S3_ACCESS_KEY=your-s3-access-key
S3_SECRET_KEY=your-s3-secret-key
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
# S3_ENDPOINT=https://s3.amazonaws.com  # Chỉ cần nếu dùng S3-compatible storage
# S3_FORCE_PATH_STYLE=false  # Set true cho MinIO, Cloudflare R2, etc.
```

### ⚠️ Lưu ý quan trọng:

1. **Không bắt buộc S3**: Nếu không thêm các biến S3, recordings sẽ được lưu local trên LiveKit Egress server (đủ cho testing)

2. **Production nên dùng S3**: Để lưu trữ lâu dài và dễ truy cập

3. **S3-Compatible Storage**: 
   - **Cloudflare R2**: `S3_ENDPOINT=https://account-id.r2.cloudflarestorage.com`, `S3_FORCE_PATH_STYLE=true`, `S3_REGION` không cần thiết (có thể để trống hoặc dùng "auto")
   - MinIO: `S3_ENDPOINT=http://localhost:9000`, `S3_FORCE_PATH_STYLE=true`
   - DigitalOcean Spaces: `S3_ENDPOINT=https://region.digitaloceanspaces.com`, `S3_FORCE_PATH_STYLE=false`

## 📝 Ví dụ file .env hoàn chỉnh

### Ví dụ với Cloudflare R2 (Khuyến nghị cho production)

```env
# LiveKit
LIVEKIT_API_KEY=APxxxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxx
LIVEKIT_WS_URL=wss://your-project.livekit.cloud
LIVEKIT_HTTP_URL=https://your-project.livekit.cloud

# Server
PORT=3000

# Cloudflare R2 Storage
S3_ACCESS_KEY=your-r2-access-key-id
S3_SECRET_KEY=your-r2-secret-access-key
S3_BUCKET=your-bucket-name
S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
S3_FORCE_PATH_STYLE=true
# S3_REGION không cần thiết cho R2, có thể để trống hoặc dùng "auto"
```

### Ví dụ với AWS S3

```env
# LiveKit
LIVEKIT_API_KEY=APxxxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxx
LIVEKIT_WS_URL=wss://your-project.livekit.cloud
LIVEKIT_HTTP_URL=https://your-project.livekit.cloud

# Server
PORT=3000

# AWS S3 Storage
S3_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
S3_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_BUCKET=my-recordings-bucket
S3_REGION=us-east-1
# S3_ENDPOINT và S3_FORCE_PATH_STYLE không cần cho AWS S3
```

Sau khi cấu hình, restart backend server để áp dụng thay đổi.
