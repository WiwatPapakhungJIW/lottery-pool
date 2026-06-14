import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/db";
import { BetForm } from "./BetForm";

// หน้าเล่นของงวด — โหลดงวด + โพยของผู้เล่นคนนี้ แล้วส่งให้ฟอร์ม (client)
export default async function DrawPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return null; // middleware กันอยู่แล้ว แต่กันเหนียว

  const draw = await prisma.draw.findUnique({
    where: { id },
    include: { room: true },
  });
  if (!draw) notFound();

  const myBets = await prisma.bet.findMany({
    where: { drawId: id, userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  const spent = myBets.reduce((s, b) => s + b.stakePoints, 0);
  const isOpen = draw.status === "OPEN" && new Date() < draw.closeAt;

  return (
    <main>
      <h1>{draw.room.name}</h1>
      <p>
        งวด {draw.drawDate.toLocaleDateString("th-TH")} · สถานะ {draw.status}
      </p>
      <p>
        แต้มคงเหลือ {draw.room.pointBudgetPerDraw - spent} /{" "}
        {draw.room.pointBudgetPerDraw}
      </p>

      <BetForm
        drawId={id}
        remaining={draw.room.pointBudgetPerDraw - spent}
        disabled={!isOpen}
        myBets={myBets.map((b) => ({
          id: b.id,
          betType: b.betType,
          number: b.number,
          stakePoints: b.stakePoints,
        }))}
      />
    </main>
  );
}
