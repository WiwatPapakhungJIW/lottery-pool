// createDraw — เปิดงวดใหม่ในวง (status OPEN)
// service ฝั่ง server เท่านั้น (เรียกผ่าน app/actions.ts ที่ verify admin จาก session)

import { prisma } from "../db";

export async function createDraw(
  roomId: string,
  drawDateISO: string,
  closeAtISO: string,
) {
  const drawDate = new Date(drawDateISO);
  const closeAt = new Date(closeAtISO);
  if (Number.isNaN(+drawDate) || Number.isNaN(+closeAt))
    throw new Error("วันที่/เวลาไม่ถูกต้อง");
  if (closeAt <= new Date())
    throw new Error("เวลาปิดรับต้องเป็นอนาคต");

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new Error("ไม่พบวง");

  try {
    return await prisma.draw.create({
      data: { roomId, drawDate, closeAt, status: "OPEN" },
    });
  } catch {
    // ชน @@unique([roomId, drawDate])
    throw new Error("มีงวดของวันที่นี้อยู่แล้ว");
  }
}
