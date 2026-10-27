# SUKOT MESSENGER — نصب روی iOS

اپل اجازه توزیع فایل IPA خارج از App Store را فقط با حساب Apple Developer (سالانه ۹۹ دلار) می‌دهد. اما خبر خوب: **SUKOT MESSENGER به‌صورت PWA روی iOS مثل یک اپ واقعی نصب می‌شود — بدون هیچ هزینه‌ای:**

## نصب PWA (پیشنهادی — رایگان و فوری)
1. آدرس SUKOT MESSENGER را با **Safari** باز کنید (فقط Safari!)
2. دکمه **اشتراک‌گذاری** (مربع با فلش به بالا) را بزنید
3. **«Add to Home Screen»** را انتخاب کنید
4. نام و آیکون را تأیید کنید — تمام!
5. اپ با تمام‌صفحه، بدون نوار مرورگر و آیکون اختصاصی اجرا می‌شود

> نکته: روی iOS، نوتیفیکیشن PWA از iOS 16.4 به بعد پشتیبانی می‌شود (کاربر باید اپ را به صفحه اصلی اضافه کرده باشد).

## ساخت اپ بومی (اختیاری — نیاز به مک و اپل دولوپر اکانت)
اگر حساب Apple Developer دارید:
1. در Xcode یک پروژه «iOS App» جدید بسازید (Bundle ID: `com.sukot.messenger`)
2. یک `WKWebView` تمام‌صفحه اضافه کنید که `app_url` را بارگذاری کند:
   ```swift
   import SwiftUI
   import WebKit

   struct ContentView: UIViewRepresentable {
       let url = URL(string: "https://YOUR-SUKOT-SITE.example.com")!
       func makeUIView(context: Context) -> WKWebView {
           let w = WKWebView()
           w.load(URLRequest(url: url))
           return w
       }
       func updateUIView(_ uiView: WKWebView) {}
   }
   ```
3. آیکون‌های `public/icons/apple-touch-icon.png` را در App Icons قرار دهید
4. از Xcode روی دستگاه نصب کنید یا برای TestFlight/App Store بفرستید
