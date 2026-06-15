import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";
import { prisma } from "@/db";

// หน้าแรก — ยังไม่ล็อกอินโชว์ hero + ปุ่ม LINE, ล็อกอินแล้วเป็น dashboard รวมวง
export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main>
        <div className="topbar">
          <div className="brand">
            <div className="logo">🎲</div>
            <h1>วงหวยเพื่อน</h1>
          </div>
        </div>

        <div className="hero">
          <h1>ทายหวยกับเพื่อน</h1>
          <p>เก็บแต้ม ลุ้นอันดับ เล่นเอาสนุก — ไม่มีเงินจริง</p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("line");
          }}
        >
          <button type="submit" className="btn-line btn-block">
            เข้าสู่ระบบด้วย LINE
          </button>
        </form>
      </main>
    );
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    include: {
      room: { include: { draws: { orderBy: { drawDate: "desc" }, take: 1 } } },
    },
    orderBy: { joinedAt: "desc" },
  });

  const isAdmin = session.user.role === "ADMIN";

  return (
    <main>
      <div className="topbar">
        <div className="brand">
          <div className="logo">🎲</div>
          <div>
            <h1>สวัสดี {session.user.name ?? "เพื่อน"}</h1>
            <div className="faint">วงหวยเพื่อน</div>
          </div>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <button type="submit" className="btn-sm">
            ออกระบบ
          </button>
        </form>
      </div>

      <div className="actions" style={{ margin: "8px 2px 4px" }}>
        <Link href="/join">+ เข้าร่วมวงด้วยโค้ดเชิญ</Link>
        {isAdmin && <Link href="/admin">⚙ แอดมิน</Link>}
      </div>

      <h2>วงของฉัน</h2>
      {memberships.length === 0 && (
        <div className="card">
          <div className="empty">
            ยังไม่ได้อยู่วงไหน
            <br />
            ขอโค้ดเชิญจากเพื่อนแล้วกด “เข้าร่วมวง”
          </div>
        </div>
      )}

      {memberships.map((m) => {
        const latest = m.room.draws[0];
        return (
          <div className="card" key={m.id}>
            <div className="row-between">
              <strong>{m.room.name}</strong>
              <span className="badge neutral">
                {m.totalPoints.toLocaleString()} แต้ม
              </span>
            </div>
            <div className="actions" style={{ marginTop: 10 }}>
              {latest ? (
                <Link href={`/draw/${latest.id}`}>ลงโพยงวดล่าสุด</Link>
              ) : (
                <span className="faint">ยังไม่มีงวด</span>
              )}
              <Link href={`/room/${m.room.id}/leaderboard`}>ลีดเดอร์บอร์ด</Link>
              {isAdmin && latest && (
                <Link href={`/draw/${latest.id}/admin`}>แอดมิน</Link>
              )}
            </div>
          </div>
        );
      })}
    </main>
  );
}
