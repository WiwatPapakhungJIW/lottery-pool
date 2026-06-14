// enterResult — แอดมินกรอก/แก้ผลรางวัล (ยังไม่คิดคะแนน)
// service ฝั่ง server เท่านั้น (เรียกผ่าน app/actions.ts ที่ verify admin จาก session)
// แยกจาก closeAndSettle เพื่อให้ดู preview ก่อนกดเคลียร์งวดได้

import { prisma } from "../db";
import { validateResult } from "../scoring";
import { toDrawResult } from "../mapper";

export interface EnterResultInput {
  drawId: string;
  adminUserId: string;
  first6: string;
  last3a: string;
  last3b: string;
  last2: string;
}

async function assertAdmin(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u || u.role !== "ADMIN") throw new Error("ต้องเป็นแอดมินเท่านั้น");
}

export async function enterResult(input: EnterResultInput) {
  const { drawId, adminUserId, first6, last3a, last3b, last2 } = input;
  await assertAdmin(adminUserId);

  const draw = await prisma.draw.findUnique({ where: { id: drawId } });
  if (!draw) throw new Error("ไม่พบงวดนี้");
  if (draw.status === "SETTLED")
    throw new Error("งวดนี้เคลียร์ไปแล้ว แก้ผลไม่ได้");

  // ตรวจรูปแบบก่อนบันทึก (6/3/3/2 หลัก) — กันกรอกผิด
  validateResult(toDrawResult({ first6, last3a, last3b, last2 }));

  const result = await prisma.result.upsert({
    where: { drawId },
    create: { drawId, first6, last3a, last3b, last2, enteredById: adminUserId },
    update: { first6, last3a, last3b, last2, enteredById: adminUserId },
  });

  return { resultId: result.id };
}
