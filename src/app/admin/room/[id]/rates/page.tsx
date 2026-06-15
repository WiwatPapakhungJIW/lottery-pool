import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/db";
import { getRoomRates, ALL_BET_TYPES } from "@/actions/rates";
import { RatesForm } from "./RatesForm";

export default async function RatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: roomId } = await params;
  const session = await auth();
  if (!session?.user) return null;
  if (session.user.role !== "ADMIN") redirect("/");

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) notFound();

  const rates = await getRoomRates(roomId);

  return (
    <main>
      <div className="topbar">
        <div className="brand">
          <Link href="/admin" style={{ fontSize: 20 }}>
            ‹
          </Link>
          <div>
            <h1>อัตราจ่าย</h1>
            <div className="faint">{room.name}</div>
          </div>
        </div>
      </div>

      <p className="note">
        ตั้งเรตจ่ายต่อแต้มของแต่ละประเภท · มีผลกับโพยที่ลงใหม่เท่านั้น
        โพยที่ลงไปแล้วใช้เรตเดิม
      </p>

      <RatesForm roomId={roomId} initial={rates} order={ALL_BET_TYPES} />
    </main>
  );
}
