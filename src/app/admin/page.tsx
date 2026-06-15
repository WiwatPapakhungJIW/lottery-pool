import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/db";
import { CreateRoomForm } from "./CreateRoomForm";
import { CreateDrawForm } from "./CreateDrawForm";

const STATUS: Record<string, string> = {
  OPEN: "open",
  CLOSED: "closed",
  SETTLED: "settled",
};

export default async function AdminHomePage() {
  const session = await auth();
  if (!session?.user) return null;
  if (session.user.role !== "ADMIN") redirect("/");

  const rooms = await prisma.room.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      draws: { orderBy: { drawDate: "desc" } },
      _count: { select: { memberships: true } },
    },
  });

  return (
    <main>
      <div className="topbar">
        <div className="brand">
          <Link href="/" style={{ fontSize: 20 }}>
            ‹
          </Link>
          <h1>แอดมิน</h1>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>สร้างวงใหม่</h3>
        <CreateRoomForm />
      </div>

      <h2>วงทั้งหมด</h2>
      {rooms.length === 0 && (
        <div className="card">
          <div className="empty">ยังไม่มีวง</div>
        </div>
      )}

      {rooms.map((room) => (
        <div className="card" key={room.id}>
          <div className="row-between">
            <strong>{room.name}</strong>
            <span className="badge neutral">{room._count.memberships} คน</span>
          </div>
          <p className="faint" style={{ margin: "4px 0 8px" }}>
            โค้ดเชิญ{" "}
            <span style={{ fontWeight: 600, letterSpacing: 1 }}>
              {room.inviteCode}
            </span>
          </p>
          <div className="actions" style={{ marginBottom: 8 }}>
            <Link href={`/admin/room/${room.id}/rates`}>อัตราจ่าย</Link>
          </div>

          {room.draws.length === 0 && (
            <p className="note">ยังไม่มีงวด</p>
          )}
          {room.draws.map((d) => (
            <div className="list-row" key={d.id}>
              <div style={{ flex: 1 }}>
                งวด {d.drawDate.toLocaleDateString("th-TH")}{" "}
                <span className={"badge " + (STATUS[d.status] ?? "neutral")}>
                  {d.status}
                </span>
              </div>
              <Link href={`/draw/${d.id}/admin`}>จัดการ</Link>
              <Link href={`/draw/${d.id}`}>เล่น</Link>
            </div>
          ))}

          <div className="divider" />
          <CreateDrawForm roomId={room.id} />
        </div>
      ))}
    </main>
  );
}
