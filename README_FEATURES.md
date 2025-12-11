# 🎓 WebRTC E-Learning Platform - Tính năng

## 📋 Tổng quan nhanh

Nền tảng e-learning trực tuyến với đầy đủ tính năng cho việc học tiếng Nhật online, được xây dựng trên LiveKit WebRTC.

---

## ✨ 12 Tính năng chính

| # | Tính năng | Mô tả | Vị trí |
|---|-----------|-------|--------|
| 1 | 🎥 **Video/Audio** | Video call đa người, controls, adaptive streaming | Main area + Footer |
| 2 | 📺 **Screen Share** | Chia sẻ màn hình với audio | Footer button |
| 3 | 💬 **Chat** | Real-time messaging | Sidebar tab "Chat" |
| 4 | 📊 **Polls** | Tạo poll, voting, real-time results | Sidebar tab "Polls" |
| 5 | 📁 **File Sharing** | Upload/download files | Sidebar tab "Files" |
| 6 | 🎭 **Reactions** | Emoji reactions real-time | Footer buttons |
| 7 | ⏱️ **Timer** | Countdown timer với sync | Sidebar bottom |
| 8 | 📝 **Attendance** | Tracking + CSV export | Sidebar top |
| 9 | ✋ **Raise Hand** | Giơ tay để phát biểu | Footer button |
| 10 | 🎨 **Whiteboard** | Bảng trắng cộng tác | Toggle từ menu |
| 11 | 👥 **Participants** | Danh sách với status indicators | Sidebar top |
| 12 | 🎬 **Recording** | Ghi lại bài giảng (instructor only) | Header + Sidebar tab |

---

## 🎯 Phân quyền

### 👨‍🏫 **Instructor** (Giảng viên)
- ✅ Tất cả quyền của Student
- ✅ Start/Stop recording
- ✅ Tạo và quản lý polls
- ✅ Upload files
- ✅ Control timer
- ✅ Export attendance
- ✅ Vẽ trên whiteboard

### 👨‍🎓 **Student** (Học viên)
- ✅ Join room, video/audio
- ✅ Chat, vote polls, download files
- ✅ Gửi reactions, raise hand
- ✅ Xem timer, whiteboard (read-only)
- ✅ Xem recordings list

---

## 🏗️ Cấu trúc Components

```
apps/web-livekit/src/app/room/[roomId]/
├── room-client.tsx          # Main entry point
├── components/
│   ├── video-grid.tsx        # Video display
│   ├── participants-panel.tsx # Participants list
│   ├── chat-panel.tsx        # Chat
│   ├── poll-panel.tsx        # Polls
│   ├── file-sharing-panel.tsx # File sharing
│   ├── reactions-panel.tsx   # Reactions
│   ├── timer-panel.tsx       # Timer
│   ├── attendance-panel.tsx  # Attendance
│   ├── whiteboard-panel.tsx  # Whiteboard
│   ├── screen-share-button.tsx # Screen share
│   ├── recording-panel.tsx  # Recording controls
│   └── recordings-list.tsx  # Recordings list
```

---

## 🔧 Cấu hình nhanh

### Backend (`.env`)
```env
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_WS_URL=wss://...
LIVEKIT_HTTP_URL=https://...

# Optional: S3 for recordings
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET=...
S3_ENDPOINT=...  # For Cloudflare R2
S3_FORCE_PATH_STYLE=true
```

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_WS_URL=wss://...
```

---

## 🚀 Quick Start

1. **Start Backend**:
   ```bash
   cd apps/server-livekit
   npm install
   npm run start:dev
   ```

2. **Start Frontend**:
   ```bash
   cd apps/web-livekit
   npm install
   npm run dev
   ```

3. **Truy cập**: `http://localhost:3000/room/[roomId]`

---

## 📡 Data Channels

| Topic | Mục đích | Reliability |
|-------|----------|-------------|
| `chat` | Text messages | Reliable (Text Stream API) |
| `poll` | Polls & voting | Reliable |
| `file-sharing` | File metadata | Reliable |
| `reactions` | Emoji reactions | Unreliable (speed) |
| `timer` | Timer sync | Reliable |
| `participant-state` | Raise hand fallback | Reliable |

---

## 🎨 UI Layout

```
┌─────────────────────────────────────────────────┐
│ Header: [Recording] [Status] [Menu]            │
├─────────────────────┬───────────────────────────┤
│                     │ Sidebar:                  │
│                     │ - Participants            │
│   Main Area         │ - Attendance              │
│   (Video/Whiteboard)│ - Tabs: Chat/Polls/Files │
│                     │ - Recordings              │
│                     │ - Timer                   │
├─────────────────────┴───────────────────────────┤
│ Footer: [Controls] [Reactions] [Raise Hand] [SS]│
└─────────────────────────────────────────────────┘
```

---

## 📝 Ghi chú

- ✅ Tất cả tính năng đã được test và hoạt động
- ✅ Có fallback mechanisms cho reliability
- ✅ Responsive design cho mobile và desktop
- ✅ Real-time synchronization cho tất cả features
- ✅ Role-based permissions được implement đầy đủ

---

**Xem chi tiết**: [FEATURES_SUMMARY.md](./FEATURES_SUMMARY.md)
