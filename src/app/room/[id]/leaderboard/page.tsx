import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/db";

function initials(name: string) {
  return name.trim().slice(0, 2) || "??";
}

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: roomId } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) notFound();

  const me = await prisma.membership.findUnique({
    where: { userId_roomId: { userId: session.user.id, roomId } },
  });
  if (!me) redirect("/join");

  const members = await prisma.membership.findMany({
    where: { roomId },
    include: { user: true },
    orderBy: { totalPoints: "desc" },
  });

  const lastSettled = await prisma.draw.findFirst({
    where: { roomId, status: "SETTLED" },
    orderBy: { settledAt: "desc" },
    include: { result: true, bets: true },
  });

  const deltaByUser = new Map<string, number>();
  if (lastSettled) {
    for (const b of lastSettled.bets) {
      deltaByUser.set(
        b.userId,
        (deltaByUser.get(b.userId) ?? 0) + b.wonPoints - b.stakePoints,
      );
    }
  }

  return (
    <main>
      <div className="topbar">
        <div className="brand">
          <Link href="/" style={{ fontSize: 20 }}>
            ‹
          </Link>
          <div>
            <h1>{room.name}</h1>
            <div className="faint">ลีดเดอร์บอร์ด</div>
          </div>
        </div>
      </div>

      {lastSettled?.result && (
        <div className="card">
          <div className="row-between">
            <strong>ผลงวด {lastSettled.drawDate.toLocaleDateString("th-TH")}</strong>
            <span className="badge settled">ออกผลแล้ว</span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 12,
            }}
          >
            <div className="stat">
              <div className="label">รางวัลที่ 1</div>
              <div className="value" style={{ letterSpacing: 1 }}>
                {lastSettled.result.first6}
              </div>
            </div>
            <div className="stat">
              <div className="label">2 ตัวล่าง</div>
              <div className="value" style={{ letterSpacing: 2 }}>
                {lastSettled.result.last2}
              </div>
            </div>
            <div className="stat">
              <div className="label">3 ตัวบน</div>
              <div className="value" style={{ letterSpacing: 2 }}>
                {lastSettled.result.first6.slice(-3)}
              </div>
            </div>
            <div className="stat">
              <div className="label">3 ตัวล่าง</div>
              <div className="value" style={{ fontSize: 17 }}>
                {lastSettled.result.last3a} · {lastSettled.result.last3b}
              </div>
            </div>
          </div>
        </div>
      )}

      <h2>อันดับ</h2>
      <div className="card">
        {members.map((m, i) => {
          const delta = deltaByUser.get(m.userId);
          const isMe = m.userId === session.user.id;
          return (
            <Link
              href={`/room/${roomId}/player/${m.userId}`}
              key={m.id}
              className={
                "lb-item" + (i === 0 ? " first" : isMe ? " me" : "")
              }
              style={{ color: "inherit" }}
            >
              <span className={"rank" + (i === 0 ? " top" : "")}>{i + 1}</span>
              <span
                className={
                  "avatar" + (i === 0 ? " gold" : isMe ? " me" : "")
                }
              >
                {initials(m.user.displayName)}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>
                  {m.user.displayName}
                  {isMe && (
                    <span style={{ color: "var(--info)", fontSize: 12 }}>
                      {" "}
                      (คุณ)
                    </span>
                  )}
                </div>
                {delta !== undefined && delta !== 0 && (
                  <span className={delta > 0 ? "delta-up" : "delta-down"}>
                    {delta > 0 ? "▲ +" : "▼ "}
                    {delta.toLocaleString()} งวดนี้
                  </span>
                )}
              </div>
              <strong>{m.totalPoints.toLocaleString()}</strong>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
