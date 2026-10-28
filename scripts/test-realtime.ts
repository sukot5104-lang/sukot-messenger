/**
 * SUKOT MESSENGER — real-time two-user delivery test (fixed sequencing)
 * B listener starts first; A sends while B is connected.
 */
import { io, Socket } from "socket.io-client";

const BASE = "http://localhost:3000";
const j = (r: Response) => r.json() as Promise<any>;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function auth(path: string, payload: object) {
  const res = await fetch(`${BASE}/api/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await j(res);
  if (!res.ok || !data?.token) throw new Error(`${path} failed: ${JSON.stringify(data)}`);
  return data;
}

const rand = Math.floor(Math.random() * 100000);
const userB = `rtb${rand}`;

let A;
try {
  A = await auth("register", { username: `rtba${rand}`, password: "Test@1234", displayName: "کاربر A تست" });
  console.log("✔ user A registered:", A.user.username);
} catch {
  A = await auth("login", { username: `rtba${rand}`, password: "Test@1234" });
  console.log("✔ user A logged in:", A.user.username);
}

let B;
try {
  B = await auth("register", { username: userB, password: "Test@1234", displayName: "کاربر B تست" });
  console.log("✔ user B registered:", B.user.username);
} catch {
  B = await auth("login", { username: userB, password: "Test@1234" });
  console.log("✔ user B logged in:", B.user.username);
}

const convRes = await fetch(`${BASE}/api/conversations`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Cookie: `sukot_session=${A.token}` },
  body: JSON.stringify({ username: B.user.username }),
});
const conv = await j(convRes);
if (!convRes.ok || !conv.conversationId) throw new Error("conversation failed: " + JSON.stringify(conv));
console.log("✔ conversation ready:", conv.conversationId);

// ---- user B: connect socket, START LISTENER (do not await yet) ----
let resolveB: (v: any[]) => void;
let rejectB: (e: Error) => void;
const bPromise = new Promise<any[]>((res, rej) => { resolveB = res; rejectB = rej; });
const got: any[] = [];

const sB: Socket = io("http://localhost:3003", {
  transports: ["polling", "websocket"],
  auth: { token: B.token },
  timeout: 10000,
});
sB.on("connect", () => console.log("✔ user B socket connected:", sB.id));
sB.on("message:new", (m: any) => { console.log("📩 user B got message:new"); got.push(m); });
sB.on("connect_error", (e: Error) => rejectB(new Error("B connect_error: " + e.message)));
setTimeout(() => { sB.disconnect(); resolveB(got); }, 8000);

await sleep(2500); // let B fully connect & join rooms

// ---- user A: connect socket, send message ----
await new Promise<void>((resolve, reject) => {
  const sA: Socket = io("http://localhost:3003", {
    transports: ["polling", "websocket"],
    auth: { token: A.token },
    timeout: 10000,
  });
  sA.on("connect", () => {
    console.log("✔ user A socket connected:", sA.id);
    sA.emit("message:send", { conversationId: conv.conversationId, content: "عکس تست real-time", clientId: "rt-" + rand, messageType: "image", imageUrl: "/uploads/mvs5vnws90a9a04c1879e54e.png" }, (ack: any) => {
      console.log("✔ send ack ok =", ack?.ok);
      sA.disconnect();
      resolve();
    });
  });
  sA.on("connect_error", (e: Error) => { sA.disconnect(); reject(new Error("A connect_error: " + e.message)); });
});

const received = await bPromise;

if (received.length > 0) {
  const m = received[0]?.message ?? received[0];
  console.log("\n✅ PASS — پیام در لحظه به کاربر B رسید:", String(m?.content ?? "").slice(0, 80));
  process.exit(0);
} else {
  console.log("\n❌ FAIL — user B did NOT receive the message via socket");
  process.exit(1);
}
