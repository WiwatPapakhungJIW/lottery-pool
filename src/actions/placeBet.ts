// placeBet — service ฝั่ง server เท่านั้น (ไม่ใช่ Server Action โดยตรง)
// เรียกผ่าน app/actions.ts ที่ inject userId จาก session → กัน client ส่ง userId ปลอม
// กันโกง: เช็คสถานะงวด + เวลาเซิร์ฟเวอร์ + งบแต้ม ที่ฝั่ง server เท่านั้น

import { prisma } from "../db";
import { validateBetDraft, type BetType } from "../scoring";
import { resolvePayoutRate } from "../mapper";

export interface BetDraft {
  betType: BetType;
  number: string;
  stakePoints: number;
}

export interface PlaceBetInput {
  drawId: string;
  userId: string;
  items: BetDraft[];
}

export async function placeBet(input: PlaceBetInput) {
  const { drawId, userId, items } = input;

  if (items.length === 0) throw new Error("ยังไม่มีโพยให้ยืนยัน");

  // ตรวจรูปแบบโพยทุกใบก่อน (เลขกี่หลัก, stake > 0)
  items.forEach((it, i) =>
    validateBetDraft(it.betType, it.number, it.stakePoints, `โพยใบที่ ${i + 1}`),
  );

  const draw = await prisma.draw.findUnique({
    where: { id: drawId },
    include: { room: { include: { rates: true } } },
  });
  if (!draw) throw new Error("ไม่พบงวดนี้");

  // กันโกง 1: งวดต้องยังเปิด และยังไม่เลยเวลาปิดรับ (เทียบเวลาเซิร์ฟเวอร์)
  if (draw.status !== "OPEN") throw new Error("งวดนี้ปิดรับแล้ว");
  if (new Date() >= draw.closeAt) throw new Error("เลยเวลาปิดรับแล้ว");

  // ต้องเป็นสมาชิกวงนี้
  const membership = await prisma.membership.findUnique({
    where: { userId_roomId: { userId, roomId: draw.roomId } },
  });
  if (!membership) throw new Error("คุณยังไม่ได้อยู่ในวงนี้");

  // กันโกง 2: รวมแต้มที่ลงไปแล้ว + ใบใหม่ ต้องไม่เกินงบต่องวด
  const existing = await prisma.bet.aggregate({
    where: { drawId, userId },
    _sum: { stakePoints: true },
  });
  const already = existing._sum.stakePoints ?? 0;
  const adding = items.reduce((s, it) => s + it.stakePoints, 0);
  if (already + adding > draw.room.pointBudgetPerDraw)
    throw new Error(
      `เกินงบงวดนี้ (เหลือ ${draw.room.pointBudgetPerDraw - already} แต้ม)`,
    );

  // snapshot เรต ณ ตอนแทง แล้วบันทึกทั้งชุดในทีเดียว
  const created = await prisma.bet.createMany({
    data: items.map((it) => ({
      drawId,
      userId,
      betType: it.betType,
      number: it.number,
      stakePoints: it.stakePoints,
      payoutRate: resolvePayoutRate(it.betType, draw.room.rates),
    })),
  });

  return { count: created.count };
}
