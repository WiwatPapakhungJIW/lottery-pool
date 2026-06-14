// setup-demo.ts — ตั้งค่าเริ่มต้นหลัง login ครั้งแรก
// ใช้: ตั้งผู้ใช้เป็นแอดมิน + สร้างวงตัวอย่าง + เปิดงวดให้ทดสอบ
//
//   npm run setup:demo                 # ใช้ user คนแรกในระบบ
//   npm run setup:demo -- <lineUserId> # ระบุ user ที่ต้องการตั้งเป็นแอดมิน
//
// ต้อง login ผ่าน LINE อย่างน้อย 1 ครั้งก่อน (เพื่อให้มีแถวใน User)

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const lineUserIdArg = process.argv[2];

  const user = lineUserIdArg
    ? await prisma.user.findUnique({ where: { lineUserId: lineUserIdArg } })
    : await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });

  if (!user) {
    throw new Error(
      "ไม่พบผู้ใช้ — กรุณา login ด้วย LINE ที่หน้าเว็บอย่างน้อย 1 ครั้งก่อน",
    );
  }

  // 1) ตั้งเป็นแอดมิน
  await prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN" },
  });

  // 2) สร้างวงตัวอย่าง (ถ้ายังไม่มี) — owner = ผู้ใช้คนนี้
  const inviteCode = "DEMO" + Math.random().toString(36).slice(2, 6).toUpperCase();
  const room = await prisma.room.create({
    data: {
      name: "วงเพื่อนซอย 7",
      inviteCode,
      ownerId: user.id,
      pointBudgetPerDraw: 10000,
      memberships: { create: { userId: user.id, totalPoints: 0 } },
    },
  });

  // 3) เปิดงวด: ปิดรับอีก 2 วัน
  const closeAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const draw = await prisma.draw.create({
    data: {
      roomId: room.id,
      drawDate: new Date(),
      closeAt,
      status: "OPEN",
    },
  });

  console.log("เสร็จแล้ว:");
  console.log(`  แอดมิน : ${user.displayName} (${user.id})`);
  console.log(`  วง     : ${room.name} · โค้ดเชิญ ${inviteCode}`);
  console.log(`  งวด    : ${draw.id} · ปิดรับ ${closeAt.toLocaleString("th-TH")}`);
  console.log("");
  console.log(`  หน้าเล่น  : /draw/${draw.id}`);
  console.log(`  หน้าแอดมิน: /draw/${draw.id}/admin`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
