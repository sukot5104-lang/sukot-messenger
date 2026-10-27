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
