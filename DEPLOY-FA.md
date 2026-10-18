# 🚀 راهنمای استقرار سرور IHMS Emergency

این اپ از سه بخش تشکیل شده که باید همزمان اجرا شوند:

| بخش | پورت | نقش |
|-----|------|-----|
| Next.js (وب + API) | 3000 | صفحه اپ و REST API |
| سرویس Socket.IO | 3003 | ارسال لحظه‌ای هشدار به گوشی‌ها |
| Caddy (اختیاری) | 80/443 | پراکسی + HTTPS (برای استقرار رسمی) |

دو مسیر دارید — اولی برای **تست فوری رایگان**، دومی برای **استقرار دائم**:

---

## 🅰 مسیر اول: تست امشب با کامپیوتر شخصی (رایگان، بدون خرید سرور)

گوشی و کامپیوتر باید به **یک وای‌فای** متصل باشند.

### ۱) نصب Node.js
از [nodejs.org](https://nodejs.org) نسخه **LTS** را نصب کنید (هنگام نصب همه گزینه‌ها را پیش‌فرض بگذارید).

### ۲) دانلود پروژه
از GitHub: دکمه سبز **Code → Download ZIP** → باز کردن فایل فشرده
(یا: `git clone https://github.com/tohid6080/IHMS-Emergency.git`)

### ۳) راه‌اندازی — یک‌بار
در پوشه پروژه یک **CMD** باز کنید (در نوار آدرس Explorer بنویسید `cmd` و Enter):

```bat
npm install
npx prisma db push
npx --yes tsx prisma/seed.ts
cd mini-services\emergency-socket
npm install
cd ..\..
```

### ۴) پیدا کردن IP کامپیوتر
در همان CMD بنویسید:

```bat
ipconfig
```

عدد مقابل **IPv4 Address** را یادداشت کنید — مثلاً `192.168.1.5`

### ۵) اجرای سرویس‌ها — هر بار که می‌خواهید تست کنید

**پنجره ۱ — سرویس سوکت:**
```bat
npx --yes tsx mini-services/emergency-socket/index.ts
```

**پنجره ۲ — وب‌اپ** (به‌جای `192.168.1.5` آی‌پی خودتان را بگذارید):
```bat
set NEXT_PUBLIC_SOCKET_URL=http://192.168.1.5:3003
npx next dev -p 3000
```

⚠️ اگر ویندوز پرسید «Allow Node.js on these networks» → تیک **Private networks** را بزنید و Allow کنید.

### ۶) تست سریع قبل از گوشی
در مرورگر کامپیوتر بروید به: `http://localhost:3000` → ورود با `dispatcher / 123456`
اگر صفحه بالا آمد، سرور آماده است ✅

### ۷) ساخت APK مخصوص شبکه خودتان
1. GitHub → تب **Actions** → **Build Android APK** → **Run workflow**
2. در فیلد `server_url` وارد کنید: `http://192.168.1.5:3000`
3. چند دقیقه صبر کنید → APK جدید را از **Releases** دانلود و روی گوشی نصب کنید

### ۸) سناریوی کامل
- گوشی: ورود با `worker1 / 123456`
- کامپیوتر: ورود با `dispatcher / 123456` → یک شرایط اضطراری فعال کنید
- گوشی: صفحه قرمز + آژیر! 🚨

> 📌 نکات:
> - اگر آی‌پی وای‌فای عوض شد (ری‌استارت مودم)، مرحله ۴ و ۷ را تکرار کنید
> - با بستن کامپیوتر، گوشی قطع می‌شود — برای دائمی بودن، مسیر ب را بروید

---

## 🅱 مسیر دوم: استقرار دائم روی VPS

### ۱) خرید سرور
یک **VPS اوبونتو** (نسخه 22 یا 24) تهیه کنید — ارائه‌دهنده‌های ایرانی مثل ابرآروان، پارس‌پک، لیارا یا هر VPS خارجی. حداقل منابع: 1GB RAM.

### ۲) اتصال و نصب پیش‌نیازها
```bash
ssh root@SERVER_IP

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs caddy git
npm i -g tsx
```

### ۳) دریافت و آماده‌سازی پروژه
```bash
git clone https://github.com/tohid6080/IHMS-Emergency.git
cd IHMS-Emergency
npm install
npx prisma db push
npx --yes tsx prisma/seed.ts
cd mini-services/emergency-socket && npm install && cd ../..
npm run build
echo "DATABASE_URL=file:/root/IHMS-Emergency/db/custom.db" > .env
```

### ۴) دامنه و DNS
در پنل دامنه خود یک رکورد **A** بسازید که به IP سرور اشاره کند — مثلاً:
`ihms.example.com → 5.6.7.8`

### ۵) تنظیم Caddy (HTTPS خودکار)
فایل `Caddyfile` را ویرایش کنید — خط اول `:81` را با دامنه خود عوض کنید:

```
ihms.example.com {
    @transform_port_query {
        query XTransformPort=*
    }
    handle @transform_port_query {
        reverse_proxy localhost:{query.XTransformPort}
    }
    handle {
        reverse_proxy localhost:3000
    }
}
```

Caddy به‌صورت خودکار گواهی SSL می‌گیرد و تمدید می‌کند.

### ۶) سرویس‌های systemd (اجرای دائمی)

**وب‌اپ** — فایل `/etc/systemd/system/ihms-web.service`:
```ini
[Unit]
Description=IHMS Emergency Web
After=network.target

[Service]
WorkingDirectory=/root/IHMS-Emergency
EnvironmentFile=/root/IHMS-Emergency/.env
ExecStart=node .next/standalone/server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

**سوکت** — فایل `/etc/systemd/system/ihms-socket.service`:
```ini
[Unit]
Description=IHMS Emergency Socket
After=network.target

[Service]
WorkingDirectory=/root/IHMS-Emergency
ExecStart=npx tsx mini-services/emergency-socket/index.ts
Restart=always

[Install]
WantedBy=multi-user.target
```

**فعال‌سازی:**
```bash
systemctl daemon-reload
systemctl enable --now ihms-socket ihms-web caddy
systemctl status ihms-web --no-pager
```

### ۷) ساخت APK نهایی
GitHub → **Actions → Build Android APK → Run workflow** → در `server_url` بنویسید:
`https://ihms.example.com`

APK جدید در Releases جایگزین می‌شود → دانلود و نصب روی همه گوشی‌های پرسنل. ✅

---

## 🔧 عیب‌یابی

| مشکل | راه‌حل |
|------|--------|
| گوشی به `http://IP:3000` وصل نمی‌شود | فایروال ویندوز پورت 3000 و 3003 را باز نکرده؛ یا گوشی و کامپیوتر روی یک وای‌فای نیستند |
| در اپ، گوشه صفحه «قطع» نشان می‌دهد | سرویس سوکت اجرا نیست یا `NEXT_PUBLIC_SOCKET_URL` اشتباه است |
| هنگام ورود خطا می‌دهد | `npx --yes tsx prisma/seed.ts` را اجرا نکرده‌اید |
| ورود کار نمی‌کند بعد از چند روز | ساعت سرور/گوشی درست تنظیم نیست (توکن‌ها به ساعت وابسته‌اند) |
| APK باز می‌شود ولی خطای اتصال می‌دهد | آدرس `server_url` هنگام build اشتباه بوده — دوباره workflow را با آدرس درست اجرا کنید |
| `EADDRINUSE :3000` | یک اجرای قبلی هنوز باز است — آن پنجره CMD را ببندید یا `taskkill /f /im node.exe` |

## 👤 حساب‌های پیش‌فرض پس از seed

| نقش | نام کاربری | رمز |
|-----|-----------|-----|
| مدیر سازمان | `admin` | `admin123` |
| HSE / فعال‌کننده | `dispatcher` | `123456` |
| کاربر عادی | `worker1` / `worker2` | `123456` |

کد فعال‌سازی: **`HSE-CODE-01`** — ⚠️ در محیط واقعی رمزها را حتماً عوض کنید.
