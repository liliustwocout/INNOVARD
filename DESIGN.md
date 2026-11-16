# INNOVARD — Design system & kế hoạch redesign

Tài liệu này khoá hệ thống thiết kế của INNOVARD. Mọi trang dùng chung nó; thay đổi màu, chữ, bo góc
hay chuyển động thì sửa token ở `src/app/globals.css`, không viết giá trị rời trong component.

Nguồn phương pháp: ba skill thiết kế **hallmark** (Floor + quy tắc "app screen"), **impeccable**
(chế độ *Operate*, craft floor, animate) và **taste-skill** (motion layer, không slop). Lớp chuyển động
áp dụng có chủ đích 20 nguyên tắc *UX & Animation* (bảng ở mục 5).

---

## 1. Chẩn đoán giao diện cũ

| Vấn đề | Bằng chứng | Skill nói gì |
|---|---|---|
| Màu indigo + slate mặc định của Tailwind, không có cá tính | ~1.900 class `slate-*`/`indigo-*` | impeccable: "grey screen + one accent = category default" |
| Nhãn chữ IN HOA giãn chữ ở khắp nơi (`uppercase tracking-wider`) | 53 chỗ | hallmark Floor #9: cấm eyebrow / nhãn tracked caps |
| Gradient trang trí, chữ gradient, shimmer, 3 loader chồng nhau ở màn chờ | `AppShell`, `loading.tsx` | impeccable: cấm gradient text; hallmark: một chuyển động có chủ đích |
| Modal, drawer xuất hiện/biến mất tức thì, không ngữ cảnh không gian | 21 modal `fixed inset-0` | animate.md: chuyển động giải thích trạng thái & quan hệ |
| Thanh tiến độ đổi `width`, không chuyển tiếp | 5 chỗ | hallmark Floor #2: không animate width |
| Không có focus ring nhất quán, scrollbar/selection mặc định | `globals.css` | craft floor: "browser surfaces" phải theo palette |
| Điều hướng 5 nhóm cho 8 trang, không icon, mục nhỏ | `AppShell` | Hick, Fitts, Jakob |

## 2. Hướng thiết kế: "Mũi tên đi lên"

- **Chế độ:** *Operate* — người dùng đến để làm việc (nộp standup, xem tiến độ, lịch). Rõ ràng,
  nhất quán, mật độ vừa phải hơn là phô diễn.
- **Sự thật thương hiệu:** logo là mũi tên chữ N gấp khúc đi lên, xanh azure trên nền navy đậm.
  Palette lấy từ chính logo — không lấy phần tím (các skill đều tránh violet).
- **Signature move:** *tiến độ là mũi tên đi lên.* Mọi thanh tiến độ có đầu mũi tên, lấp đầy bằng
  `transform: scaleX` với easing dứt khoát; rail điều hướng navy như ô nền của logo, chỉ báo mục đang
  chọn trượt theo (follow‑through).
- **Ánh sáng sử dụng:** văn phòng/phòng lab ban ngày, laptop → nền sáng; rail tối làm khung.

## 3. Token

| Nhóm | Token | Ghi chú |
|---|---|---|
| Neutral | `--color-slate-50…950` (ghi đè) | xám pha navy, hue 255–268, `400` đạt ~4.5:1 trên trắng |
| Accent | `--color-indigo-50…950` (ghi đè thành **azure‑cobalt**, hue ~258) | chỉ dùng cho hành động chính, mục đang chọn, trạng thái |
| Phụ | `--color-violet-*` → **lagoon** (hue ~200) | loại bỏ tím khỏi UI |
| Rail | `--rail-bg`, `--rail-fg`, `--rail-muted`, `--rail-active` | navy của logo |
| Trạng thái | emerald (xong), amber (cảnh báo), rose (lỗi/xoá), sky (thông tin) | giữ nghĩa cũ |
| Chữ | **Be Vietnam Pro** (thiết kế cho tiếng Việt), 1 họ chữ; số dạng `tabular-nums` | `next/font`, tự host |
| Bo góc | lg 8 · xl 10 · 2xl 14 · 3xl 18 px | giảm độ "phồng" |
| Đổ bóng | `--shadow-2xs…2xl` | cùng một nguồn sáng phía trên, có offset + blur mềm, tint navy |
| Thời lượng | `--dur-micro 120ms` · `--dur-short 200ms` · `--dur-medium 320ms` · `--dur-long 480ms` | snappy |
| Easing | `--ease-out-expo (0.16,1,0.3,1)` · `--ease-in-out (0.65,0,0.35,1)` · `--ease-spring (0.34,1.4,0.64,1)` · `--ease-in (0.4,0,1,1)` | không dùng linear |

## 4. Floor (không thương lượng)

1. Mọi màu/chữ qua token. 2. Không `transition: all`, không animate `width/height/top/left`.
3. `overflow-x: clip` cho `html` và `body`. 4. Mọi phần tử tương tác có `:focus-visible` hiện tức thì.
5. Mọi animation có nhánh `prefers-reduced-motion` — giữ phản hồi màu/opacity, bỏ dịch chuyển.
6. Không nhãn IN HOA giãn chữ, không gradient text, không emoji làm icon, không card lồng card mới.
7. Nội dung hiển thị mặc định; animation chỉ là lớp phủ.

## 5. Bản đồ 20 nguyên tắc UX & Animation → triển khai

| # | Nguyên tắc | Áp dụng ở đâu | Cách làm |
|---|---|---|---|
| 1 | Squash & stretch | Mọi nút, checkbox | `:active` nén `scale(.97)`; checkbox bật "pop" 1 → 1.18 → 1 |
| 2 | Anticipation | Nút có icon mũi tên/gửi, mục nav | icon lùi 2px khi nhấn rồi bật tới khi thả (`.ui-anticipate`) |
| 3 | Staging the focus | Modal, drawer, bảng lệnh | nền mờ + blur, hộp thoại nổi lên ở tâm; trang phía sau lùi |
| 4 | Pose to pose | Thanh tiến độ, đổi trạng thái task | keyframe giữa hai "tư thế" rõ ràng: giá trị cũ → giá trị mới bằng `scaleX` |
| 5 | Follow through | Chỉ báo mục nav đang chọn, toast | chỉ báo trượt với easing overshoot nhẹ rồi lắng lại |
| 6 | Slow in & slow out | Toàn hệ thống | chỉ dùng các easing token, không linear |
| 7 | Moving in arcs | Thông báo thành công (toast) | trục X và Y dùng hai easing khác nhau → quỹ đạo cong |
| 8 | Secondary action | Badge số lượng, avatar | badge "nảy" khi số thay đổi; đầu mũi tên tiến độ nhích khi lấp đầy |
| 9 | Snappy timing | Toàn hệ thống | phản hồi 120ms, đổi trạng thái 200ms, overlay 320ms; thoát nhanh hơn vào |
| 10 | Exaggerated feedback | Form lỗi / thành công | lỗi rung ngang ngắn; thành công nảy dấu tick |
| 11 | Solid drawing in 3D | Card, popover, modal | thang elevation thống nhất một nguồn sáng (2xs → 2xl) |
| 12 | Overall appeal | Toàn app | một palette từ logo, một họ chữ, một thang bo góc |
| 13 | Fitts's law | Nav, nút chính, mobile | mục nav cao 40px toàn hàng bấm được; thanh tab dưới cùng trên mobile |
| 14 | Bigger hit areas | Nút icon nhỏ, liên kết nhỏ | `.ui-hit` mở rộng vùng chạm bằng `::after`; ≥44px trên màn cảm ứng |
| 15 | Hick's law | Điều hướng | 5 nhóm → 3 nhóm, ≤ 8 mục, có icon |
| 16 | Miller's law | Nav, bảng lệnh | chia cụm ≤ 7 mục; bảng lệnh tách "Gần đây / Trang / Thao tác" |
| 17 | Doherty threshold | Chuyển trang, tải dữ liệu | thanh tiến trình đầu trang ngay khi bấm; skeleton đúng hình khung app thay vì màn splash |
| 18 | Postel's law | Tìm kiếm | tìm không dấu, không phân biệt hoa thường: "tien do" khớp "Tiến độ" |
| 19 | Jakob's law | Shell | sidebar trái, `Ctrl/⌘ K` mở bảng lệnh, `Esc` đóng, `/` tìm nhanh |
| 20 | Frequency of use | Bảng lệnh, thanh tab mobile | bảng lệnh ghi nhận số lần truy cập (localStorage) → nhóm "Hay dùng" lên đầu; thanh tab mobile cố định 4 việc làm hằng ngày (Tổng quan, Bài nộp, Tiến độ, Lịch) để giữ trí nhớ vị trí |

### Những gì *không* làm (theo skill)

- Không fade‑in theo cuộn cho từng card/section, không parallax, không tilt, không vòng lặp trang trí.
- Không choreography khi tải trang — chỉ một chuyển cảnh nội dung 240ms khi đổi route.
- Không thêm thư viện animation: CSS + một ít React là đủ.

## 6. Phạm vi file

| File | Thay đổi |
|---|---|
| `src/app/globals.css` | token `@theme`, base (focus, selection, scrollbar, caret), motion utilities, reduced‑motion |
| `src/app/layout.tsx` | font Be Vietnam Pro |
| `src/lib/navigation.ts` | định nghĩa nav dùng chung, chuẩn hoá tìm kiếm không dấu, đếm tần suất |
| `src/components/layout/AppShell.tsx` | rail navy + icon + chỉ báo trượt, drawer có chuyển động, tab bar mobile, route progress, page transition, skeleton |
| `src/components/layout/CommandPalette.tsx` | bảng lệnh `Ctrl K` (Hick, Miller, Postel, Jakob, Frequency) |
| `src/components/ui/ProgressBar.tsx` | signature: thanh tiến độ mũi tên, `scaleX` |
| `src/app/loading.tsx`, `src/app/login/page.tsx` | bỏ gradient/shimmer, theo token |
| Các trang | bỏ nhãn tracked caps, `transition-all`, gắn `ui-overlay`/`ui-dialog` cho modal, dùng `ProgressBar` |
