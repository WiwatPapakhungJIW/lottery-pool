// closeAndSettle — หัวใจฝั่งแอดมิน: ปิดงวด + คิดทุกโพย + อัปเดตแต้มสะสม
// service ฝั่ง server เท่านั้น (เรียกผ่าน app/actions.ts ที่ verify admin จาก session)
// ทั้งหมดอยู่ใน transaction เดียว → สำเร็จทั้งหมด หรือไม่เปลี่ยนอะไรเลย

import { prisma } from "../db";
import { settleDraw } from "../scoring";
import { toDrawResult, toScoringBet } from "../mapper";

export interface CloseAndSettleInput {
  drawId: string;
  adminUserId: string;
}

async function assertAdmin(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u || u.role !== "ADMIN") throw new Error("ต้องเป็นแอดมินเท่านั้น");
}

// previewSettlement — คิดคะแนน "เสมือน" โดยไม่เขียน DB
// ให้แอดมินเห็นผลก่อนกดเคลียร์จริง (กันกรอกผลผิด)
export async function previewSettlement(drawId: string) {
  const draw = await prisma.draw.findUnique({
    where: { id: drawId },
    include: { result: true, bets: true },
  });
  if (!draw) throw new Error("ไม่พบงวดนี้");
  if (!draw.result) throw new Error("ยังไม่ได้กรอกผลรางวัล");

  return settleDraw(toDrawResult(draw.result), draw.bets.map(toScoringBet));
}

export async function closeAndSettle(input: CloseAndSettleInput) {
  const { drawId, adminUserId } = input;
  await assertAdmin(adminUserId);

  const draw = await prisma.draw.findUnique({
    where: { id: drawId },
    include: { result: true, bets: true },
  });
  if (!draw) throw new Error("ไม่พบงวดนี้");
  if (draw.status === "SETTLED") throw new Error("งวดนี้เคลียร์ไปแล้ว");
  if (!draw.result) throw new Error("ยังไม่ได้กรอกผลรางวัล");

  // คิดคะแนนด้วย pure function (ไม่แตะ DB) — ทดสอบมาแล้วครบ
  const summary = settleDraw(
    toDrawResult(draw.result),
    draw.bets.map(toScoringBet),
  );

  // เขียนผลทั้งหมดแบบ atomic
  await prisma.$transaction(async (tx) => {
    // กัน double-settle จาก race condition: เช็คสถานะอีกครั้งในทรานแซกชัน
    const fresh = await tx.draw.findUnique({
      where: { id: drawId },
      select: { status: true },
    });
    if (fresh?.status === "SETTLED") throw new Error("งวดนี้เพิ่งถูกเคลียร์ไป");

    // 1) อัปเดตผลแต่ละโพย
    for (const b of summary.bets) {
      await tx.bet.update({
        where: { id: b.id },
        data: {
          status: b.status === "win" ? "WIN" : "LOSE",
          appliedRate: b.appliedRate,
          wonPoints: b.wonPoints,
        },
      });
    }

    // 2) บวกแต้มสะสมต่อคน ด้วย net (= won - staked) ของงวดนี้
    for (const [userId, agg] of Object.entries(summary.perUser)) {
      await tx.membership.update({
        where: { userId_roomId: { userId, roomId: draw.roomId } },
        data: { totalPoints: { increment: agg.net } },
      });
    }

    // 3) ปิดงวด
    await tx.draw.update({
      where: { id: drawId },
      data: { status: "SETTLED", settledAt: new Date() },
    });
  });

  return summary; // เอาไปโชว์สรุป/ลีดเดอร์บอร์ดได้เลย
}

// revertSettlement — "ยกเลิกการเคลียร์งวด" กรณีกรอกผลผิด
// ถอนแต้มที่บวกไปคืน + รีเซ็ตโพยกลับ PENDING + งวดกลับเป็น CLOSED
export async function revertSettlement(input: CloseAndSettleInput) {
  const { drawId, adminUserId } = input;
  await assertAdmin(adminUserId);

  const draw = await prisma.draw.findUnique({
    where: { id: drawId },
    include: { result: true, bets: true },
  });
  if (!draw) throw new Error("ไม่พบงวดนี้");
  if (draw.status !== "SETTLED") throw new Error("งวดนี้ยังไม่ได้เคลียร์");
  if (!draw.result) throw new Error("ไม่พบผลรางวัลของงวด");

  // คำนวณ net เดิมจากข้อมูลปัจจุบัน เพื่อถอนคืนให้พอดี
  const summary = settleDraw(
    toDrawResult(draw.result),
    draw.bets.map(toScoringBet),
  );

  await prisma.$transaction(async (tx) => {
    for (const [userId, agg] of Object.entries(summary.perUser)) {
      await tx.membership.update({
        where: { userId_roomId: { userId, roomId: draw.roomId } },
        data: { totalPoints: { decrement: agg.net } },
      });
    }
    await tx.bet.updateMany({
      where: { drawId },
      data: { status: "PENDING", appliedRate: null, wonPoints: 0 },
    });
    await tx.draw.update({
      where: { id: drawId },
      data: { status: "CLOSED", settledAt: null },
    });
  });

  return { reverted: true };
}
