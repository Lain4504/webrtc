Mình sẽ trả lời **rất thẳng và đúng vai trò BA / Solution Architect**, dựa **trực tiếp vào context đồ án Capstone + phạm vi chấm điểm**, không dựa theo “đề xuất chung chung của chat”.

---

## Kết luận ngắn gọn trước (TL;DR)

👉 **VỚI YÊU CẦU DỰ ÁN NÀY, BẠN NÊN CHỌN:**

### ✅ **Approach 2 – Mutual Exclusion + Auto-Resume (có kiểm soát)**

> **KHÔNG** hiển thị đồng thời whiteboard và screen share
> **CÓ** nhớ trạng thái whiteboard trước khi share
> **CÓ THỂ** tự mở lại whiteboard sau khi dừng share

🚫 **KHÔNG chọn overlay / carousel / both-visible logic**

---

Giờ mình giải thích **vì sao quyết định này là đúng trong bối cảnh đồ án của bạn**, không phải vì “đơn giản cho dev”, mà vì **đúng mục tiêu học thuật + nghiệp vụ**.

---

## 1. Hiểu đúng CONTEXT của Capstone này

Đây **KHÔNG PHẢI** sản phẩm thương mại hoàn chỉnh như Zoom / Meet / Miro.
Đây là:

> 🎓 **Capstone Project – đánh giá năng lực phân tích, thiết kế, triển khai hệ thống**

Hội đồng sẽ quan tâm nhất đến:

1. **Requirement clarity** (rõ ràng, không mâu thuẫn)
2. **Architecture hợp lý** (microservice, WebRTC, AI agent)
3. **UX logic đúng nghiệp vụ giáo dục**
4. **Tránh over-engineering**
5. **Có thể demo ổn định**

👉 **Không ai chấm điểm bạn vì làm UI phức tạp hơn Google Meet.**

---

## 2. Whiteboard trong đề bài của bạn đang ĐÓNG VAI TRÒ GÌ?

Trong phần **Proposed Solutions**, whiteboard được mô tả là:

> “interactive whiteboard for real-time explanations and visual learning”

➡️ Nghĩa là:

* Công cụ **giải thích**
* Công cụ **trực quan hóa**
* Công cụ **tương tác**

❗ Không hề nói:

* Whiteboard là công cụ annotation cho screen share
* Whiteboard phải tồn tại song song với screen share

👉 **Whiteboard = một mode giảng dạy**, không phải layer phụ trợ.

---

## 3. WebRTC Live Class trong đề bài là “Classroom”, không phải “Streaming Tool”

Live class của bạn phục vụ:

* Dạy tiếng Nhật
* Luyện JLPT
* Có:

    * vẽ chữ Kanji
    * phân tích ngữ pháp
    * minh họa hội thoại
    * giảng bài từng bước

👉 Workflow giáo dục **tuần tự**, không phải đa màn hình:

```
Giải thích → Minh họa → Chuyển ngữ cảnh → Tiếp tục
```

Không phải:

```
Giải thích + code + vẽ + slide cùng lúc
```

---

## 4. Góc nhìn BA: “Both visible” KHÔNG phải requirement nghiệp vụ

Nếu đây là **đề tài công nghệ thuần**, có thể tranh luận.

Nhưng với **Japanese Learning Center**, hãy hỏi:

### ❓ Teacher cần BOTH để làm gì?

* Viết Kanji trong khi share PowerPoint? → ❌ Dừng share, vẽ
* Giải thích ngữ pháp trong khi share web? → ❌ Dừng share, dùng whiteboard
* Tham chiếu sơ đồ cũ? → ❌ Screenshot / trí nhớ

👉 **Không có user story bắt buộc.**

➡️ Requirement này **KHÔNG xuất phát từ nghiệp vụ**, mà từ suy nghĩ kỹ thuật.

---

## 5. Vì sao KHÔNG chọn Mutual Exclusion “cứng” (Option 1)?

Option 1 (đóng whiteboard hoàn toàn) **đúng**, nhưng:

* UX hơi “gắt”
* Không thể hiện tư duy thiết kế linh hoạt
* Hội đồng có thể hỏi:

  > “Nếu giáo viên muốn quay lại nhanh thì sao?”

---

## 6. Vì sao Approach 2 là LỰA CHỌN TỐI ƯU cho Capstone?

### ✔️ Đáp ứng nghiệp vụ

* Không hiển thị cả hai cùng lúc
* Giữ đúng “mode giảng dạy”

### ✔️ Thể hiện tư duy BA tốt

* Có phân tích trạng thái trước–sau
* Có state memory (UX consideration)

### ✔️ Không phức tạp kiến trúc

* Không cần sync đa view
* Không cần overlay
* Không cần carousel logic

### ✔️ Dễ mô tả trong SRS & Sequence Diagram

RẤT QUAN TRỌNG cho đồ án.

---

## 7. Cách ghi requirement cho ĐÚNG CHẤM ĐIỂM

Bạn nên ghi **RÕ RÀNG** như sau trong SRS:

> **FR – Live Class Interaction**

* At any given time, the live class interface supports **only one primary teaching mode**:

    * Whiteboard mode **OR**
    * Screen sharing mode
* When a lecturer starts screen sharing, the whiteboard is automatically hidden.
* If the whiteboard was active before screen sharing, the system may automatically restore it when screen sharing ends.

👉 Dùng từ **“may”** → linh hoạt, không ràng buộc cứng.

---

## 8. Nếu hội đồng hỏi: “Sao không cho hiển thị cả hai?”

Bạn trả lời như BA:

> “Based on pedagogical workflow analysis and the scope of a Japanese language learning center, displaying both simultaneously does not provide additional learning value but significantly increases system complexity and cognitive load for learners. Therefore, the system prioritizes a single focused teaching mode at a time.”

💯 Câu này là **ăn điểm**.

---

## 9. Kết luận cuối cùng (RẤT QUAN TRỌNG)

### ❌ Không chọn:

* Whiteboard overlay
* Carousel during screen share
* Both-visible logic

### ✅ Nên chọn:

**Mutual Exclusion + Auto Resume**

### 🎯 Lý do:

* ĐÚNG nghiệp vụ giáo dục
* ĐÚNG phạm vi Capstone
* DỄ chứng minh bằng UML
* DỄ demo
* KHÔNG over-engineering


