# FreelanceHub

Ung dung quan ly cong viec ca nhan danh cho freelancer. Du an chay truc tiep tren trinh duyet, ho tro dang nhap Google, dong bo du lieu rieng theo tung tai khoan va cai dat nhu mot Progressive Web App (PWA).

## Demo

- Website: [freelancer-app-one.vercel.app](https://freelancer-app-one.vercel.app/)
- Repository: [github.com/vanluanp1/freelancer-app](https://github.com/vanluanp1/freelancer-app)

## Tinh nang

- Dashboard tong quan deadline, Pomodoro va khoi luong cong viec theo du an.
- Quan ly task theo Kanban, muc do uu tien, deadline va du an.
- Lich thang: keo tha task vao ngay de thay doi deadline.
- Quan ly du an va theo doi tien do.
- Pomodoro, habit tracker va nhat ky cong viec.
- Thong ke thu chi ca nhan.
- Nhac deadline va Pomodoro bang Notification API.
- Backup JSON thu cong va snapshot noi bo hang ngay.
- Tu dong dong bo backup len Supabase sau khi du lieu thay doi.
- Tu dong khoi phuc ban cloud moi hon khi dang nhap tren thiet bi khac.
- PWA: co the cai len desktop hoac dien thoai va mo giao dien khi offline.

## Bao mat

- Bat buoc dang nhap Google qua Supabase Auth truoc khi truy cap ung dung.
- Du lieu local duoc tach rieng theo ID cua tai khoan dang nhap.
- Bang backup tren Supabase bat Row Level Security (RLS).
- Moi tai khoan chi duoc doc, ghi va xoa backup cua chinh minh.
- Frontend chi su dung Supabase Publishable Key.
- CSP va cac security header duoc cau hinh trong `vercel.json`.

Khong dua `service_role` key, Google Client Secret hoac bat ky secret backend nao vao frontend hay GitHub.

## Cong nghe

- HTML, CSS va JavaScript thuần
- Supabase Auth, Database va RLS
- Google OAuth 2.0
- Vercel
- Service Worker va Web App Manifest

## Chay local

Du an la static site. Co the dung mot static web server bat ky, vi du:

```powershell
npx serve .
```

Sau do mo URL local duoc hien thi trong terminal.

## Cau hinh Supabase

1. Tao mot project tren [Supabase](https://supabase.com/).
2. Mo SQL Editor va chay noi dung file [`supabase/schema.sql`](supabase/schema.sql).
3. Dien Project URL va Publishable Key vao [`js/config.js`](js/config.js).
4. Trong Authentication > URL Configuration, them URL production cua ung dung vao Redirect URLs.
5. Trong Authentication > Providers, bat Google provider.

## Cau hinh Google OAuth

1. Tao OAuth Client ID loai Web application trong [Google Cloud Console](https://console.cloud.google.com/).
2. Them callback URL do Supabase cung cap vao Authorized redirect URIs:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

3. Dien Google Client ID va Client Secret vao Google provider tren Supabase.

Client Secret chi duoc luu trong Supabase Dashboard, khong dat trong source code.

## Deploy Vercel

Import repository vao [Vercel](https://vercel.com/) va deploy nhu mot static site. Co the deploy tu terminal:

```powershell
npx vercel --prod
```

Sau khi co domain production, cap nhat Redirect URLs trong Supabase Auth.

## Kiem tra nhanh

Chay smoke test tren Windows:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\tests\smoke-check.ps1
```

Kiem tra syntax JavaScript:

```powershell
node --check .\js\app.js
node --check .\js\cloud.js
node --check .\sw.js
```

## Cau truc thu muc

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

Du an hien chua khai bao license. Mac dinh, tac gia giu toan bo quyen.
