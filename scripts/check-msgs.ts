import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const msgs = await p.message.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { sender: true } });
console.log(JSON.stringify(msgs.map(x => ({ from: x.sender.username, body: x.content.slice(0, 40), conv: x.conversationId })), null, 1));
const users = await p.user.findMany({ select: { username: true, isVerified: true } });
console.log("USERS:", users);
await p.$disconnect();
