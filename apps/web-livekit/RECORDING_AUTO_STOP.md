# Khi nào Recording sẽ tự động tắt?

## 🛑 Recording sẽ tự động tắt trong các trường hợp sau:

### 1. **Giảng viên nhấn nút "Stop Recording"** ✅
   - Giảng viên có thể dừng recording bất cứ lúc nào bằng cách nhấn nút "Stop Recording"
   - File sẽ được lưu ngay sau khi dừng

### 2. **Room kết thúc (tất cả participants rời khỏi room)** ✅
   - Theo LiveKit docs, **Room Composite Egress tự động stop khi room kết thúc**
   - Khi tất cả participants (bao gồm giảng viên) rời khỏi room, recording sẽ tự động dừng
   - File sẽ được lưu tự động

### 3. **Connection bị mất/ngắt kết nối** ✅
   - Nếu connection bị ngắt (mất mạng, server down, etc.)
   - Code sẽ tự động detect và stop recording
   - File sẽ được lưu nếu đã ghi được một phần

### 4. **Giảng viên rời khỏi trang/đóng tab** ✅
   - Khi giảng viên đóng tab hoặc rời khỏi trang
   - Component sẽ cleanup và tự động stop recording
   - File sẽ được lưu tự động

## ⚠️ Lưu ý quan trọng:

1. **Recording không tự động tắt khi:**
   - Chỉ có học viên rời khỏi room (giảng viên vẫn còn)
   - Giảng viên refresh trang (nếu vẫn còn trong room)
   - Mất kết nối tạm thời nhưng tự động reconnect

2. **Best Practice:**
   - Giảng viên nên **chủ động nhấn "Stop Recording"** khi kết thúc buổi học
   - Điều này đảm bảo file được lưu đúng lúc và không bị mất dữ liệu

3. **File Location:**
   - Nếu đã cấu hình S3 (Cloudflare R2), file sẽ được upload lên bucket tự động
   - Nếu không có S3, file sẽ được lưu trên LiveKit Egress server

## 🔍 Cách kiểm tra:

1. Xem trong tab "Recordings" để thấy danh sách các recordings đã hoàn thành
2. Kiểm tra Cloudflare R2 bucket (nếu đã cấu hình) để xem file đã được upload chưa
3. Xem status của recording: "EGRESS_COMPLETE" = đã hoàn thành, "EGRESS_ACTIVE" = đang ghi
