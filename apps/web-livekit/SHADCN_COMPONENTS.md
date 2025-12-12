# Shadcn UI Components Used

Dưới đây là danh sách các shadcn UI components đã được sử dụng trong project. Bạn cần cài đặt các components này sau:

## Components đã sử dụng:

### 1. Button (`components/ui/button.tsx`)
- **Dependencies**: 
  - `@radix-ui/react-slot` (đã có trong package.json)
  - `class-variance-authority` (đã có trong package.json)
- **Usage**: Được sử dụng trong nhiều components
- **Install command**: 
  ```bash
  npx shadcn@latest add button
  ```

### 2. Input (`components/ui/input.tsx`)
- **Usage**: Được sử dụng trong `page.tsx`, `room-client.tsx`, `chat-panel.tsx`, `poll-panel.tsx`, `timer-panel.tsx`
- **Install command**: 
  ```bash
  npx shadcn@latest add input
  ```

### 3. Label (`components/ui/label.tsx`)
- **Usage**: Được sử dụng trong `page.tsx`, `room-client.tsx`
- **Install command**: 
  ```bash
  npx shadcn@latest add label
  ```

### 4. Select (`components/ui/select.tsx`)
- **Dependencies**: 
  - `@radix-ui/react-select` (cần cài đặt)
- **Usage**: Được sử dụng trong `room-client.tsx`
- **Install command**: 
  ```bash
  npx shadcn@latest add select
  ```

### 5. Card (`components/ui/card.tsx`)
- **Usage**: Được sử dụng trong `page.tsx`, `room-client.tsx`, `chat-panel.tsx`, `participants-panel.tsx`, `poll-panel.tsx`, `recording-panel.tsx`, `timer-panel.tsx`, `attendance-panel.tsx`, `file-sharing-panel.tsx`, `recordings-list.tsx`, `reactions-panel.tsx`
- **Install command**: 
  ```bash
  npx shadcn@latest add card
  ```

### 6. Badge (`components/ui/badge.tsx`)
- **Usage**: Được sử dụng trong `room-client.tsx`, `participants-panel.tsx`, `poll-panel.tsx`, `attendance-panel.tsx`, `recordings-list.tsx`
- **Install command**: 
  ```bash
  npx shadcn@latest add badge
  ```

### 7. Tabs (`components/ui/tabs.tsx`)
- **Dependencies**: 
  - `@radix-ui/react-tabs` (cần cài đặt)
- **Usage**: Được sử dụng trong `room-client.tsx` cho tab navigation
- **Install command**: 
  ```bash
  npx shadcn@latest add tabs
  ```

### 8. DropdownMenu (`components/ui/dropdown-menu.tsx`)
- **Dependencies**: 
  - `@radix-ui/react-dropdown-menu` (cần cài đặt)
- **Usage**: Được sử dụng trong `room-client.tsx` cho menu
- **Install command**: 
  ```bash
  npx shadcn@latest add dropdown-menu
  ```

### 9. Alert (`components/ui/alert.tsx`)
- **Usage**: Được sử dụng trong `recording-panel.tsx`, `timer-panel.tsx`, `recordings-list.tsx`
- **Install command**: 
  ```bash
  npx shadcn@latest add alert
  ```

### 10. Popover (`components/ui/popover.tsx`)
- **Dependencies**: 
  - `@radix-ui/react-popover` (cần cài đặt)
- **Usage**: Được sử dụng trong `reactions-panel.tsx`
- **Install command**: 
  ```bash
  npx shadcn@latest add popover
  ```

## Lưu ý:
- Các dependencies cần thiết (`@radix-ui/react-slot`, `class-variance-authority`, `clsx`, `tailwind-merge`) đã có trong `package.json`
- Các component đã được import và sử dụng trong code, bạn chỉ cần chạy các lệnh install trên để tạo các file component
- Một số component cần thêm dependencies từ Radix UI, shadcn sẽ tự động cài đặt khi bạn chạy lệnh add

## Các icon đã được thay thế bằng lucide-react:
- Hand (giơ tay)
- MoreVertical (menu 3 chấm)
- Mic, MicOff (microphone)
- Video, VideoOff (camera)
- Wifi, WifiOff, AlertCircle (kết nối)
- Monitor, MonitorOff (screen share)
- Circle, CircleDot (recording)
- Download (tải file)
- FileImage, FileVideo, FileText, FileSpreadsheet, File (file types)
- Upload (upload file)
- Loader2 (loading spinner)

Tất cả các icon đã được import từ `lucide-react` và thay thế các SVG inline.
