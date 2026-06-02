# FreelanceHub

[English](README.en.md) | **Tiếng Việt**

Ứng dụng quản lý công việc cá nhân dành cho freelancer, có đăng nhập Google, đồng bộ cloud riêng theo tài khoản và hỗ trợ cài đặt như một Progressive Web App (PWA).

## Demo

- Website: [freelancer-app-one.vercel.app](https://freelancer-app-one.vercel.app/)
- Repository: [github.com/vanluanp1/freelancer-app](https://github.com/vanluanp1/freelancer-app)

## Tính năng

- Dashboard tổng quan deadline, Pomodoro và khối lượng công việc theo dự án.
- Quản lý task theo Kanban, mức độ ưu tiên, deadline và dự án.
- Lịch tháng: kéo thả task vào ngày để thay đổi deadline.
- Theo dõi dự án, habit, nhật ký công việc và thu chi cá nhân.
- Nhắc deadline và Pomodoro bằng Notification API.
- Backup JSON thủ công và snapshot nội bộ hằng ngày.
- Tự động đồng bộ backup lên Supabase sau khi dữ liệu thay đổi.
- Tự động khôi phục bản cloud mới hơn khi đăng nhập trên thiết bị khác.
- PWA: có thể cài lên desktop hoặc điện thoại và mở giao diện khi offline.

## Bảo mật

- Bắt buộc đăng nhập Google qua Supabase Auth trước khi truy cập ứng dụng.
- Dữ liệu local được tách riêng theo ID của tài khoản đăng nhập.
- Bảng backup trên Supabase bật Row Level Security (RLS).
- Mỗi tài khoản chỉ được đọc, ghi và xóa backup của chính mình.
- Frontend chỉ sử dụng Supabase Publishable Key.
- CSP và các security header được cấu hình trong [`vercel.json`](vercel.json).

Không đưa `service_role` key, Google Client Secret hoặc bất kỳ secret backend nào vào frontend hay GitHub.

## Công nghệ

- HTML, CSS và JavaScript thuần
- Supabase Auth, Database và RLS
- Google OAuth 2.0
- Vercel
- Service Worker và Web App Manifest

## Chạy local

Đây là static site. Có thể chạy bằng một static web server bất kỳ:

```powershell
npx serve .
```

Sau đó mở URL local được hiển thị trong terminal.

## Cấu hình Supabase

1. Tạo project trên [Supabase](https://supabase.com/).
2. Mở SQL Editor và chạy nội dung file [`supabase/schema.sql`](supabase/schema.sql).
3. Điền Project URL và Publishable Key vào [`js/config.js`](js/config.js).
4. Trong Authentication > URL Configuration, thêm URL production của ứng dụng vào Redirect URLs.
5. Trong Authentication > Providers, bật Google provider.

## Cấu hình Google OAuth

1. Tạo OAuth Client ID loại Web application trong [Google Cloud Console](https://console.cloud.google.com/).
2. Thêm callback URL do Supabase cung cấp vào Authorized redirect URIs:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

3. Điền Google Client ID và Client Secret vào Google provider trên Supabase.

Client Secret chỉ được lưu trong Supabase Dashboard, không đặt trong source code.

## Deploy Vercel

Import repository vào [Vercel](https://vercel.com/) và deploy như một static site, hoặc chạy:

```powershell
npx vercel --prod
```

Sau khi có domain production, cập nhật Redirect URLs trong Supabase Auth.

## Kiểm tra nhanh

Chạy smoke test trên Windows:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\tests\smoke-check.ps1
```

Kiểm tra syntax JavaScript:

```powershell
node --check .\js\app.js
node --check .\js\cloud.js
node --check .\sw.js
```

## Cấu trúc thư mục

```text
.
|-- index.html
|-- style.css
|-- manifest.webmanifest
|-- sw.js
|-- js/
|   |-- app.js
|   |-- cloud.js
|   |-- store.js
|   `-- pages/
|-- supabase/
|   `-- schema.sql
`-- tests/
    `-- smoke-check.ps1
```

## License

Dự án hiện chưa khai báo license. Mặc định, tác giả giữ toàn bộ quyền.
