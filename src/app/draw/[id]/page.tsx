import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/db";
import { BetForm } from "./BetForm";

const STATUS: Record<string, { cls: string; label: string }> = {
  OPEN: { cls: "open", label: "เปิดรับ" },
  CLOSED: { cls: "closed", label: "ปิดรับแล้ว" },
  SETTLED: { cls: "settled", label: "ออกผลแล้ว" },
};

export default async function DrawPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return null;

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
  const remaining = draw.room.pointBudgetPerDraw - spent;
  const isOpen = draw.status === "OPEN" && new Date() < draw.closeAt;
  const st = STATUS[draw.status] ?? STATUS.OPEN!;

  return (
    <main>
      <div className="topbar">
        <div className="brand">
          <Link href="/" style={{ fontSize: 20 }}>
            ‹
          </Link>
          <div>
            <h1>{draw.room.name}</h1>
            <div className="faint">
              งวด {draw.drawDate.toLocaleDateString("th-TH")}
            </div>
          </div>
        </div>
        <span className={"badge " + st.cls}>{st.label}</span>
      </div>

      <div className="card">
        <div className="stat">
          <div className="label">แต้มคงเหลืองวดนี้</div>
          <div className="value">
            {remaining.toLocaleString()}{" "}
            <span style={{ fontSize: 14, fontWeight: 400, color: "var(--faint)" }}>
              / {draw.room.pointBudgetPerDraw.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <BetForm
        drawId={id}
        remaining={remaining}
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
