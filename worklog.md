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

---
Task ID: 5
Agent: main (Z.ai)
Task: 修复 APK 打开报错（网页不可达）并重新发布 v1.0.1

Work Log:
- 诊断：APK/Windows 安装包指向占位地址 YOUR-SUKOT-SITE.example.com → ERR_CONNECTION_CLOSED
- 发现 sandbox 真实 preview URL：preview-chat-3fd46f3c-fade-49e4-a7c1-0333d3f54379.space-z.ai（HTTP 200）
- 发现数据库被 sandbox 重启重置（Sukot 官方账号/保留ID/设置丢失，仅剩 Skkei 用户）→ 重新运行 seed.ts 恢复
- agent-browser 端到端验证：登录页渲染 ✓ 注册 demo_link ✓ 主页 ✓ 搜索到 Sukot（绿勾）✓ 聊天发消息 ✓ 截图确认 UI
- 清理全部测试数据（仅剩官方 Sukot）
- 重写 MainActivity.kt：启动画面（SUKOT 霓虹 logo）+ 波斯语错误页 + 重试按钮 + 状态栏深色
- Windows main.js：真实 URL + 断线自动重试（波斯语错误页，5秒循环）
- push 被拒两次：大文件（ghdl 安装包误入自动提交）→ soft reset 清除；GitHub Push Protection 拦截 token（create-release.sh）→ 改为 GITHUB_TOKEN 环境变量
- 推送成功 → Actions 构建 APK+EXE 均 success → 下载产物
- 发布 Release v1.0.1，三个链接均验证 HTTP 200

Stage Summary:
- v1.0.1 安装包链接已交付用户；APK 现指向当前 sandbox preview URL（会话结束会失效，需用户日后部署固定服务器并改 strings.xml 一行 + GitHub Actions 自动重构建）
- 教训：.gitignore 已加入 scripts/ghdl/、download/、upload/；token 只通过环境变量传递

---
Task ID: 6
Agent: main (Z.ai)
Task:sandbox revert recovery — restore v1.0.2 code, user logo, DB, admin password Sukotzxcv; verify messaging end-to-end

Work Log:
- Sandbox rolled back to pre-v1.0.2 snapshot: local git missing 774e9ff/95f9b99, worklog tasks 4-5 lost, scripts/ trimmed, download/ emptied, DB wiped
- Recovered BOTH user images from local auto-commit fecac31 before reset (upload/*.jpg screenshot + 1254x1254 Sukot neon logo PNG)
- git reset --hard origin/main -> restored full v1.0.2 (socket user-rooms delivery fix, REST fallback, logo splash, in-app downloads)
- Re-seeded DB (Sukot official account + 21 reserved IDs + policy=reserve); cleaned all test users afterwards (only Sukot remains)
- .env: ADMIN_PASSWORD=Sukotzxcv (user request) — Next.js hot-reloaded env
- Restarted chat-service (was down after revert): socket 3003 + internal bridge 3004 healthy
- Implemented official-avatar feature: Avatar src prop; Sukot renders /logo.png in chat list, chat header, search results + featured card
- Optimized logo 1254px/1.7MB -> 640px/506KB for web delivery
- Verified: tsc clean, eslint clean, register via UI, message send (UI + socket ack), REAL-TIME delivery A->B PASS (scripts/test-realtime.ts), admin login Sukotzxcv + stats OK
- v1.0.2 release links all HTTP 200; public preview URL 200
- Pushed 5f528d5 (token via env only, stripped from remote URL after push)

Stage Summary:
- App fully restored to last-night state + logo-as-Sukot-avatar now actually implemented
- Admin panel password: Sukotzxcv (from .env)
- Installer binaries unchanged (v1.0.2 release assets still valid — server-side changes only)
- User accounts were wiped by sandbox revert -> user must re-register their ID

---
Task ID: 7
Agent: main (Z.ai)
Task: sandbox restart #2 recovery + set official Sukot password to owner-chosen value

Work Log:
- Sandbox restarted again: DB wiped, .env reverted, chat-service down, recovered/ dir lost
- .env restored (ADMIN + SUKOT_PASSWORD now owner-chosen values)
- Re-seeded DB with SUKOT_PASSWORD env -> official account created directly with owner password
- Restarted chat-service (3003/3004 healthy), Next.js env hot-reloaded
- Added scripts/set-sukot-password.ts (argv-based, no secrets in repo)
- Verified: REST login sukot + owner password -> ok:true token; admin login ok; UI form login PASS (screenshot)
- No plaintext passwords committed to repo

Stage Summary:
- Official Sukot account now uses owner-chosen password (email-format string)
- Recurring risk: every sandbox reset wipes DB -> users must re-register; seed + .env restore is the documented recovery path

---
Task ID: 8
Agent: main (Z.ai)
Task: self-recovery system so server resets stop breaking the app

Work Log:
- Built scripts/full-recovery.sh: on every boot restores .env (from gitignored scripts/.secrets.env), prisma schema (db push, idempotent), seeds official data ONLY if user table empty, restarts chat-service if health fails; logs to recovery.log
- Hooked into package.json "dev" -> runs automatically before next dev on every sandbox boot
- Both paths tested: happy path (3 users -> seed skipped) and fresh-DB path (scratch db -> db push + seed -> count=1)
- Real users exist now (reza, Shshshdhdh) — cleanup scripts must never run again except on explicit request
- Created scheduled health-check agent job (cron, every 6h, Asia/Tehran, priority high): checks web+chat-service+DB+Sukot login, self-heals (git sync, .env rewrite, recovery script, dev boot), never deletes data, never commits secrets
- No secrets in repo: passwords only in .env / .secrets.env (gitignored) / private cron prompt

Stage Summary:
- Reset resilience: code+logo safe on GitHub; infra auto-restores in seconds on boot; periodic agent self-heal every 6h
- Remaining gap: regular user accounts still lost on a full disk revert (offer: automatic DB backup or permanent host later)

---
Task ID: 9
Agent: main (Z.ai)
Task: automatic DB backup so user accounts survive resets (user request)

Work Log:
- Created PRIVATE repo sukot5104-lang/sukot-db-backup (201, private:true)
- scripts/db-checkpoint.ts: SQLite WAL checkpoint for consistent snapshot
- scripts/db-backup.sh: checkpoint -> copy db -> commit+push to private repo; lockfile; skips empty DB / no-change pushes; token from scripts/.secrets.env
- scripts/db-restore.sh: clones private backup, restores ONLY if local DB empty (never overwrites live data), then prisma db push to sync schema
- full-recovery.sh: new step 3 (restore-if-empty before schema/seed) + step 7 (best-effort backup after healing)
- Fixed lock-dir mkdir bug (mkdir -p before lock)
- Verified: backup pushed (3 users: reza, Shshshdhdh, Sukot; 106KB), remote contents checked, clone test = 3 users OK, restore skips on non-empty local, full recovery e2e OK
- Cron job recreated (480657, every 6h Asia/Tehran, high priority): health check + backup + self-heal incl. .env/.secrets recreation + private-repo knowledge
- Token stored only in gitignored scripts/.secrets.env + private cron prompt; nothing secret in pushed code

Stage Summary:
- User accounts + messages now survive full disk reverts (backup every 6h + on every boot)
- Restore is safe: only fills empty DB, never clobbers newer local data
- If user rotates the GitHub token, backup needs the new token (told user)

---
Task ID: 10
Agent: main (Z.ai)
Task: admin password -> owner email-format value + image sharing feature

Work Log:
- ADMIN_PASSWORD changed to mrzban679@gmail.com in .env + scripts/.secrets.env; verified via API; cron job recreated (480744) with new value
- Prisma Message: added messageType ("text"|"image", default text) + imageUrl? ; db push additive (no data loss) + generate
- New POST /api/upload: auth required, rate limit 12/min, 5MB cap, magic-byte signature check (jpg/png/webp/gif — rejects fake extensions), random filename, stored in public/uploads
- chat-service message:send: accepts messageType/imageUrl (validates /^\/uploads\/[a-z0-9]+\.(ext)$/), includes both in message:new payload
- REST messages route + conversations list lastMessage + GET history: include messageType/imageUrl
- ChatView: attach button (ImageIcon), hidden file input, preview bar with remove, upload-then-send flow, optimistic temp message, image bubble (click opens full size) + caption, spinner on send button; chat list shows «📷 عکس»
- Backup: db-backup.sh archives public/uploads -> uploads.tar.gz; db-restore.sh extracts on restore; full-recovery mkdir uploads
- Verified: upload via curl OK; fake-image rejected; 6MB rejected; UI flow register -> Sukot chat -> pick image -> preview -> send -> bubble with caption + ticks (screenshots t9-t12); DB persisted (type=image, img path); real-time socket delivery of image message PASS; backup pushed incl. uploads (2 files)
- Cleaned test accounts (imgtest1, rtb*) via targeted cleanup; real users reza/shshdhdh kept
- Note: HMR Fast Refresh reset component state mid-test once (dev artifact, not a bug)
- Dev server restart quirk: nohup bun run dev must use subshell pattern to survive tool sessions

Stage Summary:
- Image sharing fully live; all previous features intact; backup covers DB + uploaded images
- Everything pushed to GitHub (2f876f5)
