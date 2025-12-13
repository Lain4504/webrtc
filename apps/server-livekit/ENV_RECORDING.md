# Environment Variables cho Recording Feature

## Biến môi trường bắt buộc (đã có sẵn)

Các biến này đã được sử dụng trong `LivekitService`:

```env
# LiveKit Server Configuration
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
LIVEKIT_WS_URL=wss://your-livekit-server.com
LIVEKIT_HTTP_URL=https://your-livekit-server.com

# Server Port
PORT=3000
```

## Biến môi trường tùy chọn cho S3 Storage

Nếu bạn muốn lưu recordings lên S3 (hoặc S3-compatible storage), bạn có thể thêm các biến sau:

```env
# AWS S3 Configuration (Optional - chỉ cần nếu muốn lưu recordings lên S3)
S3_ACCESS_KEY=your-s3-access-key
S3_SECRET_KEY=your-s3-secret-key
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
S3_ENDPOINT=https://s3.amazonaws.com  # Optional, chỉ cần nếu dùng S3-compatible storage
S3_FORCE_PATH_STYLE=false  # Set true cho S3-compatible storage như MinIO, Cloudflare R2, etc.
```

## Lưu ý

1. **Không bắt buộc S3**: Nếu không cấu hình S3, recordings sẽ được lưu local trên LiveKit Egress server (phù hợp cho testing)

2. **Production**: Nên cấu hình S3 hoặc cloud storage khác (GCP, Azure) để:
   - Lưu trữ recordings lâu dài
   - Dễ dàng truy cập và chia sẻ
   - Tự động backup

3. **S3-Compatible Storage**: Nếu dùng MinIO, Cloudflare R2, DigitalOcean Spaces, etc.:
   - Set `S3_ENDPOINT` thành URL của storage provider
   - Set `S3_FORCE_PATH_STYLE=true`
   - Set `S3_REGION` phù hợp (hoặc để trống nếu không áp dụng)

## Ví dụ cấu hình

### AWS S3

```env
S3_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
S3_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_BUCKET=my-recordings-bucket
S3_REGION=us-east-1
```

### Cloudflare R2

```env
S3_ACCESS_KEY=your-r2-access-key-id
S3_SECRET_KEY=your-r2-secret-access-key
S3_BUCKET=my-recordings-bucket
S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
S3_FORCE_PATH_STYLE=true
S3_REGION=auto
```

### MinIO (Local)

```env
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=recordings
S3_ENDPOINT=http://localhost:9000
S3_FORCE_PATH_STYLE=true
S3_REGION=us-east-1
```
