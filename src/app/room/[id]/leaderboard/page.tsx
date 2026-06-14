import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/db";

function initials(name: string) {
  return name.trim().slice(0, 2) || "??";
}

// หน้าลีดเดอร์บอร์ดของวง — อันดับตามแต้มสะสม + เดลต้างวดล่าสุดที่เคลียร์แล้ว
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

  // ต้องเป็นสมาชิกถึงจะดูได้
  const me = await prisma.membership.findUnique({
    where: { userId_roomId: { userId: session.user.id, roomId } },
  });
  if (!me) redirect(`/join`);

  const members = await prisma.membership.findMany({
    where: { roomId },
    include: { user: true },
    orderBy: { totalPoints: "desc" },
  });

  // งวดล่าสุดที่เคลียร์แล้ว → ใช้คำนวณเดลต้าต่อคน + โชว์ผลรางวัล
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
      <h1>{room.name}</h1>

      {lastSettled?.result && (
        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 12,
            margin: "12px 0",
          }}
        >
          <strong>
            ผลงวด {lastSettled.drawDate.toLocaleDateString("th-TH")}
          </strong>
          <div style={{ marginTop: 6, lineHeight: 1.8 }}>
            รางวัลที่ 1: <b>{lastSettled.result.first6}</b> · 3 ตัวบน{" "}
            <b>{lastSettled.result.first6.slice(-3)}</b>
            <br />
            เลขท้าย 3 ตัว: <b>{lastSettled.result.last3a}</b> ·{" "}
            <b>{lastSettled.result.last3b}</b> · เลขท้าย 2 ตัว:{" "}
            <b>{lastSettled.result.last2}</b>
          </div>
        </section>
      )}

      <h2>อันดับ</h2>
      <ol style={{ listStyle: "none", padding: 0 }}>
        {members.map((m, i) => {
          const delta = deltaByUser.get(m.userId);
          const isMe = m.userId === session.user.id;
          return (
            <li
              key={m.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 10,
                border: i === 0 ? "2px solid #f0b400" : "1px solid #eee",
                background: isMe ? "#f5f8ff" : "transparent",
                marginBottom: 6,
              }}
            >
              <span style={{ width: 24, textAlign: "center", fontWeight: 500 }}>
                {i + 1}
              </span>
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "#eee",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                }}
              >
                {initials(m.user.displayName)}
              </span>
              <span style={{ flex: 1 }}>
                {m.user.displayName}
                {isMe && " (คุณ)"}
                {delta !== undefined && delta !== 0 && (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 13,
                      color: delta > 0 ? "green" : "crimson",
                    }}
                  >
                    {delta > 0 ? "▲ +" : "▼ "}
                    {delta.toLocaleString()} งวดนี้
                  </span>
                )}
              </span>
              <b>{m.totalPoints.toLocaleString()}</b>
            </li>
          );
        })}
      </ol>

      <p>
        <Link href="/">← กลับหน้าแรก</Link>
      </p>
    </main>
  );
}
