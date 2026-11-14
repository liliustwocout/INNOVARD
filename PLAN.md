# Kế hoạch Dự án Website INNOVARD

## 1. Tổng quan dự án
**INNOVARD** là nền tảng web nội bộ hỗ trợ quản lý tiến độ cá nhân và phối hợp làm việc nhóm cho nhiều đội dự án (Multi-team). Hệ thống giúp thành viên, trưởng nhóm và Mentor/Admin theo dõi tiến độ công việc, cập nhật báo cáo hàng ngày (Daily Standup), lưu trữ biên bản họp nhóm, trực quan hóa các mốc thời gian (Deadline & Lịch họp) và kết nối nhanh tới các tài nguyên cốt lõi (GitHub Repo, Discord, tài liệu).

---

## 2. Công nghệ sử dụng (Tech Stack)
- **Frontend & Framework**: Next.js (App Router) + React + TypeScript
- **Styling & UI**: Tailwind CSS + Lucide React Icons
- **Authentication**: Google OAuth (tích hợp Supabase Auth lấy Tên & Avatar Google + Chế độ Demo Google Sign-In để kiểm thử tức thì)
- **Database & Backend**: Supabase (PostgreSQL + Row Level Security) kèm **Dual-Mode Local Persistence Fallback** (`localStorage` + Seed Data) giúp hệ thống vận hành mượt mà ngay cả khi chưa kết nối Supabase project.

---

## 3. Cấu trúc trang & Sơ đồ điều hướng (Sitemap)

| Đường dẫn | Tên trang | Chức năng chính |
| :--- | :--- | :--- |
| `/login` | **Đăng nhập Google** | Đăng nhập bằng tài khoản Google (lấy Tên & Avatar), hỗ trợ Supabase Google OAuth và Demo Google Account Picker. |
| `/` | **Trang chủ** | Bảng Thông báo (có ghim, lọc, tạo thông báo), Lịch trình các giai đoạn dự án (Roadmap), Danh sách Liên kết nhanh. |
| `/overview` | **Trang Tổng quát** | Tóm tắt Thông tin đội của tôi, nút truy cập nhanh GitHub Repo & Discord của đội, danh sách Deadline sắp đến (đếm ngược), danh sách Thành viên & trạng thái Standup/tiến độ. |
| `/team` | **Trang Đội của tôi** | Chi tiết thông tin đội (mã đội, đề tài, Mentor, repo, Discord, chỉnh sửa thông tin đội) & danh sách thành viên chi tiết (kỹ năng, vai trò, liên kết cá nhân, thêm thành viên). |
| `/project` | **Trang Dự án** | Trang trung tâm chuyển đổi giữa 2 trang con: `/project/submissions` và `/project/progress`. |
| `/project/submissions` | **Bài nộp của tôi** | Form nộp **Daily Standup** (*Hôm qua làm gì*, *Hôm nay làm gì*, *Đang vướng*) + Lịch sử nộp; Form **Họp nhóm** (*Đã làm*, *Đang làm*, *Đang vướng*, nhiều *Link* GitHub/Demo/Tài liệu, *Câu hỏi thắc mắc*) + Lịch sử báo cáo họp nhóm. |
| `/project/progress` | **Tiến độ của tôi** | Dashboard thống kê cá nhân (% hoàn thành, chuỗi Standup, task hoàn thành), bảng quản lý task (*To Do / Đang làm / Đã xong*), cập nhật % tiến độ & tạo task mới. |
| `/calendar` | **Lịch sự kiện** | Lịch tháng trực quan (Calendar Grid) phân biệt màu sắc giữa **Deadline** và **Lịch họp**, chi tiết sự kiện theo ngày, bộ lọc và form thêm Deadline / Lịch họp mới. |
| `/profile` | **Hồ sơ cá nhân** | **Định danh** (Avatar Google, Họ tên, Email, Chức danh, Bio, Kỹ năng) & **Hồ sơ kết nối** (GitHub, Discord, LinkedIn, Portfolio). |

---

## 4. Kiến trúc dữ liệu (Database ERD)
Cơ sở dữ liệu PostgreSQL trên Supabase (xem chi tiết tại `supabase/schema.sql`):
- `teams`: Lưu thông tin các đội (Multi-team), `github_repo_url`, `discord_invite_url`, `mentor_name`, `progress`.
- `users`: Lưu hồ sơ người dùng đồng bộ từ Google Auth (`name`, `email`, `avatar_url`), thông tin định danh và các liên kết hồ sơ kết nối (`connected_profiles` JSONB).
- `team_members`: Bảng liên kết N-N giữa `users` và `teams` kèm vai trò (`leader`, `member`, `mentor`).
- `announcements`: Thông báo chung hoặc theo từng đội, hỗ trợ `is_pinned`, `category`, `priority`.
- `schedule_milestones`: Các giai đoạn lộ trình dự án hiển thị ở Trang chủ.
- `quick_links`: Liên kết tài nguyên dùng chung và theo đội.
- `standups`: Dữ liệu Daily Standup hàng ngày (`yesterday`, `today`, `blockers`, `standup_date`).
- `team_reports`: Báo cáo họp nhóm (`done`, `in_progress`, `blockers`, `links` JSONB, `questions`, `meeting_date`).
- `tasks`: Công việc và tiến độ cá nhân (`status`, `progress_percent`, `priority`, `due_date`).
- `calendar_events`: Sự kiện trực quan trên lịch (`type`: `'deadline' | 'meeting'`, `event_date`, `event_time`, `meeting_link`).

---

## 5. Phạm vi Multi-Team & Phân quyền
- Người dùng thuộc về một đội mặc định ("Đội của tôi") nhưng có thể sử dụng **Multi-team Switcher** trên thanh tiêu đề để xem/chuyển đổi qua các đội khác trong hệ thống (ví dụ: *INNOVARD Alpha*, *AI Nexus*, *GreenTech*).
- Vai trò thành viên:
  - **Thành viên (Member)**: Nộp Daily Standup, nộp/xem báo cáo họp nhóm, quản lý tiến độ cá nhân, thêm sự kiện, cập nhật hồ sơ.
  - **Trưởng nhóm (Leader)** & **Mentor/Admin**: Có thêm quyền chỉnh sửa thông tin đội, ghim/tạo thông báo quan trọng, quản lý danh sách thành viên.

---

## 6. Lộ trình phát triển
1. **Giai đoạn 1 — Khởi tạo & Thiết kế Schema**: Thiết lập Next.js App Router, Tailwind CSS, TypeScript types, `supabase/schema.sql`.
2. **Giai đoạn 2 — Xác thực & Shell ứng dụng**: Trang Đăng nhập Google (`/login`), Layout chính (`AppShell`) với Sidebar responsive, Multi-team Switcher và Profile menu.
3. **Giai đoạn 3 — Các trang cốt lõi**: Trang chủ (`/`), Tổng quát (`/overview`), Đội của tôi (`/team`), Hồ sơ cá nhân (`/profile`).
4. **Giai đoạn 4 — Quản lý Dự án & Lịch trực quan**: Trang Dự án (`/project`, `/project/submissions`, `/project/progress`) với đầy đủ Daily Standup, Báo cáo họp nhóm, Lịch sử nộp và Tiến độ cá nhân; Trang Lịch sự kiện (`/calendar`).
5. **Giai đoạn 5 — Kiểm thử & Kết nối Supabase Production**: Build kiểm tra TypeScript, cấu hình `.env.local` với Supabase project thật và bật Google Provider trên Supabase Auth.
