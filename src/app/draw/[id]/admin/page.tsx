import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/db";
import { drawSummary } from "@/actions/summary";
import { AdminPanel } from "./AdminPanel";

const STATUS: Record<string, { cls: string; label: string }> = {
  OPEN: { cls: "open", label: "เปิดรับ" },
  CLOSED: { cls: "closed", label: "ปิดรับแล้ว" },
  SETTLED: { cls: "settled", label: "ออกผลแล้ว" },
};

export default async function AdminDrawPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return null;
  if (session.user.role !== "ADMIN") redirect(`/draw/${id}`);

  const draw = await prisma.draw.findUnique({
    where: { id },
    include: { room: true, result: true, _count: { select: { bets: true } } },
  });
  if (!draw) notFound();
  const st = STATUS[draw.status] ?? STATUS.OPEN!;
  const summary = await drawSummary(id);

  return (
    <main>
      <div className="topbar">
        <div className="brand">
          <Link href="/admin" style={{ fontSize: 20 }}>
            ‹
          </Link>
          <div>
            <h1>{draw.room.name}</h1>
            <div className="faint">
              งวด {draw.drawDate.toLocaleDateString("th-TH")} · โพย{" "}
              {draw._count.bets} ใบ
            </div>
          </div>
        </div>
        <span className={"badge " + st.cls}>{st.label}</span>
      </div>

      <AdminPanel
        drawId={id}
        status={draw.status}
        result={
          draw.result
            ? {
                first6: draw.result.first6,
                last3a: draw.result.last3a,
                last3b: draw.result.last3b,
                last2: draw.result.last2,
              }
            : null
        }
      />

      <h2>สรุปรายลูกค้า</h2>
      <div className="card">
        {summary.length === 0 && <div className="empty">ยังไม่มีโพยในงวดนี้</div>}
        {summary.map((p) => (
          <div className="list-row" key={p.userId}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{p.name}</div>
              <span className="faint">
                ลง {p.staked.toLocaleString()} · ถูก {p.won.toLocaleString()}
              </span>
            </div>
            <strong className={p.net >= 0 ? "delta-up" : "delta-down"}>
              {p.net >= 0 ? "+" : ""}
              {p.net.toLocaleString()}
            </strong>
          </div>
        ))}
      </div>
    </main>
  );
}
