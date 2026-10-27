#!/bin/bash
# SUKOT MESSENGER — Create GitHub Release with installer assets
# Usage: GITHUB_TOKEN=xxxx bash scripts/create-release.sh   (token is NOT stored here)
set -e
TOKEN="${GITHUB_TOKEN:?Set GITHUB_TOKEN env var}"
REPO="sukot5104-lang/sukot-messenger"
TAG="v1.0.0"
DL="/home/z/my-project/download"

# 1. Create the release (idempotent: reuse if exists)
RELEASE_JSON=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.github.com/repos/$REPO/releases" \
  -d '{
    "tag_name": "v1.0.0",
    "target_commitish": "main",
    "name": "SUKOT MESSENGER v1.0.0",
    "body": "## 🚀 SUKOT MESSENGER v1.0.0\n\n### 📱 اندروید (Android)\n- `SUKOT-Messenger-Android.apk` — دانلود و نصب مستقیم (اجازه نصب از منابع ناشناس را بدهید)\n\n### 💻 ویندوز (Windows)\n- `SUKOT-Messenger-Setup-Windows.exe` — نصب‌کننده کامل (پیشنهادی)\n- `SUKOT-Messenger-Portable-Windows.exe` — نسخه پرتابل بدون نصب\n\n### 🍎 iOS (iPhone/iPad)\n- اپلیکیشن تحت وب (PWA): سایت را با Safari باز کنید → Share → Add to Home Screen\n\n### 🌐 نسخه وب\n- نسخه وب برنامه روی هر دستگاهی قابل استفاده است و به‌صورت PWA قابل نصب است.\n\n---\n- پیام‌رسان آنلاین با شناسه یکتا (بدون شماره موبایل)\n- پیام‌رسانی لحظه‌ای، تیک سبز رسمی Sukot، پنل مدیریت کامل\n- توسعه‌دهنده: Sukot",
    "draft": false,
    "prerelease": false
  }')

RELEASE_ID=$(echo "$RELEASE_JSON" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('id',''))")
if [ -z "$RELEASE_ID" ]; then
  echo "Release creation failed, checking existing release..."
  RELEASE_ID=$(curl -s -H "Authorization: Bearer $TOKEN" "https://api.github.com/repos/$REPO/releases/tags/$TAG" | python3 -c "import json,sys; print(json.load(sys.stdin).get('id',''))")
fi
echo "Release ID: $RELEASE_ID"

# 2. Upload assets
upload() {
  local FILE="$1"; local NAME="$2"
  echo "Uploading $NAME ..."
  curl -s -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/octet-stream" \
    --data-binary "@$DL/$FILE" \
    "https://uploads.github.com/repos/$REPO/releases/$RELEASE_ID/assets?name=$NAME" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print(' ->', d.get('browser_download_url') or d)"
}

upload "SUKOT-Messenger-Android.apk" "SUKOT-Messenger-Android.apk"
upload "SUKOT-Messenger-Setup-Windows.exe" "SUKOT-Messenger-Setup-Windows.exe"
upload "SUKOT-Messenger-Portable-Windows.exe" "SUKOT-Messenger-Portable-Windows.exe"

echo "DONE"
