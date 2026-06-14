// joinRoom — เข้าร่วมวงด้วยโค้ดเชิญ
// service ฝั่ง server เท่านั้น (เรียกผ่าน app/actions.ts ที่ inject userId จาก session)

import { prisma } from "../db";

export async function joinRoom(userId: string, inviteCodeRaw: string) {
  const inviteCode = inviteCodeRaw.trim().toUpperCase();
  if (!inviteCode) throw new Error("กรุณาใส่โค้ดเชิญ");

  const room = await prisma.room.findUnique({ where: { inviteCode } });
  if (!room) throw new Error("ไม่พบวงจากโค้ดนี้");

  // เข้าร่วม (ถ้าเป็นสมาชิกอยู่แล้วก็ไม่เป็นไร)
  await prisma.membership.upsert({
    where: { userId_roomId: { userId, roomId: room.id } },
    create: { userId, roomId: room.id, totalPoints: 0 },
    update: {},
  });

  return { roomId: room.id, roomName: room.name };
}
