import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";
import { prisma } from "@/db";

// หน้าแรก — ยังไม่ล็อกอินโชว์ปุ่ม LINE, ล็อกอินแล้วเป็น dashboard รวมวง
export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main>
        <h1>วงหวยเพื่อน</h1>
        <p>เกมทายผลหวยในกลุ่มเพื่อน เล่นเอาสนุก ไม่มีเงินจริง</p>
        <form
          action={async () => {
            "use server";
            await signIn("line");
          }}
        >
          <button type="submit">เข้าสู่ระบบด้วย LINE</button>
        </form>
      </main>
    );
  }

  // วงที่เป็นสมาชิก + งวดล่าสุดของแต่ละวง
  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    include: {
      room: {
        include: { draws: { orderBy: { drawDate: "desc" }, take: 1 } },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const isAdmin = session.user.role === "ADMIN";

  return (
    <main>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>สวัสดี {session.user.name ?? "เพื่อน"}</h1>
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <button type="submit">ออกจากระบบ</button>
        </form>
      </div>

      <p style={{ display: "flex", gap: 16 }}>
        <Link href="/join">+ เข้าร่วมวงด้วยโค้ดเชิญ</Link>
        {isAdmin && <Link href="/admin">⚙ แอดมิน</Link>}
      </p>

      <h2>วงของฉัน</h2>
      {memberships.length === 0 && (
        <p>ยังไม่ได้อยู่วงไหน — ขอโค้ดเชิญจากเพื่อนแล้วกด “เข้าร่วมวง”</p>
      )}

      {memberships.map((m) => {
        const latest = m.room.draws[0];
        return (
          <section
            key={m.id}
            style={{
              border: "1px solid #eee",
              borderRadius: 12,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <div
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              <strong>{m.room.name}</strong>
              <span>{m.totalPoints.toLocaleString()} แต้ม</span>
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 12 }}>
              {latest ? (
                <Link href={`/draw/${latest.id}`}>ลงโพยงวดล่าสุด</Link>
              ) : (
                <span style={{ color: "#999" }}>ยังไม่มีงวด</span>
              )}
              <Link href={`/room/${m.room.id}/leaderboard`}>ลีดเดอร์บอร์ด</Link>
              {isAdmin && latest && (
                <Link href={`/draw/${latest.id}/admin`}>แอดมิน</Link>
              )}
            </div>
          </section>
        );
      })}
    </main>
  );
}
