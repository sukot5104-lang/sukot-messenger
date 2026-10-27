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
