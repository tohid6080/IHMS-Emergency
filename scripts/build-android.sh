#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# IHMS Emergency — ساخت APK اندروید با Capacitor
# استفاده:  bash scripts/build-android.sh [debug|release]
# پیش‌نیازها: Node 20+ یا Bun، JDK 17، Android SDK (راهنمای PDF بخش ۳)
# ═══════════════════════════════════════════════════════════
set -euo pipefail

MODE="${1:-debug}"
cd "$(dirname "$0")/.."
ROOT="$(pwd)"

echo "▶ ۱/۶ نصب پکیج‌های Capacitor..."
bun add @capacitor/core @capacitor/android @capacitor/splash-screen
bun add -d @capacitor/cli

echo "▶ ۲/۶ بررسی server.url در capacitor.config.ts..."
if grep -q 'YOUR-DOMAIN' capacitor.config.ts; then
  echo "⚠️  آدرس سرور هنوز placeholder است. برای تست لوکال ادامه می‌دهیم؛"
  echo "    برای انتشار، server.url را در capacitor.config.ts ویرایش کنید."
fi

echo "▶ ۳/۶ ساخت نسخه production وب‌اپ..."
bun run build

echo "▶ ۴/۶ افزودن پلتفرم اندروید (فقط بار اول)..."
if [ ! -d android ]; then
  bunx cap add android
else
  echo "    پوشه android از قبل وجود دارد — رد شد."
fi

echo "▶ ۵/۶ همگام‌سازی وب در پروژه اندروید..."
bunx cap sync android

echo "▶ ۶/۶ Gradle assemble${MODE^}..."
cd android
if [ "$MODE" = "release" ]; then
  # برای امضای release، راهنمای PDF بخش ۳-د را ببینید (keystore)
  ./gradlew assembleRelease
  APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
else
  ./gradlew assembleDebug
  APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
fi
cd "$ROOT"

echo ""
echo "✅ تمام شد! فایل APK:"
echo "   $ROOT/$APK_PATH"
echo "   نصب روی گوشی: adb install -r $APK_PATH"
