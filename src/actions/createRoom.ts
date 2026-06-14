// createRoom — สร้างวงใหม่ + ตั้งผู้สร้างเป็นเจ้าของ + สมาชิกคนแรก
// service ฝั่ง server เท่านั้น (เรียกผ่าน app/actions.ts ที่ verify admin จาก session)

import { prisma } from "../db";

// โค้ดเชิญ 8 ตัว ตัดอักขระที่สับสน (0/O, 1/I)
function genInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++)
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

export async function createRoom(
  ownerUserId: string,
  nameRaw: string,
  pointBudgetPerDraw = 10000,
) {
  const name = nameRaw.trim();
  if (!name) throw new Error("ตั้งชื่อวงก่อน");
  if (pointBudgetPerDraw <= 0) throw new Error("งบแต้มต้องมากกว่า 0");

  // กันโค้ดชน (ความน่าจะเป็นต่ำมาก) — ลองสูงสุด 5 ครั้ง
  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = genInviteCode();
    const exists = await prisma.room.findUnique({ where: { inviteCode } });
    if (exists) continue;
    return prisma.room.create({
      data: {
        name,
        inviteCode,
        ownerId: ownerUserId,
        pointBudgetPerDraw,
        memberships: { create: { userId: ownerUserId, totalPoints: 0 } },
      },
    });
  }
  throw new Error("สร้างโค้ดเชิญไม่สำเร็จ ลองใหม่อีกครั้ง");
}
