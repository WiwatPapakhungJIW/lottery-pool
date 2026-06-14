import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/db";
import { AdminPanel } from "./AdminPanel";

// หน้าแอดมินของงวด — กรอกผล / preview / เคลียร์ / ยกเลิก
export default async function AdminDrawPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return null; // middleware กันล็อกอินอยู่แล้ว
  if (session.user.role !== "ADMIN") redirect(`/draw/${id}`); // ไม่ใช่แอดมิน → กลับหน้าเล่น

  const draw = await prisma.draw.findUnique({
    where: { id },
    include: { room: true, result: true, _count: { select: { bets: true } } },
  });
  if (!draw) notFound();

  return (
    <main>
      <h1>แอดมิน · {draw.room.name}</h1>
      <p>
        งวด {draw.drawDate.toLocaleDateString("th-TH")} · สถานะ {draw.status} ·
        โพยทั้งหมด {draw._count.bets} ใบ
      </p>

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
    </main>
  );
}
