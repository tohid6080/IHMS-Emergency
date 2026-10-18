# IHMS Emergency — Worklog

---
Task ID: 1
Agent: Main Agent (Z.ai)
Task: ساخت اپلیکیشن مستقل IHMS Emergency — سامانه اطلاع‌رسانی شرایط اضطراری HSE (بر اساس ویدیوی مرجع کاربر)

Work Log:
- تحلیل ویدیوی مرجع (Screen_Recording_20261018_101244_LinkedIn.mp4): استخراج ۱۳ فریم + تحلیل — جریان: مودال «فعال‌سازی شرایط اضطراری» (نوع حادثه، سطح، محل، شرح، گزارش‌دهنده) → دیالوگ تأیید → ارسال به گیرندگان → صفحه تمام‌قرمز روی گوشی‌های گیرنده با دکمه «تایید آژیر» و «توقف صدا» → پایش زنده لیست تأییدکنندگان توسط فعال‌کننده → پایان شرایط اضطراری
- راه‌اندازی محیط fullstack-dev (Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui + Prisma/SQLite)
- طراحی اسکیمای دیتابیس (prisma/schema.prisma): Organization (اشتراک)، Project، User (نقش/سطح دسترسی/مجوز فعال‌سازی)، UserProject، Group (۱۰ نوع سیستمی)، GroupMember، ActivationCode، Alert (نوع/سطح/وضعیت)، AlertDelivery، Acknowledgment، Contact — ۱۱ جدول
- ساخت سرویس Real-time مستقل (mini-services/emergency-socket، پورت 3003 سوکت + 3004 نقطه داخلی emit) — rooms بر اساس سازمان، احراز هویت با توکن HMAC مشترک
- ساخت ۱۹ روت API: auth (login/activate/logout/me)، bootstrap، alerts (list/create/ack/mute/end/detail)، contacts، admin (resource CRUD پنج موجودیت + org + stats)
- منطق اطلاع‌رسانی هوشمند: نگاشت نوع حادثه به گروه‌های هدف (SMART_DISPATCH) — حریق→آتش‌نشانی+بهداری+HSE+حراست+مدیریت+بهره‌برداری+پرسنل، نشت شیمیایی→محیط‌زیست+...، تخلیه→همه
- فرانت‌اند تک‌صفحه‌ای RTL فارسی با فونت Vazirmatn: صفحه ورود (حساب سازمانی/کد فعال‌سازی)، صفحه قرمز تمام‌صفحه با آژیر Web Audio + لرزش Vibration API، فرم فعال‌سازی با انتخاب هوشمند گروه‌ها، پایش زنده با progress، شیت جزئیات، تب‌های خانه/هشدارها/مخاطبین/تاریخچه/گروه‌ها/مدیریت، پنل مدیریت ۷ تب (داشبورد/کاربران/گروه‌ها/پروژه‌ها/کدها/مخاطبین/اشتراک)
- PWA اندرویدی: manifest.json + sw.js + آیکون‌های تولیدشده با PIL (192/512/maskable)
- Seed داده نمونه: سازمان «زرین برگ پارس» (از ویدیو)، ۳ پروژه، ۱۲ کاربر شامل «داود جورکش» HSE، ۱۰ گروه، ۸ کد فعال‌سازی، ۱۲ مخاطبین اضطراری
- رفع باگ‌ها: ctx params در requireAdmin، فایل جاافتاده [entity]/route.ts، re-auth سوکت پس از login، DialogTitle accessibility
- تست کامل با Agent Browser (دو نشست هم‌زمان): ورود با حساب و کد، فعال‌سازی اضطراری، ظهور لحظه‌ای صفحه قرمز در نشست گیرنده، تأیید، به‌روزرسانی زنده پایش (۱/۱۲)، پایان اضطراری، بسته‌شدن لحظه‌ای صفحه قرمز، پنل مدیریت، تاریخچه، مخاطبین، مسدودسازی ورود با اشتراک منقضی

Stage Summary:
- اپلیکیشن کامل و تست‌شده تحویل شد. تمام قابلیت‌های درخواستی کاربر پیاده‌سازی شده است.
- حساب‌های نمونه: admin/admin123 (مدیر)، dispatcher/123456 (داود جورکش - فعال‌ساز)، worker1/123456 (پرسنل)
- کدهای فعال‌سازی: HSE-CODE-01، FIRE-TEAM-01، WORKER-01، ADMIN-CODE-01
- سرویس سوکت: mini-services/emergency-socket (پورت 3003 از طریق گیت‌وی، داخلی 3004)
- نکته انتشار: برای تبدیل به APK واقعی اندروید با Push بومی FCM، می‌توان همین وب‌اپ را با Capacitor/TWA بسته‌بندی کرد.

---
Task ID: 2
Agent: Main Agent (Z.ai)
Task: آماده‌سازی نهایی (آماده کن) — تست End-to-End کامل، کشف و رفع باگ صفحه قرمز برای گزارش‌دهنده

Work Log:
- بررسی وضعیت محیط: سرور Next.js (3000)، سرویس سوکت (3003/3004)، دیتابیس Seed شده — همه فعال بودند
- تست API با curl: login/bootstrap/alerts/admin/stats همه سالم
- تست مرورگر با Agent Browser (دو نشست هم‌زمان از طریق گیت‌وی پورت 81): ورود dispatcher و worker2، هر دو با نشان «لحظه‌ای» (سوکت متصل)
- کشف باگ ۱: سوکت از طریق گیت‌وی کار می‌کند ولی تست اولیه روی localhost:3000 (بدون گیت‌وی) بود → نشان «قطع» فقط آرتیفکت تست بود، نه باگ واقعی
- کشف باگ ۲ (واقعی): اعلام‌کننده هشدار هم صفحه قرمز را می‌دید چون سرور او را در گیرندگان قرار می‌داد (targetIdSet.add(user.id)) و کلاینت در onAlertNew فقط isTarget را چک می‌کرد نه isMine
- اصلاح ۱ (api/alerts/route.ts): حذف گزارش‌دهنده از لیست گیرندگان (targetIdSet.delete(user.id)) + افزودن reportedById به payload سوکت
- اصلاح ۲ (page.tsx): شرط isMine در onAlertNew — صفحه قرمز فقط برای گیرندگان واقعی، گزارش‌دهنده فقط toast + پایش
- تست مجدد کامل چرخه اضطراری از طریق گیت‌وی: فعال‌سازی انفجار کپسول گاز → اعلام‌کننده پایش دید (بدون صفحه قرمز) ✓ → گیرنده صفحه قرمز لحظه‌ای گرفت ✓ → تأیید → پایش ۱/۱۱ به‌روز شد (۱۱ = ۱۲ منهای گزارش‌دهنده) ✓ → پایان اضطراری → صفحه قرمز گیرنده لحظه‌ای بسته شد ✓ → وضعیت آرام ✓
- تست دستورالعمل هوشمند: حریق ← دستورالعمل آتش‌نشانی، نشت آمونیاک ← دستورالعمل شیمیایی اختصاصی ✓
- تست تب‌های تاریخچه (۵ هشدار پایان‌یافته با فیلتر پروژه) و مخاطبین (۱۲۵/۱۱۵/۱۵۴۴ + تیم‌ها با تماس مستقیم) ✓
- lint: 0 errors

Stage Summary:
- اپلیکیشن ۱۰۰٪ آماده و تست‌شده است. چرخه کامل اضطراری (فعال‌سازی → اطلاع‌رسانی لحظه‌ای → صفحه قرمز → تأیید → پایش زنده → پایان) بدون هیچ خطایی کار می‌کند.
- حساب‌ها: admin/admin123 | dispatcher/123456 (داود جورکش) | worker1،worker2,.../123456
- کدهای فعال‌سازی: HSE-CODE-01، FIRE-TEAM-01، WORKER-01، ADMIN-CODE-01
- نکته فنی مهم: سوکت فقط از طریق گیت‌وی (preview URL) کار می‌کند؛ دسترسی مستقیم به پورت 3000 نشان «قطع» می‌دهد (طبیعی است).

---
Task ID: 3
Agent: Main Agent (Z.ai)
Task: «آماده کن» دوم — آماده‌سازی بسته‌بندی اندروید: اسکلت Capacitor + راهنمای کامل فارسی PDF

Work Log:
- ساخت capacitor.config.ts (شناسه ir.zarinpars.ihms.emergency، server.url placeholder، اسپلش قرمز)
- ساخت scripts/build-android.sh (نصب پکیج‌ها → build → cap add/sync → gradle، حالت debug/release)
- بارگذاری pdf skill و مطالعه کامل زنجیره: SKILL.md، fonts.md، creative-flow.md، overflow.md، pagination.md، typography.md، palette.md، cover.md، cover-backgrounds.md
- مسیر انتخابی: Creative Flow (سند جریان‌دار RTL فارسی) + صفحه جلد قالب HUD قرمز آینه‌شده RTL
- تولید پالت tier-محور از palette.cascade با چرخش hue به قرمز برند
- نگارش HTML راهنما (۷ فصل + جلد + صفحه پایانی): معماری و دیاگرام، پیش‌نیازها، Capacitor گام‌به‌گام + امضا، PWA Builder، FCM دوکاناله، استقرار سرور (Caddyfile + systemd)، عیب‌یابی و چک‌لیست
- اعتبارسنجی: poster_validate → تبدیل divider به pseudo-element (رفع ۷ خطای text↔line) → اصلاح فاصله hero-fa (۱۷px overlap) → جلد ایزوله: PASS کامل
- رندر: pagedjs با RTL خراب می‌شود (۳ صفحه) → --nopaged (بومی Chromium): ۱۰ صفحه صحیح
- شماره‌گذاری صفحات با pypdf (جلد و صفحه پایانی بدون شماره، بدنه ۱-۸)، متادیتا کامل
- pdf_qa: ۱۰ بررسی پاس، ۱ هشدار non-blocking (عدم تقارن عمدی جلد قالب HUD مجاز طبق spec)
- بررسی بصری ۵ صفحه کلیدی: جلد/بدنه/جدول/کد/پایانی همگی صحیح؛ صفر کاراکتر U+FFFD

Stage Summary:
- خروجی: download/IHMS-Android-Deploy-Guide.pdf (۱۰ صفحه، ~۱.۴MB، وکتور) + سورس HTML قابل ویرایش
- پروژه اکنون «APK-ready» است: کافی است server.url تنظیم و scripts/build-android.sh اجرا شود
