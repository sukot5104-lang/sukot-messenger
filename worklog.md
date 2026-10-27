# SUKOT MESSENGER - Work Log

Project: Real online messenger (Next.js 16 + Prisma SQLite + socket.io mini-service)
Owner requirement: Persian RTL UI, dark neon-purple theme, unique ID registration (no phone), real-time messaging, admin panel, official "Sukot" support account (verified, non-copyable, reserved), PWA installers (Android/iOS/Windows), GitHub upload.

---
Task ID: 1
Agent: main (Z.ai)
Task: Environment init & structure inspection

Work Log:
- Ran fullstack init script (Next.js 16 scaffold at /home/z/my-project)
- Inspected package.json, Caddyfile, examples/websocket (socket.io pattern: path '/', XTransformPort=3003)
- DATABASE_URL=file:/home/z/my-project/db/custom.db
- Dev server auto-runs on port 3000; mini-services auto-start via .zscripts/dev.sh (bun run dev in each folder)

Stage Summary:
- Plan: Prisma schema -> chat-service (socket.io, port 3003) -> REST APIs -> SPA UI (single page.tsx per sandbox rule) -> PWA -> docs/installers -> GitHub push

---
Task ID: 2
Agent: main (Z.ai)
Task: Build complete SUKOT MESSENGER

Work Log:
- Prisma schema: User (dual UNIQUE username/usernameLower), Conversation, Participation (read/delivered receipts, per-user hide), Message, Block, Report, ReservedId, Setting
- Seed: official "Sukot" account (verified, non-deletable, non-bannable) + 21 reserved IDs + id_delete_policy setting
- mini-services/chat-service (socket.io, port 3003 + internal bridge port 3004): presence, live messages, typing, delivered/read receipts, internal emit for REST, force-logout, brand echo handling
- REST APIs: auth (register/login/logout/me/check-username with live availability), conversations CRUD, messages history, search, blocks, reports, profile, account delete (release/reserve policy), full admin API set (stats/users/reports/reserved/settings/logs)
- Security: bcrypt-12, JWT HttpOnly cookies, zod validation, rate limiting (register/login/search/messages/reports/admin), brand impersonation detection (suk0t, su_kot, 5ukot...), admin auth fully separate
- UI: single-page RTL Persian dark neon-purple theme — login/register, chat list, chat view (ticks, typing, day separators, optimistic send), search with official Sukot featured card, profile (edit/color/copy-ID/blocked/install/delete-account), admin dashboard (stats, users actions, reports, reserved IDs, policy radio, logs)
- PWA: manifest, sw.js, generated neon icons (192/512/maskable/apple)
- Fixed: socket echo duplicate-message bug (clientId on data not msg), mobile grid min-content overflow (min-w-0 on grid items), bubble sides flipped to Telegram-RTL convention
- Browser-verified: register → welcome conv from Sukot, two-user real-time chat both ways, unread badges, read ticks, report flow → admin panel, admin ban/unban/verify/free-ID, policy release/reserve both verified via API, mobile 390px layout
- Cleaned all test data; DB has only official Sukot account
- Docs: README.md (Persian full guide), .env.example
- Installers: android WebView gradle project, windows Electron project, ios guide; GitHub Actions build-android.yml + build-windows.yml (auto APK/EXE artifacts)

Stage Summary:
- App fully working & tested; repo pushed to https://github.com/sukot5104-lang/sukot-messenger (token removed from remote URL after push)
- GitHub Actions building APK + EXE artifacts automatically
- Default credentials (to change in .env): SUKOT_PASSWORD=Sukot@2026, ADMIN_PASSWORD=SukotAdmin@2026

---
Task ID: 3
Agent: main (Z.ai)
Task: Final verification, GitHub upload & installer artifacts

Work Log:
- Fixed react-hooks/set-state-in-effect lint via ChatView remount-by-key pattern; eslint ignores for installers/mini-services
- Final browser smoke test: register demo_final → Sukot welcome chat → send message via UI → rendered with ticks ✓
- Cleaned all test data again (DB: only Sukot user, 0 messages/convs)
- GitHub: repo sukot5104-lang/sukot-messenger created & pushed (3 commits); token removed from remote URL
- GitHub Actions: Build Windows EXE ✓, Build Android APK ✓ (after adding gradle.properties with AndroidX flags)
- Artifacts downloaded to /home/z/my-project/download/: SUKOT-Messenger-Android.apk (3.3MB), SUKOT-Messenger-Setup-Windows.exe (78MB), SUKOT-Messenger-Portable-Windows.exe (78MB) + Persian README

Stage Summary:
- DELIVERED: full working messenger + GitHub repo + installer files
- User must revoke the leaked GitHub token immediately

---
Task ID: 4
Agent: main (Z.ai)
Task: 提供 App 安装链接（GitHub Release 发布）

Work Log:
- 确认 GitHub token 仍有效，仓库 sukot5104-lang/sukot-messenger 在线（HTTP 200）
- 从 GitHub Actions 两个成功 run 重新下载构建产物（APK 3.3MB、Windows Setup/Portable EXE 各78MB）
- 安装包恢复到 /home/z/my-project/download/
- 创建 GitHub Release v1.0.0 并上传 3 个安装包资产
- 验证三个公开下载链接均 HTTP 200；应用 dev server 正常（GET / 200）

Stage Summary:
- 永久公开下载链接已生成（github.com/sukot5104-lang/sukot-messenger/releases/tag/v1.0.0）
- 本地副本保存于 /home/z/my-project/download/
- 提醒：用户仍应尽快吊销聊天中暴露的 token
