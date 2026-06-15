import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/db";
import { roomPlayerSummary } from "@/actions/summary";

const STATUS: Record<string, string> = {
  OPEN: "open",
  CLOSED: "closed",
  SETTLED: "settled",
};

export default async function PlayerSummaryPage({
  params,
}: {
  params: Promise<{ id: string; pid: string }>;
}) {
  const { id: roomId, pid } = await params;
  const session = await auth();
  if (!session?.user) return null;

  // ผู้ดูต้องเป็นสมาชิกวงนี้
  const viewer = await prisma.membership.findUnique({
    where: { userId_roomId: { userId: session.user.id, roomId } },
  });
  if (!viewer) redirect("/join");

  const target = await prisma.membership.findUnique({
    where: { userId_roomId: { userId: pid, roomId } },
    include: { user: true, room: true },
  });
  if (!target) notFound();

  const rows = await roomPlayerSummary(roomId, pid);
  const totalNet = rows.reduce((s, r) => s + r.net, 0);

  return (
    <main>
      <div className="topbar">
        <div className="brand">
          <Link href={`/room/${roomId}/leaderboard`} style={{ fontSize: 20 }}>
            ‹
          </Link>
          <div>
            <h1>{target.user.displayName}</h1>
            <div className="faint">{target.room.name}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div className="stat">
            <div className="label">แต้มสะสม</div>
            <div className="value">{target.totalPoints.toLocaleString()}</div>
          </div>
          <div className="stat">
            <div className="label">สุทธิรวม</div>
            <div
              className="value"
              style={{ color: totalNet >= 0 ? "var(--primary)" : "var(--danger)" }}
            >
              {totalNet >= 0 ? "+" : ""}
              {totalNet.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <h2>แยกตามงวด</h2>
      <div className="card">
        {rows.length === 0 && <div className="empty">ยังไม่มีโพยในวงนี้</div>}
        {rows.map((r) => (
          <div className="list-row" key={r.drawId}>
            <div style={{ flex: 1 }}>
              <div>{r.drawDate.toLocaleDateString("th-TH")}</div>
              <span className="faint">
                ลง {r.staked.toLocaleString()} · ถูก {r.won.toLocaleString()}
              </span>
            </div>
            <span className={"badge " + (STATUS[r.status] ?? "neutral")}>
              {r.status}
            </span>
            <strong className={r.net >= 0 ? "delta-up" : "delta-down"}>
              {r.net >= 0 ? "+" : ""}
              {r.net.toLocaleString()}
            </strong>
          </div>
        ))}
      </div>
    </main>
  );
}
