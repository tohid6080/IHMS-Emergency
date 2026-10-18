import type { CapacitorConfig } from '@capacitor/cli'

/**
 * IHMS Emergency — پیکربندی Capacitor برای بسته‌بندی اندروید
 *
 * ⚠️ معماری: این اپ یک بک‌اند کامل دارد (API + دیتابیس + سوکت).
 * فایل APK فقط یک «پوسته» است که به سرور میزبان وصل می‌شود.
 * پس از استقرار سرور (راهنمای PDF بخش ۶)، مقدار server.url را
 * با آدرس دامنه خودتان جایگزین کنید.
 *
 * اجرای کامل بسته‌بندی:  bash scripts/build-android.sh
 */
const config: CapacitorConfig = {
  appId: 'ir.zarinpars.ihms.emergency',
  appName: 'IHMS Emergency',
  webDir: 'public',
  server: {
    // 🔴 آدرس سرور مستقرشده خود را اینجا بگذارید (HTTPS الزامی است)
    url: 'https://ihms.YOUR-DOMAIN.com',
    cleartext: false,
    // برای تست لوکال روی دستگاه واقعی (اختیاری):
    // url: 'http://192.168.1.10:3000',
    // cleartext: true,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0f172a',
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#dc2626',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
}

export default config
