# FreelanceHub

Ứng dụng quản lý công việc cho freelancer, chạy trực tiếp trên trình duyệt.

## Tính năng

- Kanban tasks, dự án, Pomodoro, habits, nhật ký và thống kê thu chi.
- Backup JSON thủ công.
- Snapshot backup nội bộ tự động mỗi ngày, giữ tối đa 7 bản gần nhất.
- Bắt buộc đăng nhập Google qua Supabase Auth trước khi truy cập ứng dụng.
- Đồng bộ snapshot lên Supabase theo tài khoản đăng nhập.

## Chạy local

Phục vụ thư mục này bằng một static web server rồi mở `index.html`.

## Cấu hình Supabase

1. Tạo một Supabase project.
2. Chạy nội dung `supabase/schema.sql` trong SQL Editor.
3. Điền Project URL và Publishable Key vào `js/config.js`.
4. Trong Supabase Auth URL Configuration, thêm URL Vercel của ứng dụng vào Redirect URLs.
5. Bật Google provider trong Supabase Auth và cấu hình OAuth Client ID/Secret từ Google Cloud.

`js/config.js` chỉ chứa Publishable Key dùng phía client. Không đưa `service_role` key vào frontend.

## Deploy Vercel

Repo là static site, có thể import trực tiếp vào Vercel hoặc chạy:

```powershell
npx vercel --prod
```
