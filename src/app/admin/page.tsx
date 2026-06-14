import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/db";
import { CreateRoomForm } from "./CreateRoomForm";
import { CreateDrawForm } from "./CreateDrawForm";

// ศูนย์กลางแอดมิน — สร้างวง / เปิดงวด / เข้าหน้าจัดการแต่ละงวด
export default async function AdminHomePage() {
  const session = await auth();
  if (!session?.user) return null; // middleware กันล็อกอินอยู่แล้ว
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
      <h1>แอดมิน</h1>
      <p>
        <Link href="/">← กลับหน้าแรก</Link>
      </p>

      <h2>สร้างวงใหม่</h2>
      <CreateRoomForm />

      <h2 style={{ marginTop: 24 }}>วงทั้งหมด</h2>
      {rooms.length === 0 && <p>ยังไม่มีวง</p>}

      {rooms.map((room) => (
        <section
          key={room.id}
          style={{
            border: "1px solid #eee",
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{room.name}</strong>
            <span style={{ fontSize: 13, color: "#666" }}>
              โค้ดเชิญ <b>{room.inviteCode}</b> · {room._count.memberships} คน
            </span>
          </div>

          <div style={{ marginTop: 8 }}>
            {room.draws.length === 0 && (
              <p style={{ color: "#999", fontSize: 13 }}>ยังไม่มีงวด</p>
            )}
            {room.draws.map((d) => (
              <div key={d.id} style={{ fontSize: 14, padding: "2px 0" }}>
                งวด {d.drawDate.toLocaleDateString("th-TH")} · {d.status} ·{" "}
                <Link href={`/draw/${d.id}/admin`}>จัดการ</Link> ·{" "}
                <Link href={`/draw/${d.id}`}>หน้าเล่น</Link>
              </div>
            ))}
          </div>

          <CreateDrawForm roomId={room.id} />
        </section>
      ))}
    </main>
  );
}
