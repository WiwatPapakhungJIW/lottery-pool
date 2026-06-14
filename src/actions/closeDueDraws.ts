// closeDueDraws — ปิดงวดที่ถึงเวลาแล้ว (OPEN → CLOSED) แบบ batch
// service ฝั่ง server เท่านั้น เรียกจาก cron route
// หมายเหตุ: การ "กันแทงหลังปิด" บังคับที่ placeBet (เทียบ now กับ closeAt) อยู่แล้ว
// cron นี้แค่พลิกสถานะให้ตรงเพื่อใช้แสดงผล/เปิดให้เคลียร์งวด

import { prisma } from "../db";

export async function closeDueDraws(now = new Date()) {
  const res = await prisma.draw.updateMany({
    where: { status: "OPEN", closeAt: { lte: now } },
    data: { status: "CLOSED" },
  });
  return { closed: res.count };
}
