# SUKOT MESSENGER — نصب‌کننده ویندوز (Electron)

این پوشه یک نصب‌کننده واقعی ویندوز برای SUKOT MESSENGER می‌سازد.

## روش ۱ — ساخت خودکار با GitHub Actions (پیشنهادی)
هیچ کاری لازم نیست! فایل `.github/workflows/build-windows.yml` با هر Push به مخزن، فایل‌های زیر را می‌سازد و در بخش **Actions → Artifacts** قرار می‌دهد:
- `SUKOT-Messenger-Setup.exe` (نصب‌کننده کامل)
- `SUKOT-Messenger-Portable.exe` (بدون نصب)

## روش ۲ — ساخت دستی (روی ویندوز)
```bash
cd installers/windows
# ۱) آدرس سایت خود را در main.js مقدار APP_URL بگذارید
npm install
npm run dist
# خروجی در پوشه dist/
```

## نکته
قبل از ساخت، حتماً `APP_URL` در `main.js` را به آدرس استقرار SUKOT MESSENGER خود تغییر دهید.
